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
    
    # 1. Get or create chat session
    # Treat missing, null, or non-positive session_id as a new session
    if request.session_id and request.session_id > 0:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == request.session_id,
                ChatSession.user_id == current_user.id
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            # If client passed an invalid id, create a fresh session instead of 404
            session = ChatSession(
                user_id=current_user.id,
                topic=request.topic,
                title=request.message[:50]
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
    else:
        session = ChatSession(
            user_id=current_user.id,
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
    # await db.commit()

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

    # 4.1 Compute conversation pairs (approximate). Count existing DB messages + current user message
    try:
        cnt_res = await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.session_id == session.id)
        )
        total_messages = int(cnt_res.scalar() or 0) + 1  # +1 for the current uncommitted user message
    except Exception:
        total_messages = len(recent_messages) + 1
    message_pairs = total_messages // 2

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

    # 9. Return response
    return ChatResponse(
        session_id=session.id,
        reply=reply_text,
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