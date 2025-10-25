"use client";
import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function UploadPage() {
  const folderInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🧾 Handle file selection
  const handleFolderSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setSelectedFile(selectedFiles[0]);
  };

  // 💾 Upload file to backend API
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Replace with your real backend API endpoint
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setIsUploaded(true);
      } else {
        setIsUploaded(true);
        alert("Error uploading file.");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to connect to the server.");
    }

    setLoading(false);
  };
  const handleRoadmap = () => {
    
  };
  // 🧭 After upload - button actions
  const handleAction = (type) => {
    if (type === "Roadmap") {
        handleRoadmap();
    }
    alert(`${type} will be generated soon!`);
  };

  return (
    <div style={style.uploadbar}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "left", marginBottom: "40px" }}>
          <h1 style={style.header}>Upload Your Research Paper</h1>
          <p style={style.subtext}>
            Upload a research paper to generate an intelligent implementation
            roadmap, feasibility analysis, or summarization.
          </p>
        </div>

        {/* Upload Box */}
        <div className="card shadow-sm border-0 p-4" style={style.card}>
          <div
            style={{
              border: "2px dashed rgba(16, 185, 129, 0.3)",
              borderRadius: "15px",
              padding: "40px",
              marginBottom: "20px",
              backgroundColor: "rgba(16, 185, 129, 0.02)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "16px", color: "#059669" }}>
              📂
            </div>
            <h3 style={style.title}>Select Project Files</h3>
            <p style={style.subtext}>
              Choose a research paper (PDF or DOCX) to upload
            </p>

            <input
              ref={folderInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFolderSelect}
              style={{ display: "none" }}
              id="file-upload"
            />

            <label
              htmlFor="file-upload"
              className="btn btn-success"
              style={{
                backgroundColor: "#059669",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
              }}
            >
              Browse Files
            </label>

            {selectedFile && (
              <p style={{ color: "#374151", marginTop: "15px" }}>
                📄 {selectedFile.name}
              </p>
            )}

            {/* Upload Button */}
            {selectedFile && !isUploaded && (
              <button
                className="btn btn-outline-success mt-3"
                onClick={handleUpload}
                disabled={loading}
              >
                {loading ? "Uploading..." : "Upload File"}
              </button>
            )}
          </div>

          {/* After Upload - Action Buttons */}
          {isUploaded && (
            <div className="mt-4 text-center">
              <h5 style={{ color: "#059669", marginBottom: "20px" }}>
                File uploaded successfully !
              </h5>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button
                  className="btn btn-outline-success"
                  onClick={() => handleAction("Roadmap")}
                >
                  🧭 Generate Roadmap
                </button>
                <button
                  className="btn btn-outline-success"
                  onClick={() => handleAction("Feasibility Analysis")}
                >
                  📊 Feasibility Analysis
                </button>
                <button
                  className="btn btn-outline-success"
                  onClick={() => handleAction("Summarization")}
                >
                  📝 Summarization
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 💅 Styling
const style = {
  uploadbar: {
    marginLeft: "-30px",
    marginTop: "-5px",
    padding: "10px",
    backgroundColor: "#ffffff",
    border: "3px solid #e5e7eb",
    borderRadius: "15px",
    minHeight: "90vh",
    fontFamily: "Poppins, sans-serif",
  },
  header: {
    fontSize: "2.5rem",
    fontWeight: "500",
    color: "#083d44",
    marginBottom: "16px",
  },
  subtext: {
    fontSize: "1.1rem",
    color: "#6b7280",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "20px",
    boxShadow: "0 4px 20px rgba(16, 185, 129, 0.05)",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "12px",
  },
};

