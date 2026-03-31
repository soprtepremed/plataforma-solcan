import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addQuimico() {
  const { error } = await supabase.from('empleados').insert([{
    username: 'quimico1',
    nombre: 'Dr. Roberto Mendoza',
    pin: '1234',
    role: 'quimico',
    sucursal: 'Laboratorio Matriz'
  }]);
  
  if (error) console.error('Error insertando químico:', error.message);
  else console.log('✅ Químico quimico1 (PIN 1234) creado con éxito.');
}
addQuimico();
