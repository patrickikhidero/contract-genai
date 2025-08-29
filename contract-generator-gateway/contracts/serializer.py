from rest_framework import serializers


class GenerateContractRequestSerializer(serializers.Serializer):
    prompt = serializers.CharField(
        help_text="Business context in plain language. Example: 'Draft ToS for a cloud SaaS company in New York'"
    )


class GenerateContractResponseSerializer(serializers.Serializer):
    contract = serializers.CharField(help_text="The generated contract content")
