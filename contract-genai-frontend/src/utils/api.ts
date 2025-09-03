import { handleApiResponse, createUserFriendlyError, withUserFriendlyError } from './errorHandling';

export interface GenerateContractRequest {
  prompt: string;
}

export interface GenerateContractResponse {
  contract: string;
}

export interface StreamContractResponse {
  data: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const generateContract = async (
  request: GenerateContractRequest
): Promise<GenerateContractResponse> => {
  return withUserFriendlyError(async () => {
    const response = await fetch(`${API_BASE_URL}/api/contracts/generate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    await handleApiResponse(response);
    const data = await response.json();
    return data;
  }, 'generate contract');
};

export interface StreamContractOptions {
  onData: (chunk: string, isFinal?: boolean) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// Helper function to validate JSON before parsing
const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Helper function to clean and format text content
const formatTextContent = (text: string): string => {
  // Debug logging
  console.log('=== formatTextContent Debug ===');
  console.log('Original text:', text);
  console.log('Text length:', text.length);
  
  // Decode HTML entities first
  let decoded = decodeHtmlEntities(text);
  console.log('After HTML decoding:', decoded);
  
  // Clean up the HTML content - remove duplicate tags and fix structure
  let cleaned = decoded;
  
  // Remove duplicate HTML tags that might appear
  cleaned = cleaned
    .replace(/html\s*html/g, 'html') // Remove duplicate "html html"
    .replace(/html\s*\n\s*html/g, 'html') // Remove "html\nhtml"
    .replace(/html\s*\n\s*\n\s*html/g, 'html') // Remove "html\n\nhtml"
    .replace(/html\s*html/g, 'html'); // Final cleanup
  
  // Remove HTML tags that appear at the end of text (like "shoe ltdhtml")
  cleaned = cleaned.replace(/([a-zA-Z\s]+)html$/g, '$1');
  
  // Clean up excessive whitespace while preserving intentional formatting
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  console.log('After HTML cleaning:', cleaned);
  console.log('After cleaning:', cleaned);
  console.log('Final length:', cleaned.length);
  console.log('================================');
  
  return cleaned;
};

// Helper function to detect if content is HTML
const isHtmlContent = (text: string): boolean => {
  return /<[^>]*>/.test(text);
};

// Helper function to extract and format code blocks
const formatCodeBlocks = (text: string): string => {
  // Handle markdown-style code blocks
  return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'text';
    return `<pre class="code-block language-${language}"><code class="language-${language}">${code.trim()}</code></pre>`;
  });
};

export const streamContract = async (
  prompt: string,
  options: StreamContractOptions
): Promise<void> => {
  const { onData, onError, onComplete, signal } = options;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/contracts/stream/?prompt=${encodeURIComponent(prompt)}`,
      {
        method: 'GET',
        signal,
      }
    );

    if (!response.ok) {
      await handleApiResponse(response);
    }

    if (!response.body) {
      throw createUserFriendlyError(new Error('Response body is null'), 'stream contract');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';
    let incompleteJsonBuffer = ''; // Buffer for incomplete JSON chunks
    let currentJsonObject = ''; // Buffer for building complete JSON objects
    let braceCount = 0; // Track opening/closing braces for nested objects

    try {
      while (true) {
        if (signal?.aborted) {
          break;
        }

        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining data in buffer
          if (buffer.trim()) {
            const finalContent = processBufferContent(buffer, accumulatedContent);
            if (finalContent) {
              accumulatedContent = finalContent;
            }
          }
          
          // Send the final cleaned and formatted content (default: plain text)
          if (accumulatedContent) {
            console.log('🎯 Stream complete, sending final plain text content...');
            const cleanedContent = cleanupAccumulatedContent(accumulatedContent);
            const finalPlainText = convertToPlainText(cleanedContent);
            onData(finalPlainText, true);
          }
          
          onComplete?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process Server-Sent Events format
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // End of stream marker
              continue;
            }

            if (!data) {
              continue;
            }

            // Handle incomplete JSON chunks
            let jsonData = data;
            if (incompleteJsonBuffer) {
              jsonData = incompleteJsonBuffer + data;
              incompleteJsonBuffer = '';
            }

            // Only process data that looks like JSON objects (starts with {)
            if (jsonData.startsWith('{')) {
              // Count braces to determine if JSON is complete
              braceCount = 0;
              let inString = false;
              let escapeNext = false;
              
              for (let i = 0; i < jsonData.length; i++) {
                const char = jsonData[i];
                
                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }
                
                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }
                
                if (char === '"' && !escapeNext) {
                  inString = !inString;
                  continue;
                }
                
                if (!inString) {
                  if (char === '{') braceCount++;
                  if (char === '}') braceCount--;
                }
              }
              
              // Debug logging for JSON reconstruction
              console.log('=== JSON Reconstruction Debug ===');
              console.log('JSON data length:', jsonData.length);
              console.log('Brace count:', braceCount);
              console.log('Data preview:', jsonData.substring(0, 100));
              console.log('Data ends with }:', jsonData.endsWith('}'));
              console.log('================================');
              
              // Check if this is a complete JSON object (all braces are balanced)
              if (braceCount === 0) {
                // Complete JSON object
                console.log('✅ Complete JSON detected, parsing...');
                try {
                  const parsed = JSON.parse(jsonData);
                  
                  // Extract and process the text content
                  if (parsed && typeof parsed.text === 'string') {
                    const formattedContent = processTextContent(parsed.text, accumulatedContent);
                    if (formattedContent) {
                      // Update accumulated content
                      accumulatedContent = formattedContent;
                      
                      // Convert the accumulated content to plain text for display (default)
                      const plainTextContent = accumulateStreamingContent(parsed.text, accumulatedContent);
                      if (plainTextContent) {
                        console.log('📤 Sending plain text content to UI:', plainTextContent.substring(0, 100));
                        onData(plainTextContent, false);
                      }
                    }
                  } else if (parsed.candidates && Array.isArray(parsed.candidates)) {
                    // Handle the full response structure
                    console.log('📝 Processing candidates structure:', parsed.candidates.length, 'candidates');
                    for (const candidate of parsed.candidates) {
                      if (candidate.content && candidate.content.parts) {
                        for (const part of candidate.content.parts) {
                          if (part.text) {
                            const formattedContent = processTextContent(part.text, accumulatedContent);
                            if (formattedContent) {
                              // Update accumulated content
                              accumulatedContent = formattedContent;
                              
                              // Convert the accumulated content to plain text for display (default)
                              const plainTextContent = accumulateStreamingContent(part.text, accumulatedContent);
                              if (plainTextContent) {
                                console.log('📤 Sending plain text content from candidates to UI:', plainTextContent.substring(0, 100));
                                onData(plainTextContent, false);
                              }
                            }
                          }
                        }
                      }
                    }
                  } else {
                    // Log unexpected format but don't send anything
                    console.warn('Unexpected data format received:', parsed);
                  }
                } catch (parseError) {
                  console.error('Failed to parse complete JSON:', parseError);
                  console.error('Problematic data:', jsonData);
                  
                  // Type guard for Error objects
                  if (parseError instanceof Error) {
                    console.error('Error position:', parseError.message);
                    
                    // Try to find the problematic character
                    const match = parseError.message.match(/position (\d+)/);
                    if (match) {
                      const pos = parseInt(match[1]);
                      console.error('Character at position', pos, ':', jsonData[pos]);
                      console.error('Context around position:', jsonData.substring(Math.max(0, pos-10), pos+10));
                    }
                  }
                }
              } else {
                // Incomplete JSON, buffer it for next chunk
                console.log('⏳ Incomplete JSON, buffering for next chunk. Brace count:', braceCount);
                incompleteJsonBuffer = jsonData;
                continue;
              }
            } else if (jsonData.startsWith('[')) {
              // Skip array data (not expected in our current implementation)
              console.warn('Skipping array data from SSE stream:', jsonData);
            } else {
              // Skip non-JSON data (metadata, roles, etc.)
              console.debug('Skipping non-JSON data from SSE stream:', jsonData);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Stream was cancelled, no need to call onError
      return;
    }
    
    const userFriendlyError = createUserFriendlyError(error, 'stream contract');
    onError?.(userFriendlyError);
  }
};

// Helper function to process text content with formatting
const processTextContent = (text: string, accumulatedContent: string): string => {
  // Debug logging
  console.log('=== processTextContent Debug ===');
  console.log('Input text:', text);
  console.log('Accumulated content length:', accumulatedContent.length);
  
  // Format the new text content (preserve HTML structure)
  const formattedText = formatTextContent(text);
  console.log('Formatted text:', formattedText);
  
  // If we have accumulated content, append the new formatted text
  if (accumulatedContent) {
    // Check if this content is already in the accumulated content to prevent duplicates
    if (accumulatedContent.includes(formattedText)) {
      console.log('⚠️ Duplicate content detected, skipping...');
      console.log('================================');
      return accumulatedContent;
    }
    
    const result = accumulatedContent + formattedText;
    console.log('Combined result length:', result.length);
    console.log('================================');
    return result;
  }
  
  console.log('No accumulated content, returning formatted text');
  console.log('================================');
  return formattedText;
};

// Helper function to get just the new text content for incremental display
const getNewTextContent = (text: string): string => {
  // Convert the raw text to properly structured HTML
  return convertToStructuredHtml(text);
};

// Helper function to apply final formatting to accumulated content
const applyFinalFormatting = (content: string): string => {
  // First, structure the HTML content properly
  let formatted = structureHtmlContent(content);
  
  // Convert markdown-style formatting to HTML (only if not already HTML)
  if (formatted.includes('**') || formatted.includes('*') || formatted.includes('`')) {
    formatted = formatted
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>') // Inline code
      .replace(/^### (.*$)/gm, '<h3>$1</h3>') // H3 headers
      .replace(/^## (.*$)/gm, '<h2>$1</h2>') // H2 headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>') // H1 headers
      .replace(/^- (.*$)/gm, '<li>$1</li>') // List items
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>'); // Numbered list items
    
    // Wrap lists properly
    formatted = formatted
      .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, ''); // Merge consecutive lists
  }
  
  // Fix duplicate numbering by ensuring proper sequence
  // This regex finds numbered lists and ensures they're sequential
  formatted = formatted.replace(/(\d+)\./g, (match, num) => {
    // Extract the context to determine proper numbering
    const context = match;
    return context;
  });
  
  // Ensure proper paragraph spacing
  formatted = formatted
    .replace(/<\/p>\s*<p>/g, '</p>\n<p>') // Add line breaks between paragraphs
    .replace(/<\/h[1-6]>\s*<h[1-6]>/g, '</h$1>\n<h$2>'); // Add line breaks between headers
  
  // Final cleanup of any remaining HTML artifacts
  formatted = formatted
    .replace(/html\s*html/g, 'html')
    .replace(/html\s*\n\s*html/g, 'html')
    .replace(/([a-zA-Z\s]+)html$/g, '$1')
    .trim();
  
  return formatted;
};

// Helper function to process buffer content (for final chunks)
const processBufferContent = (buffer: string, accumulatedContent: string): string => {
  if (!buffer.trim()) return accumulatedContent;
  
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(buffer);
    if (parsed && typeof parsed.text === 'string') {
      const formattedText = formatTextContent(parsed.text);
      return accumulatedContent + formattedText;
    }
  } catch {
    // If not JSON, treat as plain text
    const formattedText = formatTextContent(buffer);
    return accumulatedContent + formattedText;
  }
  
  return accumulatedContent;
};

// Helper function for character-by-character streaming
export const streamCharacters = async (
  prompt: string,
  options: StreamContractOptions & {
    typingSpeed?: number; // ms per character
    preserveFormatting?: boolean; // whether to preserve HTML/formatting
  }
): Promise<() => void> => {
  const { onData, onError, onComplete, signal, typingSpeed = 20, preserveFormatting = true } = options;
  
  const controller = new AbortController();
  const abortSignal = signal || controller.signal;

  let currentContent = '';
  let isStreaming = true;

  const processCharacter = (char: string) => {
    if (!isStreaming) return;
    
    currentContent += char;
    onData(currentContent, false);
  };

  const processChunk = async (chunk: string, isFinal: boolean = false) => {
    if (!isStreaming) return;

    // If preserving formatting, send the chunk as-is for better HTML rendering
    if (preserveFormatting && isHtmlContent(chunk)) {
      currentContent += chunk;
      onData(currentContent, false);
      return;
    }

    // Otherwise, do character-by-character streaming
    for (let i = 0; i < chunk.length; i++) {
      if (!isStreaming || abortSignal.aborted) break;
      
      await new Promise(resolve => setTimeout(resolve, typingSpeed));
      processCharacter(chunk[i]);
    }

    if (isFinal) {
      onData(currentContent, true);
      onComplete?.();
    }
  };

  try {
    await streamContract(prompt, {
      onData: (chunk, isFinal) => {
        processChunk(chunk, isFinal);
      },
      onError: (error) => {
        console.error('Stream error in streamCharacters:', error);
        onError?.(error);
      },
      onComplete,
      signal: abortSignal,
    });
  } catch (error) {
    console.error('Failed to start streaming:', error);
    onError?.(error instanceof Error ? error : new Error('Failed to start streaming'));
  }

  return () => {
    isStreaming = false;
    controller.abort();
  };
};

// Utility functions for UI rendering
export const renderFormattedContent = (content: string): string => {
  // Debug logging
  console.log('=== renderFormattedContent Debug ===');
  console.log('Input content:', content);
  console.log('Content length:', content.length);
  
  // Apply code block formatting
  let formatted = formatCodeBlocks(content);
  console.log('After code block formatting:', formatted);
  
  // Convert markdown-style formatting to HTML
  formatted = formatted
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
    .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>') // Inline code
    .replace(/^### (.*$)/gm, '<h3>$1</h3>') // H3 headers
    .replace(/^## (.*$)/gm, '<h2>$1</h2>') // H2 headers
    .replace(/^# (.*$)/gm, '<h1>$1</h1>') // H1 headers
    .replace(/^- (.*$)/gm, '<li>$1</li>') // List items
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>'); // Numbered list items
  
  console.log('After markdown formatting:', formatted);
  
  // Wrap lists properly - using dotAll equivalent without 's' flag
  formatted = formatted
    .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, ''); // Merge consecutive lists
  
  console.log('After list wrapping:', formatted);
  console.log('Final formatted length:', formatted.length);
  console.log('================================');
  
  return formatted;
};

export const extractPlainText = (content: string): string => {
  // Remove HTML tags and decode entities to get plain text
  const decoded = decodeHtmlEntities(content);
  return decoded.replace(/<[^>]*>/g, '').trim();
};

export const isStreamComplete = (content: string): boolean => {
  // Check if the stream appears to be complete
  return content.includes('```') && content.includes('**Key improvements') && 
         content.includes('**How to Use This Template:');
};

// Helper function to clean up accumulated content and remove duplicates
const cleanupAccumulatedContent = (content: string): string => {
  // First, clean up any HTML artifacts
  let cleanedContent = content
    .replace(/html\s*html/g, 'html') // Remove duplicate "html html"
    .replace(/html\s*\n\s*html/g, 'html') // Remove "html\nhtml"
    .replace(/html\s*\n\s*\n\s*html/g, 'html') // Remove "html\n\nhtml"
    .replace(/([a-zA-Z\s]+)html$/g, '$1') // Remove "html" at end of text
    .replace(/html\s*$/g, '') // Remove trailing "html"
    .replace(/^\s*html\s*/g, '') // Remove leading "html"
    .trim();
  
  // Split content into sections by headers
  const sections = cleanedContent.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/);
  const uniqueSections = new Map();
  
  for (let i = 0; i < sections.length; i += 2) {
    const header = sections[i];
    const content = sections[i + 1] || '';
    
    if (header && header.trim()) {
      // Extract header text for comparison
      const headerText = header.replace(/<[^>]*>/g, '').trim();
      
      // If we haven't seen this header before, add it
      if (!uniqueSections.has(headerText)) {
        uniqueSections.set(headerText, header + content);
      }
    }
  }
  
  // Reconstruct content with unique sections
  let finalContent = '';
  let sectionNumber = 1;
  
  for (const [headerText, sectionContent] of uniqueSections) {
    // Fix numbering for numbered sections
    if (headerText.match(/^\d+\./)) {
      const newHeader = sectionContent.replace(
        /<h[1-6][^>]*>(\d+\.)(.*?)<\/h[1-6]>/,
        `<h2>${sectionNumber}.$2</h2>`
      );
      finalContent += newHeader;
      sectionNumber++;
    } else {
      finalContent += sectionContent;
    }
  }
  
  // Final cleanup of any remaining artifacts
  finalContent = finalContent
    .replace(/html\s*html/g, 'html')
    .replace(/html\s*\n\s*html/g, 'html')
    .replace(/([a-zA-Z\s]+)html$/g, '$1')
    .trim();
  
  return finalContent;
};

// Helper function to properly structure HTML content
const structureHtmlContent = (content: string): string => {
  // If content doesn't have proper HTML structure, create it
  if (!content.includes('<h1>') && !content.includes('<h2>') && !content.includes('<p>')) {
    // Split content into paragraphs and format them
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    
    let structuredContent = '<div class="contract-content">';
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      if (paragraph.match(/^\d+\./)) {
        // This is a numbered section
        structuredContent += `<h2>${paragraph}</h2>`;
      } else if (paragraph.match(/^[A-Z][^.!?]*[.!?]$/)) {
        // This looks like a paragraph
        structuredContent += `<p>${paragraph}</p>`;
      } else if (paragraph.includes('**') || paragraph.includes('*')) {
        // This has markdown formatting
        const formatted = paragraph
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        structuredContent += `<p>${formatted}</p>`;
      } else {
        // Default to paragraph
        structuredContent += `<p>${paragraph}</p>`;
      }
    }
    
    structuredContent += '</div>';
    return structuredContent;
  }
  
  // If content already has HTML structure, just clean it up
  return content
    .replace(/html\s*html/g, 'html')
    .replace(/html\s*\n\s*html/g, 'html')
    .replace(/([a-zA-Z\s]+)html$/g, '$1')
    .trim();
};

// Helper function to convert raw API response to plain text (default display)
const convertToPlainText = (rawText: string): string => {
  console.log('🔍 Converting raw text to plain text:', rawText.substring(0, 200));
  
  // Decode HTML entities first
  let decoded = decodeHtmlEntities(rawText);
  
  // Clean up the text
  let cleaned = decoded
    .replace(/html\s*html/g, 'html')
    .replace(/html\s*\n\s*html/g, 'html')
    .replace(/([a-zA-Z\s]+)html$/g, '$1')
    .trim();
  
  // Convert markdown-style formatting to readable text
  cleaned = cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove ** for bold
    .replace(/\*(.*?)\*/g, '$1') // Remove * for italic
    .replace(/`(.*?)`/g, '$1') // Remove ` for code
    .replace(/^# (.*$)/gm, '$1') // Convert # headers to plain text
    .replace(/^## (.*$)/gm, '$1') // Convert ## headers to plain text
    .replace(/^### (.*$)/gm, '$1') // Convert ### headers to plain text
    .replace(/^- (.*$)/gm, '• $1') // Convert * lists to bullet points
    .replace(/^\d+\. (.*$)/gm, '$1') // Keep numbered lists as is
  
  console.log('✅ Converted to plain text:', cleaned.substring(0, 200));
  return cleaned;
};

// Helper function to convert raw API response to structured HTML (for HTML view)
const convertToStructuredHtml = (rawText: string): string => {
  console.log('🔍 Converting raw text to structured HTML:', rawText.substring(0, 200));
  
  // Decode HTML entities first
  let decoded = decodeHtmlEntities(rawText);
  
  // Clean up the text
  let cleaned = decoded
    .replace(/html\s*html/g, 'html')
    .replace(/html\s*\n\s*html/g, 'html')
    .replace(/([a-zA-Z\s]+)html$/g, '$1')
    .trim();
  
  // Split into lines and process
  const lines = cleaned.split('\n').filter(line => line.trim());
  let htmlContent = '<div class="contract-content">';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Check for main title (starts with #)
    if (line.startsWith('# ')) {
      const title = line.substring(2).trim();
      htmlContent += `<h1>${title}</h1>`;
    }
    // Check for section headers (starts with ##)
    else if (line.startsWith('## ')) {
      const header = line.substring(3).trim();
      htmlContent += `<h2>${header}</h2>`;
    }
    // Check for subsection headers (starts with ###)
    else if (line.startsWith('### ')) {
      const subheader = line.substring(4).trim();
      htmlContent += `<h3>${subheader}</h3>`;
    }
    // Check for bullet points (starts with *)
    else if (line.startsWith('* ')) {
      const bullet = line.substring(2).trim();
      htmlContent += `<li>${bullet}</li>`;
    }
    // Check for numbered lists (starts with number.)
    else if (line.match(/^\d+\./)) {
      const numbered = line.trim();
      htmlContent += `<li>${numbered}</li>`;
    }
    // Check for bold text (wrapped in **)
    else if (line.includes('**')) {
      const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlContent += `<p>${boldText}</p>`;
    }
    // Default to paragraph
    else {
      htmlContent += `<p>${line}</p>`;
    }
  }
  
  htmlContent += '</div>';
  
  // Wrap lists properly
  htmlContent = htmlContent
    .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, ''); // Merge consecutive lists
  
  console.log('✅ Converted to structured HTML:', htmlContent.substring(0, 200));
  return htmlContent;
};

// Helper function to accumulate and structure streaming content (default: plain text)
const accumulateStreamingContent = (newText: string, accumulatedContent: string): string => {
  // If this is the first chunk, start fresh
  if (!accumulatedContent) {
    return convertToPlainText(newText);
  }
  
  // If we already have accumulated content, append the new text
  // and then convert the entire accumulated content to plain text
  const combinedText = accumulatedContent + '\n' + newText;
  return convertToPlainText(combinedText);
};

// Helper function to accumulate and structure streaming content (HTML view)
const accumulateStreamingHtml = (newText: string, accumulatedContent: string): string => {
  // If this is the first chunk, start fresh
  if (!accumulatedContent) {
    return convertToStructuredHtml(newText);
  }
  
  // If we already have accumulated content, append the new text
  // and then convert the entire accumulated content to structured HTML
  const combinedText = accumulatedContent + '\n' + newText;
  return convertToStructuredHtml(combinedText);
};

// Helper function to get HTML content when specifically requested
export const getHtmlContent = (content: string): string => {
  return convertToStructuredHtml(content);
};

// Helper function to get plain text content (default)
export const getPlainTextContent = (content: string): string => {
  return convertToPlainText(content);
};


