import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPolicies() {
  console.log('=== Consultando Pg Policies ===');
  
  // We can run an arbitrary rpc or query pg_policies using custom sql if available.
  // But wait, the client token doesn't let us query pg_policies easily unless we can query a view or function.
  // Let's see if we can do an RPC call or direct select from pg_policies (if exposed via postgres schema, usually not).
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*');

  if (error) {
    console.log('Cannot query pg_policies directly via API (expected):', error.message);
  } else {
    console.log('Pg Policies:', data);
  }
}

checkPolicies();
