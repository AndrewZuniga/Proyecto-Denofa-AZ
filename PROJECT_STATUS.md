# DENOFA - Estado Actual del Proyecto

## 1. Resumen Ejecutivo

*   **Objetivo del proyecto:** DENOFA es una aplicación web diseñada para evaluar la credibilidad de contenidos noticiosos mediante Inteligencia Artificial. Permite analizar texto plano, enlaces a artículos web de noticias y capturas de pantalla (imágenes), retornando un puntaje de confianza (0-100), un veredicto estructurado, una justificación comprensible y fragmentos de texto sospechosos.
*   **Alcance actual:** El sistema implementa un flujo vertical completo para la entrada de texto plano, la validación de negocio, la simulación determinista del resultado basándose en características sintácticas del texto (mayúsculas, longitud, signos de exclamación), y la actualización dinámica en pantalla a través de animaciones interactivas.
*   **Estado general de avance:** Fase inicial de prototipo funcional (SPA parcial). El flujo principal está conectado y operativo con lógica de negocio real para validación y resultados simulados deterministas, pero sin persistencia activa en base de datos, sin integraciones a APIs externas (Gemini) y sin historial real del lado del servidor.

---

## 2. Arquitectura Implementada

El proyecto utiliza una variante rigurosa de **Arquitectura Hexagonal (Puertos y Adaptadores)** para aislar la lógica de negocio del framework Django y de los servicios de terceros:

```
                  ┌──────────────────────────────┐
                  │        INFRAESTRUCTURA       │
                  │  (Django Views, Modelos, JS) │
                  └──────────────┬───────────────┘
                                 │ Peticiones HTTP
                                 ▼
                  ┌──────────────────────────────┐
                  │          APLICACIÓN          │
                  │  (AnalyzeTextUseCase, Ports) │
                  └──────────────┬───────────────┘
                                 │ Orquestación
                                 ▼
                  ┌──────────────────────────────┐
                  │           DOMINIO            │
                  │  (CredibilityDomainService)  │
                  └──────────────────────────────┘
```

### Descripción de las Capas

*   **Capa de Dominio (`denofa/domain/`):**
    *   *Responsabilidad:* Contiene las reglas y entidades puras del negocio. Es totalmente independiente de Django y de cualquier librería externa de red o base de datos.
    *   *Archivos clave:* [services.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/domain/services.py).
*   **Capa de Aplicación (`denofa/application/`):**
    *   *Responsabilidad:* Contiene los casos de uso (interactores) que orquestan las acciones del sistema y definen los puertos (interfaces abstractas) para comunicarse con la infraestructura.
    *   *Archivos clave:* [ports.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/application/ports.py) y [use_cases.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/application/use_cases.py).
*   **Capa de Infraestructura (`denofa/infrastructure/`):**
    *   *Responsabilidad:* Implementa los adaptadores técnicos externos (bases de datos, templates Django, llamadas a APIs, scripts JS y estilos CSS).
    *   *Archivos clave:* [views.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/infrastructure/views.py), [models.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/infrastructure/models.py), controladores frontend ([loading.js](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/static/js/loading.js), [resultado.js](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/static/js/resultado.js)), adaptadores concretos (en la carpeta `adapters/`).

---

## 3. Funcionalidades Completadas

| Funcionalidad | Estado | Archivos Involucrados | Descripción Técnica y Flujo Funcional |
| :--- | :--- | :--- | :--- |
| **Flujo de Análisis Simulado Determinista** | **COMPLETADA** | [index.html](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/templates/pages/index.html)<br>[loading.js](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/static/js/loading.js)<br>[resultado.js](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/static/js/resultado.js)<br>[views.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/infrastructure/views.py)<br>[use_cases.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/application/use_cases.py)<br>[services.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/domain/services.py) | **Descripción:** Envía asíncronamente el texto del formulario de la SPA al servidor, el cual evalúa métricas sintácticas ( mayúsculas, exclamaciones, longitud) y retorna un JSON dinámico estructurado con veredicto, puntaje y explicación sintáctica.<br>**Flujo:** Usuario escribe texto → Envía → Carga animada en UI → Llamada `fetch` (`POST`) a `/analyze/` → Ejecución de `AnalyzeTextUseCase` → El dominio valida y genera el mock dinámico → Retorna JSON → UI renderiza score animado y veredicto. |
| **Validación de Reglas de Negocio en Dominio** | **COMPLETADA** | [services.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/domain/services.py) | **Descripción:** Contiene las funciones puras para validar textos (mínimo 20 caracteres) y URLs (bloqueo estricto de enlaces de redes sociales), además del mapeo determinista de veredictos según puntaje numérico. |
| **Infraestructura Base de Configuración Django** | **COMPLETADA** | [manage.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/manage.py)<br>[settings.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/config/settings.py)<br>[urls.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/config/urls.py)<br>[wsgi.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/config/wsgi.py)<br>[asgi.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/config/asgi.py)<br>[__init__.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/config/__init__.py) | **Descripción:** Montaje técnico del servidor Django. Se corrigieron los puntos de entrada WSGI y ASGI y el inicializador de paquetes de Python en la carpeta `config` para garantizar el despliegue y compatibilidad del servidor de desarrollo. |

