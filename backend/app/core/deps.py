# Dependencias que comparten varias rutas.

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import get_db
from app.models import Usuario

# auto_error=False para devolver 401 (y no 403) cuando falta la cabecera.
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Devuelve el usuario del token de la cabecera Authorization, o responde 401."""
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No has iniciado sesión o la sesión ha caducado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise error

    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise error

    usuario = db.get(Usuario, user_id)
    if usuario is None:
        raise error
    return usuario
