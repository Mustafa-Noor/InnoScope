from app.services.research_check import check_if_research
from app.services.summarize_research import summarize_research
from app.services.roadmap_generator import generate_roadmap
from app.utils.extract import extract_text
from app.schemas.roadmap import RoadmapPipelineInput, RoadmapPipelineOutput
from app.utils.llm import call_llm
from pydantic import ValidationError

def run_basic_roadmap_pipeline(input_data: RoadmapPipelineInput) -> RoadmapPipelineOutput:
    try:
        file_path = input_data.file_path

        # Step 1: Extract text
        text = extract_text(file_path)
        if not text or len(text.strip()) < 100:
            return RoadmapPipelineOutput(
                status="error",
                message="Document contains insufficient text.",
            )

        # Step 2: Check if research paper
        if not check_if_research(text):
            return RoadmapPipelineOutput(
                status="warning",
                message="This is not a research paper. Please provide a research-oriented document."
            )

        # Step 3: Generate summary
        summary = summarize_research(text)

        # Step 4: Generate roadmap
        roadmap = generate_roadmap(summary)

        return RoadmapPipelineOutput(
            status="success",
            message="Successfully generated roadmap from research paper.",
            summary=summary,
            roadmap=roadmap
        )

    except Exception as e:
        return RoadmapPipelineOutput(
            status="error",
            message=f"Unexpected error: {str(e)}"
        )



# if __name__ == "__main__":
#     import os
    
#     print("Testing Basic Roadmap Pipeline")
#     print("=" * 50)
    
#     # Test with just the working case first
#     test_file = os.path.join(os.path.dirname(__file__), "..", "pipelines", "test.docx")
    
#     if os.path.exists(test_file):
#         print(f"\nRunning pipeline with {test_file}:")
#         print("-" * 40)
        
#         result = run_basic_roadmap_pipeline(RoadmapPipelineInput(file_path=test_file))
        
#         print(f"\nFinal Result:")
#         print(f"Status: {result.status}")
#         print(f"Message: {result.message}")
        
#         if result.summary:
#             print(f"\n📄 Summary:\n{result.summary}\n")
        
#         if result.roadmap:
#             print(f"\n🚀 Roadmap:\n{result.roadmap}")
            
#     else:
#         print(f"❌ test.docx not found at {test_file}")