from app.utils.extract import extract_text


from app.schemas.intermediate import IntermediateState


def extract_text_node(state: IntermediateState):


    # expects state.file_path to be set


    text = extract_text(state.file_path)


    state.raw_text = text


    return state


