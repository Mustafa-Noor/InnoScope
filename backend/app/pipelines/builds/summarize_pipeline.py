"""Summarize pipeline with text extraction."""

import re
from app.utils.extract import extract_text
from app.services.summarize_research import summarize_research
from app.schemas.intermediate import IntermediateState


def summarize_pipeline_from_file(file_path: str) -> str:
    """
    Complete pipeline for summarizing a document file.
    
    Flow: file extraction → text cleanup → summarization
    
    Args:
        file_path: Path to the document file (PDF or DOCX)
        
    Returns:
        Summarized text
    """
    print("\n" + "=" * 80)
    print("SUMMARIZE PIPELINE - FROM FILE")
    print("=" * 80)
    print(f"File: {file_path}")
    
    # Step 1: Extract text from file
    print("\n[1/3] Extracting text from document...")
    raw_text = extract_text(file_path)
    
    if not raw_text:
        raise ValueError("Could not extract text from file")
    
    print(f"✓ Extracted {len(raw_text)} characters")
    print(f"  Preview: {raw_text[:100]}...")
    
    # Step 2: Create intermediate state
    print("\n[2/3] Preparing for summarization...")
    state = IntermediateState(raw_text=raw_text)
    print(f"✓ State created")
    
    # Step 3: Summarize
    print("\n[3/3] Running summarization...")
    summary = summarize_research(state.raw_text)
    
    # Clean markdown code blocks
    if isinstance(summary, str):
        summary = re.sub(r"^```(?:\w+)?\s*|\s*```$", "", summary.strip(), flags=re.MULTILINE)
    
    print(f"✓ Summarization complete!")
    print(f"  Summary length: {len(summary)} characters")
    
    print("\n" + "-" * 80)
    print("SUMMARY")
    print("-" * 80)
    print(summary)
    print("\n" + "=" * 80)
    print("SUMMARIZATION COMPLETE ✓")
    print("=" * 80 + "\n")
    
    return summary


def summarize_pipeline_from_text(text: str) -> str:
    """
    Summarization pipeline for raw text input.
    
    Args:
        text: Raw text to summarize
        
    Returns:
        Summarized text
    """
    print("\n" + "=" * 80)
    print("SUMMARIZE PIPELINE - FROM TEXT")
    print("=" * 80)
    print(f"Text length: {len(text)} characters")
    print(f"Preview: {text[:100]}...")
    
    # Step 1: Create intermediate state
    print("\n[1/2] Preparing for summarization...")
    state = IntermediateState(raw_text=text)
    print(f"✓ State created")
    
    # Step 2: Summarize
    print("\n[2/2] Running summarization...")
    summary = summarize_research(state.raw_text)
    
    # Clean markdown code blocks
    if isinstance(summary, str):
        summary = re.sub(r"^```(?:\w+)?\s*|\s*```$", "", summary.strip(), flags=re.MULTILINE)
    
    print(f"✓ Summarization complete!")
    print(f"  Summary length: {len(summary)} characters")
    
    print("\n" + "-" * 80)
    print("SUMMARY")
    print("-" * 80)
    print(summary)
    print("\n" + "=" * 80)
    print("SUMMARIZATION COMPLETE ✓")
    print("=" * 80 + "\n")
    
    return summary
