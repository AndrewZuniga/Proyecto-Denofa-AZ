import os
import json
from google import genai
from google.genai import types
from denofa.application.ports import AiAnalysisPort
from denofa.domain.services import CredibilityDomainService


class GeminiAiAnalysisAdapter(AiAnalysisPort):
    """
    Adaptador concreto que implementa AiAnalysisPort usando la API de Gemini
    con grounding de búsqueda de Google. Si la API falla o no hay key configurada,
    delega al análisis heurístico de CredibilityDomainService como fallback.
    """

    def analyze(self, text: str) -> dict:
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return CredibilityDomainService.generate_mock_analysis(text)

        try:
            prompt = self._build_prompt(text)
            client = genai.Client(api_key=api_key)
            grounding_tool = types.Tool(google_search=types.GoogleSearch())
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(tools=[grounding_tool])
            )
            result = self._parse_response(response.text)
            return result
        except Exception as e:
            print(f"Gemini API Error: {str(e)}. Fallback to mock analysis.")
            return CredibilityDomainService.generate_mock_analysis(text)

    def _build_prompt(self, text: str) -> str:
        return f"""Eres un sistema experto en verificación de credibilidad de noticias en español.
Antes de responder, busca en internet información reciente y confiable para verificar si los hechos mencionados en el texto son reales, han sido reportados por fuentes serias, o si existen desmentidos oficiales al respecto. Usa esa investigación para fundamentar tu veredicto.

Analiza el siguiente texto y evalúa su credibilidad considerando estos criterios linguísticos:

1. TONO Y EMOTIVIDAD: ¿Usa lenguaje alarmista, exclamaciones excesivas o apelaciones emocionales exageradas?
2. INCERTIDUMBRE: ¿Contiene afirmaciones sin fuentes, verbos modales vagos ("podría", "se dice que") o atribuciones anónimas?
3. PAUSALITY: ¿La puntuación y estructura del texto es coherente con escritura periodística seria?
4. INMEDIATEZ: ¿Usa pronombres de primera persona o lenguaje que busca manipular directamente al lector?
5. VERIFICABILIDAD: ¿Las afirmaciones pueden contrastarse con hechos conocidos o son inverificables?
6. ERRORES LINGÜÍSTICOS: ¿Tiene errores ortográficos, gramaticales o de redacción inusuales?
7. SENSACIONALISMO: ¿El título o contenido usa hipérboles, palabras en mayúsculas o urgencia artificial?

REGLAS DE CLASIFICACIÓN:
- CONFIABLE (score 70-100): Lenguaje neutral, fuentes identificables, afirmaciones verificables, redacción profesional.
- DUDOSO (score 40-69): Mezcla de elementos verificables e inverificables, tono parcialmente emotivo, fuentes vagas.
- PROBABLE DESINFORMACIÓN (score 0-39): Lenguaje alarmista, sin fuentes, afirmaciones inverificables, errores frecuentes.

IMPORTANTE: Si el texto NO es una noticia o afirmación verificable (ej: un saludo, una receta, código de programación),
devuelve un JSON con "not_news": true y nada más.

Analiza este texto:
\"\"\"
{text}
\"\"\"

NO uses bloques de código markdown (no uses ```json ni ```). NO inventes veredictos diferentes a los 3 indicados.

IMPORTANTE SOBRE LOS SNIPPETS: el campo "snippets" debe contener ÚNICAMENTE fragmentos literales copiados textualmente del TEXTO ORIGINAL proporcionado por el usuario (el que está entre las comillas triples arriba), nunca citas de artículos externos, fuentes de internet, o resultados de tu búsqueda. Cada snippet debe ser una oración o frase que SÍ aparece tal cual en el texto del usuario.

Si durante tu investigación encontraste fuentes externas relevantes que respaldan o contradicen el texto, resúmelas brevemente en el campo "sources" (máximo 3 fuentes, una frase corta cada una describiendo qué encontraste y de qué tipo de fuente, sin necesidad de URL exacta).

Los valores de "status" dentro de cada snippet deben ser EXACTAMENTE uno de estos 3, en minúsculas y sin acentos: "reliable", "dubious", "disinfo". Nunca uses el veredicto completo ni otras palabras.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques de código, con esta estructura exacta:
{{
  "verdict": "CONFIABLE" | "DUDOSO" | "PROBABLE DESINFORMACIÓN",
  "score": número entero entre 0 y 100,
  "explanation": "explicación en español de máximo 120 palabras, sin términos técnicos, específica al contenido analizado",
  "snippets": [array de 0 a 3 objetos con campos text (frase literal del texto original), status (reliable|dubious|disinfo) y reason (motivo breve)],
  "sources": [array de 0 a 3 strings cortos describiendo fuentes externas consultadas, puede estar vacío],
  "not_news": false
}}

El score debe ser coherente con el veredicto: CONFIABLE=70-100, DUDOSO=40-69, PROBABLE DESINFORMACIÓN=0-39."""

    def _parse_response(self, raw_result: str) -> dict:
        result = raw_result.strip()
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
            result = result.strip()
        result = json.loads(result)
        
        # Validar si no es noticia
        if isinstance(result, dict) and result.get("not_news") is True:
            return {"not_news": True}
            
        # Validar campos requeridos
        if not isinstance(result, dict):
            raise ValueError("La respuesta de Gemini no es un JSON estructurado.")
        if "score" not in result or "verdict" not in result or "explanation" not in result:
            raise ValueError("La respuesta no contiene los campos requeridos.")
            
        result["score"] = int(result["score"])
        result["verdict"] = str(result["verdict"]).upper()
        if result["verdict"] not in ["CONFIABLE", "DUDOSO", "PROBABLE DESINFORMACIÓN"]:
            result["verdict"] = CredibilityDomainService.get_verdict_by_score(result["score"])
        result["explanation"] = str(result["explanation"])
        
        if "snippets" not in result or not isinstance(result.get("snippets"), list):
            result["snippets"] = []
            
        if "sources" in result and isinstance(result["sources"], list):
            result["sources"] = result["sources"][:3]
        else:
            result["sources"] = []

        valid_statuses = ["reliable", "dubious", "disinfo"]
        for fragment in result.get("snippets", []):
            if isinstance(fragment, dict):
                status = str(fragment.get("status", "")).lower().strip()
                fragment["status"] = status if status in valid_statuses else "dubious"

        return result

    def extract_text_from_image(self, image_bytes: bytes, mime_type: str) -> str:
        """
        Usa Gemini Vision para extraer el texto legible de una imagen (captura de pantalla de noticia).
        Retorna el texto extraído como string. Si falla, lanza una excepción.
        """
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("No se puede procesar la imagen: falta configurar GEMINI_API_KEY.")

        client = genai.Client(api_key=api_key)

        image_part = {
            "inline_data": {
                "mime_type": mime_type,
                "data": image_bytes
            }
        }

        prompt_text = (
            "Extrae ÚNICAMENTE el texto legible de esta imagen (por ejemplo, el titular y cuerpo "
            "de una noticia o publicación). Responde solo con el texto extraído, sin comentarios "
            "adicionales, sin explicaciones, sin markdown. Si la imagen no contiene texto legible "
            "relacionado a una noticia, responde exactamente: NO_TEXT_FOUND"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt_text, image_part]
        )

        extracted = response.text.strip()
        if extracted == "NO_TEXT_FOUND" or not extracted:
            raise ValueError("No se pudo extraer texto legible de la imagen.")

        return extracted
