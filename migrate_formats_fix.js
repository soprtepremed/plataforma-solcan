import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ybhfsvkwpmhzwuboynre.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU');

async function fixDb() {
  console.log('🏗️ Forzando conversión de columnas booleanas a INT...');
  
  const sql = `
    DO $$ 
    BEGIN 
      BEGIN
        ALTER TABLE logistica_envios DROP COLUMN f_do_001;
      EXCEPTION WHEN undefined_column THEN NULL; END;
      BEGIN
        ALTER TABLE logistica_envios DROP COLUMN f_da_001;
      EXCEPTION WHEN undefined_column THEN NULL; END;
      BEGIN
        ALTER TABLE logistica_envios DROP COLUMN f_qc_020;
      EXCEPTION WHEN undefined_column THEN NULL; END;
      BEGIN
        ALTER TABLE logistica_envios DROP COLUMN f_rm_004;
      EXCEPTION WHEN undefined_column THEN NULL; END;
    END $$;

    ALTER TABLE logistica_envios 
    ADD COLUMN f_do_001 INT DEFAULT 0,
    ADD COLUMN f_da_001 INT DEFAULT 0,
    ADD COLUMN f_qc_020 INT DEFAULT 0,
    ADD COLUMN f_rm_004 INT DEFAULT 0;
  `;

  const { error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error migrando:', error.message);
  } else {
    console.log('✅ Base de datos actualizada con éxito a formato numérico.');
  }
}
fixDb();
