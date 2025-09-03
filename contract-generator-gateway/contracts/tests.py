from django.test import TestCase
from rest_framework import status
import json
from unittest.mock import patch, MagicMock
from contracts.utils.validators import InputValidator


class StreamContractViewTests(TestCase):
    @patch('contracts.views.httpx.stream')
    def test_stream_contract_success_with_valid_prompt(self, mock_stream):
        """Test successful streaming with valid prompt parameter"""
        mock_response = MagicMock()
        mock_response.iter_lines.return_value = [
            b'{"candidates": [{"content": {"parts": [{"text": "Test contract content"}]}}]}'
        ]
        mock_stream.return_value.__enter__.return_value = mock_response

        response = self.client.get('/api/contracts/stream/', {
            'prompt': 'Draft ToS for a cloud SaaS company'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/event-stream')
        
        content = b''.join(response.streaming_content)
        content_str = content.decode('utf-8')
        self.assertIn('data: b\'{"candidates": [{"content": {"parts": [{"text": "Test contract content"}]}}]}\'', content_str)

    @patch('contracts.views.httpx.stream')
    def test_stream_contract_success_with_empty_response(self, mock_stream):
        """Test successful streaming even with empty response from API"""
        mock_response = MagicMock()
        mock_response.iter_lines.return_value = []
        mock_stream.return_value.__enter__.return_value = mock_response

        response = self.client.get('/api/contracts/stream/', {
            'prompt': 'Draft terms of service for my SaaS company'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/event-stream')
        
        content = b''.join(response.streaming_content)
        content_str = content.decode('utf-8')
        self.assertEqual(content_str.strip(), '')

    def test_stream_contract_failure_missing_prompt(self):
        """Test failure when prompt parameter is missing"""
        response = self.client.get('/api/contracts/stream/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/event-stream')

    @patch('contracts.views.httpx.stream')
    def test_stream_contract_failure_api_error(self, mock_stream):
        """Test handling of API errors during streaming"""
        mock_stream.side_effect = Exception("API connection error")

        response = self.client.get('/api/contracts/stream/', {
            'prompt': 'Draft terms of service for my software company'
        })
        
        with self.assertRaises(Exception):
            b''.join(response.streaming_content)
    
    def test_stream_contract_failure_invalid_business_prompt(self):
        """Test failure when prompt doesn't contain business context"""
        invalid_prompts = [
            "i want a voice call to september with june and july",
            "hello there how are you",
            "just testing random stuff"
        ]
        
        for prompt in invalid_prompts:
            with self.subTest(prompt=prompt):
                response = self.client.get('/api/contracts/stream/', {
                    'prompt': prompt
                })
                
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                response_data = json.loads(response.content)
                self.assertIn("error", response_data)
                self.assertIn("business", response_data["error"].lower())


class InputValidatorTests(TestCase):
    """Test cases for InputValidator class"""
    
    def test_validate_prompt_input_valid_business_prompts(self):
        """Test validation with valid business-related prompts"""
        valid_prompts = [
            "Draft terms of service for a cloud SaaS company",
            "Create a privacy policy for my ecommerce store",
            "Generate a service agreement for my consulting business",
            "I need a contract for my software development company",
            "Terms of service for a mobile app platform",
            "Privacy policy for a restaurant business",
            "Service agreement for freelance contractor services"
        ]
        
        for prompt in valid_prompts:
            with self.subTest(prompt=prompt):
                result = InputValidator.validate_prompt_input(prompt)
                self.assertEqual(result, prompt.strip())
    
    def test_validate_prompt_input_empty_prompt(self):
        """Test validation with empty prompts"""
        empty_prompts = ["", "   ", None]
        
        for prompt in empty_prompts:
            with self.subTest(prompt=prompt):
                with self.assertRaises(ValueError) as context:
                    InputValidator.validate_prompt_input(prompt)
                self.assertIn("Prompt is required and cannot be empty", str(context.exception))
    
    def test_validate_prompt_input_too_short(self):
        """Test validation with prompts that are too short"""
        short_prompts = ["hi", "test", "ok", "yes", "no"]
        
        for prompt in short_prompts:
            with self.subTest(prompt=prompt):
                with self.assertRaises(ValueError) as context:
                    InputValidator.validate_prompt_input(prompt)
                self.assertIn("Prompt is too short", str(context.exception))
    
    def test_validate_prompt_input_too_long(self):
        """Test validation with prompts that are too long"""
        long_prompt = "a" * 10001  # Exceeds default max_length of 10000
        
        with self.assertRaises(ValueError) as context:
            InputValidator.validate_prompt_input(long_prompt)
        self.assertIn("Prompt is too long", str(context.exception))
    
    def test_validate_prompt_input_non_business_patterns(self):
        """Test validation with non-business patterns that should be rejected"""
        non_business_prompts = [
            "i want a voice call to september with june and july",
            "hello there how are you",
            "good morning what's up",
            "just testing random stuff",
            "nonsense gibberish",
            "123456789",
            "abc",
            "hi you"
        ]
        
        for prompt in non_business_prompts:
            with self.subTest(prompt=prompt):
                with self.assertRaises(ValueError) as context:
                    InputValidator.validate_prompt_input(prompt)
                self.assertIn("Please provide information about your business", str(context.exception))
    
    def test_validate_prompt_input_insufficient_business_keywords(self):
        """Test validation with prompts that have insufficient business context"""
        insufficient_prompts = [
            "I need help with something",
            "Can you help me please",
            "I want to create something",
            "Need assistance with project"
        ]
        
        for prompt in insufficient_prompts:
            with self.subTest(prompt=prompt):
                with self.assertRaises(ValueError) as context:
                    InputValidator.validate_prompt_input(prompt)
                self.assertIn("Please provide more specific information about your business", str(context.exception))
    
    def test_validate_prompt_input_repetitive_content(self):
        """Test validation with repetitive content"""
        repetitive_prompts = [
            "business business business business business",
            "service service service service service",
            "company company company company company"
        ]
        
        for prompt in repetitive_prompts:
            with self.subTest(prompt=prompt):
                with self.assertRaises(ValueError) as context:
                    InputValidator.validate_prompt_input(prompt)
                self.assertIn("Please provide more varied and specific information", str(context.exception))
    
    def test_validate_prompt_input_legal_terms_only(self):
        """Test validation with prompts containing only legal terms (should pass)"""
        legal_only_prompts = [
            "terms of service agreement",
            "privacy policy contract",
            "service agreement terms"
        ]
        
        for prompt in legal_only_prompts:
            with self.subTest(prompt=prompt):
                result = InputValidator.validate_prompt_input(prompt)
                self.assertEqual(result, prompt.strip())
    
    def test_validate_prompt_input_custom_max_length(self):
        """Test validation with custom max_length parameter"""
        # Test with custom max_length
        short_max_prompt = "a" * 100
        result = InputValidator.validate_prompt_input(short_max_prompt, max_length=50)
        self.assertEqual(result, short_max_prompt)
        
        # Test exceeding custom max_length
        with self.assertRaises(ValueError) as context:
            InputValidator.validate_prompt_input(short_max_prompt, max_length=50)
        self.assertIn("Prompt is too long", str(context.exception))
    
    def test_validate_prompt_input_edge_cases(self):
        """Test validation with edge cases"""
        # Test with exactly minimum length
        min_length_prompt = "SaaS company"
        with self.assertRaises(ValueError) as context:
            InputValidator.validate_prompt_input(min_length_prompt)
        self.assertIn("Please provide more specific information", str(context.exception))
        
        # Test with mixed case business terms
        mixed_case_prompt = "Create Terms of Service for my SaaS COMPANY"
        result = InputValidator.validate_prompt_input(mixed_case_prompt)
        self.assertEqual(result, mixed_case_prompt.strip())
        
        # Test with punctuation and special characters
        special_char_prompt = "Draft terms of service for my e-commerce store (online business)!"
        result = InputValidator.validate_prompt_input(special_char_prompt)
        self.assertEqual(result, special_char_prompt.strip())
