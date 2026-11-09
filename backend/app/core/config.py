# Configuración de la aplicación. Los valores se leen del fichero .env para
# no dejar contraseñas ni claves escritas en el código.

import os

from dotenv import load_dotenv

load_dotenv()

# Si no hay .env se usa una base de datos SQLite local, así el servidor
# arranca igualmente aunque MySQL no esté configurado.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./guitarra.db")

SECRET_KEY = os.getenv("SECRET_KEY", "clave_solo_para_desarrollo")

# Lista de orígenes permitidos para CORS, escritos en el .env separados por comas.
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
