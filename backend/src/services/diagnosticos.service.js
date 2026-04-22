import { pool } from '../config/db.js';

export async function crearBorrador({ clienteId, vendedorId }) {
  const { rows } = await pool.query(
    `INSERT INTO diagnosticos (cliente_id, vendedor_id)
     VALUES ($1, $2)
     RETURNING id, cliente_id, vendedor_id, bloque_a, bloque_b, bloque_c, bloque_d,
              resultados, estado, creado_en, actualizado_en`,
    [clienteId, vendedorId],
  );
  return rows[0];
}

export async function listarPorCliente(clienteId) {
  const { rows } = await pool.query(
    `SELECT id, cliente_id, vendedor_id, estado, creado_en, actualizado_en
       FROM diagnosticos
      WHERE cliente_id = $1
      ORDER BY creado_en DESC`,
    [clienteId],
  );
  return rows;
}

export async function obtenerPorId(id) {
  const { rows } = await pool.query(
    `SELECT d.id, d.cliente_id, d.vendedor_id,
            d.bloque_a, d.bloque_b, d.bloque_c, d.bloque_d,
            d.resultados, d.estado, d.creado_en, d.actualizado_en,
            c.nombre  AS cliente_nombre,
            c.email   AS cliente_email,
            c.empresa AS cliente_empresa,
            c.creado_por AS cliente_creado_por
       FROM diagnosticos d
       JOIN usuarios c ON c.id = d.cliente_id
      WHERE d.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// Guarda los resultados calculados y marca el diagnóstico como completado.
export async function completarConResultados(id, resultados) {
  const { rows } = await pool.query(
    `UPDATE diagnosticos
        SET resultados = $1, estado = 'completado'
      WHERE id = $2
      RETURNING id, cliente_id, vendedor_id, bloque_a, bloque_b, bloque_c, bloque_d,
                resultados, estado, creado_en, actualizado_en`,
    [resultados, id],
  );
  return rows[0] ?? null;
}

// Actualiza solo los bloques que vengan en el payload. Útil para autosave.
export async function actualizarBloques(id, { bloque_a, bloque_b, bloque_c, bloque_d }) {
  const sets = [];
  const valores = [];
  let i = 1;
  if (bloque_a !== undefined) { sets.push(`bloque_a = $${i++}`); valores.push(bloque_a); }
  if (bloque_b !== undefined) { sets.push(`bloque_b = $${i++}`); valores.push(bloque_b); }
  if (bloque_c !== undefined) { sets.push(`bloque_c = $${i++}`); valores.push(bloque_c); }
  if (bloque_d !== undefined) { sets.push(`bloque_d = $${i++}`); valores.push(bloque_d); }
  if (sets.length === 0) {
    return obtenerPorId(id);
  }
  valores.push(id);
  const { rows } = await pool.query(
    `UPDATE diagnosticos SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, cliente_id, vendedor_id, bloque_a, bloque_b, bloque_c, bloque_d,
              resultados, estado, creado_en, actualizado_en`,
    valores,
  );
  return rows[0] ?? null;
}
