# Conexión con la base de datos usando SQLAlchemy.

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import DATABASE_URL

# pool_pre_ping comprueba que la conexión sigue viva antes de usarla.
# MySQL cierra las conexiones que llevan mucho tiempo sin usarse.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False)


# Clase de la que heredan todos los modelos (tablas).
class Base(DeclarativeBase):
    pass


# Dependencia de FastAPI: abre una sesión para cada petición y la cierra al
# terminar, aunque haya habido un error.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
