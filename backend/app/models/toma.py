from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# Cada intento de un ejercicio. El audio se analiza en el navegador, aquí
# solo llega el resultado.
class Toma(Base):
    __tablename__ = "tomas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    ejercicio_id: Mapped[str] = mapped_column(ForeignKey("ejercicios.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    # Tempo al que se ha tocado. None en los ejercicios que no van a tempo.
    bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # "clean", "almost", "not_clean" o "inconclusive"
    veredicto: Mapped[str] = mapped_column(String(20))
    # Métricas calculadas en el navegador (pitchAccuracy, timingAccuracy...).
    metricas: Mapped[dict] = mapped_column(JSON, default=dict)
    # Solo para los ejercicios de respuesta (rondas de 8 preguntas).
    correctas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    media_respuesta_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
