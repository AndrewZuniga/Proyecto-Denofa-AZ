# denofa/application/use_cases.py
from denofa.domain.services import CredibilityDomainService

class AnalyzeTextUseCase:
    """Caso de uso para el análisis de credibilidad de texto (Demo Simulada)."""
    
    def execute(self, text: str) -> dict:
        # 1. Validar el texto usando las reglas de dominio
        validation = CredibilityDomainService.validate_text(text)
        if not validation['valid']:
            raise ValueError(validation['error'])
            
        # 2. Obtener el resultado simulado variable del servicio de dominio
        clean_text = validation['text']
        analysis = CredibilityDomainService.generate_mock_analysis(clean_text)
        
        return analysis
