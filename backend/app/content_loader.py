# Carga el contenido de la app (cajas y ejercicios) desde los ficheros JSON
# de la carpeta content/. Así, para añadir o cambiar un ejercicio solo hay
# que tocar el JSON y reiniciar el servidor, sin escribir SQL.

import json
from pathlib import Path

from sqlalchemy import select

from app.models import Caja, Ejercicio

# content/ está en la raíz del repositorio, al lado de backend/ y frontend/.
CONTENT_DIR = Path(__file__).resolve().parents[2] / "content"


def save_box(db, datos):
    """Crea la caja si no existe o actualiza sus datos. Se busca por su número."""
    caja = db.scalar(select(Caja).where(Caja.numero == datos["numero"]))
    if caja is None:
        caja = Caja(numero=datos["numero"])
        db.add(caja)
    caja.nombre = datos["nombre"]
    caja.objetivo = datos["objetivo"]
    db.flush()  # para tener caja.id antes de guardar sus ejercicios
    return caja


def save_exercise(db, caja, datos):
    """Crea el ejercicio si no existe o actualiza sus datos. Se busca por su id."""
    ejercicio = db.get(Ejercicio, datos["id"])
    if ejercicio is None:
        ejercicio = Ejercicio(id=datos["id"])
        db.add(ejercicio)
    ejercicio.caja_id = caja.id
    ejercicio.modulo = datos["modulo"]
    ejercicio.titulo = datos["titulo"]
    ejercicio.tipo = datos["tipo"]
    ejercicio.perfil = datos["perfil"]
    ejercicio.es_clave = datos.get("es_clave", False)
    ejercicio.bpm_objetivo = datos.get("bpm_objetivo")
    ejercicio.parametros = datos.get("parametros", {})


def jam_as_exercise(jam):
    """El Jam se guarda como un ejercicio más, del módulo "jam".
    Así las tomas y el progreso del Jam van en las mismas tablas."""
    return {
        "id": jam["id"],
        "modulo": "jam",
        "titulo": jam["titulo"],
        "tipo": "jam",
        "perfil": "jam",
        "es_clave": False,
        "bpm_objetivo": jam.get("bpm_objetivo"),
        "parametros": jam.get("parametros", {}),
    }


def load_content(db, folder=CONTENT_DIR):
    """Lee todos los caja-*.json de la carpeta y los guarda en la base de datos.
    Devuelve el número de cajas cargadas."""
    ficheros = sorted(Path(folder).glob("caja-*.json"))
    for fichero in ficheros:
        datos = json.loads(fichero.read_text(encoding="utf-8"))
        caja = save_box(db, datos)
        for ejercicio in datos["ejercicios"]:
            save_exercise(db, caja, ejercicio)
        if "jam" in datos:
            save_exercise(db, caja, jam_as_exercise(datos["jam"]))
    db.commit()
    return len(ficheros)
