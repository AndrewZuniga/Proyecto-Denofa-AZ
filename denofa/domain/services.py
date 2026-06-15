class CredibilityDomainService:
    """
    Contiene las reglas de negocio puras para la clasificación taxonómica 
    y validación de estructuras de los análisis de credibilidad de Denofa.
    Totalmente desacoplado de frameworks e infraestructura.
    """

    @staticmethod
    def get_verdict_by_score(score: int) -> str:
        """
        Determina el veredicto textual con base en el score numérico (F-16, F-17).
        Aplica los rangos estrictos definidos en las historias de usuario (HU-14).
        """
        if not (0 <= score <= 100):
            raise ValueError("El score de credibilidad debe estar estrictamente entre 0 y 100.")

        if score >= 70:
            return "CONFIABLE"
        elif score >= 40:
            return "DUDOSO"
        else:
            return "PROBABLE DESINFORMACIÓN"

    @staticmethod
    def get_color_code_by_verdict(verdict: str) -> str:
        mapping = {
            "CONFIABLE":               "reliable",  # → .badge--reliable
            "DUDOSO":                  "dubious",   # → .badge--dubious
            "PROBABLE DESINFORMACIÓN": "disinfo",   # → .badge--disinfo
        }
        if verdict not in mapping:
            raise ValueError(f"Veredicto '{verdict}' no reconocido.")
        return mapping[verdict]

    @staticmethod
    def sanitize_explanation_length(explanation: str) -> str:
        """
        Asegura el cumplimiento técnico del límite de palabras en la explicación (F-18).
        Si excede el estándar comprensible de 120 palabras, lo trunca y añade puntos suspensivos.
        """
        words = explanation.split()
        if len(words) > 120:
            return " ".join(words[:120]) + "..."
        return explanation
    @staticmethod
    def validate_text(text: str) -> dict:
        if not text or not text.strip():
            return {'valid': False, 'error': 'El texto no contiene contenido analizable.'}
        clean = text.strip()
        if len(clean) < 20:
            return {'valid': False, 'error': 'Ingresa al menos 20 caracteres.'}
        truncated = len(clean) > 5000
        return {'valid': True, 'error': None, 'text': clean[:5000], 'truncated': truncated}

    @staticmethod
    def validate_url(url: str) -> dict:
        BLOCKED = ['facebook.com', 'instagram.com', 'tiktok.com', 'x.com', 'twitter.com']
        if not url or not url.strip().startswith(('http://', 'https://')):
            return {'valid': False, 'error': 'El enlace debe comenzar con http:// o https://'}
        if any(domain in url for domain in BLOCKED):
            return {'valid': False, 'error': 'Esta plataforma no permite extracción. Copia el texto o sube una captura.'}
        return {'valid': True, 'error': None, 'url': url.strip()}