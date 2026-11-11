import json

from sqlalchemy import func, select

from app.content_loader import load_content
from app.models import Caja, Ejercicio, ProgresoCaja
from tests.test_auth import cabecera_con_token, registrar

CAJA_DE_PRUEBA = {
    "numero": 1,
    "nombre": "Primeros sonidos",
    "objetivo": "Tocar dos acordes",
    "ejercicios": [
        {
            "id": "c1-oido-notas-cuerda6",
            "modulo": "oido",
            "titulo": "Notas de la cuerda 6",
            "tipo": "note_finding",
            "perfil": "response",
            "es_clave": True,
            "bpm_objetivo": None,
            "parametros": {"cuerdas": [6]},
        }
    ],
    "jam": {"id": "c1-jam", "titulo": "Jam 1", "bpm_objetivo": 70, "parametros": {}},
}


def escribir_caja(carpeta, datos, nombre="caja-1.json"):
    (carpeta / nombre).write_text(json.dumps(datos), encoding="utf-8")


def contar(db, modelo):
    return db.scalar(select(func.count()).select_from(modelo))


def test_carga_la_caja_sus_ejercicios_y_el_jam(db, tmp_path):
    escribir_caja(tmp_path, CAJA_DE_PRUEBA)

    cargadas = load_content(db, tmp_path)

    assert cargadas == 1
    caja = db.scalar(select(Caja).where(Caja.numero == 1))
    assert caja.nombre == "Primeros sonidos"
    ejercicio = db.get(Ejercicio, "c1-oido-notas-cuerda6")
    assert ejercicio.caja_id == caja.id
    assert ejercicio.parametros == {"cuerdas": [6]}
    jam = db.get(Ejercicio, "c1-jam")
    assert jam.modulo == "jam"
    assert jam.bpm_objetivo == 70


def test_cargar_dos_veces_actualiza_y_no_duplica(db, tmp_path):
    escribir_caja(tmp_path, CAJA_DE_PRUEBA)
    load_content(db, tmp_path)

    cambiada = json.loads(json.dumps(CAJA_DE_PRUEBA))
    cambiada["ejercicios"][0]["titulo"] = "Título nuevo"
    escribir_caja(tmp_path, cambiada)
    load_content(db, tmp_path)

    assert contar(db, Caja) == 1
    assert contar(db, Ejercicio) == 2
    assert db.get(Ejercicio, "c1-oido-notas-cuerda6").titulo == "Título nuevo"


def test_los_json_del_proyecto_se_cargan_sin_errores(db):
    cargadas = load_content(db)

    assert cargadas >= 2
    numeros = db.scalars(select(Caja.numero).order_by(Caja.numero)).all()
    assert numeros[:2] == [1, 2]


def test_boxes_sin_token(client):
    assert client.get("/boxes").status_code == 401


def test_boxes_devuelve_las_cajas_con_sus_ejercicios(client, db, tmp_path):
    escribir_caja(tmp_path, CAJA_DE_PRUEBA)
    escribir_caja(tmp_path, {**CAJA_DE_PRUEBA, "numero": 2, "ejercicios": [],
                             "jam": {"id": "c2-jam", "titulo": "Jam 2"}}, "caja-2.json")
    load_content(db, tmp_path)
    cabecera = cabecera_con_token(client)

    respuesta = client.get("/boxes", headers=cabecera)

    assert respuesta.status_code == 200
    cajas = respuesta.json()
    assert [caja["numero"] for caja in cajas] == [1, 2]
    ids = {ejercicio["id"] for ejercicio in cajas[0]["ejercicios"]}
    assert ids == {"c1-oido-notas-cuerda6", "c1-jam"}


def test_con_el_contenido_cargado_el_usuario_nuevo_tiene_la_caja_1_abierta(client, db):
    load_content(db)

    usuario_id = registrar(client).json()["id"]

    caja_1 = db.scalar(select(Caja).where(Caja.numero == 1))
    assert db.get(ProgresoCaja, (usuario_id, caja_1.id)).estado == "abierta"
    assert contar(db, ProgresoCaja) == 1
