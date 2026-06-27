# denofa/application/use_cases.py
from denofa.domain.services import CredibilityDomainService
from denofa.application.ports import HistoryRepositoryPort
from typing import Any

class AnalyzeTextUseCase:
    """Caso de uso para el análisis de credibilidad de texto (Demo Simulada)."""
    
    def __init__(self, ai_port):
        self.ai_port = ai_port
        
    def execute(self, text: str) -> dict:
        # 1. Validar el texto usando las reglas de dominio
        validation = CredibilityDomainService.validate_text(text)
        if not validation['valid']:
            raise ValueError(validation['error'])
            
        # 2. Obtener el resultado utilizando la API de Gemini (o mock en su defecto)
        clean_text = validation['text']
        analysis = self.ai_port.analyze(clean_text)
        
        return analysis

class SaveAnalysisUseCase:
    """Caso de uso para persistir un análisis."""
    def __init__(self, repository: HistoryRepositoryPort):
        self.repository = repository

    def execute(self, session_key: str, input_type: str, content: str, results: dict) -> Any:
        return self.repository.save_analysis(session_key, input_type, content, results)

class GetHistoryUseCase:
    """Caso de uso para obtener todo el historial de una sesión."""
    def __init__(self, repository: HistoryRepositoryPort):
        self.repository = repository

    def execute(self, session_key: str) -> list:
        return self.repository.get_session_history(session_key)

class GetAnalysisDetailUseCase:
    """Caso de uso para obtener el detalle de un análisis con validación de seguridad de sesión."""
    def __init__(self, repository: HistoryRepositoryPort):
        self.repository = repository

    def execute(self, session_key: str, analysis_id: int) -> Any:
        analysis = self.repository.get_analysis_by_id(analysis_id)
        if analysis and getattr(analysis, 'session_key', '') == session_key:
            return analysis
        return None

class DeleteAnalysisUseCase:
    """Caso de uso para vaciar el historial de análisis de la sesión."""
    def __init__(self, repository: HistoryRepositoryPort):
        self.repository = repository

    def execute(self, session_key: str) -> None:
        self.repository.delete_session_history(session_key)
