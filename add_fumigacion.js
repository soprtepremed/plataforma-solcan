import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function add() {
  console.log('Inserting FUMIGACION into Supabase maintenance_equipos table...');
  const newEquip = {
    id: 'INV-FUM-001',
    nombre: 'Fumigación (Control de Plagas)',
    marca: 'Genérico',
    modelo: 'Servicio Periódico',
    serie: 'Sin Serie',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-05-15',
    proximo_manto: '2026-11-15',
    sucursal: 'Matriz',
    estatus: 'Activo'
  };

  const { data, error } = await supabase
    .from('mantenimiento_equipos')
    .insert([newEquip]);

  if (error) {
    console.error('Error inserting:', error.message);
    process.exit(1);
  }

  console.log('✅ FUMIGACION inserted successfully!');
}

add();
