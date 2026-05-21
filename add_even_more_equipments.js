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
  // ── SUCURSAL LIMÓN ───────────────────────────────────────────────────────
  {
    id: 'EQ-HEM-031',
    nombre: 'Centrífuga ICB-Fuge V',
    marca: 'ICB',
    modelo: 'Fuge V',
    serie: '24121604086',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-10',
    proximo_manto: '2026-09-10',
    sucursal: 'Limón',
    estatus: 'Activo'
  },
  {
    id: 'EQ-TEM-006',
    nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C',
    marca: 'Genérico',
    modelo: '110 °C',
    serie: 'Sin Serie',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-05',
    proximo_manto: '2026-10-05',
    sucursal: 'Limón',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-018',
    nombre: 'Aire Acondicionado Mirage',
    marca: 'Mirage',
    modelo: 'SMEC1821X',
    serie: 'SME182X8071001181',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-12',
    proximo_manto: '2026-09-12',
    sucursal: 'Limón',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-019',
    nombre: 'Aire Acondicionado Mirage',
    marca: 'Mirage',
    modelo: 'SMEC2621X',
    serie: 'SME21X8021005436',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-14',
    proximo_manto: '2026-09-14',
    sucursal: 'Limón',
    estatus: 'Activo'
  },
  {
    id: 'INV-FUM-002',
    nombre: 'Fumigación (Control de Plagas)',
    marca: 'Genérico',
    modelo: 'Servicio Periódico',
    serie: 'Sin Serie',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-05-10',
    proximo_manto: '2026-11-10',
    sucursal: 'Limón',
    estatus: 'Activo'
  },
  {
    id: 'INV-OPTH-006',
    nombre: 'Tergohidrómetro HTC-1',
    marca: 'Genérico',
    modelo: 'HTC-1',
    serie: 'Sin Serie',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-10',
    proximo_manto: '2026-10-10',
    sucursal: 'Limón',
    estatus: 'Activo'
  },

  // ── SUCURSAL SAN CRISTÓBAL ────────────────────────────────────────────────
  {
    id: 'EQ-SSC-002',
    nombre: 'Estufa EK-25',
    marca: 'Genérico',
    modelo: 'EK-25',
    serie: '262',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-15',
    proximo_manto: '2026-08-15',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },
  {
    id: 'EQ-SSC-003',
    nombre: 'Mezclador de Placas R-06',
    marca: 'Genérico',
    modelo: 'R-06',
    serie: '2704',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-02-18',
    proximo_manto: '2026-08-18',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },
  {
    id: 'EQ-SSC-007',
    nombre: 'Microscopio Velab VE-B2',
    marca: 'Velab',
    modelo: 'VE-B2',
    serie: '0001942',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Anual',
    ultimo_manto: '2026-01-20',
    proximo_manto: '2027-01-20',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },
  {
    id: 'EQ-SSC-004',
    nombre: 'Centrífuga Ultra 8T',
    marca: 'Genérico',
    modelo: 'Ultra 8T',
    serie: 'T100035',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-05',
    proximo_manto: '2026-09-05',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },
  {
    id: 'EQ-SSC-005',
    nombre: 'Centrífuga Biofuge Primo',
    marca: 'Heraeus',
    modelo: 'Biofuge Primo',
    serie: 'Sin Serie',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-08',
    proximo_manto: '2026-09-08',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },
  {
    id: 'INV-OPTH-003',
    nombre: 'Termohidrómetro CEM DT-172',
    marca: 'CEM',
    modelo: 'DT-172',
    serie: 'Sin Serie',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-01',
    proximo_manto: '2026-10-01',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },
  {
    id: 'EQ-TEM-011',
    nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C',
    marca: 'Genérico',
    modelo: '110 °C',
    serie: 'Sin Serie',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-02',
    proximo_manto: '2026-10-02',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },
  {
    id: 'INV-FUM-003',
    nombre: 'Fumigación (Control de Plagas)',
    marca: 'Genérico',
    modelo: 'Servicio Periódico',
    serie: 'Sin Serie',
    area: 'MICROBIOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-05-15',
    proximo_manto: '2026-11-15',
    sucursal: 'San Cristóbal',
    estatus: 'Activo'
  },

  // ── SUCURSAL CAMPESTRE ───────────────────────────────────────────────────
  {
    id: 'EQ-CAM-001',
    nombre: 'Centrífuga J-600',
    marca: 'Genérico',
    modelo: 'J-600',
    serie: '9019',
    area: 'UROANÁLISIS',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-15',
    proximo_manto: '2026-09-15',
    sucursal: 'Campestre',
    estatus: 'Activo'
  },
  {
    id: 'EQ-TEM-MERC08',
    nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C',
    marca: 'Genérico',
    modelo: '110 °C',
    serie: 'Sin Serie',
    area: 'UROANÁLISIS',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-08',
    proximo_manto: '2026-10-08',
    sucursal: 'Campestre',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-025',
    nombre: 'Aire Acondicionado Prime',
    marca: 'Prime',
    modelo: 'EMPRC362-B',
    serie: 'Sin Serie',
    area: 'UROANÁLISIS',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-20',
    proximo_manto: '2026-09-20',
    sucursal: 'Campestre',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-024',
    nombre: 'Aire Acondicionado Midea',
    marca: 'Midea',
    modelo: 'Midea',
    serie: 'D212185000114310120024',
    area: 'UROANÁLISIS',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-22',
    proximo_manto: '2026-09-22',
    sucursal: 'Campestre',
    estatus: 'Activo'
  },
  {
    id: 'INV-FUM-004',
    nombre: 'Fumigación (Control de Plagas)',
    marca: 'Genérico',
    modelo: 'Servicio Periódico',
    serie: 'Sin Serie',
    area: 'UROANÁLISIS',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-05-12',
    proximo_manto: '2026-11-12',
    sucursal: 'Campestre',
    estatus: 'Activo'
  },
  {
    id: 'INV-OPTH-007',
    nombre: 'Tergohidrómetro HTC-1',
    marca: 'Genérico',
    modelo: 'HTC-1',
    serie: 'Sin Serie',
    area: 'UROANÁLISIS',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-12',
    proximo_manto: '2026-10-12',
    sucursal: 'Campestre',
    estatus: 'Activo'
  },

  // ── SUCURSAL CHIAPA DE CORZO ──────────────────────────────────────────────
  {
    id: 'INV-CLI-001',
    nombre: 'Aire Acondicionado LG',
    marca: 'LG',
    modelo: 'M-SP121CA',
    serie: 'Sin Serie',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-25',
    proximo_manto: '2026-09-25',
    sucursal: 'Chiapa de Corzo',
    estatus: 'Activo'
  },
  {
    id: 'EQ-CHC-001',
    nombre: 'Centrífuga MPW 260',
    marca: 'MPW',
    modelo: '260',
    serie: '10260018316',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-03-28',
    proximo_manto: '2026-09-28',
    sucursal: 'Chiapa de Corzo',
    estatus: 'Activo'
  },
  {
    id: 'EQ-TEM-MER003',
    nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C',
    marca: 'Genérico',
    modelo: '110 °C',
    serie: 'Sin Serie',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-15',
    proximo_manto: '2026-10-15',
    sucursal: 'Chiapa de Corzo',
    estatus: 'Activo'
  },
  {
    id: 'INV-FUM-005',
    nombre: 'Fumigación (Control de Plagas)',
    marca: 'Genérico',
    modelo: 'Servicio Periódico',
    serie: 'Sin Serie',
    area: 'HEMATOLOGÍA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-05-18',
    proximo_manto: '2026-11-18',
    sucursal: 'Chiapa de Corzo',
    estatus: 'Activo'
  },

  // ── SUCURSAL CEDROS ──────────────────────────────────────────────────────
  {
    id: 'EQ-CED-001',
    nombre: 'Centrífuga J-600',
    marca: 'Genérico',
    modelo: 'J-600',
    serie: '9014',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-02',
    proximo_manto: '2026-10-02',
    sucursal: 'Cedros',
    estatus: 'Activo'
  },
  {
    id: 'EQ-TEM-021',
    nombre: 'Termómetro de Líquido en Vidrio alcance de 110 °C',
    marca: 'Genérico',
    modelo: '110 °C',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-20',
    proximo_manto: '2026-10-20',
    sucursal: 'Cedros',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-023',
    nombre: 'Aire Acondicionado LG',
    marca: 'LG',
    modelo: 'S362CG',
    serie: '903KABF00301',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-05',
    proximo_manto: '2026-10-05',
    sucursal: 'Cedros',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-026',
    nombre: 'Aire Acondicionado Hisense',
    marca: 'Hisense',
    modelo: 'K-AJ2C M-SP121CA',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-08',
    proximo_manto: '2026-10-08',
    sucursal: 'Cedros',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-027',
    nombre: 'Aire Acondicionado Midea',
    marca: 'Midea',
    modelo: 'M-18CDA REC',
    serie: 'Sin Serie (18000 BTU)',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-10',
    proximo_manto: '2026-10-10',
    sucursal: 'Cedros',
    estatus: 'Activo'
  },
  {
    id: 'INV-CLI-028',
    nombre: 'Aire Acondicionado Midea',
    marca: 'Midea',
    modelo: 'M-18CDA TMU',
    serie: 'Sin Serie (18000 BTU)',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-12',
    proximo_manto: '2026-10-12',
    sucursal: 'Cedros',
    estatus: 'Activo'
  },
  {
    id: 'INV-FUM-006',
    nombre: 'Fumigación (Control de Plagas)',
    marca: 'Genérico',
    modelo: 'Servicio Periódico',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-05-20',
    proximo_manto: '2026-11-20',
    sucursal: 'Cedros',
    estatus: 'Activo'
  },
  {
    id: 'INV-OPTH-008',
    nombre: 'Tergohidrómetro HTC-1',
    marca: 'Genérico',
    modelo: 'HTC-1',
    serie: 'Sin Serie',
    area: 'QUÍMICA CLÍNICA',
    frecuencia: 'Semestral',
    ultimo_manto: '2026-04-18',
    proximo_manto: '2026-10-18',
    sucursal: 'Cedros',
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
  
  console.log('✅ All 32 new equipments from Limón, San Cristóbal, Campestre, Chiapa de Corzo, and Cedros registered successfully!');
}

addAll();
