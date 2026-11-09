# Estado del progreso de cada usuario. Se guarda aparte de las tomas para no
# tener que recalcularlo desde todo el historial cada vez que se consulta.

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ProgresoEjercicio(Base):
    __tablename__ = "progreso_ejercicio"

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), primary_key=True)
    ejercicio_id: Mapped[str] = mapped_column(ForeignKey("ejercicios.id"), primary_key=True)
    estrellas: Mapped[int] = mapped_column(Integer, default=0)
    # Tomas limpias seguidas a más del 70 % del tempo objetivo (para la 1ª
    # estrella) y al tempo objetivo (para la 2ª).
    limpias_seguidas_70: Mapped[int] = mapped_column(Integer, default=0)
    limpias_seguidas_objetivo: Mapped[int] = mapped_column(Integer, default=0)
    ultima_practica: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ProgresoModulo(Base):
    __tablename__ = "progreso_modulo"

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), primary_key=True)
    caja_id: Mapped[int] = mapped_column(ForeignKey("cajas.id"), primary_key=True)
    modulo: Mapped[str] = mapped_column(String(20), primary_key=True)
    medalla: Mapped[bool] = mapped_column(Boolean, default=False)


class ProgresoCaja(Base):
    __tablename__ = "progreso_caja"

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), primary_key=True)
    caja_id: Mapped[int] = mapped_column(ForeignKey("cajas.id"), primary_key=True)
    # "bloqueada", "abierta" o "completada"
    estado: Mapped[str] = mapped_column(String(20), default="bloqueada")
    estrellas_jam: Mapped[int] = mapped_column(Integer, default=0)
