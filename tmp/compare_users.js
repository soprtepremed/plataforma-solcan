import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareUsers() {
    const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .or('nombre.ilike.%Humberto%,nombre.ilike.%Carlos%');

    if (error) {
        console.error('Error fetching users:', error.message);
        return;
    }

    console.log('--- Comparación de Usuarios ---');
    data.forEach(user => {
        console.log(`Nombre: ${user.nombre}`);
        console.log(`Usuario: ${user.username}`);
        console.log(`Rol (DB): ${user.role}`);
        console.log(`Áreas Asignadas: ${user.areas_asignadas}`);
        console.log('---------------------------');
    });
}

compareUsers();
