import { createClient } from '@supabase/supabase-js';

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
  console.log('Body:', text);
}

async function addIndexes() {
  console.log('=== Agregando Índices de Alto Rendimiento ===');
  
  // 1. Index for Search (Trigram GIN for fast ILIKE search)
  // We need pg_trgm extension for this
  const sql = `
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    
    CREATE INDEX IF NOT EXISTS idx_especiales_nombre_trgm ON public.especiales_catalogo USING gin (nombre gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_especiales_clave_trgm ON public.especiales_catalogo USING gin (clave_orthin gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_especiales_metodologia_trgm ON public.especiales_catalogo USING gin (metodologia gin_trgm_ops);
    
    -- B-tree indexes for general sorting and direct matches
    CREATE INDEX IF NOT EXISTS idx_especiales_nombre_sort ON public.especiales_catalogo (nombre ASC);
    CREATE INDEX IF NOT EXISTS idx_especiales_clave_orthin ON public.especiales_catalogo (clave_orthin);
  `;
  
  await runSQL(sql);
  console.log('Índices creados exitosamente.');
}

addIndexes().catch(console.error);
