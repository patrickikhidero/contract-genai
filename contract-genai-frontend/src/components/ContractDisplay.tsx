'use client';

import { useState } from 'react';
import TypingAnimation from './TypingAnimation';
import { renderFormattedContent, extractPlainText, isStreamComplete, getHtmlContent, getPlainTextContent } from '../utils/api';

interface ContractDisplayProps {
  contract: string;
  isStreaming?: boolean;
}

export default function ContractDisplay({ contract, isStreaming = false }: ContractDisplayProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [showFormatted, setShowFormatted] = useState(false); 

  if (!contract) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md">
        <div className="text-center text-gray-500">
          <p>No contract generated yet. Enter a business description above to get started.</p>
        </div>
      </div>
    );
  }

  // Determine what content to display based on view mode
  let displayContent = contract;
  if (showFormatted) {
    // Show HTML formatted content
    displayContent = getHtmlContent(contract);
  } else if (showRaw) {
    // Show plain text without any formatting
    displayContent = extractPlainText(contract);
  } else {
    // Default: show plain text (clean, readable)
    displayContent = getPlainTextContent(contract);
  }

  const isComplete = isStreamComplete(contract);

  // console.log('Original contract:', contract);
  // console.log('Formatted content:', displayContent);
  // console.log('Plain text:', extractPlainText(contract));
  // console.log('Is complete:', isComplete);
  // console.log('Show formatted:', showFormatted);
  // console.log('Show raw:', showRaw);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Generated Contract {isStreaming && <span className="text-blue-600 text-sm ml-2">(Streaming...)</span>}
          {isComplete && !isStreaming && <span className="text-green-600 text-sm ml-2">(Complete)</span>}
        </h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFormatted(!showFormatted)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              showFormatted 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showFormatted ? 'View Plain Text' : 'View HTML'}
          </button>
          
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            {showRaw ? 'View Formatted' : 'View Raw'}
          </button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <TypingAnimation 
          text={displayContent} 
          speed={20} 
        />
      </div>

      {contract && (
        <div className="mt-4 flex justify-end space-x-3">

          <button
            onClick={() => {
              const contentToCopy = showRaw ? extractPlainText(contract) : getHtmlContent(contract);
              navigator.clipboard.writeText(contentToCopy);
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Copy {showRaw ? 'Text' : 'HTML'}
          </button>
          
          <button
            onClick={() => {
              const contentToDownload = showRaw ? extractPlainText(contract) : getHtmlContent(contract);
              const mimeType = showRaw ? 'text/plain' : 'text/html';
              const extension = showRaw ? 'txt' : 'html';
              const filename = showRaw ? 'terms-of-service.txt' : 'terms-of-service.html';
              
              const blob = new Blob([contentToDownload], { type: mimeType });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Download {showRaw ? 'Text' : 'HTML'}
          </button>
        </div>
      )}
    </div>
  );
}
