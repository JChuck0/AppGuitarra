# Cifrado de contraseñas y tokens de sesión.

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import SECRET_KEY

ALGORITHM = "HS256"
TOKEN_HOURS = 24


def hash_password(password):
    """Devuelve el hash bcrypt de la contraseña. Nunca se guarda la contraseña tal cual."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password, password_hash):
    """Comprueba si la contraseña coincide con el hash guardado."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_token(user_id):
    """Crea un token JWT con el id del usuario que caduca a las 24 horas."""
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    payload = {"sub": str(user_id), "exp": expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token):
    """Devuelve el id del usuario del token, o None si el token no es válido o ha caducado."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
