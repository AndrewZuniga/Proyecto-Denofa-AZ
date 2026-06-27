# denofa/application/ports.py
from abc import ABC, abstractmethod
from typing import TypedDict, BinaryIO, Any
# 1. Definir excepciones de dominio específicas
class PortException(Exception): """Excepción base para fallos de puertos."""
class ScrapingError(PortException): """Error al extraer contenido web."""
class OCRError(PortException): """Error al procesar la imagen."""
class AnalysisError(PortException): """Error al llamar al modelo generativo."""
# 2. Contratos explícitos con TypedDict
class FragmentoSospechoso(TypedDict):
    texto: str
    razon: str
class CredibilityResult(TypedDict):
    verdict: str
    score: int
    explanation: str
    fragmentos_sospechosos: list[FragmentoSospechoso]
class ScraperPort(ABC):
    @abstractmethod
    def extract_text(self, url: str) -> str:
        """Debe extraer el contenido principal. Lanza ScrapingError en caso de fallo."""
        pass
class VisionPort(ABC):
    @abstractmethod
    def extract_text_from_image(self, image_file: BinaryIO) -> str:
        """Debe procesar la imagen (ej: como stream binario). Lanza OCRError en caso de fallo."""
        pass
class AiAnalysisPort(ABC):
    @abstractmethod
    def analyze(self, text: str) -> dict:
        """
        Analiza el texto y retorna un diccionario con verdict, score, explanation,
        fragments y opcionalmente not_news. Implementado por adaptadores concretos.
        """
        pass
class HistoryRepositoryPort(ABC):
    @abstractmethod
    def save_analysis(self, session_key: str, input_type: str, content: str, results: CredibilityResult) -> None:
        """Persiste el resultado asociado al id anónimo de sesión."""
        pass
    @abstractmethod
    def get_session_history(self, session_key: str) -> list[CredibilityResult]:
        """Recupera la lista cronológica de análisis de la sesión activa."""
        pass
    @abstractmethod
    def get_analysis_by_id(self, analysis_id: int) -> Any:
        """Recupera un análisis específico por su identificador primario."""
        pass
    @abstractmethod
    def delete_session_history(self, session_key: str) -> None:
        """Elimina todos los análisis asociados a una sesión activa."""
        pass