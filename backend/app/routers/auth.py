# Registro e inicio de sesión.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_token, hash_password, verify_password
from app.database import get_db
from app.models import Caja, ProgresoCaja, Usuario
from app.schemas.usuario import Token, UsuarioCrear, UsuarioLogin, UsuarioRespuesta

router = APIRouter(prefix="/auth", tags=["auth"])


def find_user_by_email(db, email):
    return db.scalar(select(Usuario).where(Usuario.email == email))


def open_first_box(db, usuario):
    """Deja abierta la Caja 1 para el usuario nuevo.
    Si todavía no se ha cargado el contenido, no hace nada."""
    caja = db.scalar(select(Caja).where(Caja.numero == 1))
    if caja is not None:
        db.add(ProgresoCaja(usuario_id=usuario.id, caja_id=caja.id, estado="abierta"))


@router.post("/register", response_model=UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def register(datos: UsuarioCrear, db: Session = Depends(get_db)):
    email = datos.email.lower()
    if find_user_by_email(db, email) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese email")

    usuario = Usuario(
        email=email,
        password_hash=hash_password(datos.password),
        nombre=datos.nombre,
    )
    db.add(usuario)
    db.flush()  # para tener el id antes de crear su progreso
    open_first_box(db, usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/login", response_model=Token)
def login(datos: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = find_user_by_email(db, datos.email.lower())
    # El mismo mensaje en los dos casos para no dar pistas de qué emails existen.
    if usuario is None or not verify_password(datos.password, usuario.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email o contraseña incorrectos")

    return Token(access_token=create_token(usuario.id))
