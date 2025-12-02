from utils.llm import call_llm
from utils.extract import extract_text

def check_if_research(text):
    prompt = f"""
    You are an expert assistant. Determine if the following text appears to be a research paper 
    (academic tone, abstract, methodology, experiments, results, references).
    Respond with ONLY 'Yes' or 'No'.

    Text: {text[:2000]}
    """
    response = call_llm(prompt)
    return response.strip()


# if __name__ == "__main__":
#     # Test cases
#     test_cases = [
#         {
#             "name": "Research Paper Text",
#             "text": """
#             Abstract: This paper presents a novel approach to machine learning algorithms.
#             The methodology involves extensive experiments on large datasets.
#             Results show significant improvements over existing approaches.
#             References: [1] Smith et al. (2023)
#             """,
#             "expected": "Yes"
#         },
#         {
#             "name": "Non-Research Text",
#             "text": """
#             Welcome to our company newsletter!
#             This month we're excited to announce new product features.
#             Our team has been working hard to improve user experience.
#             Contact us for more information.
#             """,
#             "expected": "No"
#         }
#     ]
    
#     print("Testing research_check function")
#     print("=" * 40)
    
#     for i, test_case in enumerate(test_cases, 1):
#         print(f"\nTest {i}: {test_case['name']}")
#         print("-" * 30)
        
#         result = check_if_research(test_case['text'])
        
#         print(f"Input text preview: {test_case['text'][:100]}...")
#         print(f"Expected: {test_case['expected']}")
#         print(f"Got: {result}")
        
#         if result.lower() == test_case['expected'].lower():
#             print("✅ PASS")
#         else:
#             print("❌ FAIL")
    
#     print(f"\nTesting complete!")