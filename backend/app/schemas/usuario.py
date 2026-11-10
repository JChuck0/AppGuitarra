# Datos que entran y salen de la API en las rutas de usuarios.
# Pydantic valida lo que llega: si falta un campo o el email no es válido,
# FastAPI responde 422 sin llegar a ejecutar la ruta.

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# bcrypt solo admite contraseñas de hasta 72 bytes, por eso el máximo.
class UsuarioCrear(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    nombre: str = Field(min_length=1, max_length=100)


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


class UsuarioActualizar(BaseModel):
    latencia_ms: int = Field(ge=0, le=1000)


# Lo que se devuelve de un usuario. No lleva el hash de la contraseña.
class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nombre: str
    latencia_ms: int | None
    fecha_registro: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
