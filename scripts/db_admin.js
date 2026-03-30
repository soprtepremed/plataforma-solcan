import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl || dbUrl.includes("[TU-PASSWORD]")) {
  console.error("❌ ERROR: No se encontró la URL de la base de datos o no has puesto tu contraseña en .env.local.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });

async function runAdmin() {
  try {
    console.log("🚀 Conectando a Supabase DB mediante Puerto 6543...");
    await client.connect();
    console.log("✅ Conexión exitosa.");

    console.log("🛠️ Asegurando esquema de 'logistica_envios'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS logistica_envios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT now(),
        sucursal TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pendiente',
        s_dorado INT DEFAULT 0, s_rojo INT DEFAULT 0, s_celeste INT DEFAULT 0,
        s_petri INT DEFAULT 0, s_laminilla INT DEFAULT 0, s_suero INT DEFAULT 0,
        s_papel INT DEFAULT 0,
        r_dorado INT DEFAULT 0, r_rojo INT DEFAULT 0, r_celeste INT DEFAULT 0,
        r_petri INT DEFAULT 0, r_laminilla INT DEFAULT 0, r_suero INT DEFAULT 0,
        r_papel INT DEFAULT 0,
        temp_sale_amb FLOAT, temp_sale_ref FLOAT,
        temp_entra_amb FLOAT, temp_entra_ref FLOAT,
        hora_sale TIMESTAMPTZ, hora_recoleccion TIMESTAMPTZ, hora_recepcion TIMESTAMPTZ,
        img_url TEXT, mensajero_id TEXT, observaciones_recepcion TEXT, recibido_por TEXT
      );
      
      ALTER TABLE logistica_envios REPLICA IDENTITY FULL;
      ALTER TABLE logistica_envios ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Admin full access" ON logistica_envios;
      CREATE POLICY "Admin full access" ON logistica_envios FOR ALL USING (true);
    `);

    console.log("✨ ¡Base de Datos lista y accesible!");
  } catch (err) {
    console.error("❌ Error de admin:", err.message);
  } finally {
    await client.end();
  }
}

runAdmin();
