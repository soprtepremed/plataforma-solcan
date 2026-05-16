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
  console.log('=== Agregando columnas a solicitudes_vale ===');
  const sqlVales = `
    ALTER TABLE public.solicitudes_vale ADD COLUMN IF NOT EXISTS firma_receptor text;
    ALTER TABLE public.solicitudes_vale ADD COLUMN IF NOT EXISTS nombre_receptor text;
  `;
  const r1 = await runSQL(sqlVales);
  console.log('Resultado vales:', r1.body);

  console.log('=== Agregando columnas a solicitudes_items ===');
  const sqlItems = `
    ALTER TABLE public.solicitudes_items ADD COLUMN IF NOT EXISTS cantidad_surtida integer;
  `;
  const r2 = await runSQL(sqlItems);
  console.log('Resultado items:', r2.body);
}

start().catch(e => console.error('Error fatal:', e.message));
