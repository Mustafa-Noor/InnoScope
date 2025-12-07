import google.generativeai as genai
from app.config import settings

# Configure Gemini API once
genai.configure(api_key=settings.GOOGLE_API_KEY)

# Load the model once at module level
model = genai.GenerativeModel("gemini-2.5-flash")


def call_llm(prompt: str) -> str:
    """
    Generates a response using Gemini LLM given a user prompt.
    
    Args:
        prompt (str): The question or instruction for the LLM.
    
    Returns:
        str: The LLM-generated response text.
    """
    try:
        response = model.generate_content(prompt)
        print("DEBUG: LLM response received", response.text)
        return response.text.strip()
    except Exception as e:
        return f"Error: {str(e)}"


if __name__ == "__main__":
    prompt = "Explain the theory of relativity in simple terms. Write one paragraph."
    result = call_llm(prompt)
    print(result)