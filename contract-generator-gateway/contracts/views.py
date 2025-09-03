import httpx
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.http import StreamingHttpResponse
from .utils.validators import InputValidator, GEMINI_API_KEY, URL

logger = logging.getLogger(__name__)


class StreamContractView(APIView):
    """
    Stream contract generation
    """
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'prompt',
                openapi.IN_QUERY,
                description="Business context in plain language",
                type=openapi.TYPE_STRING,
                required=True,
            )
        ],
        responses={
            200: "text/event-stream",
            400: "Bad Request - Invalid or missing prompt",
            500: "Internal Server Error - API or service unavailable"
        }
    )
    def get(self, request):
        try:
            try:
                user_prompt = InputValidator.validate_prompt_input(request.GET.get("prompt", ""))
            except ValueError as e:
                logger.warning(f"Invalid prompt input: {str(e)}")
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            logger.info(f"Starting contract generation for prompt: {user_prompt[:100]}...")

            payload = {
                "contents": [{
                    "parts": [{
                        "text": f"You are a legal AI assistant. Write a long HTML Terms of Service. "
                                f"Business context: {user_prompt}"
                    }]
                }]
            }

            def event_stream():
                try:
                    url = URL
                    headers = {"Content-Type": "application/json"}
                    params = {"key": GEMINI_API_KEY}

                    timeout = httpx.Timeout(300.0, connect=10.0)

                    with httpx.stream(
                        "POST", 
                        url, 
                        headers=headers, 
                        params=params, 
                        json=payload, 
                        timeout=timeout
                    ) as response:
                        response.raise_for_status()
                        
                        for line in response.iter_lines():
                            if line:
                                yield f"data: {line}\n\n"
                                
                except httpx.TimeoutException:
                    logger.error("Request timeout when calling API")
                    yield f"data: {self._format_error('Request timeout. Please try again.')}\n\n"
                except httpx.ConnectError:
                    logger.error("Connection error when calling API")
                    yield f"data: {self._format_error('Unable to connect to AI service. Please try again later.')}\n\n"
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error from API: {e.response.status_code} - {e.response.text}")
                    if e.response.status_code == 401:
                        yield f"data: {self._format_error('Authentication failed. Please check API configuration.')}\n\n"
                    elif e.response.status_code == 429:
                        yield f"data: {self._format_error('Rate limit exceeded. Please try again later.')}\n\n"
                    elif e.response.status_code >= 500:
                        yield f"data: {self._format_error('AI service is temporarily unavailable. Please try again later.')}\n\n"
                    else:
                        yield f"data: {self._format_error('AI service error. Please try again.')}\n\n"
                except httpx.RequestError as e:
                    logger.error(f"Request error when calling API: {str(e)}")
                    yield f"data: {self._format_error('Network error. Please check your connection and try again.')}\n\n"
                except Exception as e:
                    logger.error(f"Unexpected error in event stream: {str(e)}")
                    yield f"data: {self._format_error('An unexpected error occurred. Please try again.')}\n\n"

            return StreamingHttpResponse(
                event_stream(), 
                content_type="text/event-stream",
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no' 
                }
            )

        except Exception as e:
            logger.error(f"Unexpected error in StreamContractView: {str(e)}")
            return Response(
                {"error": "An unexpected error occurred. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _format_error(self, message):
        """Format error message for streaming response"""
        return f'{{"error": "{message}", "type": "error"}}'