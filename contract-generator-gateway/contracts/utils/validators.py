import logging
import re
from django.conf import settings

GEMINI_API_KEY = settings.GEMINI_API_KEY
URL = settings.URL

class InputValidator:
    """Handles user input validation."""
    
    # Business-related keywords that should be present in valid prompts
    BUSINESS_KEYWORDS = {
        'business_types': [
            'company', 'business', 'corporation', 'enterprise', 'startup', 'firm', 'organization',
            'saas', 'software', 'app', 'platform', 'service', 'website', 'ecommerce', 'store',
            'restaurant', 'hotel', 'clinic', 'agency', 'consulting', 'freelance', 'contractor'
        ],
        'business_activities': [
            'service', 'services', 'product', 'products', 'consulting', 'development', 'design',
            'marketing', 'sales', 'support', 'maintenance', 'hosting', 'subscription', 'membership',
            'delivery', 'shipping', 'payment', 'billing', 'customer', 'client', 'user', 'subscriber'
        ],
        'legal_terms': [
            'terms', 'service', 'agreement', 'contract', 'policy', 'privacy', 'liability',
            'warranty', 'refund', 'cancellation', 'termination', 'dispute', 'governance'
        ]
    }
    
    NON_BUSINESS_PATTERNS = [
        r'\b(voice call|phone call|call)\s+(to|with)\s+\w+',  
        r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(and|with)\s+(january|february|march|april|may|june|july|august|september|october|november|december)',  # month combinations
        r'\b(hello|hi|hey)\s+(there|you)\b',  
        r'\b(how are you|what\'s up|good morning|good afternoon|good evening)\b',  
        r'\b(test|testing|just testing|random|nonsense|gibberish)\b',  
        r'^[^a-zA-Z]*$',  
        r'^\d+$',  
        r'^[a-zA-Z]{1,3}$',  
    ]
    
    @staticmethod
    def validate_prompt_input(prompt: str, max_length: int = 10000) -> str:
        """
        Validate and sanitize user prompt input with business context validation.
        
        Args:
            prompt: The user-provided prompt
            max_length: Maximum allowed length for the prompt
            
        Returns:
            Sanitized prompt string
            
        Raises:
            ValueError: If prompt is invalid
        """
        if not prompt or not prompt.strip():
            raise ValueError("Prompt is required and cannot be empty")
        
        sanitized_prompt = prompt.strip()
        
        if len(sanitized_prompt) > max_length:
            raise ValueError(f"Prompt is too long. Maximum {max_length} characters allowed")
        
        if len(sanitized_prompt) < 10:
            raise ValueError("Prompt is too short. Please provide more details about your business or service")
        
        InputValidator._validate_business_context(sanitized_prompt)
        
        return sanitized_prompt
    
    @staticmethod
    def _validate_business_context(prompt: str) -> None:
        """
        Validate that the prompt contains business-related content.
        
        Args:
            prompt: The sanitized prompt to validate
            
        Raises:
            ValueError: If prompt doesn't contain business context
        """
        prompt_lower = prompt.lower()
        
        for pattern in InputValidator.NON_BUSINESS_PATTERNS:
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                raise ValueError(
                    "Please provide information about your business, company, or service. "
                    "Your input should describe what your business does or what kind of contract you need."
                )
        
        business_score = 0
        all_keywords = []
        
        for category, keywords in InputValidator.BUSINESS_KEYWORDS.items():
            for keyword in keywords:
                if keyword in prompt_lower:
                    business_score += 1
                    all_keywords.append(keyword)
        
        if business_score < 2:
            legal_terms_found = any(term in prompt_lower for term in InputValidator.BUSINESS_KEYWORDS['legal_terms'])
            
            if not legal_terms_found:
                raise ValueError(
                    "Please provide more specific information about your business or service. "
                    "Include details like: what type of business you have, what services you provide, "
                    "or what kind of contract you need (terms of service, privacy policy, etc.). "
                    f"Found keywords: {', '.join(all_keywords) if all_keywords else 'none'}"
                )
        
        words = prompt.split()
        if len(words) < 3:
            raise ValueError("Please provide a more detailed description of your business or service needs")
        
        if len(set(words)) < len(words) * 0.3:  
            raise ValueError("Please provide more varied and specific information about your business")

