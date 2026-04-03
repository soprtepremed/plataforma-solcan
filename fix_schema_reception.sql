-- 🛠️ CORRECCIÓN DE ESQUEMA: PERSISTENCIA DE RECEPCIÓN (FASE A)
-- Ejecutar en el Editor SQL de Supabase para habilitar el guardado de auditoría física.

-- 1. Cambiar los formatos de BOOLEAN a INT para registrar cantidades
ALTER TABLE logistica_envios 
  ALTER COLUMN f_do_001 TYPE INT USING (CASE WHEN f_do_001 THEN 1 ELSE 0 END),
  ALTER COLUMN f_da_001 TYPE INT USING (CASE WHEN f_da_001 THEN 1 ELSE 0 END),
  ALTER COLUMN f_qc_020 TYPE INT USING (CASE WHEN f_qc_020 THEN 1 ELSE 0 END),
  ALTER COLUMN f_rm_004 TYPE INT USING (CASE WHEN f_rm_004 THEN 1 ELSE 0 END);

-- 2. Añadir columnas de "Recibido" (Audit trail) para materiales
ALTER TABLE logistica_envios
  ADD COLUMN IF NOT EXISTS r_dorado INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_rojo INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_lila INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_celeste INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_verde INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_petri INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_laminilla INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_suero INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_papel INT DEFAULT 0;

-- 3. Añadir columnas de "Recibido" para formatos
ALTER TABLE logistica_envios
  ADD COLUMN IF NOT EXISTS r_f_do_001 INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_f_da_001 INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_f_qc_020 INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS r_f_rm_004 INT DEFAULT 0;

-- 4. Añadir columna para observaciones de recepción (audit trail)
ALTER TABLE logistica_envios
  ADD COLUMN IF NOT EXISTS observaciones_recepcion TEXT;

COMMENT ON TABLE logistica_envios IS 'Esquema corregido para trazabilidad física completa (FO-DO-017)';
