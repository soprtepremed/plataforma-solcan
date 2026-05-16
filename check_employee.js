import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEmployee() {
  // Get solicitante_id for VALE-542679
  const { data: vales } = await supabase
    .from('solicitudes_vale')
    .select('solicitante_id')
    .eq('folio', 'VALE-542679');

  if (vales && vales.length > 0) {
    const empId = vales[0].solicitante_id;
    console.log('Employee ID:', empId);

    const { data: emp, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', empId);
    
    if (error) console.log('Error:', error);
    else console.log('Employee Details:', emp);
  } else {
    console.log('Vale not found');
  }
}

checkEmployee();
