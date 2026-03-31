-- 🛠️ SCRIPT DE ACTUALIZACIÓN DE ESQUEMA (CUMPLIMIENTO FO-DO-017)
-- Pega este código en el EDITOR SQL de tu Panel de Supabase para habilitar todos los campos del formato físico.

ALTER TABLE logistica_envios 
-- Muestras Sanguíneas
ADD COLUMN IF NOT EXISTS s_lila INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_verde INT DEFAULT 0,
-- Muestras Varias
ADD COLUMN IF NOT EXISTS s_orina_24h INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_medio_transporte INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_hisopo INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_laminilla_he INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_laminilla_mi INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_heces INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_otros_cant TEXT,
ADD COLUMN IF NOT EXISTS s_otros_analisis TEXT,
ADD COLUMN IF NOT EXISTS s_papel INT DEFAULT 0,
-- Formatos
ADD COLUMN IF NOT EXISTS f_do_001 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS f_da_001 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS f_qc_020 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS f_rm_004 BOOLEAN DEFAULT false,
-- Firmas de Áreas (Campos de Usuario y Hora para los 7 procesos)
ADD COLUMN IF NOT EXISTS a_hemato_user TEXT, ADD COLUMN IF NOT EXISTS a_hemato_time TEXT,
ADD COLUMN IF NOT EXISTS a_uro_user TEXT, ADD COLUMN IF NOT EXISTS a_uro_time TEXT,
ADD COLUMN IF NOT EXISTS a_quimica_user TEXT, ADD COLUMN IF NOT EXISTS a_quimica_time TEXT,
ADD COLUMN IF NOT EXISTS a_archivo_user TEXT, ADD COLUMN IF NOT EXISTS a_archivo_time TEXT,
ADD COLUMN IF NOT EXISTS a_calidad_user TEXT, ADD COLUMN IF NOT EXISTS a_calidad_time TEXT,
ADD COLUMN IF NOT EXISTS a_admin_user TEXT, ADD COLUMN IF NOT EXISTS a_admin_time TEXT,
ADD COLUMN IF NOT EXISTS a_recursos_user TEXT, ADD COLUMN IF NOT EXISTS a_recursos_time TEXT;

-- Mensaje de confirmación
COMMENT ON TABLE logistica_envios IS 'Actualizada para compatibilidad total con formato FO-DO-017';
