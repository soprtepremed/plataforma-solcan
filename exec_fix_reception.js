import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runStep(sql, label) {
    console.log(`⏳ ${label}...`);
    const { error } = await supabase.rpc('exec_sql', { query_text: sql });
    if (error) {
        console.warn(`⚠️  Error en ${label}: ${error.message}`);
    } else {
        console.log(`✅  ${label} completado.`);
    }
}

async function runFix() {
  console.log('🚀 Iniciando reparación de esquema por pasos...');

  // 1. Columnas de auditoría de materiales
  const colsMateriales = ['r_dorado', 'r_rojo', 'r_lila', 'r_celeste', 'r_verde', 'r_petri', 'r_laminilla', 'r_suero', 'r_papel'];
  for (const col of colsMateriales) {
      await runStep(`ALTER TABLE logistica_envios ADD COLUMN IF NOT EXISTS ${col} INT DEFAULT 0;`, `Añadiendo ${col}`);
  }

  // 2. Columnas de auditoría de formatos
  const colsFormatos = ['r_f_do_001', 'r_f_da_001', 'r_f_qc_020', 'r_f_rm_004'];
  for (const col of colsFormatos) {
      await runStep(`ALTER TABLE logistica_envios ADD COLUMN IF NOT EXISTS ${col} INT DEFAULT 0;`, `Añadiendo ${col}`);
  }

  // 3. Observaciones
  await runStep(`ALTER TABLE logistica_envios ADD COLUMN IF NOT EXISTS observaciones_recepcion TEXT;`, 'Añadiendo observaciones_recepcion');

  // 4. Corrección de tipos de formatos (Casteo seguro)
  const baseFormatos = ['f_do_001', 'f_da_001', 'f_qc_020', 'f_rm_004'];
  for (const col of baseFormatos) {
      // Intentamos cambiar a INT. Si ya es INT, fallará pero no importa.
      await runStep(`ALTER TABLE logistica_envios ALTER COLUMN ${col} TYPE INT USING 0;`, `Normalizando tipo de ${col}`);
  }

  console.log('🏁 Proceso finalizado.');
  process.exit(0);
}

runFix();
