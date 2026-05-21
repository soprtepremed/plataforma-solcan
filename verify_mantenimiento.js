import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log('🔍 Verificando tablas de mantenimiento en Supabase...');
  
  // 1. Equipos
  const { data: equipos, error: errorEquipos } = await supabase
    .from('mantenimiento_equipos')
    .select('id, nombre, sucursal')
    .limit(5);
  
  if (errorEquipos) {
    console.error('❌ Error consultando mantenimiento_equipos:', errorEquipos.message);
  } else {
    console.log(`✅ Tabla mantenimiento_equipos existe! Total muestras: ${equipos.length}`);
    console.log('Muestra:', equipos);
  }

  // 2. Tickets
  const { data: tickets, error: errorTickets } = await supabase
    .from('mantenimiento_tickets')
    .select('id, equipo_nombre, estado')
    .limit(5);

  if (errorTickets) {
    console.error('❌ Error consultando mantenimiento_tickets:', errorTickets.message);
  } else {
    console.log(`✅ Tabla mantenimiento_tickets existe! Total muestras: ${tickets.length}`);
    console.log('Muestra:', tickets);
  }

  // 3. Historial
  const { data: historial, error: errorHistorial } = await supabase
    .from('mantenimiento_historial')
    .select('id, equipo_nombre, tipo, subtipo')
    .limit(5);

  if (errorHistorial) {
    console.error('❌ Error consultando mantenimiento_historial:', errorHistorial.message);
  } else {
    console.log(`✅ Tabla mantenimiento_historial existe! Total muestras: ${historial.length}`);
    console.log('Muestra:', historial);
  }
}

verify();
