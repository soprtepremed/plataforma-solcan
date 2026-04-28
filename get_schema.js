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
  return JSON.parse(text);
}

async function getSchema() {
  console.log('=== Obteniendo Columnas de logistica_envios ===');
  const sql = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'logistica_envios'
    ORDER BY column_name;
  `;
  
  const result = await runSQL(sql);
  console.log(JSON.stringify(result, null, 2));
}

getSchema().catch(console.error);
