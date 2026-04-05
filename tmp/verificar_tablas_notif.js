import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('push_subscriptions', 'notificaciones');
`;

async function run() {
  console.log('🔍 Verificando estado de tablas en Supabase...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
  
  if (error) {
    console.error('❌ Error verificando estado:', error);
  } else {
    const existing = data.map(r => r.table_name);
    console.log('📊 Tablas encontradas:', existing.length > 0 ? existing.join(', ') : 'Ninguna');
    
    if (!existing.includes('push_subscriptions')) console.log('⚠️ Falta: push_subscriptions');
    if (!existing.includes('notificaciones')) console.log('⚠️ Falta: notificaciones');
  }
}

run();
