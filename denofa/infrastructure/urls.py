from django.urls import path
from denofa.infrastructure.views import index_view, analyze_view, history_view, detail_view

app_name = 'denofa'

urlpatterns = [
    path('', index_view, name='index'),
    path('historial/', history_view, name='historial'),
    path('detalle/<int:analysis_id>/', detail_view, name='detalle'), 
    path('analyze/', analyze_view, name='analyze'), 
]