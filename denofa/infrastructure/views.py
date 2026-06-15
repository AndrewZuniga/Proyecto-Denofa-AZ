# denofa/infrastructure/views.py
from django.shortcuts import render, get_object_or_404  # <-- CORREGIDO AQUÍ
from django.http import HttpResponse
from denofa.infrastructure.models import SessionAnalysis

def index_view(request):
    """Renderiza la página de inicio principal con la caja inteligente (CU-01)."""
    return render(request, 'pages/index.html')

def history_view(request):
    """
    Consulta y despliega el historial cronológico de análisis (CU-07).
    Filtra los resultados usando la clave de sesión anónima del usuario.
    """
    if not request.session.session_key:
        request.session.create()
    
    session_key = request.session.session_key
    analyses = SessionAnalysis.objects.filter(session_key=session_key)
    
    return render(request, 'pages/historial.html', {'analyses': analyses})

def detail_view(request, analysis_id):
    """Muestra el desglose y análisis detallado de una consulta pasada (HU-21)."""
    # Recupera el análisis por ID o devuelve un error 404 si no existe (CORREGIDO)
    analysis = get_object_or_404(SessionAnalysis, id=analysis_id)
    return render(request, 'pages/detalle.html', {'analysis': analysis})

def analyze_view(request):
    if request.method == 'POST':
        return render(request, 'pages/resultado.html')
        
    return HttpResponse("Método no permitido", status=405)