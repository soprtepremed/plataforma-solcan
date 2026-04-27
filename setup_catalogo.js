// fetch is native in Node 24

const token = 'sbp_37540de441f46d06a3884cf883388ea3ee5abedb';
const projectRef = 'ybhfsvkwpmhzwuboynre';

async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: text };
  }
}

async function start() {
  console.log('--- Iniciando Configuración de Base de Datos ---');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.especiales_catalogo (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      clave_orthin text NOT NULL,
      nombre text NOT NULL,
      metodologia text,
      contenido text DEFAULT 'NA',
      tipo_muestra text,
      tiempo_entrega text,
      acreditado_ema boolean DEFAULT false,
      subrogado boolean DEFAULT false,
      notas text,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.especiales_catalogo ENABLE ROW LEVEL SECURITY;
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'acceso_especiales_catalogo') THEN
        CREATE POLICY "acceso_especiales_catalogo" ON public.especiales_catalogo FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;
  
  console.log('1. Creando tabla y políticas...');
  const res1 = await runSQL(createTableSQL);
  if (res1.error) {
    console.error('Error en creación:', res1.error);
    return;
  }
  console.log('Tabla lista ✅');

  const insertSQL = `
    INSERT INTO public.especiales_catalogo (clave_orthin, nombre, metodologia, tipo_muestra, tiempo_entrega, acreditado_ema, subrogado)
    VALUES 
    ('01', '17 Alfa hidroxiprogesterona en suero', 'Inmunoensayo enzimático (ELISA)', 'Suero', '1 día hábil', true, false),
    ('02', 'Adrenalina en plasma', 'Inmunoensayo enzimático (ELISA)', 'Plasma / EDTA', '7 días hábiles', false, false),
    ('03', 'Calcitonina', 'Quimioluminiscencia (C.M.I.A.)', 'Suero', '1 día hábil', false, false),
    ('04', 'Analisis fisicoquímico de urolito', 'Espectroscopía de infrarojo (IR)', 'Calculo renal', '3 días hábiles', false, false),
    ('05', 'Cannabinoides (marihuana)', 'Inmunoensayo cromatográfico', 'Orina ocasional', 'EMD', false, false),
    ('07', 'CurT-uptake (TU)', 'Quimioluminiscencia (C.M.I.A.)', 'Suero', 'EMD', false, false),
    ('08', 'Isoenzimas de deshidrogenasa láctica (LDH)', 'Electroforesis', 'Suero', '10 días hábiles', false, true),
    ('09', 'Capacidad total de fijación de hierro (TIBC)', 'Espectrofotometría automatizada', 'Suero', 'EMD', false, false),
    ('10', 'Carbamacepina (Tegretol)', 'Quimioluminiscencia (C.M.I.A.)', 'Suero', '1 día hábil', true, false),
    ('11', 'Perfil de Catecolaminas en plasma', 'Inmunoensayo enzimático (ELISA)', 'Plasma / EDTA', '7 días hábiles', false, false),
    ('13', 'Complemento C-5', 'Nefelometría', 'Suero', '16 días hábiles', false, true),
    ('14', 'Células L.E.', 'Microscopía', 'Sangre coagulada', '1 día hábil', false, false),
    ('15', 'Ciclosporina', 'Quimioluminiscencia (C.M.I.A.)', 'Sangre total / EDTA', '2 días hábiles', false, false),
    ('104', 'Gastrina', 'Quimioluminiscencia (C.M.I.A.)', 'Suero', '4 días hábiles', false, true),
    ('105', 'Alfafetoproteína (AFP)', 'Quimioluminiscencia (C.M.I.A.)', 'Suero', 'EMD', true, false),
    ('111', 'Glucosa urinaria', 'Espectrofotometría automatizada', 'Orina de 24 hrs', 'EMD', false, false),
    ('293', 'Western blot HIV', 'Enzimoinmunoensayo', 'Suero', '1 día hábil', true, false),
    ('577', 'PCR Detección cromosoma filadelfia BCR/ABL t(9;22)', 'Reacción en cadena de la polimerasa', 'Sangre total / EDTA', '6 días hábiles', false, true)
    ON CONFLICT DO NOTHING;
  `;

  console.log('2. Insertando datos de prueba (PDF Orthin)...');
  const res2 = await runSQL(insertSQL);
  console.log('Carga masiva completada ✅');
  
  console.log('--- Configuración Finalizada con Éxito ---');
}

start();
