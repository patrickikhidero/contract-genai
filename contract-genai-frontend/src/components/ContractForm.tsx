'use client';

import { useState } from 'react';
import { streamContract } from '@/utils/api';

interface ContractFormProps {
  onStreamingData: (data: string) => void;
  onStreamingComplete: () => void;
  onError: (error: string) => void;
}

export default function ContractForm({
  onStreamingData,
  onStreamingComplete,
  onError,
}: ContractFormProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      onError('Please enter a business description');
      return;
    }

    setIsLoading(true);
    onError('');

    try {
      setIsStreaming(true);
      await streamContract(
        prompt,
        (data) => {
          onStreamingData(data);
        },
        (error) => {
          onError(error.message);
          setIsStreaming(false);
          setIsLoading(false);
        },
        () => {
          setIsStreaming(false);
          setIsLoading(false);
          onStreamingComplete();
        }
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Generate Terms of Service Contract</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Business Description
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your business, services, and any specific requirements for your Terms of Service..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            disabled={isLoading || isStreaming}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isStreaming || !prompt.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || isStreaming ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isStreaming ? 'Generating...' : 'Loading...'}
            </span>
          ) : (
            'Generate Contract'
          )}
        </button>
      </form>
    </div>
  );
}
