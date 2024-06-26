"""
URL configuration for jwtauth project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path
from jwtapp.jwt import CustomTokenVerifyView, GenerateTokenView, BlacklistTokenView

urlpatterns = [
    path('api-jwt/token/verify', CustomTokenVerifyView.as_view(), name='token_verify'),
    path('api-jwt/token/generate', GenerateTokenView.as_view(), name='token_generate'),
    path('api-jwt/token/blacklist', BlacklistTokenView.as_view(), name='token_blacklist'),
]
