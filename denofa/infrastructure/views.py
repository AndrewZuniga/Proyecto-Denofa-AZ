# denofa/infrastructure/views.py
import json
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse, Http404
from django.views.decorators.csrf import ensure_csrf_cookie
from denofa.infrastructure.adapters.history_repository import DjangoHistoryRepositoryAdapter
from denofa.application.use_cases import (
    AnalyzeTextUseCase,
    SaveAnalysisUseCase,
    GetHistoryUseCase,
    GetAnalysisDetailUseCase,
    DeleteAnalysisUseCase
)

@ensure_csrf_cookie
def index_view(request):
    """Renderiza la página de inicio principal con la caja inteligente (CU-01)."""
    if not request.session.session_key:
        request.session.create()
        request.session['initiated'] = True
    return render(request, 'pages/index.html')

def history_view(request):
    """
    Consulta y despliega el historial cronológico de análisis (CU-07).
    Filtra los resultados usando la clave de sesión anónima del usuario.
    """
    if not request.session.session_key:
        request.session.create()
        request.session['initiated'] = True
    
    session_key = request.session.session_key
    repository = DjangoHistoryRepositoryAdapter()
    use_case = GetHistoryUseCase(repository)
    analyses = use_case.execute(session_key)
    
    # Serializar el historial a un formato compatible con historial.js
    analyses_list = []
    for item in analyses:
        analyses_list.append({
            'id': item.id,
            'verdict': item.verdict,  # 'CONFIABLE', etc.
            'date': item.created_at.isoformat(),
            'excerpt': item.original_content[:70] + ('...' if len(item.original_content) > 70 else '')
        })
    analyses_json = json.dumps(analyses_list)
    
    return render(request, 'pages/historial.html', {
        'analyses': analyses,
        'analyses_json': analyses_json
    })

def detail_view(request, analysis_id):
    """Muestra el desglose y análisis detallado de una consulta pasada (HU-21)."""
    if not request.session.session_key:
        request.session.create()
        request.session['initiated'] = True
        
    session_key = request.session.session_key
    repository = DjangoHistoryRepositoryAdapter()
    use_case = GetAnalysisDetailUseCase(repository)
    analysis = use_case.execute(session_key, analysis_id)
    
    if not analysis:
        raise Http404("El análisis no existe o no pertenece a la sesión activa.")
        
    # Deserializar los fragmentos JSON guardados
    try:
        snippets = json.loads(analysis.snippets_json) if analysis.snippets_json else []
    except Exception:
        snippets = []
        
    return render(request, 'pages/detalle.html', {
        'analysis': analysis,
        'snippets': snippets
    })

def analyze_view(request):
    if request.method != 'POST':
        return HttpResponse("Método no permitido", status=405)
        
    try:
        if not request.session.session_key:
            request.session.create()
            request.session['initiated'] = True
            
        session_key = request.session.session_key
        
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            text = data.get('text', '')
        else:
            text = request.POST.get('text', '')
            
        # 1. Ejecutar análisis sintáctico/dominio
        analyze_use_case = AnalyzeTextUseCase()
        result = analyze_use_case.execute(text)
        
        # 2. Persistir automáticamente en base de datos
        repository = DjangoHistoryRepositoryAdapter()
        save_use_case = SaveAnalysisUseCase(repository)
        analysis_obj = save_use_case.execute(session_key, 'text', text, result)
        
        # 3. Adjuntar el ID autogenerado a la respuesta
        result['id'] = analysis_obj.id
        
        return JsonResponse(result)
        
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': 'Error interno al procesar la solicitud.'}, status=500)

def clear_history_view(request):
    """Limpia todo el historial de la sesión del usuario."""
    if request.method != 'POST':
        return HttpResponse("Método no permitido", status=405)
        
    if not request.session.session_key:
        request.session.create()
        
    session_key = request.session.session_key
    repository = DjangoHistoryRepositoryAdapter()
    use_case = DeleteAnalysisUseCase(repository)
    use_case.execute(session_key)
    
    return JsonResponse({'status': 'ok'})

def resultado_view(request):
    return render(request, 'pages/resultado.html')