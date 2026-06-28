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
        snippets = []
        try:
            parsed = json.loads(item.snippets_json) if item.snippets_json else []
            if isinstance(parsed, dict):
                snippets = parsed.get('snippets', [])
            elif isinstance(parsed, list):
                snippets = parsed
        except Exception:
            snippets = []
            
        analyses_list.append({
            'id': item.id,
            'verdict': item.verdict,  # 'CONFIABLE', etc.
            'score': item.score,
            'date': item.created_at.isoformat(),
            'excerpt': item.original_content[:70] + ('...' if len(item.original_content) > 70 else ''),
            'snippets': snippets
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
        
    # Deserializar los fragmentos JSON guardados (compatible con formato viejo y nuevo)
    snippets = []
    sources = []
    has_grounding = False
    try:
        parsed = json.loads(analysis.snippets_json) if analysis.snippets_json else []
        if isinstance(parsed, dict):
            # Formato nuevo: {"snippets": [...], "sources": [...], "has_grounding": bool}
            snippets = parsed.get('snippets', [])
            sources = parsed.get('sources', [])
            has_grounding = parsed.get('has_grounding', False)
        elif isinstance(parsed, list):
            # Formato viejo: array plano de snippets, sin fuentes
            snippets = parsed
    except Exception:
        snippets = []
        sources = []
        has_grounding = False
        
    return render(request, 'pages/detalle.html', {
        'analysis': analysis,
        'snippets': snippets,
        'sources': sources,
        'has_grounding': has_grounding
    })

def analyze_view(request):
    if request.method != 'POST':
        return HttpResponse("Método no permitido", status=405)
        
    try:
        if not request.session.session_key:
            request.session.create()
            request.session['initiated'] = True
            
        session_key = request.session.session_key
        
        input_type = 'text'

        if 'image' in request.FILES:
            image_file = request.FILES['image']
            image_bytes = image_file.read()
            mime_type = image_file.content_type or 'image/png'
            
            from denofa.infrastructure.adapters.ai_analysis_adapter import GeminiAiAnalysisAdapter
            ai_adapter = GeminiAiAnalysisAdapter()
            try:
                text_to_analyze = ai_adapter.extract_text_from_image(image_bytes, mime_type)
            except ValueError as e:
                return JsonResponse({'error': str(e)}, status=400)
            
            text = text_to_analyze
            input_type = 'image'
        else:
            if request.content_type == 'application/json':
                data = json.loads(request.body)
                text = data.get('text', '')
            else:
                text = request.POST.get('text', '')
            
            text_to_analyze = text.strip()
            if text_to_analyze.lower().startswith('http'):
                from denofa.domain.services import CredibilityDomainService
                url_validation = CredibilityDomainService.validate_url(text_to_analyze)
                if not url_validation['valid']:
                    return JsonResponse({'error': url_validation['error']}, status=400)
                
                from denofa.infrastructure.adapters.url_scraper import scrape_url
                text_to_analyze = scrape_url(url_validation['url'])
                input_type = 'url'
            
        # 1. Ejecutar análisis sintáctico/dominio
        from denofa.infrastructure.adapters.ai_analysis_adapter import GeminiAiAnalysisAdapter
        ai_adapter = GeminiAiAnalysisAdapter()
        analyze_use_case = AnalyzeTextUseCase(ai_port=ai_adapter)
        result = analyze_use_case.execute(text_to_analyze)
        
        if isinstance(result, dict) and result.get("not_news") is True:
            return JsonResponse({"error": "El contenido ingresado no parece ser una noticia o afirmación verificable."}, status=400)
            
        # 2. Persistir automáticamente en base de datos
        repository = DjangoHistoryRepositoryAdapter()
        save_use_case = SaveAnalysisUseCase(repository)
        analysis_obj = save_use_case.execute(session_key, input_type, text, result)
        
        # 3. Adjuntar el ID autogenerado a la respuesta
        result['id'] = analysis_obj.id
        
        return JsonResponse(result)
        
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        print(f"ERROR EN ANALYZE_VIEW: {type(e).__name__}: {e}")
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

def about_view(request):
    return render(request, 'pages/about.html')

def privacy_view(request):
    return render(request, 'pages/privacidad.html')

def terms_view(request):
    return render(request, 'pages/terminos.html')

def contact_view(request):
    return render(request, 'pages/contacto.html')

