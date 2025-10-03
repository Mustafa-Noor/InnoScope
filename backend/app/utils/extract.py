def extract_text(file_path):
    if file_path.endswith(".docx"):
        from docx import Document
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])
    elif file_path.endswith(".pdf"):
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        return "\n".join([page.get_text() for page in doc])
    else:
        return None


# if __name__ == "__main__":
#     import os
    
#     # Test the extract_text function - file is in the same directory as this script
#     file_path = os.path.join(os.path.dirname(__file__), "test.docx")
    
#     if not os.path.exists(file_path):
#         print(f"Error: File '{file_path}' not found")
#         print("Please update the file_path variable with an existing file")
#     else:
#         result = extract_text(file_path)
        
#         if result:
#             print("Extracted text:")
#             print(result)
#         else:
#             print("Could not extract text or unsupported file type")