from app.models import Caja, ProgresoCaja

DATOS_ANA = {"email": "ana@correo.com", "password": "secreto123", "nombre": "Ana"}


def registrar(client, datos=DATOS_ANA):
    return client.post("/auth/register", json=datos)


def iniciar_sesion(client, email="ana@correo.com", password="secreto123"):
    return client.post("/auth/login", json={"email": email, "password": password})


def cabecera_con_token(client):
    registrar(client)
    token = iniciar_sesion(client).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_registro_correcto(client):
    respuesta = registrar(client)

    assert respuesta.status_code == 201
    datos = respuesta.json()
    assert datos["email"] == "ana@correo.com"
    assert datos["nombre"] == "Ana"
    assert "password" not in datos
    assert "password_hash" not in datos


def test_no_se_puede_registrar_dos_veces_el_mismo_email(client):
    registrar(client)

    respuesta = registrar(client, {**DATOS_ANA, "email": "ANA@correo.com"})

    assert respuesta.status_code == 409


def test_la_contraseña_debe_tener_al_menos_8_caracteres(client):
    respuesta = registrar(client, {**DATOS_ANA, "password": "corta"})

    assert respuesta.status_code == 422


def test_login_correcto_devuelve_un_token(client):
    registrar(client)

    respuesta = iniciar_sesion(client)

    assert respuesta.status_code == 200
    assert respuesta.json()["token_type"] == "bearer"
    assert respuesta.json()["access_token"]


def test_login_con_contraseña_incorrecta(client):
    registrar(client)

    respuesta = iniciar_sesion(client, password="no_es_esta")

    assert respuesta.status_code == 401


def test_login_con_email_que_no_existe(client):
    respuesta = iniciar_sesion(client, email="nadie@correo.com")

    assert respuesta.status_code == 401


def test_users_me_sin_token(client):
    assert client.get("/users/me").status_code == 401


def test_users_me_con_token_falso(client):
    respuesta = client.get("/users/me", headers={"Authorization": "Bearer inventado"})

    assert respuesta.status_code == 401


def test_users_me_con_token(client):
    cabecera = cabecera_con_token(client)

    respuesta = client.get("/users/me", headers=cabecera)

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == "ana@correo.com"


def test_se_guarda_la_latencia(client):
    cabecera = cabecera_con_token(client)

    respuesta = client.patch("/users/me", json={"latencia_ms": 45}, headers=cabecera)

    assert respuesta.status_code == 200
    assert respuesta.json()["latencia_ms"] == 45


def test_al_registrarse_queda_abierta_la_caja_1(client, db):
    caja = Caja(numero=1, nombre="Primeros sonidos", objetivo="Tocar dos acordes")
    db.add(caja)
    db.commit()

    usuario_id = registrar(client).json()["id"]

    progreso = db.get(ProgresoCaja, (usuario_id, caja.id))
    assert progreso.estado == "abierta"
