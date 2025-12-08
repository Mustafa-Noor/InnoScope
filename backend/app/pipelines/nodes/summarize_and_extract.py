"""Combined node for summarization and field extraction in a single LLM call."""

import re
from app.services.summarize_research import summarize_and_extract_fields
from app.schemas.intermediate import IntermediateState


def summarize_and_extract_node(state: IntermediateState):
    """Generate summary and extract fields in a single LLM call.
    
    This combines the work of summarize_node and fill_state_node into one call,
    saving tokens and reducing LLM overhead.
    """
    if not state.raw_text or not isinstance(state.raw_text, str):
        return state
    
    # Call combined function
    summary, fields = summarize_and_extract_fields(state.raw_text)
    
    # Set summary
    if summary:
        state.summary = summary
        state.initial_summary = summary
    
    # Set extracted fields with normalization
    if fields:
        state.problem_statement = fields.get("problem_statement", state.problem_statement)
        
        # domain normalization
        domain_val = fields.get("domain", state.domain)
        if isinstance(domain_val, list):
            domain_val = ", ".join([str(x).strip() for x in domain_val if str(x).strip()])
        if isinstance(domain_val, str):
            domain_val = domain_val.strip()
        state.domain = domain_val
        
        # goals normalization
        goals = fields.get("goals", state.goals)
        if isinstance(goals, str):
            goals = [x.strip() for x in goals.split(";") if x.strip()]
            if len(goals) == 1:
                goals = [x.strip() for x in goals[0].split(",") if x.strip()]
        elif isinstance(goals, list):
            goals = [str(x).strip() for x in goals if str(x).strip()]
        state.goals = goals
        
        # key_topics normalization
        key_topics = fields.get("key_topics", state.key_topics)
        if isinstance(key_topics, str):
            key_topics = [x.strip() for x in key_topics.split(";") if x.strip()]
            if len(key_topics) == 1:
                key_topics = [x.strip() for x in key_topics[0].split(",") if x.strip()]
        elif isinstance(key_topics, list):
            key_topics = [str(x).strip() for x in key_topics if str(x).strip()]
        state.key_topics = key_topics
        
        # prerequisites normalization
        prerequisites = fields.get("prerequisites", state.prerequisites)
        if isinstance(prerequisites, str):
            prerequisites = [x.strip() for x in prerequisites.split(";") if x.strip()]
            if len(prerequisites) == 1:
                prerequisites = [x.strip() for x in prerequisites[0].split(",") if x.strip()]
        elif isinstance(prerequisites, list):
            prerequisites = [str(x).strip() for x in prerequisites if str(x).strip()]
        state.prerequisites = prerequisites
    
    return state
