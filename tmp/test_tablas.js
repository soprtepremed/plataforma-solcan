import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  console.log('--- Resumen de Tablas en Supabase ---');

  const { error: err1 } = await supabase.from('notificaciones').select('*').limit(1);
  if (err1) {
    if (err1.code === 'PGRST204' || err1.message.includes('not exist')) {
       console.log('❌ notificaciones: NO EXISTE');
    } else {
       console.log('⚠️ notificaciones: Error - ' + err1.message);
    }
  } else {
    console.log('✅ notificaciones: EXISTE');
  }

  const { error: err2 } = await supabase.from('push_subscriptions').select('*').limit(1);
  if (err2) {
    if (err2.code === 'PGRST204' || err2.message.includes('not exist')) {
       console.log('❌ push_subscriptions: NO EXISTE');
    } else {
       console.log('⚠️ push_subscriptions: Error - ' + err2.message);
    }
  } else {
    console.log('✅ push_subscriptions: EXISTE');
  }
}

check();
