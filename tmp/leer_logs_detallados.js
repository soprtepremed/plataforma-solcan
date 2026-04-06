import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkDetailedLogs() {
  const { data, error } = await supabase
    .from('push_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) console.error(error.message);
  else {
    console.log('📝 LOGS DE GOOGLE/FCM:');
    data.forEach(l => {
      console.log(`- [${l.created_at}] ${l.message}`);
      console.log(`  Detalles: ${JSON.stringify(l.details)}`);
    });
  }
}

checkDetailedLogs();
