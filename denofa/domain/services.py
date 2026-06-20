import os
import json

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
    def generate_mock_analysis(text: str) -> dict:
        """
        Genera un análisis simulado de manera determinista y variable 
        basado en la estructura del texto de entrada (sin Gemini).
        """
        clean_text = text.strip()
        length = len(clean_text)
        words = clean_text.split()
        word_count = len(words)
        
        # 1. Contar signos de exclamación
        exclamations = clean_text.count('!')
        
        # 2. Contar porcentaje de mayúsculas (sobre caracteres alfabéticos)
        alpha_chars = [c for c in clean_text if c.isalpha()]
        uppercase_count = sum(1 for c in alpha_chars if c.isupper())
        uppercase_pct = (uppercase_count / len(alpha_chars) * 100) if alpha_chars else 0
        
        # 3. Calcular score determinista (inicia en 85)
        score = 85
        
        # Penalizaciones por devaluación de tono neutral
        score -= min(exclamations * 6, 24)  # Hasta -24 puntos por exclamaciones
        
        if uppercase_pct > 25:
            score -= 15  # -15 puntos por exceso de mayúsculas
        elif uppercase_pct > 15:
            score -= 7
            
        if length < 50:
            score -= 10  # -10 puntos por texto demasiado corto
            
        # Variabilidad determinista por cantidad de palabras
        score += (word_count % 7) - 3  # Entre -3 y +3
        
        # Acotar
        score = max(0, min(100, score))
        
        # 4. Veredicto y mapeo de color
        verdict = CredibilityDomainService.get_verdict_by_score(score)
        
        # 5. Generar explicación y fragmentos dinámicos
        fragments = []
        if score >= 70:
            explanation = (
                f"El texto analizado (de {word_count} palabras) presenta una estructura neutral. "
                f"No se detectan patrones de urgencia, signos de exclamación excesivos ni uso atípico de mayúsculas. "
                f"El tono de la redacción es compatible con estándares informativos normales."
            )
            fragments.append({"text": "Estructura informativa neutral", "status": "reliable"})
        elif score >= 40:
            explanation = "El texto muestra un tono dudoso. "
            reasons = []
            if exclamations > 0:
                reasons.append("el uso de signos de exclamación que añaden sesgo emocional")
                fragments.append({"text": "Puntuación sensacionalista", "status": "dubious"})
            if uppercase_pct > 15:
                reasons.append("un uso elevado de letras mayúsculas que genera sensación de alarma")
                fragments.append({"text": "Énfasis en mayúsculas", "status": "dubious"})
            if length < 50:
                reasons.append("una longitud corta para desarrollar un reporte estructurado")
                fragments.append({"text": "Brevedad sospechosa", "status": "dubious"})
                
            explanation += f"Se detecta {', '.join(reasons) if reasons else 'una redacción inusual'}. Se recomienda verificar con fuentes primarias."
        else:
            explanation = (
                f"Alerta: El contenido presenta múltiples indicadores sintácticos de desinformación. "
                f"El uso de {exclamations} signos de exclamación y un {int(uppercase_pct)}% de mayúsculas "
                f"delatan un tono alarmista diseñado para apelar a emociones rápidas antes que informar de forma objetiva."
            )
            fragments.append({"text": "Tono alarmista extremo", "status": "disinfo"})
            fragments.append({"text": "Uso excesivo de mayúsculas", "status": "disinfo"})
            
        return {
            "score": score,
            "verdict": verdict,
            "explanation": explanation,
            "fragments": fragments
        }


    @staticmethod
    def validate_url(url: str) -> dict:
        BLOCKED = ['facebook.com', 'instagram.com', 'tiktok.com', 'x.com', 'twitter.com']
        if not url or not url.strip().startswith(('http://', 'https://')):
            return {'valid': False, 'error': 'El enlace debe comenzar con http:// o https://'}
        if any(domain in url for domain in BLOCKED):
            return {'valid': False, 'error': 'Esta plataforma no permite extracción. Copia el texto o sube una captura.'}
        return {'valid': True, 'error': None, 'url': url.strip()}