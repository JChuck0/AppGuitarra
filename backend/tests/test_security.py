from app.core.security import create_token, decode_token, hash_password, verify_password


def test_el_hash_no_es_la_contraseña_y_se_puede_verificar():
    password_hash = hash_password("secreto123")

    assert password_hash != "secreto123"
    assert verify_password("secreto123", password_hash)
    assert not verify_password("otra_cosa", password_hash)


def test_el_token_guarda_el_id_del_usuario():
    token = create_token(7)

    assert decode_token(token) == 7


def test_un_token_falso_no_es_valido():
    assert decode_token("esto.no.es.un.token") is None
