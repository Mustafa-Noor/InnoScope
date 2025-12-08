'use client';
import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';

const API_BASE_RAW = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE = (API_BASE_RAW || '').toString().replace(/\/+$/g, '');

export default function FeasibilityPage() {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feasibilityData, setFeasibilityData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [loadingStages, setLoadingStages] = useState([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const folderInputRef = useRef(null);
  const progressRef = useRef(null);
  const resultsRef = useRef(null);

  // Auto-analyze if summary is passed from chat
  useEffect(() => {
    const analyzeSummary = async () => {
      const pdfDataUrl = sessionStorage.getItem('feasibility_pdf');
      const filename = sessionStorage.getItem('feasibility_filename') || 'feasibility_summary.pdf';
      const autoFlag = new URLSearchParams(window.location.search).get('auto');
      
      if (pdfDataUrl && autoFlag === 'true') {
        try {
          // Convert data URL back to Blob
          const response = await fetch(pdfDataUrl);
          const blob = await response.blob();
          
          // Create File object
          const file = new File([blob], filename, { type: 'application/pdf' });
          
          setSelectedFolder(file.name);
          setFiles([file]);
          
          // Clear sessionStorage
          sessionStorage.removeItem('feasibility_pdf');
          sessionStorage.removeItem('feasibility_filename');
          
          // Automatically analyze
          setTimeout(() => {
            handleAnalyzeFeasibilityWithFile(file);
          }, 100);
        } catch (error) {
          console.error('Error retrieving PDF from session:', error);
          alert('Error preparing analysis. Please try again.');
        }
      }
    };

    analyzeSummary();
  }, []);

  // Auto-scroll to progress during analysis
  useEffect(() => {
    if (isAnalyzing && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loadingStages, currentProgress, isAnalyzing]);

  // Auto-scroll to results when analysis completes
  useEffect(() => {
    if (feasibilityData && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [feasibilityData]);

  const handleFolderSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    if (selectedFiles.length > 0) {
      const firstFile = selectedFiles[0];
      setSelectedFolder(firstFile.name);
      
      const relevantFiles = selectedFiles.filter(file => {
        const extension = file.name.toLowerCase().split('.').pop();
        return ['pdf', 'docx'].includes(extension);
      });
      
      if (relevantFiles.length === 0) {
        alert('Please select a PDF or DOCX file.');
        return;
      }
      
      setFiles(relevantFiles);
    }
  };

  const handleAnalyzeFeasibilityWithFile = async (file) => {
    setIsAnalyzing(true);
    setLoadingStages([]);
    setCurrentProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Starting feasibility analysis for file:', file.name);
      const res = await fetch(`${API_BASE}/feasibility/generate-stream`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.error('Response not OK:', res.status, res.statusText);
        alert('Feasibility analysis failed. Please try again.');
        setIsAnalyzing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData = null;
      let eventCount = 0;
      let lastEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream reading completed, received', eventCount, 'events');
          console.log('Last event before completion:', lastEvent);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Process complete lines (split by empty line or by individual data: lines)
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          
          // Skip empty lines
          if (!line) continue;
          
          // Look for data: lines (SSE simple format)
          if (line.startsWith('data:')) {
            const dataLine = line.replace('data:', '').trim();
            if (!dataLine) continue;
            
            try {
              const eventData = JSON.parse(dataLine);
              eventCount++;
              lastEvent = eventData;
              console.log('Event', eventCount, ':', eventData.stage || 'unknown', eventData);
              
              // Update progress bar
              if (eventData.progress !== undefined) {
                setCurrentProgress(eventData.progress);
              }

              // Update loading stages
              if (eventData.message) {
                setLoadingStages(prev => [...prev, eventData.message]);
              }

              // Check if this is the complete event
              if (eventData.stage === 'complete') {
                finalData = eventData.result || eventData;
                console.log('Complete event received with data:', finalData);
              }
            } catch (e) {
              console.warn('Could not parse SSE data:', dataLine, 'Error:', e.message);
            }
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }

      console.log('Final data after streaming:', finalData);
      
      // If no explicit complete event was received, use the last event if it has result data
      if (!finalData && lastEvent && lastEvent.result) {
        console.log('Using last event result as final data:', lastEvent.result);
        finalData = lastEvent.result;
      }
      
      if (finalData) {
        // Transform the response to match our FeasibilityData structure
        const transformedData = {
          final_score: finalData.final_score || finalData.feasibility_score || 50,
          sub_scores: finalData.sub_scores || finalData.feasibility_sub_scores || {},
          explanation: finalData.explanation || `This project has a feasibility score of ${finalData.final_score || finalData.feasibility_score}/100.`,
          recommendations: finalData.recommendations || [],
          detailed_report: finalData.detailed_report || finalData.feasibility_report || 'No detailed report available.'
        };
        
        console.log('Transformed data:', transformedData);
        setFeasibilityData(transformedData);
        setToastMessage('Feasibility analysis completed');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      } else {
        console.error('No final data received from stream');
        alert('No analysis data received. Please try again.');
      }
    } catch (e) {
      console.error('Error during feasibility analysis:', e);
      alert('Error analyzing feasibility: ' + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeFeasibility = async () => {
    if (!selectedFolder || files.length === 0) {
      alert('Please select a file first');
      return;
    }

    handleAnalyzeFeasibilityWithFile(files[0]);
  };

  const handleReset = () => {
    setSelectedFolder(null);
    setFiles([]);
    setFeasibilityData(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Amber
    if (score >= 40) return '#f97316'; // Orange
    return '#dc2626'; // Red
  };

  // Get score status text
  const getScoreStatus = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Challenging';
  };

  // Clean markdown from text (remove all formatting marks)
  const removeMarkdown = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#+\s+/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.+?)`/g, '$1')
      .replace(/^\s*[-•*]\s+/gm, '• ')
      .trim();
  };

  // Download feasibility report as PDF
  const handleDownloadFeasibility = () => {
    if (!feasibilityData) return;

    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;

    // Helper function to wrap text
    const wrapText = (text, maxLength) => {
      if (!text) return [];
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
          if (currentLine) lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      });

      if (currentLine) lines.push(currentLine.trim());
      return lines;
    };

    // Check if new page is needed
    const checkNewPage = (neededHeight) => {
      if (yPosition + neededHeight > pageHeight - 10) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.setTextColor(8, 61, 68);
    doc.setFont(undefined, 'bold');
    doc.text('Project Feasibility Analysis Report', margin, yPosition);
    yPosition += 12;

    // Project name
    if (files[0]) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      const projectName = files[0].name.replace(/\.[^/.]+$/, '');
      doc.text(`Project: ${projectName}`, margin, yPosition);
      yPosition += 8;
    }

    // Date
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 10;

    // Overall Score Section
    doc.setFontSize(14);
    doc.setTextColor(8, 61, 68);
    doc.setFont(undefined, 'bold');
    doc.text('Overall Feasibility Score', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(36);
    doc.setTextColor(getScoreColor(feasibilityData.final_score));
    doc.setFont(undefined, 'bold');
    doc.text(`${feasibilityData.final_score}/100`, margin, yPosition);
    yPosition += 12;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text(`Status: ${getScoreStatus(feasibilityData.final_score)}`, margin, yPosition);
    yPosition += 12;

    // Sub-scores Section
    if (feasibilityData.sub_scores && Object.keys(feasibilityData.sub_scores).length > 0) {
      checkNewPage(50);
      
      doc.setFontSize(14);
      doc.setTextColor(8, 61, 68);
      doc.setFont(undefined, 'bold');
      doc.text('Dimension Scores', margin, yPosition);
      yPosition += 10;

      Object.entries(feasibilityData.sub_scores).forEach(([key, value]) => {
        checkNewPage(8);
        
        const displayKey = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`${displayKey}: ${value}/100`, margin, yPosition);
        yPosition += 8;
      });

      yPosition += 4;
    }

    // Explanation Section
    if (feasibilityData.explanation) {
      checkNewPage(40);
      
      doc.setFontSize(14);
      doc.setTextColor(8, 61, 68);
      doc.setFont(undefined, 'bold');
      doc.text('Analysis Summary', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      const explanationLines = wrapText(feasibilityData.explanation, 80);
      explanationLines.forEach(line => {
        checkNewPage(6);
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });

      yPosition += 6;
    }

    // Recommendations Section
    if (feasibilityData.recommendations && feasibilityData.recommendations.length > 0) {
      checkNewPage(30);
      
      doc.setFontSize(14);
      doc.setTextColor(8, 61, 68);
      doc.setFont(undefined, 'bold');
      doc.text('Recommendations', margin, yPosition);
      yPosition += 10;

      feasibilityData.recommendations.forEach(rec => {
        checkNewPage(8);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        const recLines = wrapText(rec, 80);
        
        // Add bullet point
        doc.text('•', margin, yPosition);
        
        recLines.forEach((line, idx) => {
          checkNewPage(6);
          doc.text(line, margin + 5, yPosition);
          yPosition += 6;
        });
      });

      yPosition += 4;
    }

    // Detailed Report Section
    if (feasibilityData.detailed_report) {
      checkNewPage(30);
      
      doc.setFontSize(14);
      doc.setTextColor(8, 61, 68);
      doc.setFont(undefined, 'bold');
      doc.text('Detailed Report', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      const reportLines = wrapText(feasibilityData.detailed_report, 80);
      reportLines.forEach(line => {
        checkNewPage(6);
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });
    }

    // Save the PDF
    const projectName = files[0] ? files[0].name.replace(/\.[^/.]+$/, '') : 'Feasibility_Report';
    doc.save(`${projectName}_Feasibility_Analysis.pdf`);
  };

  return (
    <div style={{ 
      marginLeft: '-30px',
      marginTop: '-5px', 
      padding: '10px',
      backgroundColor: '#ffffff',
      border: '3px solid #e5e7eb',
      borderRadius: '15px',
      minHeight: '90vh',
      fontFamily: 'Poppins, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'left', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700', 
            color: '#083d44',
            marginBottom: '16px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Project Feasibility Analysis
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#6b7280',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Analyze technical, resource, and skill feasibility of your project
          </p>
        </div>

        {/* Upload Section */}
        <div style={{
          backgroundColor: 'white',
          border: '2px solid rgba(16, 185, 129, 0.1)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '15px',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)',
          textAlign: 'center'
        }}>
          <div style={{
            border: '2px dashed rgba(16, 185, 129, 0.3)',
            borderRadius: '15px',
            padding: '40px',
            marginBottom: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.02)'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '16px',
              color: '#059669'
            }}>
              📊
            </div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '12px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Upload Research Document
            </h3>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '24px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Choose a PDF or DOCX file to analyze project feasibility
            </p>
            
            <input
              ref={folderInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFolderSelect}
              style={{ display: 'none' }}
              id="file-upload"
            />
            
            <label
              htmlFor="file-upload"
              style={{
                display: 'inline-block',
                backgroundColor: '#059669',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                fontFamily: 'Poppins, sans-serif',
                border: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#047857';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#059669';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Browse Files
            </label>
          </div>

          {selectedFolder && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{ 
                color: '#059669', 
                marginBottom: '12px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '600'
              }}>
                Selected File
              </h4>
              <p style={{ 
                color: '#374151', 
                marginBottom: '8px',
                fontFamily: 'Poppins, sans-serif'
              }}>
                📄 {files[0]?.name}
              </p>

              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button 
                  onClick={handleAnalyzeFeasibility}
                  disabled={isAnalyzing}
                  style={{ 
                    padding: '12px 24px', 
                    borderRadius: 10, 
                    background: '#059669', 
                    color: 'white',
                    border: 'none',
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    fontFamily: 'Poppins, sans-serif',
                    transition: 'all 0.2s ease',
                    opacity: isAnalyzing ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isAnalyzing) {
                      e.target.style.backgroundColor = '#047857';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAnalyzing) {
                      e.target.style.backgroundColor = '#059669';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze Feasibility'}
                </button>
              </div>
            </div>
          )}

          {selectedFolder && (
            <button
              onClick={handleReset}
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '0.9rem',
                fontWeight: '500',
                fontFamily: 'Poppins, sans-serif',
                cursor: 'pointer',
                marginTop: '15px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#059669';
                e.target.style.color = '#059669';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#6b7280';
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Loading Progress Bar */}
        {isAnalyzing && (
          <div ref={progressRef} style={{
            backgroundColor: 'white',
            border: '2px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
          }}>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#083d44',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              Analyzing Your Project...
            </h3>

            {/* Progress Bar */}
            <div style={{
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Progress
                </span>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#10b981',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  {currentProgress}%
                </span>
              </div>
              <div style={{
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '999px',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${currentProgress}%`,
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                }} />
              </div>
            </div>

            {/* Loading Stages */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h4 style={{
                fontSize: '0.95rem',
                fontWeight: '700',
                color: '#374151',
                marginBottom: '12px',
                marginTop: 0,
                fontFamily: 'Poppins, sans-serif'
              }}>
                Processing Steps
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {loadingStages.length > 0 ? (
                  loadingStages.map((stage, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.9rem',
                        color: '#374151',
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </span>
                      <span>{stage}</span>
                    </div>
                  ))
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.9rem',
                    color: '#9ca3af',
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid #d1d5db'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                    </span>
                    <span>Initializing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CSS Animation */}
            <style>{`
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.5;
                }
              }
            `}</style>
          </div>
        )}

        {/* Feasibility Display */}
        {feasibilityData && (
          <div ref={resultsRef} style={{
            backgroundColor: 'white',
            border: '2px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
          }}>
            {/* Header with Download Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#083d44',
                margin: 0,
                fontFamily: 'Poppins, sans-serif'
              }}>
                Feasibility Analysis Report
              </h2>
              <button
                onClick={handleDownloadFeasibility}
                style={{
                  padding: '10px 24px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#059669';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#10b981';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                📥 Download Report
              </button>
            </div>
            {/* Overall Score */}
            <div style={{
              textAlign: 'center',
              marginBottom: '40px',
              padding: '30px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              borderRadius: '15px'
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                color: '#6b7280',
                marginBottom: '20px',
                fontFamily: 'Poppins, sans-serif'
              }}>
                Overall Feasibility Score
              </h2>
              
              <div style={{
                position: 'relative',
                width: '200px',
                height: '200px',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Circular Progress */}
                <svg
                  width="200"
                  height="200"
                  style={{ position: 'absolute' }}
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke={getScoreColor(feasibilityData.final_score)}
                    strokeWidth="8"
                    strokeDasharray={`${(feasibilityData.final_score / 100) * 565} 565`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{
                    fontSize: '4rem',
                    fontWeight: 'bold',
                    color: getScoreColor(feasibilityData.final_score),
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    {feasibilityData.final_score}
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    color: '#6b7280',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: '600',
                    marginTop: '5px'
                  }}>
                    {getScoreStatus(feasibilityData.final_score)}
                  </div>
                </div>
              </div>

              <p style={{
                color: '#374151',
                fontSize: '1rem',
                lineHeight: '1.6',
                fontFamily: 'Poppins, sans-serif',
                marginTop: '20px'
              }}>
                {feasibilityData.explanation}
              </p>
            </div>

            {/* Sub-Scores Grid */}
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#083d44',
              marginBottom: '25px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Detailed Assessment
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {feasibilityData.sub_scores && Object.entries(feasibilityData.sub_scores).map(([key, score]) => (
                <div
                  key={key}
                  style={{
                    padding: '20px',
                    background: `linear-gradient(180deg, #ffffff 0%, ${getScoreColor(score)}08 100%)`,
                    border: `2px solid ${getScoreColor(score)}30`,
                    borderRadius: '15px',
                    boxShadow: `0 4px 15px ${getScoreColor(score)}15`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: '#083d44',
                      margin: 0,
                      fontFamily: 'Poppins, sans-serif',
                      textTransform: 'capitalize'
                    }}>
                      {key.replace(/_/g, ' ')}
                    </h4>
                    <span style={{
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      color: getScoreColor(score),
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      {score}
                    </span>
                  </div>

                  {/* Score Bar */}
                  <div style={{
                    height: '12px',
                    background: '#e5e7eb',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, score)}%`,
                      background: `linear-gradient(90deg, ${getScoreColor(score)}, ${getScoreColor(score)}cc)`,
                      borderRadius: '999px',
                      transition: 'width 1s ease',
                      boxShadow: `0 0 8px ${getScoreColor(score)}60`
                    }} />
                  </div>

                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: '500'
                  }}>
                    {getScoreStatus(score)}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {feasibilityData.recommendations && feasibilityData.recommendations.length > 0 && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #fbbf24',
                borderRadius: '15px',
                padding: '25px',
                marginBottom: '30px'
              }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#92400e',
                  marginBottom: '15px',
                  fontFamily: 'Poppins, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  💡 Recommendations
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  color: '#78350f',
                  fontFamily: 'Poppins, sans-serif',
                  lineHeight: '1.8'
                }}>
                  {feasibilityData.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '10px' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Report */}
            {feasibilityData.detailed_report && (
              <div style={{
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '15px',
                padding: '25px'
              }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '15px',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  📋 Detailed Analysis
                </h3>
                <div style={{
                  color: '#374151',
                  fontSize: '0.95rem',
                  lineHeight: '1.8',
                  fontFamily: 'Poppins, sans-serif',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
                  {/* Split report into sections for better formatting */}
                  {feasibilityData.detailed_report.split(/(?=^##|^###)/m).map((section, idx) => {
                    const headingMatch = section.match(/^(#+)\s+(.+?)(?:\n|$)/);
                    if (headingMatch) {
                      const level = headingMatch[1].length;
                      const heading = removeMarkdown(headingMatch[2]);
                      const content = section.replace(/^#+\s+.+?\n/, '').trim();
                      
                      return (
                        <div key={idx} style={{ marginBottom: '20px' }}>
                          {level === 2 && (
                            <h4 style={{
                              fontSize: '1.1rem',
                              fontWeight: '700',
                              color: '#059669',
                              margin: '15px 0 10px 0',
                              paddingBottom: '8px',
                              borderBottom: '2px solid #059669'
                            }}>
                              {heading}
                            </h4>
                          )}
                          {level === 3 && (
                            <h5 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: '#0891b2',
                              margin: '12px 0 8px 0'
                            }}>
                              {heading}
                            </h5>
                          )}
                          <div style={{
                            color: '#374151',
                            lineHeight: '1.8',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                          }}>
                            {content.split('\n').map((line, lineIdx) => {
                              // Format bullet points
                              const bulletMatch = line.match(/^[\s]*[-•]\s+(.+)$/);
                              if (bulletMatch) {
                                const cleanedBullet = removeMarkdown(bulletMatch[1]);
                                return (
                                  <div key={lineIdx} style={{ marginBottom: '8px', marginLeft: '20px' }}>
                                    <span style={{ color: '#059669', fontWeight: '600' }}>•</span> {cleanedBullet}
                                  </div>
                                );
                              }
                              // Skip empty lines and headings
                              if (!line.trim() || line.match(/^#+/)) return null;
                              // Regular text - clean markdown
                              const cleanedLine = removeMarkdown(line);
                              return (
                                <div key={lineIdx} style={{ marginBottom: '8px' }}>
                                  {cleanedLine}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else if (section.trim()) {
                      // Regular paragraph without heading
                      return (
                        <div key={idx} style={{ marginBottom: '15px', lineHeight: '1.8' }}>
                          {section.split('\n').map((line, lineIdx) => {
                            const bulletMatch = line.match(/^[\s]*[-•]\s+(.+)$/);
                            if (bulletMatch) {
                              const cleanedBullet = removeMarkdown(bulletMatch[1]);
                              return (
                                <div key={lineIdx} style={{ marginBottom: '8px', marginLeft: '20px' }}>
                                  <span style={{ color: '#059669', fontWeight: '600' }}>•</span> {cleanedBullet}
                                </div>
                              );
                            }
                            if (!line.trim()) return null;
                            const cleanedLine = removeMarkdown(line);
                            return (
                              <div key={lineIdx} style={{ marginBottom: '8px' }}>
                                {cleanedLine}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            top: '20px',
            background: '#0f172a',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
          role="status"
          aria-live="polite"
        >
          <span style={{ fontSize: '14px', fontWeight: 600 }}>✅ {toastMessage}</span>
          <button
            onClick={() => setShowToast(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}