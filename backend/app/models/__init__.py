# Se importan aquí todos los modelos para que SQLAlchemy los conozca antes
# de crear las tablas.
from app.models.contenido import Caja, Ejercicio
from app.models.progreso import ProgresoCaja, ProgresoEjercicio, ProgresoModulo
from app.models.toma import Toma
from app.models.usuario import Usuario
