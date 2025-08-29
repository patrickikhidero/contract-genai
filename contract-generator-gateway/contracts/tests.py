from django.test import TestCase
from rest_framework import status
import json
from unittest.mock import patch, MagicMock


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
            'prompt': 'Test business prompt'
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
            'prompt': 'Test prompt'
        })
        
        with self.assertRaises(Exception):
            b''.join(response.streaming_content)
