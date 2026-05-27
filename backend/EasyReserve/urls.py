from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Documentation OpenAPI / Swagger UI interactive
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Authentification JWT sécurisée
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Modules métiers de l'écosystème EasyReserve
    path('api/users/', include('users.urls')),
    path('api/agences/', include('agences.urls')),
    path('api/bus/', include('buses.urls')),
    path('api/trajets/', include('trajets.urls')),
    path('api/reservations/', include('reservations.urls')),
    path('api/paiements/', include('paiements.urls')),
]
