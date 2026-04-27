import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConfig() {
  const { data, error } = await supabase.from('configuraciones').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Configuraciones schema:', data.length > 0 ? Object.keys(data[0]) : 'Empty table');
  }
  process.exit(0);
}

checkConfig();
