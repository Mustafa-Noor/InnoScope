/**
 * MCP Client Utility
 * Handles all JSON-RPC 2.0 calls to MCP gateway
 */

export const getMcpUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL;
};

export const getToken = () => {
  try {
    // Check if we're in browser
    if (typeof window === 'undefined') {
      return null;
    }
    const stored = localStorage.getItem('token');
    console.log('[MCP] getToken() returned:', stored ? 'token found' : 'NO TOKEN');
    return stored || null;
  } catch (e) {
    console.error('[MCP] getToken() error:', e);
    return null;
  }
};

let messageId = 1;

export const callMcpTool = async (toolName, args) => {
  try {
    const url = getMcpUrl();
    console.log(`[MCP] Calling tool: ${toolName} at ${url}`);
    console.log(`[MCP] Args:`, args);
    
    // Check if any argument is a File object
    let hasFile = false;
    for (const key in args) {
      if (args[key] instanceof File) {
        hasFile = true;
        break;
      }
    }

    let res;
    
    if (hasFile) {
      // Use FormData for file uploads
      console.log('[MCP] Detected File object, using FormData');
      const formData = new FormData();
      
      // Add the JSON-RPC request as text
      const payload = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        },
        id: messageId++
      };
      formData.append('jsonrpc', JSON.stringify(payload));
      
      // Add file objects
      for (const key in args) {
        if (args[key] instanceof File) {
          formData.append(key, args[key]);
        }
      }
      
      res = await fetch(url, {
        method: 'POST',
        body: formData
        // Don't set Content-Type - browser will set it with boundary
      });
    } else {
      // Use JSON for non-file calls
      const payload = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        },
        id: messageId++
      };
      
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    console.log(`[MCP] Response status: ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[MCP] Error response:`, errorText);
      throw new Error(`MCP error: ${res.status} ${res.statusText} - ${errorText.substring(0, 100)}`);
    }
    
    const data = await res.json();
    console.log(`[MCP] Full response:`, data);
    
    if (data.error) {
      throw new Error(data.error.message || 'MCP error');
    }
    
    let result = data.result;
    
    // Handle nested response structure where result is in content[0].text as JSON string
    if (result?.content && Array.isArray(result.content) && result.content[0]?.text) {
      try {
        const textContent = result.content[0].text;
        const parsed = JSON.parse(textContent);
        console.log(`[MCP] Parsed text content:`, parsed);
        result = parsed;
      } catch (e) {
        console.log(`[MCP] Could not parse text content as JSON, using as-is`);
      }
    }
    
    console.log(`[MCP] Extracted result:`, result);
    return result;
  } catch (err) {
    console.error(`MCP call failed for ${toolName}:`, err);
    throw err;
  }
};

export const parseSSEEvents = (sseText) => {
  const events = [];
  const lines = sseText.split('\n');
  
  let currentEvent = null;
  let currentData = '';
  
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) {
      // Empty line marks end of event
      if (currentEvent && currentData) {
        try {
          currentData = JSON.parse(currentData);
        } catch (e) {
          console.error(`[MCP] Failed to parse data for event "${currentEvent}":`, e);
          // Keep as string if not valid JSON
        }
        console.log(`[MCP] Parsed event "${currentEvent}":`, currentData);
        events.push({
          type: currentEvent,
          data: currentData
        });
      }
      currentEvent = null;
      currentData = '';
      continue;
    }
    
    if (line.startsWith('event:')) {
      // If we had a previous event, save it first
      if (currentEvent && currentData) {
        try {
          currentData = JSON.parse(currentData);
        } catch (e) {
          console.error(`[MCP] Failed to parse data for event "${currentEvent}":`, e);
          // Keep as string if not valid JSON
        }
        console.log(`[MCP] Parsed event "${currentEvent}":`, currentData);
        events.push({
          type: currentEvent,
          data: currentData
        });
      }
      currentEvent = line.replace('event:', '').trim();
      currentData = '';
    } else if (line.startsWith('data:')) {
      const dataValue = line.replace('data:', '').trim();
      if (currentData) {
        currentData += '\n' + dataValue;
      } else {
        currentData = dataValue;
      }
    }
  }
  
  // Don't forget the last event if file doesn't end with empty line
  if (currentEvent && currentData) {
    try {
      currentData = JSON.parse(currentData);
    } catch (e) {
      console.error(`[MCP] Failed to parse data for event "${currentEvent}":`, e);
      // Keep as string if not valid JSON
    }
    console.log(`[MCP] Parsed event "${currentEvent}":`, currentData);
    events.push({
      type: currentEvent,
      data: currentData
    });
  }
  
  console.log(`[MCP] Total events parsed:`, events.length);
  return events;
};

/**
 * Helper to call streaming tools and parse SSE from response
 */
export const callMcpToolAndParseSSE = async (toolName, args) => {
  const result = await callMcpTool(toolName, args);
  
  console.log(`[MCP] callMcpToolAndParseSSE result:`, result);
  
  // SSE text could be in different places depending on the response structure
  let sseText = null;
  
  // Check if result is already the SSE text (for streaming responses)
  if (typeof result === 'string' && result.startsWith('event:')) {
    sseText = result;
  }
  // Check if SSE text is in result.content[0].text
  else if (result?.content?.[0]?.text) {
    sseText = result.content[0].text;
  }
  // Check if result object directly has SSE data (already parsed)
  else if (typeof result === 'object' && (result.roadmap || result.status || result.message)) {
    // Convert object back to SSE format for parsing
    const events = [];
    if (result.status === 'success' || result.roadmap) {
      events.push({
        type: 'complete',
        data: result
      });
    }
    console.log(`[MCP] Converted result object to events:`, events);
    return events;
  }
  
  if (!sseText) {
    console.warn(`[MCP] No SSE text found in result`);
    return [];
  }
  
  return parseSSEEvents(sseText);
};
