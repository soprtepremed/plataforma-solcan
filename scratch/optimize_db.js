import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const sql = `
CREATE OR REPLACE VIEW v_inventario_resumen AS
SELECT 
    catalogo_id,
    SUM(stock_actual) as stock_total,
    MIN(caducidad) as proxima_caducidad,
    COUNT(*) as total_lotes
FROM materiales_unidades
WHERE estatus = 'Almacenado'
GROUP BY catalogo_id;

CREATE OR REPLACE VIEW v_inventario_panoramico AS
SELECT 
    c.*,
    COALESCE(r.stock_total, 0) + COALESCE(c.existencia_excel, 0) as stock_real,
    r.proxima_caducidad,
    r.total_lotes
FROM materiales_catalogo c
LEFT JOIN v_inventario_resumen r ON c.id = r.catalogo_id;
`;

async function run() {
    console.log("Intentando crear vistas optimizadas...");
    const { error } = await supabase.rpc('exec_sql', { query_text: sql });
    if (error) {
        console.error("Error ejecutando SQL:", error);
    } else {
        console.log("Vistas creadas exitosamente.");
    }
}

run();
