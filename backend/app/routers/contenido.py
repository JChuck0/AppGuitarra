# Contenido de la app: las cajas con sus ejercicios.

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Caja
from app.schemas.contenido import CajaRespuesta

# Todas las rutas de este router piden haber iniciado sesión.
router = APIRouter(tags=["contenido"], dependencies=[Depends(get_current_user)])


@router.get("/boxes", response_model=list[CajaRespuesta])
def list_boxes(db: Session = Depends(get_db)):
    # selectinload trae los ejercicios de todas las cajas en una sola consulta
    # extra, en vez de una consulta por caja.
    consulta = select(Caja).options(selectinload(Caja.ejercicios)).order_by(Caja.numero)
    return db.scalars(consulta).all()
