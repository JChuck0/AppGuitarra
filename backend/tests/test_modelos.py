import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Caja, Ejercicio, ProgresoCaja, ProgresoEjercicio, Toma, Usuario


def crear_usuario(db, email="ana@correo.com"):
    usuario = Usuario(email=email, password_hash="hash", nombre="Ana")
    db.add(usuario)
    db.commit()
    return usuario


def crear_caja_con_ejercicio(db):
    caja = Caja(numero=1, nombre="Primeros sonidos", objetivo="Tocar dos acordes")
    ejercicio = Ejercicio(
        id="c1-acordes-em-am",
        caja=caja,
        modulo="acordes",
        titulo="Cambios Em - Am",
        tipo="chord_change",
        perfil="chord_tempo",
        es_clave=True,
        bpm_objetivo=70,
        parametros={"acordes": ["Em", "Am"]},
    )
    db.add_all([caja, ejercicio])
    db.commit()
    return caja, ejercicio


def test_un_usuario_nuevo_tiene_fecha_de_registro_y_sin_latencia(db):
    usuario = crear_usuario(db)

    assert usuario.id is not None
    assert usuario.fecha_registro is not None
    assert usuario.latencia_ms is None


def test_no_puede_haber_dos_usuarios_con_el_mismo_email(db):
    crear_usuario(db)

    with pytest.raises(IntegrityError):
        crear_usuario(db)


def test_una_caja_guarda_sus_ejercicios(db):
    caja, ejercicio = crear_caja_con_ejercicio(db)

    assert caja.ejercicios == [ejercicio]
    assert ejercicio.parametros == {"acordes": ["Em", "Am"]}


def test_se_guarda_una_toma_con_sus_metricas(db):
    usuario = crear_usuario(db)
    _, ejercicio = crear_caja_con_ejercicio(db)

    toma = Toma(
        usuario_id=usuario.id,
        ejercicio_id=ejercicio.id,
        bpm=70,
        veredicto="clean",
        metricas={"timingAccuracy": 0.95, "chordCompleteness": 1.0},
    )
    db.add(toma)
    db.commit()

    guardada = db.get(Toma, toma.id)
    assert guardada.veredicto == "clean"
    assert guardada.metricas["timingAccuracy"] == 0.95
    assert guardada.fecha is not None


def test_el_progreso_empieza_sin_estrellas_y_la_caja_bloqueada(db):
    usuario = crear_usuario(db)
    caja, ejercicio = crear_caja_con_ejercicio(db)

    progreso = ProgresoEjercicio(usuario_id=usuario.id, ejercicio_id=ejercicio.id)
    progreso_caja = ProgresoCaja(usuario_id=usuario.id, caja_id=caja.id)
    db.add_all([progreso, progreso_caja])
    db.commit()

    assert progreso.estrellas == 0
    assert progreso.limpias_seguidas_objetivo == 0
    assert progreso_caja.estado == "bloqueada"
