# denofa/infrastructure/views.py

```python
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
```

# denofa/static/js/historial.js

```javascript
// denofa/static/js/historial.js
import { NAVBAR_HTML, FOOTER_HTML, formatDate } from './utils.js';

const VERDICT_PILL_MAP = {
  'CONFIABLE':               'verdict-pill--reliable',
  'DUDOSO':                  'verdict-pill--dubious',
  'PROBABLE DESINFORMACIÓN': 'verdict-pill--disinfo',
};

function loadHistory() {
  const el = document.getElementById('analyses-data');
  if (el) {
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      console.error('Error parsing analyses data:', e);
    }
  }
  return [];
}

function initNavAndFooter() {
  const navbarContainer = document.getElementById('navbar-placeholder');
  const footerContainer = document.getElementById('footer-placeholder');
  if (navbarContainer) navbarContainer.innerHTML = NAVBAR_HTML('historial');
  if (footerContainer) footerContainer.innerHTML = FOOTER_HTML;
}

function renderCard(item) {
  return `
    <li>
      <a href="/detalle/${item.id}/" 
         class="history-card"
         aria-label="Ver detalle del análisis">
        <div class="history-card__content">
          <div class="history-card__meta">
            <span class="verdict-pill verdict-pill--${item.verdict}">
              ${item.verdictLabel}
            </span>
            <span class="history-card__date">
              ${formatDate(item.timestamp)}
            </span>
          </div>
          <p class="history-card__excerpt">
            ${item.excerpt}
          </p>
        </div>
        <span class="history-card__link">
          Ver más
        </span>
      </a>
    </li>
  `;
}

function renderHistory(items) {
  const container = document.getElementById('history-list');
  const emptyState = document.getElementById('empty-state');
  if (!container) return;

  if (items.length === 0) {
    if (emptyState) emptyState.style.display = 'list-item';
    Array.from(container.children).forEach(child => {
      if (child.id !== 'empty-state') child.remove();
    });
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  const cardsHtml = items.map(item => {
    let verdictClassModifier = 'reliable';
    if (VERDICT_PILL_MAP[item.verdict]) {
      verdictClassModifier = VERDICT_PILL_MAP[item.verdict].replace('verdict-pill--', '');
    }
    const adaptedItem = {
      ...item,
      verdict: verdictClassModifier,
      verdictLabel: item.verdict,
      timestamp: item.date
    };
    return renderCard(adaptedItem);
  }).join('');

  container.innerHTML = (emptyState ? emptyState.outerHTML : '') + cardsHtml;
  
  const newEmptyState = document.getElementById('empty-state');
  if (newEmptyState) newEmptyState.style.display = 'none';

  const detailLinks = container.querySelectorAll('.history-card');
  detailLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Obtener el ID desde el href (ej: /detalle/10/)
      const parts = link.getAttribute('href').split('/');
      const id = parts[parts.length - 2];
      if (id) {
        sessionStorage.setItem('currentAnalysisId', id);
        sessionStorage.setItem('returnUrl', window.location.pathname);
        window.location.href = `/detalle/${id}/`;
      }
    });
  });
}

function initClearButton() {
  const btn = document.getElementById('btn-clear');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (confirm('¿Eliminar todo el historial?')) {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';

      fetch('/historial/limpiar/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        }
      })
      .then(res => {
        if (res.ok) {
          renderHistory([]);
        } else {
          alert('Error al limpiar el historial de la sesión');
        }
      })
      .catch(err => {
        console.error('Error:', err);
        alert('Error al conectar con el servidor.');
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('history-list')) {
    initNavAndFooter();
    const items = loadHistory();
    renderHistory(items);
    initClearButton();
  }
});
```

# denofa/templates/pages/historial.html

```html
{% extends 'base/_base.html' %}
{% load static %}

{% block title %}DenoFA - Historial{% endblock %}

{% block content %}
<section class="page-canvas">
  <div class="container" style="display:flex; flex-direction:column; align-items:center; width:100%;">
    
    <div style="width:100%; max-width:var(--max-width-card); 
      display:flex; justify-content:space-between; 
      align-items:center; margin-bottom:var(--space-lg);">
      <h1 style="font-family:var(--font-display); 
        font-size:var(--font-size-h1);">
        Historial de consultas
      </h1>
      <button id="btn-clear"
        aria-label="Limpiar historial"
        style="font-size:var(--font-size-label);
          color:var(--color-disinfo);
          font-weight:var(--font-weight-semibold);
          background:none; border:none; cursor:pointer;">
        Limpiar historial
      </button>
    </div>

    <ul id="history-list" 
      class="history-list"
      aria-label="Lista de consultas anteriores">

      <li id="empty-state" 
        style="text-align:center; 
          padding:var(--space-2xl) 0;
          color:var(--color-text-muted);
          font-size:var(--font-size-body);">
        Aún no has verificado ninguna noticia.
        ¡Anímate a probar tu primer enlace!
      </li>

    </ul>
  </div>
</section>
{% endblock %}

{% block scripts %}
<script id="analyses-data" type="application/json">
  {{ analyses_json|safe }}
</script>
<script type="module" src="{% static 'js/utils.js' %}"></script>
<script type="module" src="{% static 'js/historial.js' %}"></script>
{% endblock %}
```

# denofa/templates/pages/detalle.html

```html
{% extends 'base/_base.html' %}
{% load static %}

{% block title %}DenoFA - Análisis detallado{% endblock %}

{% block content %}
<section class="page-canvas">
  <div class="container" style="display:flex; flex-direction:column; align-items:center;">
    <div class="card" style="padding: 0;">
      
      <header style="padding: var(--space-xl); border-bottom: 1px solid var(--color-border);">
        <a href="/resultado/" style="display:inline-flex; align-items:center; gap:4px; font-size:14px; margin-bottom:var(--space-sm); color:var(--color-text-secondary);">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Volver al resultado
        </a>
        <h1 style="font-size: 24px;">Análisis detallado</h1>
      </header>

      <div id="analysis-rows" style="padding: 0 var(--space-xl);">
        {% for snippet in snippets %}
        <article class="analysis-row">
          <div style="margin-bottom: var(--space-xs);">
            <span class="verdict-pill verdict-pill--{{ snippet.status }}">
              {% if snippet.status == 'reliable' %}Verificado
              {% elif snippet.status == 'dubious' %}Dudoso
              {% else %}No verificado
              {% endif %}
            </span>
          </div>
          <blockquote class="analysis-row__fragment">
            "{{ snippet.text }}"
          </blockquote>
          <p class="analysis-row__explanation">
            {{ analysis.explanation }}
          </p>
        </article>
        {% empty %}
        <p style="padding: var(--space-xl) 0; text-align: center; color: var(--color-text-muted);">
          No se detectaron fragmentos sospechosos en este análisis.
        </p>
        {% endfor %}
      </div>

      <div class="actions-row" style="padding: var(--space-xl); border-top: 1px solid var(--color-border);">
        <a href="/resultado/" class="btn btn--outline" style="flex:1; text-align:center;">Volver</a>
        <a href="/" class="btn btn--primary" style="flex:1; text-align:center;">Nueva consulta</a>
      </div>

    </div>
  </div>
</section>
{% endblock %}

{% block scripts %}
<script type="module" src="{% static 'js/detalle.js' %}"></script>
{% endblock %}
```
