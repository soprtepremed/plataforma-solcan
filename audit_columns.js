import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runAudit() {
  console.log('🔍 Auditando columnas de logistica_envios...');
  const { data, error } = await supabase.rpc('exec_sql', { 
    query_text: "SELECT column_name FROM information_schema.columns WHERE table_name = 'logistica_envios';" 
  });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  const cols = data.map(c => c.column_name);
  console.log('✅ Columnas encontradas:', JSON.stringify(cols, null, 2));
  process.exit(0);
}

runAudit();