---

## 4. Funcionalidades Parcialmente Implementadas

### Historial de Consultas por Sesión Anónima
*   **Estado:** **EN PROGRESO**
*   **Qué ya funciona:**
    *   El modelo de datos [SessionAnalysis](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/infrastructure/models.py) está definido y migrado con soporte para guardar `session_key`, `verdict`, `score`, `explanation` y fragmentos JSON.
    *   Las vistas de Django [history_view](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/infrastructure/views.py#L14) y [detail_view](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/infrastructure/views.py#L25) existen y filtran los objetos usando el `session_key` del cliente.
    *   La interfaz de usuario del Historial ([historial.html](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/templates/pages/historial.html)) y Detalle ([detalle.html](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/templates/pages/detalle.html)) están maquetadas visualmente de forma estática.
    *   Los archivos JS del frontend ([historial.js](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/static/js/historial.js)) operan utilizando `localStorage` en el navegador del cliente para simular el guardado local.
*   **Qué falta por implementar:**
    *   Implementar el adaptador concreto `DjangoHistoryRepositoryAdapter` dentro de `infrastructure/adapters/` para interactuar con la base de datos real.
    *   Escribir los casos de uso (`GetHistoryUseCase`, `DeleteHistoryUseCase`, `SaveAnalysisUseCase`) en `use_cases.py` que conecten el flujo de negocio con el repositorio de base de datos.
    *   Modificar el JavaScript ([utils.js](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/static/js/utils.js)) para reemplazar `localStorage` por peticiones `fetch` que guarden y recuperen datos del servidor usando el identificador de sesión de Django.
    *   Actualizar la plantilla [detalle.html](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/templates/pages/detalle.html) para inyectar las variables dinámicas de base de datos en lugar de textos quemados estáticos.

---

## 5. Funcionalidades Pendientes

| Funcionalidad | Prioridad | Dependencias | Impacto en el Proyecto |
| :--- | :--- | :--- | :--- |
| **Persistencia e Historial en Base de Datos** | **Alta** | Adaptador de repositorio, Casos de uso de historial, Conexión JS frontend | Habilita la trazabilidad real y permite reabrir consultas anteriores almacenadas en el servidor sin repetir solicitudes de IA. |
| **Extracción de Contenido de URLs (Scraping)** | **Alta** | Adaptador `NewspaperScraperAdapter`, Librería `newspaper3k` | Permite procesar de manera directa artículos de prensa digital pegando su enlace web en el formulario. |
| **Extracción de Texto sobre Capturas (OCR)** | **Media** | Adaptador `PillowVisionAdapter`, SDK de Gemini | Habilita la subida de imágenes y capturas de pantalla, extrayendo el texto automáticamente antes del análisis. |
| **Comando de Mantenimiento / Limpieza** | **Baja** | Persistencia real activa | Permite depurar periódicamente los registros de análisis asociados a sesiones de Django que ya hayan expirado. |

---

## 6. Integraciones Pendientes

*   **Google Gemini API (Análisis semántico):**
    *   *Estado actual:* No integrada. La lógica de evaluación se simula de manera interna en la capa de dominio.
    *   *Trabajo restante:* Importar el SDK `google-generativeai`, crear el adaptador concreto `GeminiAiAnalysisAdapter` que implemente `AiAnalysisPort`, definir los prompts del sistema y configurar la clave de API `GEMINI_API_KEY`.
*   **Newspaper3k / BeautifulSoup (Scraping web):**
    *   *Estado actual:* No integrada.
    *   *Trabajo restante:* Instalar dependencias en python, implementar `NewspaperScraperAdapter` para limpiar anuncios, scripts y extraer el texto puro de la noticia.
*   **OCR (Gemini Vision / Pillow):**
    *   *Estado actual:* No integrada.
    *   *Trabajo restante:* Implementar `PillowVisionAdapter` para transformar archivos de imagen subidos en texto plano legible por la IA.

---

## 7. Restricciones del Proyecto

Basado en [PROJECT_RULES.md](file:///c:/Users/User/Desktop/Denofa-protipo-main/PROJECT_RULES.md) y [MISSION_CONTEXT.md](file:///c:/Users/User/Desktop/Denofa-protipo-main/MISSION_CONTEXT.md), el proyecto debe cumplir estrictamente con los siguientes límites:

1.  **Sin Autenticación:** Queda prohibido implementar flujos de Registro de usuarios, Inicio de sesión, Cierre de sesión, Recuperación de contraseñas, Perfiles de usuario, JWT, OAuth o Roles.
2.  **Sesión Anónima:** Todo el historial pertenece exclusivamente a la sesión activa en el navegador. Las consultas deben desaparecer automáticamente al expirar la sesión en el servidor o cuando el usuario elimine voluntariamente su historial.
3.  **Límite de Entrada Única:** El sistema solo procesa un tipo de entrada a la vez (solo Texto, solo URL o solo Imagen). Si el usuario ingresa contenido mixto (ej. texto y un enlace a la vez), el sistema debe rechazarlo con la advertencia: *"Por favor, ingresa solo el texto de la noticia o solo el enlace web, no ambos a la vez."*
4.  **Límites de Longitud de Texto:** Mínimo 20 caracteres y máximo 5000 caracteres.
5.  **Restricción de Redes Sociales:** Se bloquean de forma taxativa enlaces que provengan de Facebook, X/Twitter, Instagram y TikTok con el mensaje: *"Esta plataforma no permite extracción. Por favor copia el texto o sube una captura."*
6.  **Desacoplamiento Estricto:** La capa de Dominio no debe importar módulos de Django ni acoplarse a los modelos de base de datos. Las vistas de Django (`views.py`) no deben contener reglas de negocio de credibilidad o clasificación, sino delegarlas a los casos de uso.
7.  **Escala de Score y Color:**
    *   **Verde (70 - 100):** Veredicto `CONFIABLE`.
    *   **Amarillo (40 - 69):** Veredicto `DUDOSO`.
    *   **Rojo (0 - 39):** Veredicto `PROBABLE DESINFORMACIÓN`.

---

## 8. Reglas Arquitectónicas obligatorias

Para futuras modificaciones del código, se establecen las siguientes reglas estructurales:

*   **Regla 1 (Business Rules):** Toda regla de negocio (validaciones, asignación de veredictos, lógica de análisis) debe ubicarse en la capa de Dominio ([services.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/domain/services.py)).
*   **Regla 2 (Use Cases):** La lógica de orquestación de operaciones y control del flujo de datos del sistema debe programarse en la capa de Aplicación ([use_cases.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/application/use_cases.py)).
*   **Regla 3 (Ports):** Los límites externos de comunicación del negocio deben definirse como interfaces abstractas en [ports.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/application/ports.py).
*   **Regla 4 (Adapters):** Cualquier interacción con librerías externas (Gemini, Newspaper3k) o el ORM de Django para bases de datos debe resolverse en adaptadores concretos en `denofa/infrastructure/adapters/`.
*   **Regla 5 (HTTP & Web):** El enrutamiento de red, las respuestas HTTP y la serialización JSON pertenecen a las vistas de Django ([views.py](file:///c:/Users/User/Desktop/Denofa-protipo-main/denofa/infrastructure/views.py)).

---

## 9. Estado del Flujo Principal

El recorrido del dato desde el formulario hasta la pantalla final se comporta actualmente del siguiente modo:

```
[Usuario] ──(Ingresa Texto)──> [Formulario HTML]
                                     │
                                     ▼ (Javascript - loading.js)
                             [Llamada Fetch POST]
                                     │
                                     ▼ (Infrastructure - views.py)
                              [analyze_view]
                                     │
                                     ▼ (Application - use_cases.py)
                           [AnalyzeTextUseCase]
                                     │
                                     ▼ (Domain - services.py)
                        [CredibilityDomainService]
                      (Validación y Score Simulado)
                                     │
                                     ▼ (Retorno JSON)
[Resultado Pantalla] <──(Dibuja Score Animado)── [resultado.js]
```

### Componentes Implementados vs. Simulados
*   **Interfaz, Entrada y JS (SPA):** REAL. El formulario captura los datos, realiza validaciones y gestiona estados dinámicos del DOM.
*   **Petición HTTP y API Django:** REAL. Se realiza un `fetch` POST real que transmite el contenido y valida el token CSRF.
*   **Lógica de Caso de Uso y Validación:** REAL. El UseCase y la validación de mínimos de caracteres se ejecutan de verdad en el servidor de Django.
*   **Algoritmo de Evaluación de Credibilidad:** SIMULADO. En lugar de interrogar a la API de Gemini, se ejecuta un algoritmo sintáctico determinista y variable en la capa de dominio basado en heurísticas del texto recibido (gritos, longitud, exclamaciones).
*   **Persistencia de Historial:** SIMULADA. Al presionar guardar, se persiste en el `localStorage` del navegador en lugar de la base de datos de Django.

---

## 10. Próximos Pasos Recomendados

### Fase 1: Persistencia e Historial Anónimo Real (Alta Prioridad)
*   Implementar `DjangoHistoryRepositoryAdapter` para interactuar con la base de datos real.
*   Modificar los endpoints API en Django y el JavaScript en el cliente para guardar y recuperar el historial directamente desde la base de datos y asociarlo al `session_key` de Django.
*   Corregir la longitud de `explanation` en `models.py` eliminando el límite de 500 caracteres.

### Fase 2: Scraping de URLs de Prensa (Alta Prioridad)
*   Instalar `newspaper3k`.
*   Desarrollar el adaptador de extracción de noticias `NewspaperScraperAdapter` para resolver peticiones tipo URL en el flujo de análisis.

### Fase 3: Integración de IA y OCR con Gemini (Media Prioridad)
*   Desarrollar `GeminiAiAnalysisAdapter` para análisis real con prompts de credibilidad.
*   Desarrollar `PillowVisionAdapter` para realizar OCR multimodal sobre las imágenes subidas.

---

## 11. Riesgos Técnicos Detectados

*   **Riesgo de Desbordamiento de Base de Datos:** El campo `explanation` del modelo `SessionAnalysis` tiene un límite estricto de `max_length=500`. Las explicaciones reales de la IA de hasta 120 palabras desbordarán con alta probabilidad este límite, rompiendo el flujo al intentar guardar en base de datos.
*   **Seguridad de Claves de API:** Al integrar Gemini, existe el riesgo de exponer accidentalmente la clave `GEMINI_API_KEY` si no se configura de forma estricta a través de variables de entorno administradas.
*   **Acumulación de Sesiones en SQLite:** Como SQLite almacena el historial anónimo, si muchos usuarios realizan pruebas académicas, la base de datos crecerá acumulando registros huérfanos de sesiones expiradas si no se define una rutina de limpieza periódica.

---

## 12. Resumen para Presentación Académica

### Qué se puede demostrar actualmente
1.  **Experiencia de Usuario SPA Fluid:** Un formulario moderno interactivo donde se puede ingresar texto plano, ver la longitud de caracteres en tiempo real y presionar analizar.
2.  **Pantalla de Carga Animada (Pasos de Análisis):** Visualización de una barra de progreso fluida y un checklist dinámico que simula los estados internos del procesamiento.
3.  **Análisis Semántico Variable y Determinista:** El sistema responde dinámicamente según lo que se escriba. Por ejemplo, escribir un texto largo y neutral dará un veredicto verde de "Confiable" con un score alto, mientras que escribir frases en mayúsculas sostenidas y signos de exclamación generará un veredicto rojo de "Desinformación" con score bajo.
4.  **Integración Asíncrona:** La comunicación cliente-servidor mediante llamadas API reales sin recargar la página.

### Qué falta por completar para el sistema final
1.  Persistencia en base de datos (el historial y el detalle utilizan `localStorage` del navegador en la demo actual).
2.  El análisis mediante IA real (Gemini API) y extracción web (Scraping de URLs).
3.  La subida de imágenes y lectura mediante OCR.
