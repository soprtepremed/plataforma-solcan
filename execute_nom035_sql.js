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
  console.log('Status:', res.status);
  return { status: res.status, body: text };
}

async function start() {
  console.log('=== CREANDO / ACTUALIZANDO TABLAS PARA EVALUACIONES PÚBLICAS NOM-035 ===');

  const sql = `
    -- 1. Catálogo de cuestionarios
    CREATE TABLE IF NOT EXISTS public.nom035_cuestionarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        norma TEXT DEFAULT 'NOM-035-STPS-2018',
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- 2. Preguntas
    CREATE TABLE IF NOT EXISTS public.nom035_preguntas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cuestionario_id UUID REFERENCES public.nom035_cuestionarios(id) ON DELETE CASCADE,
        numero INTEGER NOT NULL,
        seccion TEXT NOT NULL,
        texto TEXT NOT NULL,
        categoria TEXT,
        dominio TEXT,
        dimension TEXT,
        tipo_puntuacion TEXT NOT NULL CHECK (tipo_puntuacion IN ('directa', 'inversa', 'binaria')),
        CONSTRAINT unique_pregunta_cuestionario UNIQUE (cuestionario_id, numero)
    );

    -- 3. Evaluaciones (Actualizada con campos de identificación pública/anónima)
    CREATE TABLE IF NOT EXISTS public.nom035_evaluaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE, -- Nullable para libre acceso
        empleado_nombre TEXT NOT NULL DEFAULT 'Anónimo',
        empleado_departamento TEXT NOT NULL DEFAULT 'General',
        empleado_sucursal TEXT NOT NULL DEFAULT 'Sede Central',
        cuestionario_id UUID REFERENCES public.nom035_cuestionarios(id) ON DELETE RESTRICT,
        estado TEXT DEFAULT 'iniciada' CHECK (estado IN ('iniciada', 'completada')),
        score_total INTEGER,
        nivel_riesgo TEXT CHECK (nivel_riesgo IN ('Nulo', 'Bajo', 'Medio', 'Alto', 'Muy alto')),
        requiere_valoracion_clinica BOOLEAN DEFAULT FALSE,
        fecha_aplicacion TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- 4. Respuestas
    CREATE TABLE IF NOT EXISTS public.nom035_respuestas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluacion_id UUID REFERENCES public.nom035_evaluaciones(id) ON DELETE CASCADE,
        pregunta_id UUID REFERENCES public.nom035_preguntas(id) ON DELETE CASCADE,
        respuesta_seleccionada TEXT NOT NULL,
        puntos INTEGER NOT NULL CHECK (puntos BETWEEN 0 AND 4),
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT unique_respuesta_pregunta UNIQUE (evaluacion_id, pregunta_id)
    );

    -- Asegurar RLS en todas las tablas
    ALTER TABLE public.nom035_cuestionarios ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.nom035_preguntas ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.nom035_evaluaciones ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.nom035_respuestas ENABLE ROW LEVEL SECURITY;

    -- Eliminar políticas viejas para evitar conflictos
    DROP POLICY IF EXISTS "Lectura pública de cuestionarios" ON public.nom035_cuestionarios;
    DROP POLICY IF EXISTS "Lectura pública de preguntas" ON public.nom035_preguntas;
    DROP POLICY IF EXISTS "Inserción libre de evaluaciones" ON public.nom035_evaluaciones;
    DROP POLICY IF EXISTS "Inserción libre de respuestas" ON public.nom035_respuestas;
    DROP POLICY IF EXISTS "Lectura para admin de evaluaciones" ON public.nom035_evaluaciones;
    DROP POLICY IF EXISTS "Lectura para admin de respuestas" ON public.nom035_respuestas;

    -- Crear políticas públicas sin restricciones para que cualquiera pueda responder
    CREATE POLICY "Lectura pública de cuestionarios" ON public.nom035_cuestionarios 
        FOR SELECT USING (true);

    CREATE POLICY "Lectura pública de preguntas" ON public.nom035_preguntas 
        FOR SELECT USING (true);

    CREATE POLICY "Inserción libre de evaluaciones" ON public.nom035_evaluaciones 
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Lectura para admin de evaluaciones" ON public.nom035_evaluaciones 
        FOR SELECT USING (true);

    CREATE POLICY "Inserción libre de respuestas" ON public.nom035_respuestas 
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Lectura para admin de respuestas" ON public.nom035_respuestas 
        FOR SELECT USING (true);
  `;

  const res = await runSQL(sql);
  console.log('Resultado SQL:', res.body);
}

start().catch(e => console.error(e));
