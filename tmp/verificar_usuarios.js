import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) console.error('Error listando usuarios:', error.message);
  else {
    console.log('✅ Usuarios encontrados en la nube:', data.users.length);
    if (data.users.length > 0) {
      console.log('--- IDs Sugeridos para test ---');
      data.users.slice(0, 3).forEach(u => console.log(`${u.email}: ${u.id}`));
    }
  }
}

checkUsers();
