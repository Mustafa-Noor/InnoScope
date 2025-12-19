from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from sqlalchemy import update, func

# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from app.models.chat import ChatSession, ChatMessage, SenderType, ChatSessionState
from app.schemas.chat import ChatRequest, ChatResponse
from app.utils.llm import call_llm
from app.pipelines.builds.chat_agent import run_chat_turn, create_chat_graph, ChatState
from fastapi import BackgroundTasks

async def handle_chat(
    request: ChatRequest, 
    db: AsyncSession, 
    current_user,
    background_tasks: BackgroundTasks
) -> ChatResponse:
    
    # Extract user_id from request (MCP provides as string)
    if request.user_id:
        try:
            user_id = int(request.user_id)  # Convert string to int
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid user_id format")
    elif current_user:
        user_id = current_user.id  # Fallback to authenticated user
    else:
        raise HTTPException(status_code=401, detail="user_id required")  # No fallback to 1
    
    # 1. Get or create chat session
    # Treat missing, null, or non-positive session_id as a new session
    if request.session_id and request.session_id > 0:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == request.session_id,
                ChatSession.user_id == user_id
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            # If client passed an invalid id, create a fresh session instead of 404
            session = ChatSession(
                user_id=user_id,
                topic=request.topic,
                title=request.message[:50]
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
    else:
        session = ChatSession(
            user_id=user_id,
            topic=request.topic,
            title=request.message[:50]
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # 2. Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        sender=SenderType.user,
        message=request.message
    )
    db.add(user_msg)
    await db.commit()

    # 3. Fetch recent messages (6)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.id.desc())
        .limit(6)
    )
    recent_messages = list(reversed(result.scalars().all()))

    memory_pairs = [
        f"{'User' if m.sender == SenderType.user else 'Assistant'}: {m.message}"
        for m in recent_messages
    ]

    recent_context = "\n".join(memory_pairs)

    # 4. Use long-term memory + recent context
    long_term_memory = session.memory or ""
    if long_term_memory:
        combined_context = long_term_memory
    else:
        combined_context = recent_context

    print("Context sent to LLM:\n", combined_context)

    # 4.1 Count USER messages specifically to detect 2nd message
    try:
        cnt_res = await db.execute(
            select(func.count(ChatMessage.id)).where(
                ChatMessage.session_id == session.id,
                ChatMessage.sender == SenderType.user
            )
        )
        user_message_count = int(cnt_res.scalar() or 0)  # Now includes the message we just saved
    except Exception:
        user_message_count = 1
    
    # Check if this is the 2nd user message
    is_second_message = user_message_count == 2
    
    # Also compute message pairs for graph
    try:
        cnt_res = await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.session_id == session.id)
        )
        total_messages = int(cnt_res.scalar() or 0)  # Already includes the user message we just saved
    except Exception:
        total_messages = len(recent_messages)
    message_pairs = total_messages // 2
    
    print(f"User messages: {user_message_count}, Is second message: {is_second_message}, Total messages: {total_messages}")

    # 5. Delegate to LangGraph chat agent build, seeding with any saved session state
    seeded_state = None
    try:
        result_state = await db.execute(
            select(ChatSessionState).where(ChatSessionState.session_id == session.id)
        )
        existing = result_state.scalar_one_or_none()
        if existing is not None:
            seeded_state = ChatState(
                memory_text=combined_context,
                problem_statement=existing.problem_statement,
                domain=existing.domain,
                goals=existing.goals,
                prerequisites=existing.prerequisites,
                key_topics=existing.key_topics,
                initial_summary=existing.initial_summary,
                summary=existing.refined_summary or existing.initial_summary,
            )
    except Exception:
        seeded_state = None

    if seeded_state is not None:
        graph = create_chat_graph()
        seeded_state.message_pairs = message_pairs
        chat_state = graph.invoke(seeded_state)
        if isinstance(chat_state, dict):
            chat_state = ChatState(**chat_state)
    else:
        # pass pairs via initial state by calling graph directly
        graph = create_chat_graph()
        start = ChatState(memory_text=combined_context, message_pairs=message_pairs)
        chat_state = graph.invoke(start)
        if isinstance(chat_state, dict):
            chat_state = ChatState(**chat_state)
    reply_text = chat_state.reply_text or "Could you share more details?"

    # Create focused research idea summary from extracted fields
    idea_summary = _compose_idea_summary(chat_state)

    # If this is the 2nd message, replace with completion message only
    if is_second_message:
        completion_msg = "✅ **Given the information you provided, I've extracted the key research details.** \n\nNow you can:\n• **Summary** - Review the research summary\n• **Roadmap** - See implementation steps\n• **Feasibility** - Get feasibility analysis"
        reply_text = completion_msg

    # 6. Save assistant message
    bot_msg = ChatMessage(
        session_id=session.id,
        sender=SenderType.assistant,
        message=reply_text,
    )
    db.add(bot_msg)
    await db.commit()

    # 7. Upsert structured state snapshot for this session
    # Note: chat_state may contain fields and summaries populated by the graph
    try:
        result_state = await db.execute(
            select(ChatSessionState).where(ChatSessionState.session_id == session.id)
        )
        existing = result_state.scalar_one_or_none()
        if existing is None:
            snapshot = ChatSessionState(
                session_id=session.id,
                problem_statement=getattr(chat_state, "problem_statement", None),
                domain=getattr(chat_state, "domain", None),
                goals=getattr(chat_state, "goals", None),
                prerequisites=getattr(chat_state, "prerequisites", None),
                key_topics=getattr(chat_state, "key_topics", None),
                initial_summary=getattr(chat_state, "initial_summary", None),
                refined_summary=getattr(chat_state, "summary", None),
            )
            db.add(snapshot)
        else:
            await db.execute(
                update(ChatSessionState)
                .where(ChatSessionState.session_id == session.id)
                .values(
                    problem_statement=getattr(chat_state, "problem_statement", existing.problem_statement),
                    domain=getattr(chat_state, "domain", existing.domain),
                    goals=getattr(chat_state, "goals", existing.goals),
                    prerequisites=getattr(chat_state, "prerequisites", existing.prerequisites),
                    key_topics=getattr(chat_state, "key_topics", existing.key_topics),
                    initial_summary=getattr(chat_state, "initial_summary", existing.initial_summary),
                    refined_summary=getattr(chat_state, "summary", existing.refined_summary),
                )
            )
        await db.commit()
    except Exception:
        # non-fatal: continue even if snapshot fails
        pass

    # 8. Background task to update memory
    background_tasks.add_task(update_session_memory, session.id, db)

    # 9. Return response with extracted fields and completion flag
    return ChatResponse(
        session_id=session.id,
        reply=reply_text,
        is_complete=is_second_message,
        problem_statement=getattr(chat_state, "problem_statement", None),
        domain=getattr(chat_state, "domain", None),
        goals=getattr(chat_state, "goals", None),
        prerequisites=getattr(chat_state, "prerequisites", None),
        key_topics=getattr(chat_state, "key_topics", None),
        summary=idea_summary,  # Use focused idea summary, not conversation summary
    )

