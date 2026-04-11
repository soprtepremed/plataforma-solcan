import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Vista para agrupar unidades (Cada registro en materiales_unidades es 1 unidad física)
CREATE OR REPLACE VIEW v_inventario_resumen AS
SELECT 
    catalogo_id,
    COUNT(*) as stock_unidades,
    MIN(caducidad) as proxima_caducidad
FROM materiales_unidades
WHERE estatus = 'Almacenado'
GROUP BY catalogo_id;

-- Vista final panorámica (Catálogo + Agregados)
CREATE OR REPLACE VIEW v_inventario_panoramico AS
SELECT 
    c.*,
    COALESCE(r.stock_unidades, 0) + COALESCE(c.existencia_excel, 0) as stock_real,
    r.proxima_caducidad
FROM materiales_catalogo c
LEFT JOIN v_inventario_resumen r ON c.id = r.catalogo_id;
`;

async function run() {
    console.log("Intentando crear vistas optimizadas (V3)...");
    const { error } = await supabase.rpc('exec_sql', { query_text: sql });
    if (error) {
        console.error("Error ejecutando SQL:", JSON.stringify(error, null, 2));
    } else {
        console.log("Vistas creadas exitosamente.");
    }
}

run();
