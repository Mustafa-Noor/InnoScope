from  services.research_check import check_if_research
from  services.summarize_research import summarize_research
from  services.roadmap_generator import generate_roadmap
from  utils.extract import extract_text
from  utils.llm import call_llm


def run_basic_roadmap_pipeline(file_path):
    """
    Main pipeline function to process a document and generate a roadmap.
    
    Args:
        file_path (str): Path to the document file
        
    Returns:
        dict: Result containing status, messages, and generated content
    """
    result = {
        "status": "success",
        "message": "",
        "summary": None,
        "roadmap": None
    }
    
    try:
        # Extract text from document
        print(f"Step 1: Extracting text from {file_path}")
        text = extract_text(file_path)
        if not text:
            result["status"] = "error"
            result["message"] = "Could not extract text from the document or unsupported file type."
            return result
        print(f"✅ Text extracted successfully ({len(text)} characters)")
        
        # Check if it's a research paper
        print("Step 2: Checking if document is research paper")
        is_research = check_if_research(text)
        print(f"✅ Research check result: {is_research}")
        
        if is_research.lower() != "yes":
            result["status"] = "warning"
            result["message"] = "This is not a research paper. Suggest looking for research-oriented documents."
            return result
        
        # Generate summary
        print("Step 3: Generating summary")
        summary = summarize_research(text)
        print(f"✅ Summary generated ({len(summary)} characters)")
        result["summary"] = summary
        
        # Generate roadmap
        print("Step 4: Generating roadmap")
        roadmap = generate_roadmap(summary)
        print(f"✅ Roadmap generated ({len(roadmap)} characters)")
        result["roadmap"] = roadmap
        
        result["message"] = "Successfully generated roadmap from research paper."
        
    except Exception as e:
        print(f"❌ Error in step: {str(e)}")
        import traceback
        traceback.print_exc()
        result["status"] = "error"
        result["message"] = f"Error processing document: {str(e)}"
    
    return result


# if __name__ == "__main__":
#     import os
    
#     print("Testing Basic Roadmap Pipeline")
#     print("=" * 50)
    
#     # Test with just the working case first
#     test_file = os.path.join(os.path.dirname(__file__), "..", "pipelines", "test.docx")
    
#     if os.path.exists(test_file):
#         print(f"\nRunning pipeline with {test_file}:")
#         print("-" * 40)
        
#         result = run_basic_roadmap_pipeline(test_file)
        
#         print(f"\nFinal Result:")
#         print(f"Status: {result['status']}")
#         print(f"Message: {result['message']}")
        
#         if result['summary']:
#             print(f"\n📄 Summary:\n{result['summary']}\n")
        
#         if result['roadmap']:
#             print(f"\n🚀 Roadmap:\n{result['roadmap']}")
            
#     else:
#         print(f"❌ test.docx not found at {test_file}")