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

const newEquipments = [
  {
    id: 'EQ-INM-002',
    nombre: 'Vitros ECi',
    marca: 'Ortho Clinical',
    modelo: 'Vitros ECi',
    serie: '30004788',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-10',
    proximo_manto: '2026-09-10',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-003',
    nombre: 'Vitros V-4600/V Fusion 5.1',
    marca: 'Ortho Clinical',
    modelo: 'Vitros V-4600/V Fusion 5.1',
    serie: 'J46001095',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-12',
    proximo_manto: '2026-09-12',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-001',
    nombre: 'Vitros 3600',
    marca: 'Ortho Clinical',
    modelo: 'Vitros 3600',
    serie: '36001223',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-14',
    proximo_manto: '2026-09-14',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-006',
    nombre: 'EUROBlotMaster',
    marca: 'Euroimmun',
    modelo: 'EUROBlotMaster',
    serie: '0207-5641',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-15',
    proximo_manto: '2026-08-15',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-013',
    nombre: 'Congelador FCM 7DTAWH',
    marca: 'Midea',
    modelo: 'FCM 7DTAWH',
    serie: 'GM188239',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Anual',
    ultimo_manto: '2025-11-20',
    proximo_manto: '2026-11-20',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-014',
    nombre: 'Enfriador Revco',
    marca: 'Revco',
    modelo: 'Enfriador',
    serie: 'U25T-628549-UT',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Anual',
    ultimo_manto: '2025-11-22',
    proximo_manto: '2026-11-22',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-015',
    nombre: 'Enfriador Vendo',
    marca: 'Vendo',
    modelo: 'Enfriador',
    serie: '319050700144',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Anual',
    ultimo_manto: '2025-11-25',
    proximo_manto: '2026-11-25',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-007',
    nombre: 'Termohidrómetro CEM DT-172',
    marca: 'CEM',
    modelo: 'DT-172',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-01',
    proximo_manto: '2026-10-01',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-TEM-009',
    nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C',
    marca: 'Genérico',
    modelo: '110 °C',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-05',
    proximo_manto: '2026-10-05',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-TEM-020',
    nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C',
    marca: 'Genérico',
    modelo: '110 °C',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-06',
    proximo_manto: '2026-10-06',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-022',
    nombre: 'Micropipeta Transferpette Analógica 100-1000 ul',
    marca: 'Brand',
    modelo: 'Transferpette',
    serie: 'O2L91130',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-10',
    proximo_manto: '2026-08-10',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-023',
    nombre: 'Micropipeta Transferpette Analógica 20-200 ul',
    marca: 'Brand',
    modelo: 'Transferpette',
    serie: 'O4E58883',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-12',
    proximo_manto: '2026-08-12',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-024',
    nombre: 'Centrífuga ICB Fuge V',
    marca: 'ICB',
    modelo: 'Fuge V',
    serie: '24132303056',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-20',
    proximo_manto: '2026-09-20',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INM-PIP-002',
    nombre: 'Pipeta Volumétrica de Cristal de 1 ml',
    marca: 'Kimax',
    modelo: 'Cristal 1 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-05',
    proximo_manto: '2026-08-05',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-PIP-10-02',
    nombre: 'Pipeta Volumétrica de Cristal de 10 ml',
    marca: 'Kimax',
    modelo: 'Cristal 10 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-06',
    proximo_manto: '2026-08-06',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INM-PIP-001',
    nombre: 'Pipeta Volumétrica de Cristal de 1 ml',
    marca: 'Kimble',
    modelo: 'Cristal 1 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-08',
    proximo_manto: '2026-08-08',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INM-PIP-3-01',
    nombre: 'Pipeta Volumétrica de Cristal de 3 ml Clase B',
    marca: 'Kimax',
    modelo: 'Clase B 3 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-14',
    proximo_manto: '2026-08-14',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INM-PIP-3-02',
    nombre: 'Pipeta Volumétrica de Cristal de 3 ml Clase B',
    marca: 'Kimax',
    modelo: 'Clase B 3 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-15',
    proximo_manto: '2026-08-15',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INM-PIP-5-01',
    nombre: 'Pipeta Volumétrica de Cristal de 5 ml',
    marca: 'Kimax',
    modelo: 'Cristal 5 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-18',
    proximo_manto: '2026-08-18',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INM-PIP-5-02',
    nombre: 'Pipeta Volumétrica de Cristal de 5 ml Clase A',
    marca: 'Kimax',
    modelo: 'Clase A 5 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-19',
    proximo_manto: '2026-08-19',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INM-PRB-01',
    nombre: 'Probeta Escala Graduada 250 ml',
    marca: 'Genérico',
    modelo: 'Graduada 250 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-01',
    proximo_manto: '2026-09-01',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-026',
    nombre: 'Pipeta Semiautomática de 100-1000 ul',
    marca: 'Genérico',
    modelo: 'Semiautomática 100-1000 ul',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-25',
    proximo_manto: '2026-08-25',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-INM-025',
    nombre: 'Pipeta Semiautomática 20-200 ul',
    marca: 'Genérico',
    modelo: 'Semiautomática 20-200 ul',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-26',
    proximo_manto: '2026-08-26',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INV-TERDI-001',
    nombre: 'Termómetro Digital alcance de -50 °C',
    marca: 'Genérico',
    modelo: '-50 °C',
    serie: '170091367',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-10',
    proximo_manto: '2026-10-10',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INV-TERDI-002',
    nombre: 'Termómetro Digital alcance de -50 °C',
    marca: 'Genérico',
    modelo: '-50 °C',
    serie: '170091413',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-12',
    proximo_manto: '2026-10-12',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-014',
    nombre: 'Aire Acondicionado Prime',
    marca: 'Prime',
    modelo: 'CMPRC602-L',
    serie: 'SFF0WDL5LFU033000041',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-15',
    proximo_manto: '2026-09-15',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-PIP-10-01',
    nombre: 'Pipeta Volumétrica de Cristal de 10 ml Clase A',
    marca: 'Kimax',
    modelo: 'Clase A 10 ml',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-20',
    proximo_manto: '2026-08-20',
    sucursal: 'Matriz',
    estatus: 'Activo'
  },
  {
    id: 'EQ-FUM-002',
    nombre: 'Fumigación (Control de Plagas)',
    marca: 'Genérico',
    modelo: 'Servicio Periódico',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-05-15',
    proximo_manto: '2026-11-15',
    sucursal: 'Matriz',
    estatus: 'Activo'
  }
];

async function addAll() {
  console.log(`Inserting ${newEquipments.length} new equipments into Supabase...`);
  
  const { data, error } = await supabase
    .from('mantenimiento_equipos')
    .insert(newEquipments);
    
  if (error) {
    console.error('Error inserting equipments:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
  
  console.log('✅ All 28 new equipments for Química Clínica registered successfully!');
}

addAll();
