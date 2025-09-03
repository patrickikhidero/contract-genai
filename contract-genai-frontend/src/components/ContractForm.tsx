'use client';

import { useState, useEffect, useRef } from 'react';
import { streamContract } from '@/utils/api';
import { InputValidator, ValidationDebouncer, ValidationResult } from '@/utils/validation';
import { UserFriendlyError } from '@/utils/errorHandling';

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
  const [validationError, setValidationError] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const validationDebouncer = useRef(new ValidationDebouncer());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time validation effect
  useEffect(() => {
    if (prompt.trim()) {
      setIsValidating(true);
      validationDebouncer.current.validateDebounced(prompt, (result) => {
        setValidationResult(result);
        setValidationError(result.isValid ? '' : result.error || '');
        setIsValidating(false);
      });
    } else {
      setValidationResult(null);
      setValidationError('');
      setIsValidating(false);
    }

    return () => {
      validationDebouncer.current.clear();
    };
  }, [prompt]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perform full validation before submission
    const fullValidation = InputValidator.validatePromptInput(prompt);
    
    if (!fullValidation.isValid) {
      setValidationError(fullValidation.error || 'Invalid input');
      setShowSuggestions(true);
      onError(fullValidation.error || 'Invalid input');
      return;
    }

    setIsLoading(true);
    setValidationError('');
    setShowSuggestions(false);
    onError('');

    try {
      setIsStreaming(true);
      await streamContract(
        fullValidation.sanitizedInput || prompt,
        {
          onData: (data: string) => {
            onStreamingData(data);
          },
          onError: (error: Error) => {
            const errorMessage = error instanceof UserFriendlyError 
              ? error.message 
              : 'An unexpected error occurred. Please try again.';
            onError(errorMessage);
            setIsStreaming(false);
            setIsLoading(false);
          },
          onComplete: () => {
            setIsStreaming(false);
            setIsLoading(false);
            onStreamingComplete();
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof UserFriendlyError 
        ? error.message 
        : error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred. Please try again.';
      onError(errorMessage);
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
            {isValidating && (
              <span className="ml-2 text-xs text-blue-600">Validating...</span>
            )}
          </label>
          <textarea
            ref={textareaRef}
            id="prompt"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Describe your business, services, and any specific requirements for your Terms of Service..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
              validationError 
                ? 'border-red-300 focus:ring-red-500' 
                : validationResult?.isValid 
                  ? 'border-green-300 focus:ring-green-500' 
                  : 'border-gray-300 focus:ring-blue-500'
            }`}
            rows={4}
            disabled={isLoading || isStreaming}
          />
          
          {/* Character count */}
          <div className="mt-1 text-right text-xs text-gray-500">
            {prompt.length}/10,000 characters
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {validationError}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && validationError && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">
                    Suggestions to improve your description:
                  </h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {InputValidator.getSuggestions(prompt).map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success indicator */}
          {validationResult?.isValid && prompt.trim() && !validationError && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-700">Description looks good!</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || isStreaming || !prompt.trim() || !!validationError || isValidating}
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
