import fs from 'fs';

const token = 'sbp_37540de441f46d06a3884cf883388ea3ee5abedb';
const projectRef = 'ybhfsvkwpmhzwuboynre';

async function runSQL(sql) {
  const res = await fetch('https://api.supabase.com/v1/projects/' + projectRef + '/database/query', {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  return { status: res.status, body: text };
}

async function start() {
  // Step 1: Create the table
  console.log('=== PASO 1: Creando tabla especiales_catalogo ===');
  const createSQL = `
    CREATE TABLE IF NOT EXISTS public.especiales_catalogo (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      clave_orthin text NOT NULL,
      nombre text NOT NULL,
      metodologia text,
      contenido text DEFAULT 'NA',
      tipo_muestra text,
      tiempo_entrega text,
      acreditado_ema boolean DEFAULT false,
      subrogado boolean DEFAULT false,
      notas text,
      created_at timestamptz DEFAULT now()
    );
  `;
  const r1 = await runSQL(createSQL);
  console.log('Resultado:', r1.body.substring(0, 200));

  // Step 2: Enable RLS
  console.log('\n=== PASO 2: Habilitando RLS ===');
  const rlsSQL = `ALTER TABLE public.especiales_catalogo ENABLE ROW LEVEL SECURITY;`;
  const r2 = await runSQL(rlsSQL);
  console.log('Resultado:', r2.body.substring(0, 200));

  // Step 3: Create policy
  console.log('\n=== PASO 3: Creando política de acceso ===');
  const policySQL = `
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'acceso_especiales_catalogo') THEN
        CREATE POLICY "acceso_especiales_catalogo" ON public.especiales_catalogo FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;
  const r3 = await runSQL(policySQL);
  console.log('Resultado:', r3.body.substring(0, 200));

  // Step 4: Insert data from the generated SQL file
  console.log('\n=== PASO 4: Cargando 996 estudios del catálogo ===');
  const fullSQL = fs.readFileSync('catalogo_data_completo.sql', 'utf-8');
  // Extract only the INSERT statement
  const insertStart = fullSQL.indexOf('INSERT INTO');
  if (insertStart === -1) {
    console.log('ERROR: No se encontró INSERT en el archivo SQL');
    return;
  }
  const insertSQL = fullSQL.substring(insertStart);
  const r4 = await runSQL(insertSQL);
  console.log('Resultado:', r4.body.substring(0, 300));

  // Step 5: Verify
  console.log('\n=== PASO 5: Verificando carga ===');
  const r5 = await runSQL('SELECT count(*) as total FROM public.especiales_catalogo;');
  console.log('Verificación:', r5.body);

  console.log('\n=== PROCESO COMPLETADO ===');
}

start().catch(e => console.error('Error fatal:', e.message));
