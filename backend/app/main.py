from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="App Guitarra API")

# El frontend se sirve desde otro puerto (Vite, 5173), así que hay que
# permitirle hacer peticiones al backend.
FRONTEND_ORIGINS = ["http://localhost:5173"]

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
