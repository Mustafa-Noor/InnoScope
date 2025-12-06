'use client';
import React, { useState, useRef, useEffect } from 'react'
import jsPDF from 'jspdf';
// Normalize API base and remove any trailing slashes to avoid double-slash URLs
const API_BASE_RAW = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE = (API_BASE_RAW || '').toString().replace(/\/+$/g, '');

export default function RoadmapPage() {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmapData, setRoadmapData] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState([]); // streaming status messages
  const [streamProgress, setStreamProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [feasibilityData, setFeasibilityData] = useState(null);
  const [isAnalyzingFeasibility, setIsAnalyzingFeasibility] = useState(false);
  const [loadingStages, setLoadingStages] = useState([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const folderInputRef = useRef(null);
  const progressRef = useRef(null);
  const resultsRef = useRef(null);
  const showThinkingBox = isStreaming || isGenerating || statusUpdates.length > 0;

  // Auto-generate roadmap when redirected from chat interface
  useEffect(() => {
    const generateRoadmap = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isAutoGenerate = urlParams.get('auto') === 'true';
      
      if (isAutoGenerate) {
        const pdfDataUrl = sessionStorage.getItem('roadmap_pdf');
        const filename = sessionStorage.getItem('roadmap_filename') || 'roadmap_summary.pdf';
        
        if (pdfDataUrl) {
          try {
            // Convert data URL back to Blob
            const response = await fetch(pdfDataUrl);
            const blob = await response.blob();
            
            // Create File object
            const file = new File([blob], filename, { type: 'application/pdf' });
            
            // Clear the sessionStorage
            sessionStorage.removeItem('roadmap_pdf');
            sessionStorage.removeItem('roadmap_filename');
            
            // Set the file and trigger generation
            setSelectedFolder(file.name);
            setFiles([file]);
            
            // Trigger generation after a brief delay to ensure state updates
            setTimeout(() => {
              generateRoadmapWithFile(file);
            }, 100);
          } catch (error) {
            console.error('Error retrieving PDF from session:', error);
            alert('Error preparing roadmap. Please try again.');
          }
        }
      }
    };
    
    generateRoadmap();
  }, []);

  // Auto-scroll to progress during generation
  useEffect(() => {
    if ((isGenerating || isStreaming || statusUpdates.length > 0) && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [statusUpdates, streamProgress, isGenerating, isStreaming]);

  // Auto-scroll to results when generation completes
  useEffect(() => {
    if (roadmapData && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [roadmapData]);

  // Function to generate roadmap with a file (used by auto-generate)
  const generateRoadmapWithFile = async (fileToProcess) => {
    setIsGenerating(true);
    setIsStreaming(true);
    setStatusUpdates([{ message: 'Starting upload to server...', progress: 0 }]);
    setStreamProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', fileToProcess);
      
      const response = await fetch(`${API_BASE}/roadmap/generate-stream`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || !response.body) {
        console.log('Response not ok:', response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      const pushStatus = (msg, prog) => {
        setStatusUpdates((prev) => [...prev, { message: msg, progress: prog }]);
        if (typeof prog === 'number') setStreamProgress(prog);
      };

      const handleComplete = (payload) => {
        if (!payload) return;
        finalResult = payload;
      };

      const processChunk = (textChunk) => {
        buffer += textChunk;
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        parts.forEach((part) => {
          if (!part.trim()) return;
          let eventType = 'message';
          let dataLine = '';
          part.split('\n').forEach((line) => {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataLine += line.replace('data:', '').trim();
            }
          });
          if (!dataLine) return;
          let dataObj = null;
          try {
            dataObj = JSON.parse(dataLine);
          } catch (e) {
            console.warn('Could not parse SSE data', dataLine);
            return;
          }
          if (eventType === 'status') {
            pushStatus(dataObj.message || 'Working...', dataObj.progress);
          } else if (eventType === 'error') {
            pushStatus(dataObj.error || 'Error', undefined);
          } else if (eventType === 'complete') {
            handleComplete(dataObj);
          }
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(value, { stream: true });
        processChunk(textChunk);
      }

      if (buffer.trim()) {
        processChunk('\n\n');
      }

      if (!finalResult) {
        throw new Error('Streaming finished without a complete event');
      }

      if (!finalResult.success) {
        alert(finalResult.message || 'Failed to generate roadmap');
        return;
      }

      const parsedPhases = parseRoadmapText(finalResult.roadmap || '');

      parsedPhases.forEach((phase) => {
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
          phase.duration = taskCount > 6 ? '6-10 weeks' : taskCount > 3 ? '3-6 weeks' : '2-4 weeks';
        }
      });

      // Create the final roadmap data structure
      const roadmapDataObj = {
        projectName: fileToProcess.name.replace(/\.[^/.]+$/, ''),
        phases: parsedPhases,
        summary: finalResult.refined_summary || finalResult.initial_summary || ''
      };

      setRoadmapData(roadmapDataObj);
      setShowSummary(false);
      setToastMessage('Roadmap generated successfully');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } catch (err) {
      console.error('Error generating roadmap:', err);
      setStatusUpdates((prev) => [...prev, { message: `Error: ${err.message || 'Unknown issue'}`, progress: undefined }]);
      
      if (err.message.includes('Failed to fetch')) {
        alert('Cannot connect to the backend server. Please ensure the backend is running on http://localhost:8000');
      } else if (err.message.includes('HTTP error')) {
        alert(`Server error: ${err.message}. Please check the file format and try again.`);
      } else {
        alert('Error generating roadmap. Please try again.');
      }
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
    }
  };

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

    const firstFile = files[0];
    
    const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!supportedTypes.includes(firstFile.type) && !firstFile.name.toLowerCase().endsWith('.pdf') && !firstFile.name.toLowerCase().endsWith('.docx')) {
      alert('Please select a PDF or DOCX file for roadmap generation.');
      return;
    }

    await generateRoadmapWithFile(firstFile);
  };

  // Handle summarization (calls backend if available, otherwise sets fallback)
  const handleSummarize = async () => {
    if (!selectedFolder || files.length === 0) {
      alert('Please select a file first');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const res = await fetch(`${API_BASE}/roadmap/summarize`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        // fallback: try to call same generate endpoint and use its summary
        const fallback = await fetch(`${API_BASE}/roadmap/generate`, { method: 'POST', body: formData });
        const fbData = await fallback.json().catch(() => ({}));
        if (fallback.ok && fbData.summary) {
          setRoadmapData((d) => ({ ...(d || {}), summary: fbData.summary }));
        } else {
          alert('Summarization not available on server.');
        }
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data?.summary) {
        setRoadmapData((d) => ({ ...(d || {}), summary: data.summary }));
        setShowSummary(true);
      } else if (data?.text) {
        setRoadmapData((d) => ({ ...(d || {}), summary: data.text }));
        setShowSummary(true);
      } else {
        alert('No summary returned');
      }
    } catch (e) {
      console.error(e);
      alert('Error while summarizing.');
    } finally {
      setIsGenerating(false);
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

  // Parse markdown and convert to HTML
  const formatReportText = (text) => {
    if (!text) return '';
    
    let html = text
      // Headings
      .replace(/^### (.+?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+?)$/gm, '<h1>$1</h1>')
      // Bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^\- (.+?)$/gm, '<li>$1</li>')
      // Code blocks
      .replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Line breaks and paragraphs
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    
    return html;
  };

  // Clean text for PDF (remove markdown)
  const cleanTextForPdf = (text) => {
    if (!text) return '';
    return text
      .replace(/^### (.+?)$/gm, '$1')
      .replace(/^## (.+?)$/gm, '$1')
      .replace(/^# (.+?)$/gm, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^\- /gm, '• ')
      .replace(/```(.+?)```/gs, '$1')
      .replace(/`(.+?)`/g, '$1')
      .trim();
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

  // Handle Feasibility Analysis with Streaming (matches feasibility page)
  const handleAnalyzeFeasibility = async () => {
    if (!selectedFolder || files.length === 0) {
      alert('Please select a file first');
      return;
    }

    setIsAnalyzingFeasibility(true);
    setLoadingStages([]);
    setCurrentProgress(0);
    setFeasibilityData(null);

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const res = await fetch(`${API_BASE}/feasibility/generate-stream`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('event:')) {
            const eventType = line.replace('event:', '').trim();
            if (i + 1 < lines.length && lines[i + 1].startsWith('data:')) {
              const dataStr = lines[i + 1].replace('data:', '').trim();
              try {
                const data = JSON.parse(dataStr);
                if (eventType === 'status') {
                  if (data.message) {
                    setLoadingStages((prev) => [...prev, data.message]);
                  }
                  if (typeof data.progress === 'number') {
                    setCurrentProgress(data.progress);
                  }
                } else if (eventType === 'complete') {
                  finalData = data;
                }
              } catch (e) {
                console.warn('Could not parse SSE data', dataStr);
              }
            }
          }
        }
        buffer = lines[lines.length - 1];
      }

      if (!finalData) {
        throw new Error('No data received from server');
      }

      setFeasibilityData(finalData);
      setToastMessage('✅ Feasibility analysis complete!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error analyzing feasibility:', error);
      alert('Error analyzing feasibility: ' + error.message);
    } finally {
      setIsAnalyzingFeasibility(false);
    }
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

    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`${feasibilityData.final_score}/100`, margin, yPosition);
    yPosition += 10;

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

    // Detailed Report Section
    if (feasibilityData.detailed_report) {
      checkNewPage(30);
      yPosition += 10;
      
      doc.setFontSize(14);
      doc.setTextColor(8, 61, 68);
      doc.setFont(undefined, 'bold');
      doc.text('Detailed Analysis', margin, yPosition);
      yPosition += 10;

      // Split by headings and format appropriately
      const cleanedReport = cleanTextForPdf(feasibilityData.detailed_report);
      const sections = cleanedReport.split(/(?=^##|^###)/m);

      sections.forEach(section => {
        if (!section.trim()) return;

        // Check if it's a heading
        const headingMatch = section.match(/^#+\s+(.+)/);
        if (headingMatch) {
          checkNewPage(12);
          doc.setFontSize(12);
          doc.setTextColor(8, 61, 68);
          doc.setFont(undefined, 'bold');
          doc.text(headingMatch[1].trim(), margin, yPosition);
          yPosition += 8;

          const content = section.replace(/^#+\s+.+\n/, '').trim();
          if (content) {
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            const lines = doc.splitTextToSize(content, maxWidth);
            lines.forEach(line => {
              checkNewPage(6);
              doc.text(line, margin, yPosition);
              yPosition += 6;
            });
            yPosition += 2;
          }
        } else {
          checkNewPage(6);
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
          const lines = doc.splitTextToSize(section.trim(), maxWidth);
          lines.forEach(line => {
            checkNewPage(6);
            doc.text(line, margin, yPosition);
            yPosition += 6;
          });
          yPosition += 3;
        }
      });
    }

    // Save the PDF
    const projectName = files[0] ? files[0].name.replace(/\.[^/.]+$/, '') : 'Feasibility_Report';
    doc.save(`${projectName}_Feasibility_Analysis.pdf`);
  };

  // Handle feasibility analysis
  const handleFeasibility = async () => {
    if (!selectedFolder || files.length === 0) {
      alert('Please select a file first');
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const res = await fetch(`${API_BASE}/feasibility/generate`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data) {
        // Transform the response to match our FeasibilityData structure
        const transformedData = {
          final_score: data.feasibility_score || 50,
          sub_scores: data.feasibility_sub_scores || {},
          explanation: `This project has a feasibility score of ${data.feasibility_score}/100.`,
          recommendations: [],
          detailed_report: data.feasibility_report || 'No detailed report available.'
        };
        
        setFeasibilityData(transformedData);
        setToastMessage('Feasibility analysis completed');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      } else {
        alert('Feasibility analysis failed. Please try again.');
      }
    } catch (e) {
      console.error(e);
      alert('Error analyzing feasibility.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset function
  const handleReset = () => {
    setSelectedFolder(null);
    setFiles([]);
    setRoadmapData(null);
    setStatusUpdates([]);
    setStreamProgress(0);
    setIsStreaming(false);
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

                {/* ACTIONS: show Summarize / Roadmap / Feasibility only after file selected */}
                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button onClick={handleSummarize} className="btn" style={{ padding: '10px 16px', borderRadius: 10, background: '#f1f5f9' }}>Summarize</button>
                  <button onClick={handleGenerateRoadmap} className="btn btn-success" style={{ padding: '10px 16px', borderRadius: 10, background: '#059669', color: 'white' }}>Generate Roadmap</button>
                  <button onClick={handleAnalyzeFeasibility} className="btn" style={{ padding: '10px 16px', borderRadius: 10, background: '#eef2ff' }} disabled={isAnalyzingFeasibility}>Feasibility</button>
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

          {/* Thinking / status box below the main button */}
          {showThinkingBox && (
            <div ref={progressRef} style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Generating roadmap...</span>
                <span style={{ fontSize: '12px', color: '#475569' }}>{Math.min(100, Math.max(0, streamProgress || 0))}%</span>
              </div>
              <div style={{
                height: '6px',
                background: '#e2e8f0',
                borderRadius: '999px',
                marginTop: 8,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, streamProgress || 0))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                  transition: 'width 200ms ease'
                }} />
              </div>
              <div style={{ marginTop: 10, maxHeight: 120, overflowY: 'auto', fontSize: '13px', color: '#0f172a' }}>
                {statusUpdates.map((s, idx) => (
                  <div key={`${s.message}-${idx}`} style={{ marginBottom: 6 }}>
                    • {s.message} {typeof s.progress === 'number' ? `(${s.progress}%)` : ''}
                  </div>
                ))}
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

        {/* Roadmap Display */}
        {roadmapData && (
          <div ref={resultsRef} style={{
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

            {/* Research Summary (only shown when user requests it) */}
            {roadmapData?.summary && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button
                  onClick={() => setShowSummary((s) => !s)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(16,185,129,0.12)',
                    background: showSummary ? '#059669' : '#f1f5f9',
                    color: showSummary ? 'white' : '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  {showSummary ? 'Hide Summary' : 'View Summary'}
                </button>
              </div>
            )}

            {showSummary && roadmapData?.summary && (
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

        {/* Feasibility Loading Progress Display */}
        {isAnalyzingFeasibility && (
          <div style={{
            backgroundColor: 'white',
            border: '2px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)',
            marginTop: '30px'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#083d44',
              margin: '0 0 30px 0',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Analyzing Feasibility...
            </h2>

            {/* Progress Bar */}
            <div style={{
              marginBottom: '30px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
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
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#059669',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  {currentProgress}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '999px',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  width: `${currentProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 8px rgba(5, 150, 105, 0.6)'
                }} />
              </div>
            </div>

            {/* Processing Steps */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '15px',
                fontFamily: 'Poppins, sans-serif'
              }}>
                Processing Steps:
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {loadingStages.map((stage, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.9rem',
                    color: '#374151',
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.8rem'
                    }}>
                      ✓
                    </div>
                    <span>{stage}</span>
                  </div>
                ))}
                {currentProgress < 100 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    fontFamily: 'Poppins, sans-serif',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px solid #059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#059669',
                        animation: 'spin 1s linear infinite'
                      }} />
                    </div>
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feasibility Display */}
        {feasibilityData && (
          <div style={{
            backgroundColor: 'white',
            border: '2px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)',
            marginTop: '30px'
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
                <svg width="200" height="200" style={{ position: 'absolute' }}>
                  <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="8" />
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
                  />
                </svg>
                {/* Score Text */}
                <div style={{ zIndex: 2, textAlign: 'center' }}>
                  <div style={{
                    fontSize: '3.5rem',
                    fontWeight: '700',
                    color: getScoreColor(feasibilityData.final_score),
                    lineHeight: '1'
                  }}>
                    {feasibilityData.final_score}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '5px' }}>
                    / 100
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: getScoreColor(feasibilityData.final_score),
                marginTop: '15px'
              }}>
                {getScoreStatus(feasibilityData.final_score)}
              </div>
            </div>

            {/* Sub-scores Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {feasibilityData.sub_scores && Object.entries(feasibilityData.sub_scores).map(([key, score]) => (
                <div key={key} style={{
                  backgroundColor: 'white',
                  border: `2px solid ${getScoreColor(score)}30`,
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  boxShadow: `0 4px 15px ${getScoreColor(score)}15`,
                  background: `linear-gradient(180deg, #ffffff 0%, ${getScoreColor(score)}08 100%)`
                }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 15px 0',
                    fontFamily: 'Poppins, sans-serif',
                    textTransform: 'capitalize'
                  }}>
                    {key.replace(/_/g, ' ')}
                  </h4>
                  
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: getScoreColor(score),
                    marginBottom: '12px'
                  }}>
                    {score}
                  </div>

                  <div style={{
                    width: '100%',
                    height: '12px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`
                  }}>
                    <div style={{
                      width: `${Math.min(100, score)}%`,
                      height: '100%',
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

      {/* Toast notification for completion */}
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