async def update_session_memory(session_id: str, db: AsyncSession):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id)
        .limit(12)
    )
    all_messages = result.scalars().all()

    memory_pairs = [
        f"{'User' if m.sender == SenderType.user else 'Assistant'}: {m.message}"
        for m in all_messages
    ]

    if len(memory_pairs) <= 10:
        new_memory = "\n".join(memory_pairs)
    else:
        joined_memory = "\n".join(memory_pairs)
        summary_prompt = f"""You are a summarization assistant. Summarize the following research conversation between a user and an assistant.

    Provide a **brief and concise** summary that captures necessary research points and user concerns.

    Conversation:
    {joined_memory}

    Concise Summary:"""
        new_memory = call_llm(summary_prompt)

    # Save new memory to session
    await db.execute(
        update(ChatSession)
        .where(ChatSession.id == session_id)
        .values(memory=new_memory)
    )
    await db.commit()


def _compose_idea_summary(chat_state: ChatState) -> str:
    """
    Compose a focused research idea summary from extracted fields.
    This is used for roadmap and feasibility generation (not conversation summary).
    
    Example output:
    "Research on: Biryani preparation techniques
    Domain: Culinary Science
    Main Goal: Optimize cooking time and flavor infusion
    Key Topics: rice cooking, spice blending, heat management"
    """
    try:
        problem = getattr(chat_state, "problem_statement", "")
        domain = getattr(chat_state, "domain", "")
        goals = getattr(chat_state, "goals", [])
        topics = getattr(chat_state, "key_topics", [])
        
        parts = []
        
        if problem:
            parts.append(f"Research on: {problem}")
        if domain:
            parts.append(f"Domain: {domain}")
        if goals and isinstance(goals, list) and goals:
            goals_str = ", ".join([str(g) for g in goals if g])
            if goals_str:
                parts.append(f"Main Goals: {goals_str}")
        if topics and isinstance(topics, list) and topics:
            topics_str = ", ".join([str(t) for t in topics if t])
            if topics_str:
                parts.append(f"Key Topics: {topics_str}")
        
        idea_summary = "\n".join(parts)
        
        # If we have a good summary, use it; otherwise fall back to conversation summary
        if idea_summary.strip():
            return idea_summary
        else:
            return getattr(chat_state, "summary", "") or ""
            
    except Exception as e:
        print(f"Error composing idea summary: {e}")
        return getattr(chat_state, "summary", "") or ""