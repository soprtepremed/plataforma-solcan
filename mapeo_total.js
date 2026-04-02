import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAll() {
  console.log('🔍 Mapeando TODA la base de datos de empleados...');
  const { data, error } = await supabase
    .from('empleados')
    .select('*')
    .order('role', { ascending: true });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  if (data.length === 0) {
    console.log('❌ No hay empleados registrados.');
  } else {
    console.log(`✅ Se encontraron ${data.length} empleados:`);
    data.forEach(u => {
      console.log(`- NOMBRE: ${u.nombre} | USER: "${u.username}" | PIN: "${u.pin}" | ROLE: ${u.role}`);
    });
  }
}

checkAll();
