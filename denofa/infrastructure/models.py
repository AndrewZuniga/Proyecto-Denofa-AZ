from django.db import models

class SessionAnalysis(models.Model):
    """
    Representa el historial de análisis persistido en el servidor.
    Cumple con el objetivo de trazabilidad anónima por sesión activa.
    """
    VERDICT_CHOICES = [
        ('CONFIABLE', 'Confiable'),
        ('DUDOSO', 'Dudoso'),
        ('PROBABLE DESINFORMACIÓN', 'Probable Desinformación'),
    ]

    session_key = models.CharField(
        max_length=40, 
        db_index=True,
        help_text="Clave de sesión anónima del usuario para aislar su historial."
    )
    
    input_type = models.CharField(
        max_length=10, 
        choices=[('text', 'Texto'), ('url', 'Enlace Web'), ('image', 'Captura de Pantalla')],
        help_text="Estrategia de extracción que se utilizó en la caja inteligente."
    )
    original_content = models.TextField(
        help_text="Texto original o extraído (limpio o truncado a 5000 caracteres)."
    )
    
    verdict = models.CharField(
        max_length=25, 
        choices=VERDICT_CHOICES,
        help_text="Nivel de credibilidad determinado por el modelo semántico."
    )
    score = models.IntegerField(
        help_text="Puntaje numérico de credibilidad en el rango de 0 a 100."
    )
    explanation = models.TextField(
        help_text="Justificación analítica en lenguaje comprensible (máximo 120 palabras)."
    )
    
    snippets_json = models.TextField(
        default="[]",
        help_text="Estructura JSON con los fragmentos específicos que activaron las alertas."
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha y hora exacta en la que se completó la evaluación."
    )

    class Meta:
        verbose_name = "Análisis de Sesión"
        verbose_name_plural = "Análisis de Sesiones"
        ordering = ['-created_at'] 

    def __str__(self):
        return f"{self.verdict} ({self.score}/100) - {self.created_at.strftime('%d/%m/%Y %H:%M')}"