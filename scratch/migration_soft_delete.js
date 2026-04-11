import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
// Using the anon key found in other scripts
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log("Intentando añadir columna 'estatus' a materiales_catalogo...");
    try {
        const { error } = await supabase.rpc('exec_sql', {
            query_text: "ALTER TABLE materiales_catalogo ADD COLUMN IF NOT EXISTS estatus TEXT DEFAULT 'Activo';"
        });

        if (error) {
            console.error("Error ejecutando RPC:", error);
            console.log("Tal vez la función exec_sql no existe o requiere permisos superiores.");
        } else {
            console.log("✅ Columna añadida correctamente (o ya existía).");
        }
    } catch (err) {
        console.error("Fallo inesperado:", err);
    }
}

runMigration();
