import os
import httpx
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.http import StreamingHttpResponse
from .serializer import GenerateContractRequestSerializer, GenerateContractResponseSerializer

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
URL = os.getenv("URL")


class GenerateContractView(APIView):
    """    
    Returns a generated Terms of Service contract in HTML format.
    """
    @swagger_auto_schema(
        request_body=GenerateContractRequestSerializer,
        responses={200: GenerateContractResponseSerializer}
    )
    def post(self, request):
        serializer = GenerateContractRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_prompt = serializer.validated_data['prompt']

        payload = {
            "contents": [{
                "parts": [{
                    "text": f"You are a legal AI assistant. Write a 10+ page Terms of Service contract "
                            f"for the following business. Format in clean HTML with section numbering. "
                            f"Business context: {user_prompt}"
                }]
            }]
        }

        url = URL
        headers = {"Content-Type": "application/json"}
        params = {"key": GEMINI_API_KEY}

        with httpx.Client(timeout=httpx.Timeout(600.0)) as client:  
            r = client.post(url, headers=headers, params=params, json=payload)
            r.raise_for_status()
            data = r.json()

        text_output = data["candidates"][0]["content"]["parts"][0]["text"]
        return Response({"contract": text_output})


class StreamContractView(APIView):
    """
    Stream contract generation with Gemini 2.0 Flash
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
        responses={200: "text/event-stream"}
    )
    def get(self, request):
        user_prompt = request.GET.get("prompt", "")

        payload = {
            "contents": [{
                "parts": [{
                    "text": f"You are a legal AI assistant. Write a long HTML Terms of Service. "
                            f"Business context: {user_prompt}"
                }]
            }]
        }

        def event_stream():
            url = URL
            headers = {"Content-Type": "application/json"}
            params = {"key": GEMINI_API_KEY}

            with httpx.stream("POST", url, headers=headers, params=params, json=payload, timeout=None) as r:
                for line in r.iter_lines():
                    if line:
                        yield f"data: {line}\n\n"

        return StreamingHttpResponse(event_stream(), content_type="text/event-stream")



