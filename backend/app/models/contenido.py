# Tablas del contenido de la app: cajas (niveles) y ejercicios.
# Se rellenan a partir de los ficheros JSON de la carpeta content/.

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Caja(Base):
    __tablename__ = "cajas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[int] = mapped_column(Integer, unique=True)
    nombre: Mapped[str] = mapped_column(String(100))
    objetivo: Mapped[str] = mapped_column(Text)

    ejercicios: Mapped[list["Ejercicio"]] = relationship(back_populates="caja")


class Ejercicio(Base):
    __tablename__ = "ejercicios"

    # El id es un texto legible (p. ej. "c1-oido-notas-cuerda6") para que
    # sea fácil reconocerlo en los JSON del contenido.
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    caja_id: Mapped[int] = mapped_column(ForeignKey("cajas.id"))
    # "oido", "acordes", "punteo" o "jam"
    modulo: Mapped[str] = mapped_column(String(20))
    titulo: Mapped[str] = mapped_column(String(150))
    # Tipo de ejercicio (note_finding, chord_change...) y forma de evaluarlo
    # (response, mono_tempo, chord_tempo...).
    tipo: Mapped[str] = mapped_column(String(40))
    perfil: Mapped[str] = mapped_column(String(30))
    # Los ejercicios clave son obligatorios para conseguir la medalla del módulo.
    es_clave: Mapped[bool] = mapped_column(Boolean, default=False)
    # Los ejercicios de oído y teoría no van a tempo, por eso puede ser None.
    bpm_objetivo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Datos propios de cada tipo (cuerdas, tonalidad, acordes...). Cambian
    # mucho de un tipo a otro, así que se guardan en una columna JSON.
    parametros: Mapped[dict] = mapped_column(JSON, default=dict)

    caja: Mapped[Caja] = relationship(back_populates="ejercicios")
