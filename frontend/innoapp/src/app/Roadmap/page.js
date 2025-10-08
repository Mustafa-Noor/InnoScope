'use client';
import React, { useState, useRef } from 'react'

export default function RoadmapPage() {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmapData, setRoadmapData] = useState(null);
  const folderInputRef = useRef(null);

  // Handle file selection
  const handleFolderSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    if (selectedFiles.length > 0) {
      const firstFile = selectedFiles[0];
      setSelectedFolder(firstFile.name);
      
      // Filter to show only PDF and DOCX files (supported by backend)
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

  // Parse roadmap text into structured phases
  const parseRoadmapText = (roadmapText) => {
    const phases = [];
    const lines = roadmapText.split('\n').filter(line => line.trim());
    
    let currentPhase = null;
    let phaseCounter = 1;
    let currentObjective = '';
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check for main numbered sections (1. Prototype Development, 2. Testing & Validation, etc.)
      const mainSectionMatch = trimmedLine.match(/^### (\d+)\.\s*(.+)$/);
      if (mainSectionMatch) {
        // Save previous phase if exists
        if (currentPhase) {
          phases.push(currentPhase);
        }
        
        // Start new phase
        const phaseName = mainSectionMatch[2];
        currentPhase = {
          id: phaseCounter++,
          name: phaseName,
          duration: 'To be determined',
          tasks: [],
          objective: ''
        };
        currentObjective = '';
        return;
      }
      
      // Check for objectives
      if (trimmedLine.startsWith('**Objective:**')) {
        const objective = trimmedLine.replace('**Objective:**', '').trim();
        if (currentPhase) {
          currentPhase.objective = objective;
          currentObjective = objective;
        }
        return;
      }
      
      // Check for action items with specific format (Action 1a, Action 2b, etc.)
      const actionMatch = trimmedLine.match(/^\*\s+\*Action \d+[a-z]:\*\s*(.+)$/);
      if (actionMatch && currentPhase) {
        const actionDescription = actionMatch[1];
        currentPhase.tasks.push(actionDescription);
        return;
      }
      
      // Check for general bullet points with actions
      const bulletMatch = trimmedLine.match(/^\*\s+(.+)$/);
      if (bulletMatch && currentPhase && !trimmedLine.includes('Action')) {
        const task = bulletMatch[1];
        // Only add meaningful tasks (longer than 15 characters and not just formatting)
        if (task.length > 15 && !task.match(/^(Objective|Goal|Target):/)) {
          currentPhase.tasks.push(task);
        }
        return;
      }
      
      // Check for sub-bullet points (nested actions)
      const subBulletMatch = trimmedLine.match(/^\s+\*\s+\*(.+?):\*\s*(.+)$/);
      if (subBulletMatch && currentPhase) {
        const actionTitle = subBulletMatch[1];
        const actionDesc = subBulletMatch[2];
        currentPhase.tasks.push(`${actionTitle}: ${actionDesc}`);
        return;
      }
      
      // Fallback: check for any meaningful content that might be a task
      if (currentPhase && trimmedLine.length > 20 && 
          !trimmedLine.startsWith('**') && 
          !trimmedLine.startsWith('---') &&
          !trimmedLine.startsWith('#') &&
          !trimmedLine.match(/^(As an expert|This roadmap|Objective)/)) {
        
        // Clean up the task text
        let cleanTask = trimmedLine.replace(/^\*+\s*/, '').replace(/\*\*/g, '');
        if (cleanTask.length > 15) {
          currentPhase.tasks.push(cleanTask);
        }
      }
    });
    
    // Add the last phase
    if (currentPhase) {
      phases.push(currentPhase);
    }
    
    // If no phases were found with the specific format, try a simpler approach
    if (phases.length === 0) {
      const simpleSections = roadmapText.split(/\n\n###?\s*\d+\.?\s*/);
      simpleSections.forEach((section, index) => {
        if (section.trim() && index > 0) {
          const lines = section.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            const title = lines[0].trim().replace(/\*+/g, '').replace(/#+/g, '');
            const tasks = lines.slice(1).filter(line => line.trim().length > 15).map(line => 
              line.trim().replace(/^\*+\s*/, '').replace(/\*\*/g, '')
            );
            
            phases.push({
              id: index,
              name: title || `Phase ${index}`,
              duration: 'To be determined',
              tasks: tasks.slice(0, 8) // Limit to 8 tasks per phase for UI
            });
          }
        }
      });
    }
    
    return phases;
  };

  // Handle generate roadmap
  const handleGenerateRoadmap = async () => {
    if (!selectedFolder || files.length === 0) {
      alert('Please select some files first');
      return;
    }

    // Only process the first file for now (can be extended later)
    const firstFile = files[0];
    
    // Check if it's a supported file type
    const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!supportedTypes.includes(firstFile.type) && !firstFile.name.toLowerCase().endsWith('.pdf') && !firstFile.name.toLowerCase().endsWith('.docx')) {
      alert('Please select a PDF or DOCX file for roadmap generation.');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', firstFile);
      
      // Call backend API
      const response = await fetch('http://localhost:8000/roadmap/generate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        alert(result.message || 'Failed to generate roadmap');
        return;
      }
      
      // Parse the roadmap text into structured phases
      const parsedPhases = parseRoadmapText(result.roadmap);
      
      // Add estimated durations based on phase content
      parsedPhases.forEach((phase, index) => {
        // Estimate duration based on phase type and complexity
        const taskCount = phase.tasks.length;
        const phaseName = phase.name.toLowerCase();
        
        if (phaseName.includes('prototype') || phaseName.includes('development')) {
          phase.duration = taskCount > 5 ? '6-8 weeks' : '4-6 weeks';
        } else if (phaseName.includes('testing') || phaseName.includes('validation')) {
          phase.duration = taskCount > 4 ? '4-6 weeks' : '2-4 weeks';
        } else if (phaseName.includes('funding') || phaseName.includes('grant')) {
          phase.duration = '3-6 months';
        } else if (phaseName.includes('manufacturing') || phaseName.includes('implementation')) {
          phase.duration = '8-12 weeks';
        } else if (phaseName.includes('marketing') || phaseName.includes('promotion')) {
          phase.duration = '6-10 weeks';
        } else if (phaseName.includes('launch') || phaseName.includes('deployment')) {
          phase.duration = '4-8 weeks';
        } else if (phaseName.includes('maintenance') || phaseName.includes('iteration')) {
          phase.duration = 'Ongoing';
        } else if (phaseName.includes('scaling') || phaseName.includes('expansion')) {
          phase.duration = '6-12 months';
        } else {
          // Default estimation based on task complexity
          phase.duration = taskCount > 6 ? '6-10 weeks' : taskCount > 3 ? '3-6 weeks' : '2-4 weeks';
        }
      });
      
      // If no phases were parsed, create a fallback
      if (parsedPhases.length === 0) {
        parsedPhases.push({
          id: 1,
          name: 'Research Implementation',
          duration: 'To be determined',
          tasks: ['Review the generated roadmap text', 'Plan implementation strategy', 'Begin development'],
          objective: 'Transform research findings into actionable implementation plan'
        });
      }
      
      const roadmapData = {
        projectName: firstFile.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        phases: parsedPhases,
        summary: result.summary
      };
      
      setRoadmapData(roadmapData);
      
    } catch (error) {
      console.error('Error generating roadmap:', error);
      
      // Show more specific error messages
      if (error.message.includes('Failed to fetch')) {
        alert('Cannot connect to the backend server. Please ensure the backend is running on http://localhost:8000');
      } else if (error.message.includes('HTTP error')) {
        alert(`Server error: ${error.message}. Please check the file format and try again.`);
      } else {
        alert('Error generating roadmap. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset function
  const handleReset = () => {
    setSelectedFolder(null);
    setFiles([]);
    setRoadmapData(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
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
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'left', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '500', 
            color: '#083d44',
            marginBottom: '16px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Your Roadmap
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#6b7280',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Upload a research paper to generate an intelligent implementation roadmap
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
              �
            </div>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '12px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Select Project Files
            </h3>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '24px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Choose a research paper (PDF or DOCX) to generate an implementation roadmap
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

          {/* Selected Files Info */}
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
                Selected Files
              </h4>
              <p style={{ 
                color: '#374151', 
                marginBottom: '8px',
                fontFamily: 'Poppins, sans-serif'
              }}>
                Found {files.length} relevant files
              </p>
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto',
                textAlign: 'left'
              }}>
                {files.slice(0, 10).map((file, index) => (
                  <div key={index} style={{ 
                    padding: '4px 0',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    📄 {file.name}
                  </div>
                ))}
                {files.length > 10 && (
                  <div style={{ 
                    padding: '4px 0',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    ... and {files.length - 10} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generate Roadmap Button */}
          <button
            onClick={handleGenerateRoadmap}
            disabled={!selectedFolder || isGenerating}
            style={{
              backgroundColor: selectedFolder && !isGenerating ? '#059669' : '#d1d5db',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '15px',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              fontFamily: 'Poppins, sans-serif',
              cursor: selectedFolder && !isGenerating ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              if (selectedFolder && !isGenerating) {
                e.target.style.backgroundColor = '#047857';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFolder && !isGenerating) {
                e.target.style.backgroundColor = '#059669';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {isGenerating ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Generating Roadmap...
              </>
            ) : (
              <>
                Generate Implementation Roadmap
              </>
            )}
          </button>

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

        {/* Roadmap Display */}
        {roadmapData && (
          <div style={{
            backgroundColor: 'white',
            border: '2px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#083d44',
              marginBottom: '20px',
              fontFamily: 'Poppins, sans-serif',
              textAlign: 'center'
            }}>
              Implementation Roadmap for {roadmapData.projectName}
            </h2>

            {/* Research Summary */}
            {roadmapData.summary && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '30px'
              }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#0c4a6e',
                  marginBottom: '12px',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Research Summary
                </h3>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#1e40af',
                  lineHeight: '1.6',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  {roadmapData.summary}
                </p>
              </div>
            )}

            {/* Roadmap with Arrows */}
            <div style={{ 
              marginTop: '40px',
              position: 'relative',
              padding: '40px 20px'
            }}>

              {/* Phase Cards Container */}
              <div 
                className="phase-cards-container"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '20px',
                  position: 'relative',
                  zIndex: 2,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  maxWidth: `${Math.min(roadmapData.phases.length * 240, 1200)}px`,
                  margin: '0 auto'
                }}
              >
                {roadmapData.phases.map((phase, index) => {
                  // Dynamic icon generation based on phase type or index
                  const getPhaseIcon = (phaseIndex, phaseName) => {
                    const defaultIcons = ['🚀', '📋', '⚙️', '🎯', '🔧', '📊', '🌟', '✅'];
                    const iconMap = {
                      'setup': '🚀', 'planning': '📋', 'development': '⚙️', 'testing': '🔧',
                      'deployment': '🎯', 'analysis': '📊', 'optimization': '🌟', 'completion': '✅'
                    };
                    
                    // Try to match by phase name keywords
                    const nameKey = Object.keys(iconMap).find(key => 
                      phaseName.toLowerCase().includes(key)
                    );
                    
                    return nameKey ? iconMap[nameKey] : defaultIcons[phaseIndex % defaultIcons.length];
                  };

                  // Dynamic color generation
                  const generatePhaseColors = (totalPhases) => {
                    const baseColors = [
                      '#059669', '#0891b2', '#7c3aed', '#dc2626', '#f59e0b', 
                      '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316'
                    ];
                    const colors = [];
                    for (let i = 0; i < totalPhases; i++) {
                      colors.push(baseColors[i % baseColors.length]);
                    }
                    return colors;
                  };

                  const generatePhaseGradients = (colors) => {
                    return colors.map(color => {
                      // Generate complementary gradient colors
                      const gradientMap = {
                        '#059669': 'linear-gradient(135deg, #059669, #10b981)',
                        '#0891b2': 'linear-gradient(135deg, #0891b2, #06b6d4)',
                        '#7c3aed': 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        '#dc2626': 'linear-gradient(135deg, #dc2626, #ef4444)',
                        '#f59e0b': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                        '#10b981': 'linear-gradient(135deg, #10b981, #34d399)',
                        '#3b82f6': 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                        '#8b5cf6': 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        '#ef4444': 'linear-gradient(135deg, #ef4444, #f87171)',
                        '#f97316': 'linear-gradient(135deg, #f97316, #fb923c)'
                      };
                      return gradientMap[color] || `linear-gradient(135deg, ${color}, ${color}90)`;
                    });
                  };

                  const phaseColors = generatePhaseColors(roadmapData.phases.length);
                  const phaseGradients = generatePhaseGradients(phaseColors);
                  const phaseIcon = getPhaseIcon(index, phase.name);
                  
                  return (
                    <div 
                      key={phase.id} 
                      className={`phase-card-${index}`}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        flexWrap:'wrap',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        const detailCard = e.currentTarget.querySelector('.detail-card');
                        if (detailCard) {
                          detailCard.style.opacity = '1';
                          detailCard.style.transform = 'translateY(0) scale(1)';
                          detailCard.style.pointerEvents = 'auto';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const detailCard = e.currentTarget.querySelector('.detail-card');
                        if (detailCard) {
                          detailCard.style.opacity = '0';
                          detailCard.style.transform = 'translateY(-20px) scale(0.95)';
                          detailCard.style.pointerEvents = 'none';
                        }
                      }}
                    >
                      {/* Main Phase Card - Equal Size */}
                      <div style={{
                        backgroundColor: 'white',
                        border: `2px solid ${phaseColors[index]}30`,
                        borderRadius: '20px',
                        padding: '20px 15px',
                        textAlign: 'center',
                        boxShadow: `0 4px 20px ${phaseColors[index]}20`,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        zIndex: 3,
                        height: '160px',
                        width: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {/* Phase Icon */}
                        <div style={{
                          width: '60px',
                          height: '60px',
                          background: phaseGradients[index],
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          margin: '0 auto 15px',
                          boxShadow: `0 4px 15px ${phaseColors[index]}40`,
                          border: '3px solid white'
                        }}>
                          {phaseIcon}
                        </div>

                        {/* Phase Number */}
                        <div style={{
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#9ca3af',
                          fontFamily: 'Poppins, sans-serif',
                          marginBottom: '5px'
                        }}>
                          Phase {index + 1}
                        </div>

                        {/* Phase Title */}
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          color: phaseColors[index],
                          margin: '0',
                          fontFamily: 'Poppins, sans-serif',
                          lineHeight: '1.3'
                        }}>
                          {phase.name}
                        </h3>
                      </div>

                      {/* Hover Indicator - Outside the card */}
                      <div style={{
                        textAlign: 'center',
                        marginTop: '8px',
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        fontFamily: 'Poppins, sans-serif',
                        fontStyle: 'italic'
                      }}>
                        hover for details
                      </div>

                      {/* Timeline Connection Point */}
                      <div style={{
                        marginTop: '15px',
                        width: '16px',
                        height: '16px',
                        backgroundColor: phaseColors[index],
                        borderRadius: '50%',
                        border: '3px solid white',
                        boxShadow: `0 2px 8px ${phaseColors[index]}50`,
                        zIndex: 4,
                        position: 'relative'
                      }}></div>



                      {/* Detailed Hover Card */}
                      <div 
                        className="detail-card"
                        style={{
                          position: 'absolute',
                          top: '-250px',
                          left: '50%',
                          transform: 'translateX(-50%) translateY(-20px) scale(0.95)',
                          width: '350px',
                          backgroundColor: 'white',
                          border: `2px solid ${phaseColors[index]}30`,
                          borderRadius: '20px',
                          padding: '25px',
                          boxShadow: `0 10px 40px ${phaseColors[index]}30`,
                          opacity: '0',
                          pointerEvents: 'none',
                          transition: 'all 0.3s ease',
                          zIndex: 10,
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}
                      >
                        {/* Detail Header */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            background: phaseGradients[index],
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            margin: '0 auto 15px',
                            boxShadow: `0 4px 15px ${phaseColors[index]}40`
                          }}>
                            {phaseIcon}
                          </div>
                          <h4 style={{
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            color: phaseColors[index],
                            margin: '0 0 5px 0',
                            fontFamily: 'Poppins, sans-serif'
                          }}>
                            Phase {index + 1}
                          </h4>
                          <h5 style={{
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: '#374151',
                            margin: '0',
                            fontFamily: 'Poppins, sans-serif'
                          }}>
                            {phase.name}
                          </h5>
                        </div>

                        {/* Objective Section */}
                        {phase.objective && (
                          <div style={{ marginBottom: '20px' }}>
                            <h6 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: '#374151',
                              marginBottom: '10px',
                              fontFamily: 'Poppins, sans-serif'
                            }}>
                              Objective:
                            </h6>
                            <p style={{
                              fontSize: '0.85rem',
                              color: '#6b7280',
                              lineHeight: '1.5',
                              fontFamily: 'Poppins, sans-serif',
                              fontStyle: 'italic',
                              padding: '10px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              border: `1px solid ${phaseColors[index]}20`
                            }}>
                              {phase.objective}
                            </p>
                          </div>
                        )}

                        {/* Tasks List */}
                        <div style={{ marginBottom: '20px' }}>
                          <h6 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '15px',
                            fontFamily: 'Poppins, sans-serif'
                          }}>
                            Key Tasks:
                          </h6>
                          {phase.tasks.map((task, taskIndex) => (
                            <div key={taskIndex} style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '10px 0',
                              borderBottom: taskIndex === phase.tasks.length - 1 ? 'none' : '1px solid #f3f4f6'
                            }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: phaseColors[index],
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px',
                                fontSize: '0.7rem',
                                color: 'white'
                              }}>
                                ✓
                              </div>
                              <span style={{
                                fontSize: '0.9rem',
                                color: '#374151',
                                fontFamily: 'Poppins, sans-serif',
                                lineHeight: '1.4'
                              }}>
                                {task}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Phase Stats */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-around',
                          padding: '15px',
                          backgroundColor: `${phaseColors[index]}08`,
                          borderRadius: '12px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>⏱️</div>
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#6b7280',
                              fontFamily: 'Poppins, sans-serif'
                            }}>
                              {phase.duration}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>📋</div>
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#6b7280',
                              fontFamily: 'Poppins, sans-serif'
                            }}>
                              {phase.tasks.length} Tasks
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>🎯</div>
                            <div style={{
                              fontSize: '0.8rem',
                              color: phaseColors[index],
                              fontFamily: 'Poppins, sans-serif',
                              fontWeight: '600'
                            }}>
                              {index === 0 ? 'High' : index === 1 ? 'High' : index === 2 ? 'Medium' : 'Low'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}


              </div>
            </div>

            {/* Mini Timeline - Positioned at the bottom */}
            <div 
              className="mini-timeline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '16px 24px',
                borderRadius: '25px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginTop: '30px',
                maxWidth: 'fit-content',
                margin: '30px auto 0'
              }}
            >
              {roadmapData.phases.map((phase, index) => {
                const phaseColors = ['#059669', '#0891b2', '#7c3aed', '#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
                
                return (
                  <React.Fragment key={`timeline-${index}`}>
                    {/* Timeline Dot */}
                    <div
                      className={`timeline-dot dot-${index}`}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: phaseColors[index % phaseColors.length],
                        border: '3px solid white',
                        boxShadow: `0 2px 10px ${phaseColors[index % phaseColors.length]}50`,
                        animation: `timelinePulse 2s ease-in-out infinite ${index * 0.3}s`,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      title={`Phase ${index + 1}: ${phase.name}`}
                    />
                    
                    {/* Connection Line */}
                    {index < roadmapData.phases.length - 1 && (
                      <div
                        style={{
                          width: '32px',
                          height: '3px',
                          background: `linear-gradient(90deg, ${phaseColors[index % phaseColors.length]}, ${phaseColors[(index + 1) % phaseColors.length]})`,
                          borderRadius: '2px',
                          opacity: 0.7
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              
              {/* Progress Indicator */}
              <div
                className="progress-text"
                style={{
                  marginLeft: '16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                {roadmapData.phases.length} Phase{roadmapData.phases.length !== 1 ? 's' : ''} Complete
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fillProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        @keyframes fadeInUp {
          0% { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 4px 20px rgba(5, 150, 105, 0.3);
          }
          50% { 
            transform: scale(1.05); 
            box-shadow: 0 6px 25px rgba(5, 150, 105, 0.4);
          }
        }

        [class*="phase-card-"]:hover > div:first-child {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .detail-card {
          backdrop-filter: blur(10px);
        }

        .detail-card::-webkit-scrollbar {
          width: 6px;
        }

        .detail-card::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .detail-card::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .detail-card::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* Mini Timeline Animations */
        @keyframes timelinePulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.3);
            opacity: 0.8;
          }
        }

        @keyframes timelineGlow {
          0%, 100% { 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }
          50% { 
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
          }
        }

        /* Dynamic Phase Cards Layout */
        .phase-cards-container {
          transition: all 0.3s ease;
        }

        /* Auto-adjust for different numbers of phases */
        .phase-cards-container:has([class*="phase-card-"]:nth-child(5)) {
          max-width: 1400px;
        }

        .phase-cards-container:has([class*="phase-card-"]:nth-child(6)) {
          max-width: 1600px;
        }

        .phase-cards-container:has([class*="phase-card-"]:nth-child(n+7)) {
          max-width: 100%;
          gap: 15px;
        }

        /* Mini Timeline Styles */
        .mini-timeline {
          animation: timelineGlow 3s ease-in-out infinite;
        }
        
        .timeline-dot:hover {
          transform: scale(1.5) !important;
          animation: none !important;
          filter: brightness(1.2);
        }
        
        .mini-timeline:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
        }

        /* Responsive Timeline */
        @media (max-width: 999px) and (min-width: 600px) {
          [class*="phase-card-"] {
            margin-bottom: 30px;
          }

          .mini-timeline {
            padding: 12px 20px;
            margin-top: 25px;
          }

          .timeline-dot {
            width: 12px;
            height: 12px;
          }
        }

        /* Mobile Timeline */
        @media (max-width: 599px) {
          [class*="phase-card-"] {
            width: 280px;
            margin-bottom: 40px;
          }

          .mini-timeline {
            padding: 10px 16px;
            gap: 6px;
            margin-top: 20px;
          }

          .timeline-dot {
            width: 10px;
            height: 10px;
          }

          .progress-text {
            font-size: 11px;
            margin-left: 10px;
          }

          .detail-card {
            width: 300px !important;
            left: 50% !important;
            transform: translateX(-50%) translateY(-20px) scale(0.95) !important;
          }
        }

        @media (max-width: 480px) {
          [class*="phase-card-"] {
            width: 260px;
            margin-bottom: 50px;
          }

          .detail-card {
            width: 280px !important;
          }

          .detail-card {
            width: 280px !important;
          }
        }
      `}</style>
    </div>
  )
}
