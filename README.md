# App Guitarra

Aplicación web para aprender a tocar la guitarra con ejercicios que se corrigen escuchando por el micrófono. Proyecto Fin de Ciclo de DAW.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `frontend/` | HTML, Tailwind y JavaScript. Audio, evaluación de ejercicios e interfaz |
| `backend/` | API REST con FastAPI. Usuarios, progreso y gamificación |
| `content/` | Contenido de las cajas y ejercicios en JSON. Se carga en la base de datos al arrancar el backend |
| `postman/` | Colección de Postman para probar la API |
| `docs/` | Fichas de ejercicios y documentos de la memoria |
| `Prueba_0/` | Prueba técnica del afinador y del analizador de acordes |

## Cómo arrancarlo

Hace falta Node.js, Python 3.11 y MySQL 8.

**Base de datos**

Desde MySQL Workbench con el usuario root:

```sql
CREATE DATABASE guitarra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'guitarra_app'@'localhost' IDENTIFIED BY 'contraseña';
GRANT ALL PRIVILEGES ON guitarra.* TO 'guitarra_app'@'localhost';
```

Después se copia `backend/.env.example` como `backend/.env` y se pone la misma contraseña en `DATABASE_URL`. Las tablas y el contenido se crean solos al arrancar el backend.

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
