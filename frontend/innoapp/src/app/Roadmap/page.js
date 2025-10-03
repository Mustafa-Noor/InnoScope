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
      setSelectedFolder('Selected Files');
      setFiles(selectedFiles);
      
      // Filter to show only relevant file types (document/report files)
      const relevantFiles = selectedFiles.filter(file => {
        const extension = file.name.toLowerCase().split('.').pop();
        return ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'md', 'rtf', 'odt', 'xlsx', 'xls'].includes(extension);
      });
      
      setFiles(relevantFiles);
    }
  };

  // Handle generate roadmap
  const handleGenerateRoadmap = async () => {
    if (!selectedFolder || files.length === 0) {
      alert('Please select some files first');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate roadmap generation (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock roadmap data
      const mockRoadmap = {
        projectName: selectedFolder,
        phases: [
          {
            id: 1,
            name: 'Project Setup & Planning',
            duration: '1-2 weeks',
            tasks: ['Environment setup', 'Dependencies installation', 'Project structure analysis']
          },
          {
            id: 2,
            name: 'Core Development',
            duration: '4-6 weeks',
            tasks: ['Implement core features', 'Database integration', 'API development']
          },
          {
            id: 3,
            name: 'Testing & Optimization',
            duration: '2-3 weeks',
            tasks: ['Unit testing', 'Integration testing', 'Performance optimization']
          },
          {
            id: 4,
            name: 'Deployment & Documentation',
            duration: '1-2 weeks',
            tasks: ['Production deployment', 'Documentation', 'User guide creation']
          }
        ]
      };
      
      setRoadmapData(mockRoadmap);
    } catch (error) {
      console.error('Error generating roadmap:', error);
      alert('Error generating roadmap. Please try again.');
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
            Upload your project folder to generate an intelligent development roadmap
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
              Choose PDF, DOCX, or other document files for your project
            </p>
            
            <input
              ref={folderInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.rtf,.odt,.xlsx,.xls"
              multiple
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
                Generate Roadmap
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
              Development Roadmap for {roadmapData.projectName}
            </h2>

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

                {/* Arrows Between Cards */}
                {/* Mini Timeline */}
                <div 
                  className="mini-timeline"
                  style={{
                    position: 'absolute',
                    top: '450px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '12px 20px',
                    borderRadius: '25px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {roadmapData.phases.map((phase, index) => {
                    const phaseColors = ['#059669', '#0891b2', '#7c3aed', '#dc2626'];
                    
                    return (
                      <React.Fragment key={`timeline-${index}`}>
                        {/* Timeline Dot */}
                        <div
                          className={`timeline-dot dot-${index}`}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: phaseColors[index],
                            border: '2px solid white',
                            boxShadow: `0 2px 8px ${phaseColors[index]}40`,
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
                              width: '24px',
                              height: '2px',
                              background: `linear-gradient(90deg, ${phaseColors[index]}, ${phaseColors[index + 1]})`,
                              borderRadius: '1px',
                              opacity: 0.6
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
                      marginLeft: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    {roadmapData.phases.length} Phase{roadmapData.phases.length !== 1 ? 's' : ''}
                  </div>
                </div>
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
          transform: translateX(-50%) translateY(-2px);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
        }

        /* Responsive Timeline */
        @media (max-width: 999px) and (min-width: 600px) {
          [class*="phase-card-"] {
            margin-bottom: 50px;
          }

          .mini-timeline {
            top: 220px;
            padding: 10px 16px;
          }

          .timeline-dot {
            width: 10px;
            height: 10px;
          }
        }

        /* Mobile Timeline */
        @media (max-width: 599px) {
          [class*="phase-card-"] {
            width: 280px;
            margin-bottom: 60px;
          }

          .mini-timeline {
            top: 230px;
            padding: 8px 14px;
            gap: 6px;
          }

          .timeline-dot {
            width: 8px;
            height: 8px;
          }

          .progress-text {
            font-size: 10px;
            margin-left: 8px;
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
