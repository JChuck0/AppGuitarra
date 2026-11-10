# Datos del usuario que ha iniciado sesión.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Usuario
from app.schemas.usuario import UsuarioActualizar, UsuarioRespuesta

router = APIRouter(prefix="/users", tags=["usuarios"])


@router.get("/me", response_model=UsuarioRespuesta)
def read_me(usuario: Usuario = Depends(get_current_user)):
    return usuario


# De momento solo se puede cambiar la latencia, que se mide en la calibración.
@router.patch("/me", response_model=UsuarioRespuesta)
def update_me(
    datos: UsuarioActualizar,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    usuario.latencia_ms = datos.latencia_ms
    db.commit()
    db.refresh(usuario)
    return usuario
