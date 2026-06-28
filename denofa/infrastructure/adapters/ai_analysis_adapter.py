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
            # Extraer las fuentes reales consultadas por Gemini (no generadas por el modelo de lenguaje)
            real_domains = []  # lista de dominios en minúsculas, para comparación
            domain_to_uri = {}  # mapa de dominio -> URL real de redirect
            try:
                if response.candidates and response.candidates[0].grounding_metadata:
                    chunks = response.candidates[0].grounding_metadata.grounding_chunks or []
                    for chunk in chunks:
                        if chunk.web and chunk.web.title:
                            domain = chunk.web.title.lower()
                            real_domains.append(domain)
                            if domain not in domain_to_uri and chunk.web.uri:
                                domain_to_uri[domain] = chunk.web.uri
            except Exception:
                real_domains = []
                domain_to_uri = {}

            print("REAL_DOMAINS COMPLETOS:", real_domains)
            print("DOMAIN_TO_URI:", domain_to_uri)
            has_grounding = bool(real_domains)
            result = self._parse_response(response.text, real_domains, domain_to_uri, has_grounding)
            return result
        except Exception as e:
            print(f"Gemini API Error: {str(e)}. Fallback to mock analysis.")
            return CredibilityDomainService.generate_mock_analysis(text)

    def _build_prompt(self, text: str) -> str:
        return f"""Eres un sistema experto en verificación de credibilidad de noticias en español.
OBLIGATORIO: Antes de responder, DEBES ejecutar al menos una búsqueda real en internet usando tu herramienta de búsqueda, sin excepción, incluso si crees que ya conoces la respuesta o el tema te resulta familiar. No respondas basándote únicamente en tu conocimiento entrenado. Realiza la búsqueda activamente para verificar si los hechos mencionados en el texto son reales, han sido reportados por fuentes serias, o si existen desmentidos oficiales al respecto. Tu respuesta debe estar fundamentada en los resultados de esa búsqueda real, no en tu memoria.

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

Si durante tu investigación encontraste fuentes externas relevantes que respaldan o contradicen el texto, resúmelas brevemente en el campo "sources" (máximo 3 fuentes). Para cada fuente, identifica el dominio del sitio web (por ejemplo "mayoclinic.org", "bbc.com", "nih.gov") en vez de describir el sitio en palabras. SOLO menciona una fuente si corresponde a una búsqueda que realmente hiciste, nunca describas una fuente de memoria o por inferencia. Si no encontraste una fuente específica y verificable para algo, omítela en vez de inventar una genérica.

OBLIGATORIO: cada objeto dentro de "snippets" DEBE incluir el campo "source_domain". Este es un paso crítico que no puedes omitir. Para cada fragmento, identifica cuál de los dominios que SÍ consultaste en tu búsqueda (los mismos que vas a listar en "sources") respalda específicamente esa afirmación, y copia ese dominio exacto en "source_domain". Si genuinamente ninguno de tus dominios consultados respalda ese fragmento en particular, escribe "source_domain": "" (cadena vacía), pero NUNCA omitas el campo por completo.

Ejemplo de cómo debe verse un snippet completo:
{{
  "text": "el agua con limón cura la apendicitis",
  "status": "disinfo",
  "reason": "Afirmación médica falsa sin respaldo científico",
  "source_domain": "mayoclinic.org"
}}

Recuerda: el valor de "source_domain" debe ser EXACTAMENTE uno de los dominios que aparecen en tu lista de "sources" para este mismo análisis, escrito igual (mismo dominio, sin variaciones de mayúsculas o formato).

Los valores de "status" dentro de cada snippet deben ser EXACTAMENTE uno de estos 3, en minúsculas y sin acentos: "reliable", "dubious", "disinfo". Nunca uses el veredicto completo ni otras palabras.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques de código, con esta estructura exacta:
{{
  "verdict": "CONFIABLE" | "DUDOSO" | "PROBABLE DESINFORMACIÓN",
  "score": número entero entre 0 y 100,
  "explanation": "explicación en español de máximo 120 palabras, sin términos técnicos, específica al contenido analizado",
  "snippets": [array de 0 a 3 objetos con campos text (frase literal del texto original), status (reliable|dubious|disinfo), reason (motivo breve) y source_domain (dominio de la fuente que respalda este fragmento específico, opcional, ej. "mayoclinic.org")],
  "sources": [array de 0 a 3 strings cortos describiendo fuentes externas consultadas, puede estar vacío],
  "not_news": false
}}

El score debe ser coherente con el veredicto: CONFIABLE=70-100, DUDOSO=40-69, PROBABLE DESINFORMACIÓN=0-39."""

    def _parse_response(self, raw_result: str, real_domains: list = None, domain_to_uri: dict = None, has_grounding: bool = False) -> dict:
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
            verified_sources = []
            for source in result["sources"][:5]:
                source_lower = str(source).lower()
                if any(rd in source_lower or source_lower in rd for rd in real_domains):
                    verified_sources.append(source)
            result["sources"] = verified_sources[:3]
        else:
            result["sources"] = []

        valid_statuses = ["reliable", "dubious", "disinfo"]
        for fragment in result.get("snippets", []):
            if isinstance(fragment, dict):
                status = str(fragment.get("status", "")).lower().strip()
                fragment["status"] = status if status in valid_statuses else "dubious"

        if real_domains is None:
            real_domains = []

        for fragment in result.get("snippets", []):
            if isinstance(fragment, dict):
                source_domain = str(fragment.get("source_domain", "")).lower().strip()
                if domain_to_uri is None:
                    domain_to_uri = {}
                if source_domain and any(source_domain in rd or rd in source_domain for rd in real_domains):
                    fragment["source_verified"] = True
                    fragment["source_domain"] = source_domain
                    matched_domain = next((rd for rd in real_domains if source_domain in rd or rd in source_domain), None)
                    fragment["source_url"] = domain_to_uri.get(matched_domain, "")
                else:
                    fragment["source_verified"] = False
                    fragment["source_domain"] = source_domain if source_domain else None
                    fragment["source_url"] = ""

        result["has_grounding"] = has_grounding
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
