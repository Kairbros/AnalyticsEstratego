import { pool } from '../config/db.js';
import { hashPassword, generateRandomPassword } from './password.service.js';

// Crea un usuario con contraseña auto-generada.
// Devuelve el usuario + la contraseña en texto plano (solo esta vez).
export async function crearUsuarioConPasswordGenerada({
  email,
  nombre,
  rol,
  creadoPor,
  empresa = null,
  telefono = null,
  industria = null,
  notas = null,
}) {
  const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existe.rowCount > 0) {
    const err = new Error('Ya existe un usuario con ese correo');
    err.status = 409;
    throw err;
  }

  const passwordPlano = generateRandomPassword(8);
  const hash = await hashPassword(passwordPlano);

  const { rows } = await pool.query(
    `INSERT INTO usuarios (email, password_hash, rol, nombre, empresa, telefono, industria, notas, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, email, rol, nombre, empresa, telefono, industria, activo, creado_en`,
    [email, hash, rol, nombre, empresa, telefono, industria, notas, creadoPor],
  );

  return { usuario: rows[0], passwordPlano };
}

export async function listarPorRol(rol, { creadoPor = null } = {}) {
  if (creadoPor != null) {
    const { rows } = await pool.query(
      `SELECT id, email, rol, nombre, empresa, telefono, industria, activo, creado_en
         FROM usuarios
        WHERE rol = $1 AND creado_por = $2
        ORDER BY creado_en DESC`,
      [rol, creadoPor],
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT id, email, rol, nombre, empresa, telefono, industria, activo, creado_en
       FROM usuarios
      WHERE rol = $1
      ORDER BY creado_en DESC`,
    [rol],
  );
  return rows;
}

// Regenera la contraseña de un usuario. Devuelve { usuario, passwordPlano }.
// La contraseña en texto plano solo se muestra esta vez.
export async function regenerarPasswordDeUsuario(id, { rolEsperado = null, creadoPorEsperado = null } = {}) {
  const actual = await obtenerPorId(id);
  if (!actual) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  if (rolEsperado && actual.rol !== rolEsperado) {
    const err = new Error('El usuario no tiene el rol esperado');
    err.status = 400;
    throw err;
  }
  if (creadoPorEsperado != null && actual.creado_por !== creadoPorEsperado) {
    const err = new Error('No puedes regenerar la contraseña de un usuario que no te pertenece');
    err.status = 403;
    throw err;
  }

  const passwordPlano = generateRandomPassword(8);
  const hash = await hashPassword(passwordPlano);

  const { rows } = await pool.query(
    `UPDATE usuarios
        SET password_hash = $1, actualizado_en = NOW()
      WHERE id = $2
      RETURNING id, email, rol, nombre, empresa, telefono, industria, activo, creado_en`,
    [hash, id],
  );

  return { usuario: rows[0], passwordPlano };
}

export async function obtenerPorId(id) {
  const { rows } = await pool.query(
    `SELECT id, email, rol, nombre, empresa, telefono, industria, activo, creado_por, creado_en
       FROM usuarios WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
