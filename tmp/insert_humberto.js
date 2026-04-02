import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertHumberto() {
    const { data, error } = await supabase
        .from('empleados')
        .insert([
            { 
                username: 'humberto', 
                nombre: 'HUMBERTO', 
                pin: '1234', 
                role: 'Quimico',
                sucursal: 'Tuxtla Gutierrez'
            }
        ]);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Humberto created successfully:', data);
    }
}

insertHumberto();
