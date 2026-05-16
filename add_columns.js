
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
  console.log('=== Agregando columnas a solicitudes_vale ===');
  const sql = `
    ALTER TABLE public.solicitudes_vale ADD COLUMN IF NOT EXISTS firma_receptor text;
    ALTER TABLE public.solicitudes_vale ADD COLUMN IF NOT EXISTS nombre_receptor text;
  `;
  const result = await runSQL(sql);
  console.log('Resultado:', result.body);
}

start().catch(e => console.error('Error fatal:', e.message));
