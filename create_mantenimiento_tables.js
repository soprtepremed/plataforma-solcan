// Utilizando fetch global nativo de Node.js

const token = 'sbp_37540de441f46d06a3884cf883388ea3ee5abedb';
const projectRef = 'ybhfsvkwpmhzwuboynre';

async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  return { status: res.status, body: text };
}

async function start() {
  console.log('=== CREANDO ESTRUCTURA DE BASE DE DATOS DE MANTENIMIENTO ===');

  // 1. Create Tables
  const schemaSQL = `
    -- 1. Equipos de Mantenimiento
    CREATE TABLE IF NOT EXISTS public.mantenimiento_equipos (
      id text PRIMARY KEY,
      nombre text NOT NULL,
      marca text NOT NULL,
      modelo text NOT NULL,
      serie text,
      area text NOT NULL,
      frecuencia text NOT NULL,
      ultimo_manto date,
      proximo_manto date,
      sucursal text NOT NULL,
      estatus text NOT NULL DEFAULT 'Activo',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- 2. Tickets Correctivos
    CREATE TABLE IF NOT EXISTS public.mantenimiento_tickets (
      id text PRIMARY KEY,
      equipo_id text REFERENCES public.mantenimiento_equipos(id) ON DELETE CASCADE,
      equipo_nombre text,
      area text,
      reportado_por text,
      fecha date NOT NULL,
      falla text,
      urgencia text,
      estado text NOT NULL DEFAULT 'Pendiente',
      sucursal text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- 3. Historial de Mantenimiento / Calibración
    CREATE TABLE IF NOT EXISTS public.mantenimiento_historial (
      id text PRIMARY KEY,
      equipo_id text REFERENCES public.mantenimiento_equipos(id) ON DELETE CASCADE,
      equipo_nombre text,
      tipo text,
      subtipo text,
      fecha date NOT NULL,
      realizado_por text,
      costo numeric(12,2) DEFAULT 0,
      observaciones text,
      sucursal text,
      evidencia_nombre text,
      evidencia_url text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Habilitar Row Level Security (RLS)
    ALTER TABLE public.mantenimiento_equipos ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.mantenimiento_tickets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.mantenimiento_historial ENABLE ROW LEVEL SECURITY;

    -- Crear Políticas de Acceso (Acceso total para simplificar de acuerdo con el estilo de Solcan)
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso Universal Mto Equipos') THEN
        CREATE POLICY "Acceso Universal Mto Equipos" ON public.mantenimiento_equipos FOR ALL USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso Universal Mto Tickets') THEN
        CREATE POLICY "Acceso Universal Mto Tickets" ON public.mantenimiento_tickets FOR ALL USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso Universal Mto Historial') THEN
        CREATE POLICY "Acceso Universal Mto Historial" ON public.mantenimiento_historial FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;

  console.log('Creando tablas y políticas...');
  const r1 = await runSQL(schemaSQL);
  console.log('Resultado Tablas:', r1.body.substring(0, 300));

  // 2. Setup Storage Bucket
  console.log('\nConfigurando bucket de storage "mantenimiento-evidencia"...');
  const storageSQL = `
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('mantenimiento-evidencia', 'mantenimiento-evidencia', true)
    ON CONFLICT (id) DO NOTHING;

    -- Políticas de Storage
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso publico mto bucket select') THEN
        CREATE POLICY "Acceso publico mto bucket select" ON storage.objects FOR SELECT USING (bucket_id = 'mantenimiento-evidencia');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso publico mto bucket insert') THEN
        CREATE POLICY "Acceso publico mto bucket insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'mantenimiento-evidencia');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso publico mto bucket update') THEN
        CREATE POLICY "Acceso publico mto bucket update" ON storage.objects FOR UPDATE USING (bucket_id = 'mantenimiento-evidencia');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso publico mto bucket delete') THEN
        CREATE POLICY "Acceso publico mto bucket delete" ON storage.objects FOR DELETE USING (bucket_id = 'mantenimiento-evidencia');
      END IF;
    END $$;
  `;
  const r2 = await runSQL(storageSQL);
  console.log('Resultado Storage:', r2.body.substring(0, 300));

  // 3. Seed initial data
  console.log('\nInsertando datos semilla...');
  const seedSQL = `
    -- Limpiar tablas si hay datos antiguos (opcional, pero seguro para idempotencia)
    TRUNCATE public.mantenimiento_historial CASCADE;
    TRUNCATE public.mantenimiento_tickets CASCADE;
    TRUNCATE public.mantenimiento_equipos CASCADE;

    -- Insertar Equipos
    INSERT INTO public.mantenimiento_equipos (id, nombre, marca, modelo, serie, area, frecuencia, ultimo_manto, proximo_manto, sucursal, estatus) VALUES
    ('EQ-001', 'Analizador Hematológico Sysmex XN-1000', 'Sysmex', 'XN-1000', 'SYSMEX-99812', 'HEMATOLOGÍA', 'Mensual', '2026-04-20', '2026-05-20', 'Matriz', 'Activo'),
    ('EQ-002', 'Analizador de Química Clínica Vitros 4600', 'Ortho Clinical', 'Vitros 4600', 'VITROS-4600-X3', 'QUÍMICA CLÍNICA', 'Trimestral', '2026-02-10', '2026-05-10', 'Matriz', 'Activo'),
    ('EQ-003', 'Gasómetro ABL90 Flex', 'Radiometer', 'ABL90', 'ABL90-8871', 'HEMATOLOGÍA', 'Semestral', '2025-11-20', '2026-05-20', 'Tapachula', 'Activo'),
    ('EQ-004', 'Centrífuga Beckman Coulter', 'Beckman Coulter', 'Allegra X-30', 'BECK-ALLEGRA-12', 'QUÍMICA CLÍNICA', 'Anual', '2025-08-10', '2026-08-10', 'Tapachula', 'Activo'),
    ('EQ-005', 'Autoclave Vertical Tuttnauer', 'Tuttnauer', '3870ELV', 'TUTT-3870-19', 'MICROBIOLOGÍA', 'Trimestral', '2026-03-01', '2026-06-01', 'San Cristóbal', 'Activo'),
    ('EQ-006', 'Analizador de Orina Aution Max', 'Arkray', 'AX-4030', 'ARK-AUTION-09', 'UROANÁLISIS', 'Trimestral', '2026-04-05', '2026-07-05', 'Comitán', 'Activo'),
    ('EQ-007', 'Microscopio Binocular Olympus CX31', 'Olympus', 'CX31', 'OLY-CX31-778', 'HEMATOLOGÍA', 'Anual', '2025-06-15', '2026-06-15', 'Tapachula', 'Activo'),
    ('EQ-008', 'Incubadora Microbiológica Binder', 'Binder', 'BD 56', 'BINDER-BD-109', 'MICROBIOLOGÍA', 'Semestral', '2025-12-10', '2026-06-10', 'CRAE', 'Activo'),
    ('EQ-009', 'Baño María Memmert', 'Memmert', 'WNB 7', 'MEM-WNB-55', 'QUÍMICA CLÍNICA', 'Anual', '2025-09-01', '2026-09-01', 'Palenque', 'Activo'),
    ('EQ-TEM-MERC-05', 'Termómetro de Líquido en Vidrio alcance de 110 °C', 'Genérico', '110 °C', 'Sin Serie', 'MICROBIOLOGÍA', 'Semestral', '2026-04-10', '2026-10-10', 'Matriz', 'Activo'),
    ('EQ-MIC-002', 'Centrífuga Ultra 8T (LW Scientific)', 'LW Scientific', 'Ultra 8T', 'F33D1000062', 'MICROBIOLOGÍA', 'Semestral', '2026-03-15', '2026-09-15', 'Matriz', 'Activo'),
    ('EQ-MIC-004', 'Microscopio CX31 RBSFA (Olympus)', 'Olympus', 'CX31 RBSFA', '6D32271', 'MICROBIOLOGÍA', 'Anual', '2026-01-20', '2027-01-20', 'Matriz', 'Activo'),
    ('EQ-MIC-007', 'Microscan Autoscan4 (Beckman Coulter)', 'Beckman Coulter', 'Autoscan4', '9513', 'MICROBIOLOGÍA', 'Trimestral', '2026-04-05', '2026-07-05', 'Matriz', 'Activo'),
    ('EQ-MIC-001-1', 'BT24 Block Chain', 'Genérico', 'BT24', '202406024BT24', 'MICROBIOLOGÍA', 'Semestral', '2026-02-10', '2026-08-10', 'Matriz', 'Activo'),
    ('EQ-MIC-001-2', 'Cabina de Seguridad Nuaire UN-126-400', 'Nuaire', 'UN-126-400', '126158093008', 'MICROBIOLOGÍA', 'Trimestral', '2026-03-01', '2026-06-01', 'Matriz', 'Activo'),
    ('EQ-MIC-008', 'Estufa de Cultivo Riossa', 'Riossa', 'ECML', 'Sin Serie', 'MICROBIOLOGÍA', 'Semestral', '2026-02-28', '2026-08-28', 'Matriz', 'Activo'),
    ('EQ-MIC-018', 'Microscopio CX31 RBSFA (Olympus)', 'Olympus', 'CX31 RBSFA', '6D11524', 'MICROBIOLOGÍA', 'Anual', '2025-11-15', '2026-11-15', 'Matriz', 'Activo'),
    ('EQ-MIC-012', 'Enfriador Vertical CV-14', 'Genérico', 'CV-14', 'LO7-1908', 'MICROBIOLOGÍA', 'Anual', '2025-08-20', '2026-08-20', 'Matriz', 'Activo'),
    ('INV-DEN-001', 'Densitómetro 001', 'Genérico', 'Densitómetro', 'Sin Serie', 'MICROBIOLOGÍA', 'Semestral', '2026-03-10', '2026-09-10', 'Matriz', 'Activo'),
    ('INV-DENS-002', 'Densitómetro 002', 'Genérico', 'Densitómetro', 'Sin Serie', 'MICROBIOLOGÍA', 'Semestral', '2026-03-12', '2026-09-12', 'Matriz', 'Activo'),
    ('EQ-MIC-005', 'Vortex Maxi Mix II', 'Genérico', 'Maxi Mix II', '18610181153028', 'MICROBIOLOGÍA', 'Anual', '2025-10-05', '2026-10-05', 'Matriz', 'Activo'),
    ('EQ-TEM-003', 'Termómetro de Líquido en Vidrio alcance de 110 °C', 'Genérico', '110 °C', 'Sin Serie', 'MICROBIOLOGÍA', 'Semestral', '2026-04-12', '2026-10-12', 'Matriz', 'Activo'),
    ('EQ-MIC-003', 'Thermostat Water Bath HH-2', 'Genérico', 'HH-2', 'Sin Serie', 'MICROBIOLOGÍA', 'Semestral', '2026-01-15', '2026-07-15', 'Matriz', 'Activo'),
    ('INV-OPTH-002', 'Termohidrómetro CEM DT-172', 'CEM', 'DT-172', 'Sin Serie', 'MICROBIOLOGÍA', 'Semestral', '2026-02-18', '2026-08-18', 'Matriz', 'Activo'),
    ('INV-CLI-029', 'Aire Acondicionado Midea', 'Midea', '12CDLA', 'D212303630114C18120609', 'HEMATOLOGÍA', 'Semestral', '2026-03-10', '2026-09-10', 'Matriz', 'Activo'),
    ('INV-CLI-030', 'Aire Acondicionado Midea', 'Midea', '12CDLA', 'D212303630314C25120060', 'MICROBIOLOGÍA', 'Semestral', '2026-03-12', '2026-09-12', 'Matriz', 'Activo');

    -- Insertar Tickets
    INSERT INTO public.mantenimiento_tickets (id, equipo_id, equipo_nombre, area, reportado_por, fecha, falla, urgencia, estado, sucursal) VALUES
    ('TKT-101', 'EQ-006', 'Analizador de Orina Aution Max', 'UROANÁLISIS', 'Mtra. Lucía Pérez', '2026-05-18', 'El lector óptico no detecta las tiras reactivas de manera intermitente, muestra error en código de barras.', 'Alta', 'Pendiente', 'Comitán'),
    ('TKT-102', 'EQ-003', 'Gasómetro ABL90 Flex', 'HEMATOLOGÍA', 'Dr. Fernando Gómez', '2026-05-19', 'El brazo mecánico tiene juego y no succiona correctamente la muestra de sangre capilar.', 'Media', 'En Proceso', 'Tapachula'),
    ('TKT-103', 'EQ-002', 'Analizador de Química Clínica Vitros 4600', 'QUÍMICA CLÍNICA', 'Q.F.B. Javier Ruiz', '2026-05-20', 'El sistema marca baja presión de agua en la bomba de desecho durante el ciclo de autolimpieza.', 'Alta', 'Pendiente', 'Matriz');

    -- Insertar Historial
    INSERT INTO public.mantenimiento_historial (id, equipo_id, equipo_nombre, tipo, subtipo, fecha, realizado_por, costo, observaciones, sucursal, evidencia_nombre, evidencia_url) VALUES
    ('HS-101', 'EQ-MIC-002', 'Centrífuga Ultra 8T (LW Scientific)', 'Preventivo', 'Mantenimiento', '2026-01-15', 'Ing. Rafael Torres (LW Scientific)', 1800.00, 'Mantenimiento preventivo semestral. Lubricación de rodamientos, limpieza del rotor y verificación de velocidades con tacómetro certificado. Equipo en óptimas condiciones.', 'Matriz', 'reporte_centrifuga_ene2026.pdf', '#'),
    ('HS-102', 'EQ-MIC-001-2', 'Cabina de Seguridad Nuaire UN-126-400', 'Preventivo', 'Calibración', '2026-01-22', 'Tec. Certificado Ambiental Humberto Díaz', 3500.00, 'Calibración anual de flujo laminar. Prueba de integridad de filtros HEPA, medición de velocidad de aire (0.45 m/s ± 20%) y prueba de humo. Certificado ASHRAE 110 emitido.', 'Matriz', 'certificado_cabina_bioseguridad_ene2026.pdf', '#'),
    ('HS-103', 'INV-OPTH-002', 'Termohidrómetro CEM DT-172', 'Preventivo', 'Verificación', '2026-02-10', 'Q.F.B. Adriana Solís', 0.00, 'Verificación interna de parámetros operativos. Comparación contra termómetro de referencia NIST. Deriva: +0.2°C — dentro del límite de aceptación (±0.5°C). Aprobado.', 'Matriz', 'registro_verificacion_termohidrometro_feb2026.pdf', '#'),
    ('HS-104', 'EQ-MIC-001-1', 'BT24 Block Chain', 'Preventivo', 'Mantenimiento', '2026-02-18', 'Tec. Interno Luis Cárdenas', 250.00, 'Mantenimiento preventivo. Limpieza de placa calefactora, revisión de contactos eléctricos y ajuste de temperatura. Funcionamiento verificado a 37°C ± 0.5°C.', 'Matriz', NULL, NULL),
    ('HS-105', 'EQ-MIC-001-2', 'Cabina de Seguridad Nuaire UN-126-400', 'Preventivo', 'Mantenimiento', '2026-03-05', 'Tec. Interno Jorge Espinoza', 380.00, 'Mantenimiento preventivo trimestral. Limpieza de superficies internas con alcohol isopropílico, revisión de luz UV y verificación de alarmas de flujo. Sin anomalías.', 'Matriz', 'mto_cabina_mar2026.jpg', '#'),
    ('HS-106', 'INV-DEN-001', 'Densitómetro 001', 'Preventivo', 'Calibración', '2026-03-20', 'Proveedor Externo DensiTech México', 2200.00, 'Calibración externa anual con estándares trazables a CENAM. Curva de calibración validada en rango 0.00–3.50 Abs. Incertidumbre: ±0.005 Abs. Certificado #DT-2026-0318 emitido.', 'Matriz', 'certificado_densitometro_001_mar2026.pdf', '#'),
    ('HS-107', 'EQ-MIC-008', 'Estufa de Cultivo Riossa', 'Preventivo', 'Verificación', '2026-03-28', 'Q.F.B. Adriana Solís', 0.00, 'Verificación de temperatura por zona (superior, media, inferior) con termómetro de referencia certificado. Uniformidad ≤ 1°C. Todas las zonas dentro de especificación a 37°C. Aprobado.', 'Matriz', 'verificacion_estufa_mar2026.pdf', '#'),
    ('HS-108', 'EQ-001', 'Analizador Hematológico Sysmex XN-1000', 'Preventivo', 'Mantenimiento', '2026-04-20', 'Ing. Carlos Mendoza (Sysmex)', 2500.00, 'Mantenimiento preventivo mensual. Limpieza de cámara de flujo, revisión de filtros y calibración de reactivos. Control de calidad interno aprobado.', 'Matriz', 'reporte_preventivo_sysmex_abr2026.pdf', '#'),
    ('HS-109', 'EQ-MIC-007', 'Microscan Autoscan4 (Beckman Coulter)', 'Preventivo', 'Mantenimiento', '2026-04-08', 'Tec. Beckman Coulter México', 1950.00, 'Mantenimiento preventivo trimestral. Limpieza óptica del lector, ajuste del sistema de pipeteo y verificación de paneles de identificación bacteriana. Sistema calibrado y operativo.', 'Matriz', 'mto_microscan_abr2026.pdf', '#'),
    ('HS-110', 'EQ-MIC-004', 'Microscopio CX31 RBSFA (Olympus)', 'Correctivo', 'Correctivo', '2026-04-15', 'Tec. Óptica Especializada S.A. de C.V.', 1100.00, 'Corrección por desalineación del revólver porta-objetivos. Limpieza de ópticas con solución de acetona al 30%. Revisión de iluminación Köhler y centrado de condensador. Equipo operativo.', 'Matriz', 'recibo_correctivo_microscopio_abr2026.jpg', '#'),
    ('HS-111', 'EQ-004', 'Centrífuga Beckman Coulter', 'Correctivo', 'Correctivo', '2026-04-12', 'Tec. Interno Luis Cárdenas', 450.00, 'Cambio de carbones del motor por desgaste. Limpieza del rotor y pruebas de revoluciones (RPM) exitosas.', 'Tapachula', 'recibo_refacciones_centrifuga.jpg', '#'),
    ('HS-112', 'EQ-MIC-002', 'Centrífuga Ultra 8T (LW Scientific)', 'Preventivo', 'Mantenimiento', '2026-05-14', 'Ing. Rafael Torres (LW Scientific)', 1800.00, 'Mantenimiento preventivo programado. Revisión de escobillas, limpieza del rotor de ángulo fijo, prueba de balanceo y verificación de freno electromagnético.', 'Matriz', 'reporte_centrifuga_may2026.pdf', '#'),
    ('HS-113', 'INV-DENS-002', 'Densitómetro 002', 'Preventivo', 'Calibración', '2026-05-06', 'Proveedor Externo DensiTech México', 2200.00, 'Calibración externa con estándares trazables a CENAM. Rango 0.00–3.50 Abs validado. Incertidumbre: ±0.005 Abs. Certificado #DT-2026-0502 emitido. Vigencia: 12 meses.', 'Matriz', 'certificado_densitometro_002_may2026.pdf', '#'),
    ('HS-114', 'EQ-MIC-012', 'Enfriador Vertical CV-14', 'Preventivo', 'En Proceso', '2026-05-20', 'Ing. Climatización Frigorex (en proceso)', 0.00, 'Calibración de temperatura en proceso. Técnico ingresó el equipo al laboratorio de metrología externo. Pendiente emisión de certificado. Fecha estimada de entrega: 27/05/2026.', 'Matriz', NULL, NULL);
  `;

  console.log('Sembrando datos...');
  const r3 = await runSQL(seedSQL);
  console.log('Resultado Siembra:', r3.body.substring(0, 300));

  // 4. Verification
  console.log('\n=== VERIFICACIÓN DE CARGA ===');
  const countSQL = `
    SELECT 
      (SELECT count(*) FROM public.mantenimiento_equipos) as equipos_total,
      (SELECT count(*) FROM public.mantenimiento_tickets) as tickets_total,
      (SELECT count(*) FROM public.mantenimiento_historial) as historial_total;
  `;
  const r4 = await runSQL(countSQL);
  console.log('Registros creados:', r4.body);

  console.log('\n=== PROCESO COMPLETADO EXITOSAMENTE ===');
}

start().catch(e => console.error('Error fatal:', e.message));
