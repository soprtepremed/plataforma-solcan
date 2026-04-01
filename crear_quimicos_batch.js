import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addQuimicos() {
  const users = [
    { username: 'quimico2', nombre: 'Dr. David Ruiz', pin: '1234', role: 'quimico', sucursal: 'Laboratorio Matriz' },
    { username: 'quimico3', nombre: 'Dra. Julia Pérez', pin: '1234', role: 'quimico', sucursal: 'Laboratorio Matriz' },
    { username: 'quimico4', nombre: 'Dr. Miguel Solís', pin: '1234', role: 'quimico', sucursal: 'Laboratorio Matriz' },
  ];

  for (const user of users) {
    const { error } = await supabase.from('empleados').insert([user]);
    if (error) {
      console.error(`Error insertando ${user.username}:`, error.message);
    } else {
      console.log(`✅ Usuario ${user.username} (PIN 1234) creado con éxito.`);
    }
  }
}

addQuimicos();
