# PROJECT_RULES.md

# DENOFA - Project Rules & Development Constraints

## Project Overview

DENOFA is a web application for analyzing the credibility of news content using AI.

The system accepts:

* Plain text
* News article URLs
* Images/screenshots containing text

The system evaluates credibility and returns:

* Credibility score (0-100)
* Verdict:

  * CONFIABLE
  * DUDOSO
  * PROBABLE DESINFORMACIÓN
* Simple explanation
* Suspicious fragments

---

# CRITICAL BUSINESS RULES

## Authentication

DENOFA DOES NOT USE AUTHENTICATION.

DO NOT IMPLEMENT:

* User registration
* User login
* User logout
* Password recovery
* User profiles
* OAuth
* JWT
* Role management
* Permissions systems
* Email verification

All users are anonymous.

---

## Session Management

The system works with anonymous sessions only.

Requirements:

* Generate an anonymous session identifier automatically.
* No personal data is requested.
* No user account exists.
* History belongs only to the active anonymous session.

History must disappear when:

* Session ends
* User deletes history

Never associate history with a user account.

---

## Scope Restrictions

Do not propose or implement features outside the approved scope.

Forbidden examples:

* Social network features
* Comments
* Likes
* User dashboards
* Admin panels not explicitly requested
* Notification systems
* Chat systems
* Friend systems
* User reputation systems

If a feature is not present in requirements, ask before implementing.

---

# INPUT RULES

The system supports only:

1. Plain text
2. URL
3. Image

Only ONE input type can be submitted at a time.

Invalid:

* Text + URL together
* URL + Image together
* Text + Image together

If mixed content is detected:

Display:

"Por favor, ingresa solo el texto de la noticia o solo el enlace web, no ambos a la vez."

---

## Text Limits

Minimum:
20 characters

Maximum:
5000 characters

---

## URL Processing

Allowed:

* News websites
* Public articles

Restricted:

* Facebook
* X/Twitter
* TikTok
* Instagram
* Other social networks

If a social network URL is detected:

"Esta plataforma no permite extracción. Por favor copia el texto o sube una captura."

---

## Image Processing

Accepted formats:

* JPG
* JPEG
* PNG

Rejected:

* PDF
* DOC
* DOCX
* Other document formats

Images are processed using Gemini Vision.

---

# AI ANALYSIS RULES

The AI response must always contain:

* Score (0-100)
* Verdict
* Explanation
* Suspicious fragments

Valid verdicts:

* CONFIABLE
* DUDOSO
* PROBABLE DESINFORMACIÓN

No additional verdicts allowed.

---

## Dashboard Color Mapping

Green:
70 - 100

Yellow:
40 - 69

Red:
0 - 39

These ranges must remain consistent across the application.

---

# UX RULES

The application must:

* Work on mobile and desktop.
* Use asynchronous interactions.
* Avoid full page reloads whenever possible.
* Display loading indicators.
* Use simple language.
* Be understandable by non-technical users.

---

## Result Presentation

Results must appear:

* On the same page.
* Without navigation.
* Without URL changes.
* Through dynamic loading.

---

# HISTORY RULES

History is anonymous.

History items must store:

* Analyzed content
* Score
* Verdict
* Explanation
* Suspicious fragments
* Timestamp

The user can:

* View history
* Reopen a previous analysis
* Delete history

Reopening a result must NOT trigger a new AI request.

---

# TECHNICAL STACK

Backend:

* Django

Frontend:

* Django Templates
* HTMX
* HTML
* CSS
* JavaScript

Database:

* PostgreSQL

AI:

* Google Gemini

Scraping:

* Newspaper3k

---

# ARCHITECTURE

Required architecture:

* Monolithic deployment
* Internal Hexagonal Architecture
* Ports and Adapters
* Strategy Pattern
* Adapter Pattern
* Facade Pattern
* Django MVT

Do not redesign the project into:

* Microservices
* React SPA
* Vue SPA
* Angular SPA

Unless explicitly requested.

---

# DEVELOPMENT RULE

Before implementing any new feature:

1. Verify it exists in requirements.
2. Verify it exists in a user story.
3. Verify it does not violate project constraints.
4. If uncertain, ask for clarification.

Never assume authentication, user accounts, or profile management exist.