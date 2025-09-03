/**
 * Error handling utilities for user-friendly error messages
 */

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  detail?: string;
  code?: string;
}

export class UserFriendlyError extends Error {
  constructor(
    message: string, 
    public originalError?: Error,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'UserFriendlyError';
  }
}

/**
 * Maps HTTP status codes to user-friendly error messages
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Authentication required. Please refresh the page and try again.',
  403: 'Access denied. You do not have permission to perform this action.',
  404: 'Service not found. Please try again later.',
  408: 'Request timeout. Please check your connection and try again.',
  413: 'Request too large. Please reduce your input and try again.',
  422: 'Invalid input provided. Please check your business description and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Server error occurred. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'Request timeout. Please try again later.',
};

/**
 * Maps common API error codes to user-friendly messages
 */
const API_ERROR_MESSAGES: Record<string, string> = {
  'VALIDATION_ERROR': 'Please provide a valid business description with more details.',
  'INVALID_INPUT': 'The input provided is not valid. Please check your business description.',
  'BUSINESS_CONTEXT_REQUIRED': 'Please provide information about your business, company, or service.',
  'INPUT_TOO_SHORT': 'Please provide more details about your business or service.',
  'INPUT_TOO_LONG': 'Your description is too long. Please provide a shorter description.',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment before trying again.',
  'SERVICE_UNAVAILABLE': 'The contract generation service is temporarily unavailable.',
  'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
  'TIMEOUT_ERROR': 'Request timed out. Please try again.',
};

/**
 * Extracts error message from API response
 */
function extractApiErrorMessage(response: any): string | null {
  if (typeof response === 'string') {
    return response;
  }
  
  if (response && typeof response === 'object') {
    // Try different common error message fields
    return response.error || response.message || response.detail || response.description || null;
  }
  
  return null;
}

/**
 * Converts technical errors to user-friendly messages
 */
export function createUserFriendlyError(
  error: any,
  context: string = 'operation'
): UserFriendlyError {
  // If it's already a UserFriendlyError, return as is
  if (error instanceof UserFriendlyError) {
    return error;
  }

  let userMessage = 'An unexpected error occurred. Please try again.';
  let statusCode: number | undefined;

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    userMessage = 'Network connection issue. Please check your internet connection and try again.';
  }
  // Handle AbortError (request cancelled)
  else if (error.name === 'AbortError') {
    userMessage = 'Request was cancelled.';
  }
  // Handle API errors with status codes
  else if (error.status || error.statusCode) {
    statusCode = error.status || error.statusCode;
    userMessage = HTTP_ERROR_MESSAGES[statusCode] || `Request failed with error ${statusCode}. Please try again.`;
    
    // Try to extract more specific error message from response
    if (error.response) {
      const apiMessage = extractApiErrorMessage(error.response);
      if (apiMessage) {
        // Check if it's a known API error code
        if (API_ERROR_MESSAGES[apiMessage]) {
          userMessage = API_ERROR_MESSAGES[apiMessage];
        } else {
          // Use the API message if it's user-friendly
          userMessage = apiMessage;
        }
      }
    }
  }
  // Handle validation errors from our frontend validation
  else if (error.message && (
    error.message.includes('business') || 
    error.message.includes('description') ||
    error.message.includes('Please provide')
  )) {
    userMessage = error.message;
  }
  // Handle generic Error objects
  else if (error instanceof Error) {
    // Check if it's a known error pattern
    if (error.message.includes('Failed to fetch')) {
      userMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    } else if (error.message.includes('network')) {
      userMessage = 'Network error occurred. Please check your connection.';
    } else {
      // For other errors, use a generic message to avoid exposing technical details
      userMessage = `Failed to ${context}. Please try again.`;
    }
  }

  return new UserFriendlyError(userMessage, error, statusCode);
}

/**
 * Handles API response errors and converts them to user-friendly messages
 */
export async function handleApiResponse(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let errorMessage = HTTP_ERROR_MESSAGES[response.status] || `Request failed with error ${response.status}. Please try again.`;
  
  try {
    const errorData = await response.json();
    const apiMessage = extractApiErrorMessage(errorData);
    
    if (apiMessage) {
      // Check if it's a known API error code
      if (API_ERROR_MESSAGES[apiMessage]) {
        errorMessage = API_ERROR_MESSAGES[apiMessage];
      } else {
        // Use the API message if it seems user-friendly
        errorMessage = apiMessage;
      }
    }
  } catch {
    // If we can't parse the error response, use the default message
  }

  throw new UserFriendlyError(errorMessage, undefined, response.status);
}

/**
 * Wraps async operations with user-friendly error handling
 */
export async function withUserFriendlyError<T>(
  operation: () => Promise<T>,
  context: string = 'operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw createUserFriendlyError(error, context);
  }
}

/**
 * Common error messages for different scenarios
 */
export const ERROR_MESSAGES = {
  NETWORK: 'Network connection issue. Please check your internet connection and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  VALIDATION: 'Please provide a valid business description with more details.',
  SERVICE_UNAVAILABLE: 'The contract generation service is temporarily unavailable. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',
  GENERIC: 'An unexpected error occurred. Please try again.',
} as const;
