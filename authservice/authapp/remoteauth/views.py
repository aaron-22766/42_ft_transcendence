import os
import json
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseRedirect, JsonResponse
from players.models import Players
from django.contrib.auth.models import User
from remoteauth.utils import authorize
from django.contrib.auth import login
from players.serializers import PlayerSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import redirect
from rest_framework import permissions
from django.http import JsonResponse
from remoteauth.authentication import RemoteJWTAUthentication
from rest_framework.permissions import AllowAny


def get_user_info(access_token):
    url = 'https://api.intra.42.fr/v2/me'
    header = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(url, headers=header)

    if response.status_code == 200:
        user_info = response.json()
        player = create_player_from_user_info(user_info=user_info)
        return player
    else:
        print(f"Request failed with status code {response.status_code}")
        return None


def create_player_from_user_info(user_info):
    username = user_info.get('login', '')
    first_name = user_info.get('first_name', '')
    last_name = user_info.get('last_name', '')
    email = user_info.get('email', '')
    profile_img_uri = user_info.get('image', {}).get('link', '')

    existing_user = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()

    if existing_user:
        player = Players.objects.filter(user=existing_user).first()
        if not player:
            player = Players.objects.create(user=existing_user, profile_img_uri=profile_img_uri)
        return player
    else:
        user = User.objects.create_user(username=username, first_name=first_name, last_name=last_name, email=email)
        player = Players.objects.create(user=user, profile_img_uri=profile_img_uri)
        return player


class authorizeCall(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    def post(self, request, format=None):
        token = request.COOKIES.get('access_token')
        return_data = {'location': authorize()}
        login_response = JsonResponse(return_data)
        if token:
            login_response.delete_cookie('access_token', path='/', domain=None)
            login_response.delete_cookie('user', path='/', domain=None)
            login_response.delete_cookie('2fa', path='/', domain=None)
            login_response.delete_cookie('player_id', path='/', domain=None)
            login_response.status_code = 200
        return login_response

class loggedIn(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, format=None):
        return Response({'detail': 'Successful operation. user is logged in.'})

class logOut(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, format=None):
        oauth_response = HttpResponse("Successful operation. User logged out and cookies cleared.")
        oauth_response.delete_cookie('access_token', path='/', domain=None)
        oauth_response.delete_cookie('user', path='/', domain=None)
        oauth_response.delete_cookie('2fa', path='/', domain=None)
        oauth_response.delete_cookie('player_id', path='/', domain=None)
        oauth_response.status_code = 200
        return oauth_response

class callbackCode(APIView):
    def get(self, request, format=None):
        code = request.GET.get('code', None)
        state = request.GET.get('state', None)
        if 'code' in request.GET and 'state' in request.GET:
            if state != os.getenv("STATE"):
                return HttpResponseBadRequest("Invalid state parameter")
            token_url = 'https://api.intra.42.fr/oauth/token'
            data = {
                'grant_type': 'authorization_code',
                'client_id': os.getenv("CLIENT_ID"),
                'client_secret': os.getenv("CLIENT_SECRET"),
                'code': code,
                'redirect_uri': os.getenv("REDIRECT_URI"),
            }
            response = requests.post(token_url, data=data)
            if response.status_code == 200:
                access_token = response.json().get('access_token')
                if not access_token:
                    return HttpResponseBadRequest('Missing Access Token in response received from 42 oauth.')
                player = get_user_info(access_token=access_token)
                jwt_service_url = 'http://jwtservice:8000/api-jwt/token/generate'
                send_data = {'user_id': player.user.id, 'username': player.user.username, 'email': player.user.email, 'access_token': access_token}
                send_json = json.dumps(send_data)
                response = requests.post(jwt_service_url, json=send_data, headers={'Content-Type': 'application/json'})
                response.raise_for_status()
                data = response.json()
                refresh_str = data.get('referesh_jwt_token')
                refresh = RefreshToken(refresh_str)
                if player and refresh and player.two_factor is False:
                    return_data = {'profile_image_url': player.profile_img_uri, 'detail': 'Successful operation. Cookies set with JWT token, username, and user ID'}
                    return_json = json.dumps(return_data)
                    oauth_response = HttpResponse(return_json, content_type='application/json')
                    oauth_response.set_cookie('access_token', refresh.access_token, httponly=True, secure=True)
                    oauth_response.set_cookie('user', player.user, httponly=False, secure=True)
                    oauth_response.set_cookie('2fa', player.two_factor, httponly=False, secure=True)
                    oauth_response.set_cookie('player_id', player.id, httponly=False, secure=True)
                    return oauth_response
                else:
                    return Response({'detail': 'Two-factor authentication is enabled for this user.'}, status=status.HTTP_200_OK)
            else:
                return HttpResponseBadRequest('Invalid Authorization Request to 42 oauth.')
        else:
            return Response({'Missing code or state parameter'}, status=status.HTTP_400_BAD_REQUEST)
