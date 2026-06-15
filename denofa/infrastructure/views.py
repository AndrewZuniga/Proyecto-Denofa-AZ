# denofa/infrastructure/views.py
import json
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from denofa.infrastructure.models import SessionAnalysis
from denofa.application.use_cases import AnalyzeTextUseCase

@ensure_csrf_cookie
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
    analysis = get_object_or_404(SessionAnalysis, id=analysis_id)
    return render(request, 'pages/detalle.html', {'analysis': analysis})

def analyze_view(request):
    if request.method != 'POST':
        return HttpResponse("Método no permitido", status=405)
        
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            text = data.get('text', '')
        else:
            text = request.POST.get('text', '')
            
        use_case = AnalyzeTextUseCase()
        result = use_case.execute(text)
        
        return JsonResponse(result)
        
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': 'Error interno al procesar la solicitud.'}, status=500)