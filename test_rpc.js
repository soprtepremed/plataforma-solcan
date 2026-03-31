import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ybhfsvkwpmhzwuboynre.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU');

async function check() {
  const { data, error } = await supabase.from('auditoria_ejecucion').select('*');
  if (error) {
     const { error: rpcError } = await supabase.rpc('exec_sql', {
        query_text: 'CREATE TABLE IF NOT EXISTS auditoria_ejecucion (id SERIAL PRIMARY KEY, agente TEXT, fecha TIMESTAMPTZ DEFAULT NOW());'
     });
     if (rpcError) console.error('Error RPC:', rpcError.message);
     else console.log('✅ TABLA CREADA AUTOMÁTICAMENTE');
  } else {
     console.log('✅ LA TABLA YA EXISTÍA:', data);
  }
}
check();
