from app.services.update_from_user import update_state_from_user_response


from app.schemas.roadmap import IntermediateState



def update_state_node(state: IntermediateState):


    user_input = getattr(state, "user_input", None)


    updated = update_state_from_user_response(state, user_input)
    return updated or state