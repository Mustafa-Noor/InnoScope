from app.services.summarize_research import refine_summary


from app.schemas.intermediate import IntermediateState


def refine_summary_node(state: IntermediateState):


    state.summary = refine_summary(state.summary, state)
    return state