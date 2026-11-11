# Datos de las cajas y ejercicios que devuelve la API.

from pydantic import BaseModel, ConfigDict


class EjercicioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    modulo: str
    titulo: str
    tipo: str
    perfil: str
    es_clave: bool
    bpm_objetivo: int | None
    parametros: dict


class CajaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: int
    nombre: str
    objetivo: str
    ejercicios: list[EjercicioRespuesta]
