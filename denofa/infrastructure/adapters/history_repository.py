# denofa/infrastructure/adapters/history_repository.py
import json
from typing import List, Any, Dict
from denofa.application.ports import HistoryRepositoryPort, CredibilityResult
from denofa.infrastructure.models import SessionAnalysis

class DjangoHistoryRepositoryAdapter(HistoryRepositoryPort):
    """Adaptador de persistencia e historial que implementa HistoryRepositoryPort usando Django ORM."""

    def save_analysis(self, session_key: str, input_type: str, content: str, results: CredibilityResult) -> Any:
        # Serializamos los fragmentos sospechosos a un string JSON para guardarlo
        fragments_data = results.get('snippets', results.get('fragments', results.get('fragmentos_sospechosos', [])))
        snippets_str = json.dumps(fragments_data)
        
        analysis = SessionAnalysis.objects.create(
            session_key=session_key,
            input_type=input_type,
            original_content=content,
            verdict=results.get('verdict'),
            score=results.get('score'),
            explanation=results.get('explanation'),
            snippets_json=snippets_str
        )
        return analysis

    def get_session_history(self, session_key: str) -> List[Any]:
        # El modelo SessionAnalysis ya tiene 'ordering = ["-created_at"]' en Meta
        return list(SessionAnalysis.objects.filter(session_key=session_key))

    def get_analysis_by_id(self, analysis_id: int) -> Any:
        try:
            return SessionAnalysis.objects.get(id=analysis_id)
        except SessionAnalysis.DoesNotExist:
            return None

    def delete_session_history(self, session_key: str) -> None:
        SessionAnalysis.objects.filter(session_key=session_key).delete()
