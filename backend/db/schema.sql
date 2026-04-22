-- Esquema — AnalyticsEstratego
-- Ejecutar contra la BD analytics_estratego
-- IMPORTANTE: este script RESETEA las tablas (DROP + CREATE). Úsalo en dev.

DROP TABLE IF EXISTS diagnosticos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;          -- tabla antigua (si existe)
DROP TYPE  IF EXISTS estado_diagnostico CASCADE;
DROP TYPE  IF EXISTS rol_usuario CASCADE;

CREATE TYPE rol_usuario AS ENUM ('super_admin', 'vendedor', 'cliente');
CREATE TYPE estado_diagnostico AS ENUM ('borrador', 'completado');

-- Usuarios: super_admin, vendedores y clientes conviven aquí
CREATE TABLE usuarios (
  id             SERIAL PRIMARY KEY,
  email          VARCHAR(200) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  rol            rol_usuario  NOT NULL,
  nombre         VARCHAR(200) NOT NULL,
  empresa        VARCHAR(200),
  telefono       VARCHAR(50),
  industria      VARCHAR(100),
  notas          TEXT,
  activo         BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_por     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email      ON usuarios(email);
CREATE INDEX idx_usuarios_rol        ON usuarios(rol);
CREATE INDEX idx_usuarios_creado_por ON usuarios(creado_por);

-- Diagnósticos: cada uno pertenece a un cliente y fue capturado por un vendedor
CREATE TABLE diagnosticos (
  id             SERIAL PRIMARY KEY,
  cliente_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  vendedor_id    INTEGER          REFERENCES usuarios(id) ON DELETE SET NULL,

  bloque_a       JSONB NOT NULL DEFAULT '{}'::jsonb,
  bloque_b       JSONB NOT NULL DEFAULT '{}'::jsonb,
  bloque_c       JSONB NOT NULL DEFAULT '{}'::jsonb,
  bloque_d       JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultados     JSONB NOT NULL DEFAULT '{}'::jsonb,

  estado         estado_diagnostico NOT NULL DEFAULT 'borrador',

  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnosticos_cliente  ON diagnosticos(cliente_id);
CREATE INDEX idx_diagnosticos_vendedor ON diagnosticos(vendedor_id);
CREATE INDEX idx_diagnosticos_creado   ON diagnosticos(creado_en DESC);

-- Trigger para mantener actualizado_en al día
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_actualizado
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_diagnosticos_actualizado
  BEFORE UPDATE ON diagnosticos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
