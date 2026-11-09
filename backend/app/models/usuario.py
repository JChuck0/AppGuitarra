from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # Nunca se guarda la contraseña, solo su hash (bcrypt).
    password_hash: Mapped[str] = mapped_column(String(255))
    nombre: Mapped[str] = mapped_column(String(100))
    # Retardo del audio del usuario en ms. Es None hasta que calibra la latencia.
    latencia_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
