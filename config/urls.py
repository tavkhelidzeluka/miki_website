"""Top-level URL config. Routes admin + API, then serves the frontend."""

from django.contrib import admin
from django.urls import path, re_path

from core import views

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/health/', views.health, name='api-health'),
    path('api/contact/', views.contact, name='api-contact'),

    path('', views.index, name='index'),
    re_path(r'^(?P<path>(assets|fonts|screenshots|uploads)/.*)$', views.frontend_file),
    re_path(r'^(?P<path>[^/]+\.(?:css|js|jsx|html|ico|png|jpg|jpeg|webp|svg|pdf|otf|ttf|woff2?))$', views.frontend_file),
]
