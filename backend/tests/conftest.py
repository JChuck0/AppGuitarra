# Preparación común de los tests.
# Los tests no usan MySQL: cada test tiene una base de datos SQLite en
# memoria, vacía, que desaparece al terminar. Así no se ensucian los datos
# de desarrollo y los tests funcionan en cualquier ordenador.

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db():
    # StaticPool hace que todas las sesiones usen la misma conexión. Si no,
    # cada conexión a "sqlite://" abriría una base de datos en memoria distinta.
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine, autoflush=False)

    session = TestSession()
    yield session
    session.close()
    test_engine.dispose()


@pytest.fixture
def client(db):
    # Las rutas que piden get_db reciben la sesión de pruebas.
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()
