import { InputValidator } from '../validation';

describe('InputValidator', () => {
  describe('validatePromptInput', () => {
    it('should reject empty input', () => {
      const result = InputValidator.validatePromptInput('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a business description');
    });

    it('should reject whitespace-only input', () => {
      const result = InputValidator.validatePromptInput('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a business description');
    });

    it('should reject input that is too short', () => {
      const result = InputValidator.validatePromptInput('short');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description is too short. Please provide more details about your business or service');
    });

    it('should reject input that is too long', () => {
      const longInput = 'a'.repeat(10001);
      const result = InputValidator.validatePromptInput(longInput);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description is too long. Maximum 10000 characters allowed');
    });

    it('should reject non-business content', () => {
      const result = InputValidator.validatePromptInput('hello there how are you');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Please provide information about your business');
    });

    it('should reject test content', () => {
      const result = InputValidator.validatePromptInput('just testing');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Please provide information about your business');
    });

    it('should reject phone call patterns', () => {
      const result = InputValidator.validatePromptInput('voice call with john');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Please provide information about your business');
    });

    it('should accept valid business description', () => {
      const result = InputValidator.validatePromptInput(
        'I run a software company that provides web development services and mobile app development. We need terms of service for our SaaS platform.'
      );
      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toBeDefined();
    });

    it('should accept business description with legal terms', () => {
      const result = InputValidator.validatePromptInput(
        'We need a privacy policy for our e-commerce store that sells products online'
      );
      expect(result.isValid).toBe(true);
    });

    it('should accept restaurant business description', () => {
      const result = InputValidator.validatePromptInput(
        'I own a restaurant that serves Italian food and we need terms of service for our delivery service'
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject input with insufficient word variety', () => {
      const result = InputValidator.validatePromptInput('business business business business business business');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('more varied and specific information');
    });

    it('should reject input with too few words', () => {
      const result = InputValidator.validatePromptInput('my company');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('more detailed description');
    });
  });

  describe('validateRealTime', () => {
    it('should be more lenient for real-time validation', () => {
      const result = InputValidator.validateRealTime('my business');
      expect(result.isValid).toBe(true);
    });

    it('should still reject empty input', () => {
      const result = InputValidator.validateRealTime('');
      expect(result.isValid).toBe(false);
    });

    it('should still reject very short input', () => {
      const result = InputValidator.validateRealTime('ab');
      expect(result.isValid).toBe(false);
    });

    it('should still reject overly long input', () => {
      const longInput = 'a'.repeat(10001);
      const result = InputValidator.validateRealTime(longInput);
      expect(result.isValid).toBe(false);
    });
  });

  describe('getSuggestions', () => {
    it('should provide suggestions for incomplete input', () => {
      const suggestions = InputValidator.getSuggestions('my business');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('business');
    });

    it('should provide suggestions for short input', () => {
      const suggestions = InputValidator.getSuggestions('company');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should provide generic suggestions for good input', () => {
      const suggestions = InputValidator.getSuggestions(
        'I run a software company that provides web development services and mobile app development. We need terms of service for our SaaS platform.'
      );
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('requirements');
    });
  });
});
