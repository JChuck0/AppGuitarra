from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registra las tablas en Base)
from app.core.config import FRONTEND_ORIGINS
from app.database import Base, engine


# Lo que se ejecuta al arrancar el servidor: crear las tablas que falten.
# Para este proyecto no hace falta una herramienta de migraciones: si cambia
# una tabla en desarrollo, se borra y se vuelve a crear.
# Se hace aquí y no al importar el fichero para que los tests no se
# conecten a MySQL (usan su propia base de datos en memoria).
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="App Guitarra API", lifespan=lifespan)

# El frontend se sirve desde otro puerto (Vite, 5173), así que hay que
# permitirle hacer peticiones al backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Comprueba que el servidor está funcionando."""
    return {"status": "ok"}
