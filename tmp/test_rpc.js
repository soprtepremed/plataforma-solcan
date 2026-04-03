import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: 'SELECT 1;'
    });
    if (error) {
       console.log('RPC exec_sql error (might not exist or permission denied):', error);
    } else {
       console.log('RPC exec_sql works:', data);
    }
  } catch (err) {
    console.error('Exception calling RPC:', err);
  }
}

testRpc();
