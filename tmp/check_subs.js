import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubs() {
  const { data, count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('❌ Error checking subscriptions:', error.message);
  } else {
    console.log(`✅ Suscripciones registradas: ${count}`);
    if (data && data.length > 0) {
      console.log('--- Listado de IDs registrados ---');
      data.forEach(s => console.log(`- User ID: ${s.user_id || 'Anon'} (ID: ${s.id})`));
    }
  }
}

checkSubs();
