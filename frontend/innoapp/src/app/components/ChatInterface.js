"use client";
import { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { callMcpTool, getToken, callMcpToolAndParseSSE } from '../../utils/mcp-client';

const createWelcomeMessage = () => ({
  id: `welcome-${Date.now()}`,
  text: "Hello! I'm your AI research assistant. How can I help you with your research today?",
  sender: 'ai',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const coerceUserId = (raw) => {
  if (raw === undefined || raw === null) return null;
  const num = Number(raw);
  if (Number.isFinite(num) && Number.isInteger(num) && num > 0) return String(num);
  return null;
};

const formatMessageText = (text, sender) => {
  if (sender !== 'ai') return text;
  
  let formatted = text;
  
  // Convert markdown headings
  formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Convert inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert bullet lists
  formatted = formatted.replace(/^\* (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Convert numbered lists
  formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Convert line breaks to paragraphs
  const paragraphs = formatted.split(/\n\n+/).map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<ol') || p.trim().startsWith('<li')) {
      return p;
    }
    return p.trim() ? `<p>${p.trim()}</p>` : '';
  }).filter(p => p);
  
  return paragraphs.join('\n');
};

export function ChatInterface({ onClose }) {
  const BUILT_IN_API_KEY = process.env.NEXT_PUBLIC_TEST_API_KEY || 'test-api-key';
  // Default to localhost backend for local development when env is not set
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const resolveUserId = () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id) return coerceUserId(parsed.id);
      return null;
    } catch (e) {
      return null;
    }
  };

  const fetchSessions = async () => {
    const token = getToken();
    if (!token) {
      setSessions([]);
      return;
    }
    try {
      const result = await callMcpTool('innoscope_get_chat_sessions', { token });
      setSessions(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Error fetching sessions', err);
      setSessions([]);
    }
  };

  const loadSession = async (sid) => {
    const token = getToken();
    if (!token) return;
    
    setSessionId(sid);
    setMessages([]);
    setActiveResult(null);
    setSummaryResult(null);
    setRoadmapResult(null);
    setFeasibilityResult(null);
    setGeneratingResult(null);
    setGeneratingProgress(0);
    setGeneratingMessage('');
    try {
      const result = await callMcpTool('innoscope_get_session_messages', {
        token,
        session_id: sid
      });
      const formatted = (result || []).map((m, idx) => ({
        id: m.id ?? `${sid}-${idx}`,
        sender: m.sender === 'assistant' ? 'ai' : m.sender,
        text: m.message || '',
        timestamp: m.created_at ? formatTimestamp(m.created_at) : '',
      }));
      setMessages(formatted.length ? formatted : [createWelcomeMessage()]);
      
      // Set extractedData from the loaded messages so buttons work
      if (formatted.length > 0) {
        const conversationText = formatted
          .map(m => `${m.sender === 'ai' ? 'Assistant' : 'User'}: ${m.text}`)
          .join('\n\n');
        
        setExtractedData({
          summary: conversationText,
          problem_statement: '',
          domain: '',
          goals: [],
          prerequisites: [],
          key_topics: [],
        });
      }
    } catch (err) {
      console.error('Error loading session messages', err);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([createWelcomeMessage()]);
    setActiveResult(null);
    setSummaryResult(null);
    setRoadmapResult(null);
    setFeasibilityResult(null);
    setGeneratingResult(null);
    setGeneratingProgress(0);
    setGeneratingMessage('');
    setRenameSessionId(null);
    setRenameValue('');
  };

  const deleteSession = async (sessionIdToDelete, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;
    
    // Remove session from local state
    setSessions(sessions.filter(s => s.id !== sessionIdToDelete));
    
    if (sessionId === sessionIdToDelete) {
      startNewChat();
    }
  };

  const startRenameSession = (session, e) => {
    e.stopPropagation();
    setRenameSessionId(session.id);
    setRenameValue(session.title || 'Untitled Chat');
  };

  const saveRenameSession = async (sessionIdToRename) => {
    if (!renameValue.trim()) return;
    
    // Update session in local state
    setSessions(sessions.map(s => 
      s.id === sessionIdToRename 
        ? { ...s, title: renameValue.trim() }
        : s
    ));
    
    setRenameSessionId(null);
    setRenameValue('');
  };

  const cancelRenameSession = () => {
    setRenameSessionId(null);
    setRenameValue('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending) return;

    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((m) => [...m, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      const token = getToken();
      const payload = {
        token,
        message: text,
        ...(sessionId && { session_id: sessionId })
      };

      const data = await callMcpTool('innoscope_send_chat_message', payload);

      if (!data) {
        setMessages((m) => [...m, { id: Date.now()+1, sender: 'ai', text: 'Sorry, no response received.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        return;
      }

      if (data?.session_id && !sessionId) setSessionId(data.session_id);
      fetchSessions();

      const reply = data?.reply || data?.message || 'No reply';
      setMessages((m) => [...m, { id: Date.now()+2, sender: 'ai', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

      // Check if chat is complete
      if (data?.is_complete) {
        setChatComplete(true);
        setExtractedData({
          summary: data.summary || '',
          problem_statement: data.problem_statement || '',
          domain: data.domain || '',
          goals: data.goals || [],
          prerequisites: data.prerequisites || [],
          key_topics: data.key_topics || [],
        });
      }
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now()+3, sender: 'ai', text: `Network error: ${err.message}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setSending(false);
    }
  };

  const latestAiMessage = () => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === 'ai' && messages[i].text) return messages[i].text;
    }
    return null;
  };

  const [chatComplete, setChatComplete] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);
  const [roadmapResult, setRoadmapResult] = useState(null);
  const [feasibilityResult, setFeasibilityResult] = useState(null);
  const [generatingResult, setGeneratingResult] = useState(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingMessage, setGeneratingMessage] = useState('');

  const generateSummary = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult('summary');
    try {
      const token = getToken();
      const result = await callMcpTool('innoscope_summarize_text', {
        token,
        text: extractedData.summary
      });
      setSummaryResult(result?.summary || 'No summary generated');
      setActiveResult('summary');
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Summary error:', error);
      setSummaryResult(`Error: ${error.message}`);
    } finally {
      setGeneratingResult(null);
    }
  };

  const generateRoadmap = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult('roadmap');
    setGeneratingProgress(0);
    setGeneratingMessage('');
    
    try {
      const token = getToken();
      const events = await callMcpToolAndParseSSE('generate_roadmap_from_summary', {
        token,
        summary: extractedData.summary
      });

      let result = null;
      events.forEach(event => {
        if (event.type === 'status') {
          setGeneratingProgress(event.data.progress || 0);
          setGeneratingMessage(event.data.message || '');
          console.log(`[Roadmap] ${event.data.stage || 'working'}: ${event.data.message} (${event.data.progress || 0}%)`);
        } else if (event.type === 'complete' || event.data?.status === 'success') {
          result = event.data;
        }
      });

      setRoadmapResult(result);
      setActiveResult('roadmap');
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Roadmap error:', error);
      setRoadmapResult({ error: error.message });
    } finally {
      setGeneratingResult(null);
    }
  };

  const generateFeasibility = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult('feasibility');
    setGeneratingProgress(0);
    setGeneratingMessage('');
    
    try {
      const token = getToken();
      const events = await callMcpToolAndParseSSE('generate_feasibility_from_summary', {
        token,
        summary: extractedData.summary
      });

      let result = null;
      events.forEach(event => {
        if (event.type === 'status') {
          setGeneratingProgress(event.data.progress || 0);
          setGeneratingMessage(event.data.message || '');
          console.log(`[Feasibility] ${event.data.stage || 'working'}: ${event.data.message} (${event.data.progress || 0}%)`);
        } else if (event.type === 'complete' || event.data?.status === 'success') {
          result = event.data;
        }
      });

      setFeasibilityResult(result);
      setActiveResult('feasibility');
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Feasibility error:', error);
      setFeasibilityResult({ error: error.message });
    } finally {
      setGeneratingResult(null);
    }
  };

  const parseMarkdown = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const elements = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) {
        elements.push({ type: 'space', key: `space-${i}` });
        continue;
      }
      
      if (trimmed.startsWith('# ')) {
        elements.push({ type: 'h1', content: trimmed.substring(2), key: `h1-${i}` });
      } else if (trimmed.startsWith('## ')) {
        elements.push({ type: 'h2', content: trimmed.substring(3), key: `h2-${i}` });
      } else if (trimmed.startsWith('### ')) {
        elements.push({ type: 'h3', content: trimmed.substring(4), key: `h3-${i}` });
      } else if (trimmed.match(/^\d+\.\s/)) {
        elements.push({ type: 'li', content: trimmed.replace(/^\d+\.\s/, ''), key: `li-${i}` });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push({ type: 'li', content: trimmed.substring(2), key: `li-${i}` });
      } else {
        elements.push({ type: 'p', content: trimmed, key: `p-${i}` });
      }
    }
    
    return elements;
  };

  const parseInlineMarkdown = (text) => {
    if (!text) return text;
    
    // Parse bold text (**text** or __text__)
    let parsed = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Parse italic text (*text* or _text_)
    parsed = parsed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    parsed = parsed.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Parse inline code
    parsed = parsed.replace(/`(.+?)`/g, '<code>$1</code>');
    
    return parsed;
  };

  const renderMarkdownElements = (elements, colorScheme = 'blue') => {
    const colorSchemes = {
      blue: {
        h1: '#1e40af',
        h2: '#1e40af',
        h3: '#0369a1',
        li: '#374151'
      },
      amber: {
        h1: '#b45309',
        h2: '#b45309',
        h3: '#d97706',
        li: '#78350f'
      }
    };
    const colors = colorSchemes[colorScheme] || colorSchemes.blue;
    
    return elements.map((el) => {
      const parsedContent = parseInlineMarkdown(el.content);
      
      switch (el.type) {
        case 'h1':
          return (
            <h1 key={el.key} style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.h1,
              marginTop: '24px',
              marginBottom: '12px',
              letterSpacing: '-0.01em'
            }}>
              <span dangerouslySetInnerHTML={{ __html: parsedContent }} />
            </h1>
          );
        case 'h2':
          return (
            <h2 key={el.key} style={{
              fontSize: '20px',
              fontWeight: '700',
              color: colors.h2,
              marginTop: '20px',
              marginBottom: '10px',
              letterSpacing: '-0.01em'
            }}>
              <span dangerouslySetInnerHTML={{ __html: parsedContent }} />
            </h2>
          );
        case 'h3':
          return (
            <h3 key={el.key} style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.h3,
              marginTop: '16px',
              marginBottom: '8px',
              letterSpacing: '-0.005em'
            }}>
              <span dangerouslySetInnerHTML={{ __html: parsedContent }} />
            </h3>
          );
        case 'li':
          return (
            <div key={el.key} style={{
              marginLeft: '24px',
              marginBottom: '8px',
              fontSize: '15px',
              lineHeight: '1.6',
              color: colors.li,
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              <span style={{ marginRight: '8px', fontWeight: '600' }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: parsedContent }} />
            </div>
          );
        case 'p':
          return (
            <p key={el.key} style={{
              marginBottom: '12px',
              fontSize: '15px',
              lineHeight: '1.7',
              color: '#374151'
            }}>
              <span dangerouslySetInnerHTML={{ __html: parsedContent }} />
            </p>
          );
        case 'space':
          return <div key={el.key} style={{ height: '8px' }} />;
        default:
          return null;
      }
    });
  };

  const formatRoadmap = (roadmapData) => {
    if (!roadmapData) return null;
    
    let roadmapText = '';
    let message = '';
    
    if (typeof roadmapData === 'string') {
      roadmapText = roadmapData;
    } else if (typeof roadmapData === 'object') {
      roadmapText = roadmapData.roadmap || '';
      message = roadmapData.message || '';
    }
    
    const elements = parseMarkdown(roadmapText);
    
    return (
      <div style={{ padding: '4px 0' }}>
        {message && (
          <p style={{ color: '#059669', marginBottom: '16px', fontWeight: '500', fontSize: '14px' }}>
            {message}
          </p>
        )}
        {renderMarkdownElements(elements, 'blue')}
      </div>
    );
  };

  const generateFeasibilityPDF = (feasibilityData) => {
    if (!feasibilityData) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - (2 * margin);

      // Helper function to add text with auto line breaking
      const addWrappedText = (text, x, y, fontSize = 11, color = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * fontSize * 0.35) + 3;
      };

      // Title
      doc.setFontSize(20);
      doc.setTextColor(180, 83, 9);
      doc.text('FEASIBILITY ANALYSIS REPORT', margin, yPosition);
      yPosition += 12;

      // Separator line
      doc.setDrawColor(180, 83, 9);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Date
      yPosition = addWrappedText(
        `Generated: ${new Date().toLocaleString()}`,
        margin,
        yPosition,
        10,
        [107, 114, 128]
      );
      yPosition += 5;

      // Score Section
      if (feasibilityData.final_score || feasibilityData.feasibility_score) {
        const score = feasibilityData.final_score || feasibilityData.feasibility_score;
        
        // Score box background
        doc.setFillColor(236, 253, 245);
        doc.rect(margin, yPosition, maxWidth, 20, 'F');
        doc.setDrawColor(134, 239, 172);
        doc.rect(margin, yPosition, maxWidth, 20);

        doc.setFontSize(11);
        doc.setTextColor(4, 120, 87);
        doc.text('FEASIBILITY SCORE:', margin + 5, yPosition + 7);

        doc.setFontSize(24);
        doc.setTextColor(5, 150, 105);
        doc.text(`${score}%`, margin + 5, yPosition + 17);

        yPosition += 28;
      }

      // Sub-scores Section
      if (feasibilityData.sub_scores) {
        doc.setFontSize(13);
        doc.setTextColor(180, 83, 9);
        doc.text('SUB-SCORES:', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);

        const scores = Object.entries(feasibilityData.sub_scores);
        const scoresPerRow = 2;

        for (let i = 0; i < scores.length; i += scoresPerRow) {
          const rowItems = scores.slice(i, Math.min(i + scoresPerRow, scores.length));
          const itemWidth = (maxWidth - 5) / scoresPerRow;

          rowItems.forEach((item, idx) => {
            const [key, value] = item;
            const scoreValue = typeof value === 'object' ? value.score : value;
            const label = key.replace(/_/g, ' ').toUpperCase();
            const xPos = margin + idx * (itemWidth + 5);

            // Box
            doc.setFillColor(249, 250, 251);
            doc.rect(xPos, yPosition, itemWidth, 20, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.rect(xPos, yPosition, itemWidth, 20);

            // Label
            doc.setFontSize(9);
            doc.setTextColor(55, 65, 81);
            const labelLines = doc.splitTextToSize(label, itemWidth - 2);
            doc.text(labelLines, xPos + 2, yPosition + 4);

            // Score
            doc.setFontSize(12);
            doc.setTextColor(5, 150, 105);
            doc.text(`${scoreValue}%`, xPos + 2, yPosition + 14);
          });

          yPosition += 25;
        }

        yPosition += 3;
      }

      // Detailed Analysis Section
      if (feasibilityData.detailed_report || feasibilityData.explanation || feasibilityData.assessment) {
        const report = feasibilityData.detailed_report || feasibilityData.explanation || feasibilityData.assessment;

        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(180, 83, 9);
        doc.text('DETAILED ANALYSIS:', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);

        const analysisLines = doc.splitTextToSize(report, maxWidth);
        analysisLines.forEach((line) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });

        yPosition += 5;
      }

      // Recommendations Section
      if (feasibilityData.recommendations && feasibilityData.recommendations.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(180, 83, 9);
        doc.text('RECOMMENDATIONS:', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);

        feasibilityData.recommendations.forEach((rec, idx) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }

          // Bullet point
          doc.setTextColor(180, 83, 9);
          doc.text(`${idx + 1}.`, margin, yPosition);

          // Recommendation text
          doc.setTextColor(55, 65, 81);
          const recLines = doc.splitTextToSize(rec, maxWidth - 5);
          doc.text(recLines, margin + 5, yPosition);
          yPosition += recLines.length * 5 + 3;
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Download
      doc.save(`feasibility-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
  };

  const formatFeasibility = (feasibilityData) => {
    if (!feasibilityData) return null;
    
    
    let reportText = '';
    let score = null;
    let subScores = null;
    let recommendations = [];
    let message = '';
    
    if (typeof feasibilityData === 'string') {
      reportText = feasibilityData;
    } else if (typeof feasibilityData === 'object') {
      score = feasibilityData.final_score || feasibilityData.feasibility_score;
      subScores = feasibilityData.sub_scores;
      recommendations = feasibilityData.recommendations || [];
      message = feasibilityData.message || '';
      reportText = feasibilityData.detailed_report || feasibilityData.explanation || feasibilityData.assessment || feasibilityData.feasibility_assessment || '';
    }
    
    const elements = parseMarkdown(reportText);
    
    return (
      <div style={{ padding: '4px 0' }}>
        {message && (
          <p style={{ color: '#059669', marginBottom: '16px', fontWeight: '500', fontSize: '14px' }}>
            {message}
          </p>
        )}
        
        {score && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#ecfdf5',
            borderRadius: '8px',
            border: '2px solid #86efac',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#047857', fontSize: '13px', marginBottom: '4px' }}>FEASIBILITY SCORE</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#059669' }}>
                {score}
                <span style={{ fontSize: '20px', marginLeft: '4px' }}>%</span>
              </div>
            </div>
          </div>
        )}
        
        {subScores && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#b45309', marginBottom: '12px' }}>Sub-Scores:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.entries(subScores).map(([key, value]) => {
                const scoreValue = typeof value === 'object' ? value.score : value;
                const scoreColor = scoreValue >= 75 ? '#059669' : scoreValue >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={key} style={{
                    padding: '10px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: scoreColor }}>
                      {scoreValue}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {reportText && (
          <div style={{ marginBottom: '20px' }}>
            {renderMarkdownElements(elements, 'amber')}
          </div>
        )}
        
        {recommendations && recommendations.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#b45309', marginBottom: '12px' }}>Recommendations:</h3>
            <div>
              {recommendations.map((rec, idx) => (
                <div key={idx} style={{
                  marginBottom: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '6px',
                  borderLeft: '4px solid #f59e0b',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#78350f'
                }}>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-overlay">
      <div className="chat-container">
        {/* Sidebar */}
        <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Chat History ({sessions.length})</h3>
            <button className="new-chat-btn" onClick={startNewChat} type="button">+ New Chat</button>
          </div>
          <div className="sessions-list">
            {sessions.length === 0 ? (
              <div className="session-item" style={{ cursor: 'default' }}>
                <div className="session-info">
                  <div className="session-title">No chat sessions yet.</div>
                  <div className="session-date">Start a new conversation to see it here.</div>
                </div>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id}>
                  {renameSessionId === session.id ? (
                    <div 
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: '#f0fdf4',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameSession(session.id);
                          if (e.key === 'Escape') cancelRenameSession();
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontFamily: 'inherit'
                        }}
                      />
                      <button
                        onClick={() => saveRenameSession(session.id)}
                        title="Save"
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelRenameSession}
                        title="Cancel"
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`session-item ${sessionId === session.id ? 'active' : ''}`}
                      onClick={() => loadSession(session.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div className="session-icon">💬</div>
                        <div className="session-info" style={{ minWidth: 0 }}>
                          <div className="session-title">{session.title || 'Untitled Chat'}</div>
                          <div className="session-date">{formatTimestamp(session.created_at)}</div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginLeft: '8px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => startRenameSession(session, e)}
                          title="Rename session"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: 'transparent',
                            color: '#6b7280',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#f3f4f6';
                            e.target.style.color = '#374151';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#6b7280';
                          }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          title="Delete session"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: 'transparent',
                            color: '#6b7280',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#fee2e2';
                            e.target.style.color = '#dc2626';
                            e.target.style.borderColor = '#fca5a5';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#6b7280';
                            e.target.style.borderColor = '#d1d5db';
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="chat-main">
          <div className="chat-header">
            <div>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.3s ease',
                  color: '#4b5563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  hover: { backgroundColor: '#f3f4f6' }
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ☰
              </button>
              <h2>AI Research Assistant</h2>
            </div>
            <button 
              onClick={onClose}
              title="Close chat"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px',
                transition: 'all 0.3s ease',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#fee2e2';
                e.target.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#6b7280';
              }}
            >
              ✖
            </button>
          </div>

          <div className="messages-area" ref={listRef}>
            {messages.map(message => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div 
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: formatMessageText(message.text, message.sender) }}
                />
                <div className="message-time">{message.timestamp}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons - Show if user has sent 2+ messages */}
          {messages.filter(m => m.sender === 'user').length >= 2 && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderTop: '1px solid #dcfce7',
              flexWrap: 'wrap'
            }} data-result-panel>
              <button
                onClick={generateSummary}
                disabled={generatingResult === 'summary'}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === 'summary' ? '#10b981' : '#e0f2fe',
                  color: activeResult === 'summary' ? 'white' : '#0369a1',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
              >
                {generatingResult === 'summary' ? 'Generating...' : '📄 Summary'}
              </button>
              <button
                onClick={generateRoadmap}
                disabled={generatingResult === 'roadmap'}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === 'roadmap' ? '#3b82f6' : '#f0f9ff',
                  color: activeResult === 'roadmap' ? 'white' : '#0c4a6e',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {generatingResult === 'roadmap' && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${generatingProgress}%`,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    transition: 'width 0.3s'
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {generatingResult === 'roadmap' ? `Generating... ${generatingProgress}%` : '🗺️ Roadmap'}
                </span>
              </button>
              <button
                onClick={generateFeasibility}
                disabled={generatingResult === 'feasibility'}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === 'feasibility' ? '#f59e0b' : '#fef3c7',
                  color: activeResult === 'feasibility' ? 'white' : '#92400e',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {generatingResult === 'feasibility' && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${generatingProgress}%`,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    transition: 'width 0.3s'
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {generatingResult === 'feasibility' ? `Analyzing... ${generatingProgress}%` : '✓ Feasibility'}
                </span>
              </button>
            </div>
          )}

          {/* Progress Message - Show while generating */}
          {generatingResult && generatingMessage && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#e0f2fe',
              borderLeft: '4px solid #0369a1',
              marginBottom: '12px',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#0c4a6e',
              fontWeight: '500',
              opacity: 0.9
            }}>
              ⏳ {generatingMessage}
            </div>
          )}

          {/* Results Panel */}
          {activeResult && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              maxHeight: '600px',
              overflowY: 'auto',
              position: 'relative'
            }} data-result-panel>
              {/* Close Button */}
              <button
                onClick={() => setActiveResult(null)}
                title="Close panel"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#fee2e2';
                  e.target.style.color = '#dc2626';
                  e.target.style.borderColor = '#fca5a5';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                ✕
              </button>

              {activeResult === 'summary' && summaryResult && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', paddingRight: '40px' }}>Summary</h3>
                  <p style={{ color: '#475569', lineHeight: '1.6' }}>{summaryResult}</p>
                </div>
              )}
              {activeResult === 'roadmap' && roadmapResult && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e40af', paddingRight: '40px' }}>🗺️ Implementation Roadmap</h3>
                  {formatRoadmap(roadmapResult)}
                </div>
              )}
              {activeResult === 'feasibility' && feasibilityResult && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#92400e', margin: 0, paddingRight: '40px' }}>✓ Feasibility Analysis</h3>
                    <button
                      onClick={() => generateFeasibilityPDF(feasibilityResult)}
                      title="Download report as PDF"
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#d97706';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#f59e0b';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ⬇ Download
                    </button>
                  </div>
                  {formatFeasibility(feasibilityResult)}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your research question..."
                className="chat-input"
                disabled={sending}
              />
              <button type="submit" className="send-btn" disabled={sending || !inputValue.trim()}>{sending ? 'Sending...' : 'Send'}</button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}