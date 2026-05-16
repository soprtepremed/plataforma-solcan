import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
  const { data, error } = await supabase
    .from('solicitudes_vale')
    .update({ 
        firma_receptor: 'test',
        nombre_receptor: 'test'
    })
    .eq('id', '11111111-1111-1111-1111-111111111111');

  if (error) {
    console.log("Error details:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success:", data);
  }
}

testUpdate();
