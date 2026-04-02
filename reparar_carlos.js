import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function repairCarlos() {
  console.log('🛠️ Reintentando creación de Carlos Ruiz...');
  
  // 1. Borramos rastro
  const { error: delErr } = await supabase.from('empleados').delete().ilike('nombre', '%Carlos%');
  if (delErr) console.log('Aviso (borrado):', delErr.message);

  // 2. Insertamos
  const { error: insErr } = await supabase.from('empleados').insert([
    { 
      username: 'carlos', 
      nombre: 'Q.F.B. Carlos Ruiz', 
      pin: '1234', 
      role: 'quimico', 
      sucursal: 'Laboratorio Matriz',
      areas_asignadas: ['hemato', 'uro', 'quimica', 'archivo', 'calidad']
    }
  ]);

  if (insErr) {
    console.error('❌ Error fatal:', insErr.message);
  } else {
    console.log('✅ ¡CARLOS ACTIVADO!');
  }
}

repairCarlos();
