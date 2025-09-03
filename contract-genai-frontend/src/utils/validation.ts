/**
 * Frontend input validation utilities that mirror the backend validation logic
 * to provide immediate feedback to users before making API calls.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedInput?: string;
}

export class InputValidator {
  // Business-related keywords that should be present in valid prompts
  private static readonly BUSINESS_KEYWORDS = {
    businessTypes: [
      'company', 'business', 'corporation', 'enterprise', 'startup', 'firm', 'organization',
      'saas', 'software', 'app', 'platform', 'service', 'website', 'ecommerce', 'store',
      'restaurant', 'hotel', 'clinic', 'agency', 'consulting', 'freelance', 'contractor'
    ],
    businessActivities: [
      'service', 'services', 'product', 'products', 'consulting', 'development', 'design',
      'marketing', 'sales', 'support', 'maintenance', 'hosting', 'subscription', 'membership',
      'delivery', 'shipping', 'payment', 'billing', 'customer', 'client', 'user', 'subscriber'
    ],
    legalTerms: [
      'terms', 'service', 'agreement', 'contract', 'policy', 'privacy', 'liability',
      'warranty', 'refund', 'cancellation', 'termination', 'dispute', 'governance'
    ]
  };

  // Patterns that indicate non-business content
  private static readonly NON_BUSINESS_PATTERNS = [
    /\b(voice call|phone call|call)\s+(to|with)\s+\w+/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(and|with)\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /\b(hello|hi|hey)\s+(there|you)\b/i,
    /\b(how are you|what's up|good morning|good afternoon|good evening)\b/i,
    /\b(test|testing|just testing|random|nonsense|gibberish)\b/i,
    /^[^a-zA-Z]*$/,
    /^\d+$/,
    /^[a-zA-Z]{1,3}$/,
  ];

  /**
   * Validate and sanitize user prompt input with business context validation.
   * 
   * @param prompt - The user-provided prompt
   * @param maxLength - Maximum allowed length for the prompt (default: 10000)
   * @returns ValidationResult with validation status and error message if invalid
   */
  static validatePromptInput(prompt: string, maxLength: number = 10000): ValidationResult {
    // Check if prompt is empty or only whitespace
    if (!prompt || !prompt.trim()) {
      return {
        isValid: false,
        error: "Please enter a business description"
      };
    }

    const sanitizedPrompt = prompt.trim();

    // Check length constraints
    if (sanitizedPrompt.length > maxLength) {
      return {
        isValid: false,
        error: `Description is too long. Maximum ${maxLength} characters allowed`
      };
    }

    if (sanitizedPrompt.length < 10) {
      return {
        isValid: false,
        error: "Description is too short. Please provide more details about your business or service"
      };
    }

    // Validate business context
    const businessValidation = this.validateBusinessContext(sanitizedPrompt);
    if (!businessValidation.isValid) {
      return businessValidation;
    }

    return {
      isValid: true,
      sanitizedInput: sanitizedPrompt
    };
  }

  /**
   * Validate that the prompt contains business-related content.
   * 
   * @param prompt - The sanitized prompt to validate
   * @returns ValidationResult with validation status and error message if invalid
   */
  private static validateBusinessContext(prompt: string): ValidationResult {
    const promptLower = prompt.toLowerCase();

    // Check for non-business patterns
    for (const pattern of this.NON_BUSINESS_PATTERNS) {
      if (pattern.test(promptLower)) {
        return {
          isValid: false,
          error: "Please provide information about your business, company, or service. Your input should describe what your business does or what kind of contract you need."
        };
      }
    }

    // Calculate business score based on keywords
    let businessScore = 0;
    const allKeywords: string[] = [];

    for (const [category, keywords] of Object.entries(this.BUSINESS_KEYWORDS)) {
      for (const keyword of keywords) {
        if (promptLower.includes(keyword)) {
          businessScore++;
          allKeywords.push(keyword);
        }
      }
    }

    // Require at least 2 business-related keywords
    if (businessScore < 2) {
      const legalTermsFound = this.BUSINESS_KEYWORDS.legalTerms.some(term => 
        promptLower.includes(term)
      );

      if (!legalTermsFound) {
        return {
          isValid: false,
          error: `Please provide more specific information about your business or service. Include details like: what type of business you have, what services you provide, or what kind of contract you need (terms of service, privacy policy, etc.). Found keywords: ${allKeywords.length > 0 ? allKeywords.join(', ') : 'none'}`
        };
      }
    }

    // Check word count and variety
    const words = prompt.split(/\s+/);
    if (words.length < 3) {
      return {
        isValid: false,
        error: "Please provide a more detailed description of your business or service needs"
      };
    }

    // Check for sufficient word variety (at least 30% unique words)
    const uniqueWords = new Set(words.map(word => word.toLowerCase()));
    if (uniqueWords.size < words.length * 0.3) {
      return {
        isValid: false,
        error: "Please provide more varied and specific information about your business"
      };
    }

    return { isValid: true };
  }

  /**
   * Get helpful suggestions for improving the input
   * 
   * @param prompt - The user's current input
   * @returns Array of suggestion strings
   */
  static getSuggestions(prompt: string): string[] {
    const suggestions: string[] = [];
    const promptLower = prompt.toLowerCase();

    // Check for missing business context
    const hasBusinessType = this.BUSINESS_KEYWORDS.businessTypes.some(keyword => 
      promptLower.includes(keyword)
    );
    const hasBusinessActivity = this.BUSINESS_KEYWORDS.businessActivities.some(keyword => 
      promptLower.includes(keyword)
    );
    const hasLegalTerms = this.BUSINESS_KEYWORDS.legalTerms.some(keyword => 
      promptLower.includes(keyword)
    );

    if (!hasBusinessType) {
      suggestions.push("• Mention what type of business you have (e.g., 'software company', 'restaurant', 'consulting firm')");
    }

    if (!hasBusinessActivity) {
      suggestions.push("• Describe what services or products you offer");
    }

    if (!hasLegalTerms) {
      suggestions.push("• Specify what type of contract you need (e.g., 'terms of service', 'privacy policy')");
    }

    if (prompt.length < 50) {
      suggestions.push("• Provide more details about your business operations");
    }

    if (suggestions.length === 0) {
      suggestions.push("• Consider adding specific requirements or special clauses you need");
    }

    return suggestions;
  }

  /**
   * Real-time validation for form inputs
   * 
   * @param prompt - The current input value
   * @returns ValidationResult with current validation status
   */
  static validateRealTime(prompt: string): ValidationResult {
    // For real-time validation, we're more lenient
    if (!prompt || !prompt.trim()) {
      return { isValid: false, error: "Please enter a business description" };
    }

    const sanitizedPrompt = prompt.trim();

    if (sanitizedPrompt.length > 10000) {
      return {
        isValid: false,
        error: `Description is too long. Maximum 10,000 characters allowed`
      };
    }

    if (sanitizedPrompt.length < 3) {
      return { isValid: false, error: "Please enter at least 3 characters" };
    }

    // For real-time, we don't enforce business context validation
    // That will be checked on form submission
    return { isValid: true, sanitizedInput: sanitizedPrompt };
  }
}

/**
 * Utility function to validate form input with debouncing for real-time validation
 */
export class ValidationDebouncer {
  private timeoutId: NodeJS.Timeout | null = null;
  private lastValidation: ValidationResult | null = null;

  /**
   * Validate input with debouncing to avoid excessive validation calls
   * 
   * @param prompt - The input to validate
   * @param callback - Callback function to receive validation result
   * @param delay - Debounce delay in milliseconds (default: 300)
   */
  validateDebounced(
    prompt: string, 
    callback: (result: ValidationResult) => void, 
    delay: number = 300
  ): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      const result = InputValidator.validateRealTime(prompt);
      this.lastValidation = result;
      callback(result);
    }, delay);
  }

  /**
   * Get the last validation result without triggering a new validation
   */
  getLastValidation(): ValidationResult | null {
    return this.lastValidation;
  }

  /**
   * Clear any pending validation
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
