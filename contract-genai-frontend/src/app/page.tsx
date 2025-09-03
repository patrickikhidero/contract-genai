'use client';

import { useState, useRef, useCallback } from 'react';
import ContractDisplay from '@/components/ContractDisplay';
import { streamCharacters } from '@/utils/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [contract, setContract] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [typingSpeed, setTypingSpeed] = useState(20);
  const stopStreamRef = useRef<(() => void) | null>(null);

  const handleStream = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a business description');
      return;
    }

    console.log('Prompt being sent:', prompt); // Log the prompt
    setContract('');
    setError('');
    setIsStreaming(true);

    try {
      const stopFunction = await streamCharacters(prompt, {
        onData: (content, isFinal) => {
          setContract(content);
          if (isFinal) {
            setIsStreaming(false);
          }
        },
        onError: (error) => {
          setError(error.message);
          setIsStreaming(false);
        },
        onComplete: () => {
          setIsStreaming(false);
        },
        typingSpeed,
      });

      stopStreamRef.current = stopFunction;
    } catch (error) {
      console.error('Error during streaming:', error); // Log the error
      setError('Failed to start streaming');
      setIsStreaming(false);
    }
  }, [prompt, typingSpeed]);

  const handleStop = useCallback(() => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleClear = useCallback(() => {
    setPrompt('');
    setContract('');
    setError('');
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Contract Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Generate professional Terms of Service contracts with AI-powered technology. 
            Watch your contract come to life character by character.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                Business Description
              </h2>
              <textarea
                className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none transition-all duration-200"
                rows={6}
                placeholder="Describe your business, services, target audience, and any specific legal requirements you need in your Terms of Service..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isStreaming}
              />
              
              {error && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  {error}
                </p>
              )}
            </div>

            {/* Typing Speed Control */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Typing Speed: {typingSpeed}ms per character
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={typingSpeed}
                onChange={(e) => setTypingSpeed(Number(e.target.value))}
                disabled={isStreaming}
                className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleStream}
                disabled={isStreaming}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
              >
                {isStreaming ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generating...
                  </span>
                ) : (
                  'Generate Contract'
                )}
              </button>
              
              <button
                onClick={handleStop}
                disabled={!isStreaming}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Stop
              </button>
              
              <button
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
            <ContractDisplay contract={contract} isStreaming={isStreaming} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Professional legal document generation
          </p>
        </div>
      </div>
    </div>
  );
}
