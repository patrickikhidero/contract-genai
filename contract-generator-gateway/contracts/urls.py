from django.urls import path
from .views import StreamContractView

urlpatterns = [
    path('stream/', StreamContractView.as_view(), name='stream-contract'),
]
