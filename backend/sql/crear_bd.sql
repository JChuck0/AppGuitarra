-- Crea la base de datos de la app y un usuario propio para el backend.
-- Se ejecuta una sola vez desde MySQL Workbench con el usuario root.
-- Antes de ejecutarlo, cambia 'CAMBIA_ESTA_CONTRASEÑA' por la contraseña que
-- quieras y ponla también en backend/.env.

CREATE DATABASE IF NOT EXISTS guitarra
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- El backend no usa root: este usuario solo tiene permisos sobre la base
-- de datos de la app.
CREATE USER IF NOT EXISTS 'guitarra_app'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CONTRASEÑA';
GRANT ALL PRIVILEGES ON guitarra.* TO 'guitarra_app'@'localhost';
FLUSH PRIVILEGES;
