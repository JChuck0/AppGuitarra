# App Guitarra

Aplicación web para aprender a tocar la guitarra con ejercicios que se corrigen escuchando por el micrófono. Proyecto Fin de Ciclo de DAW.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `frontend/` | HTML, Tailwind y JavaScript. Audio, evaluación de ejercicios e interfaz |
| `backend/` | API REST con FastAPI. Usuarios, progreso y gamificación |
| `content/` | Contenido de las cajas y ejercicios en JSON (todavía vacío) |
| `docs/` | Fichas de ejercicios y documentos de la memoria |
| `Prueba_0/` | Prueba técnica del afinador y del analizador de acordes |

## Cómo arrancarlo

Hace falta Node.js y Python 3.11.

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # en Windows
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
pytest                         # pruebas
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
npm test                       # pruebas
```

La app tiene que abrirse desde `localhost` (o HTTPS), porque si no, el navegador no deja usar el micrófono.
