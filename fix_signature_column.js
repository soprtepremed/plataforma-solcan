
const token = 'sbp_37540de441f46d06a3884cf883388ea3ee5abedb';
const projectRef = 'ybhfsvkwpmhzwuboynre';

async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  return { status: res.status, body: text };
}

async function start() {
  console.log('=== Agregando columna firma_solicitante a solicitudes_vale ===');
  const sql = `ALTER TABLE public.solicitudes_vale ADD COLUMN IF NOT EXISTS firma_solicitante text;`;
  const result = await runSQL(sql);
  console.log('Resultado:', result.body);
  
  console.log('\n=== Agregando columna fecha_surtido por si acaso ===');
  const sql2 = `ALTER TABLE public.solicitudes_vale ADD COLUMN IF NOT EXISTS fecha_surtido timestamptz;`;
  const result2 = await runSQL(sql2);
  console.log('Resultado 2:', result2.body);

  console.log('\n=== Verificando columnas ===');
  const sql3 = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'solicitudes_vale';
  `;
  const result3 = await runSQL(sql3);
  console.log('Columnas actuales:', result3.body);
}

start().catch(e => console.error('Error fatal:', e.message));
