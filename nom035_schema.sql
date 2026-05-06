-- ====================================================================
-- SCHEMA FOR NOM-035-STPS-2018 PSYCHOSOCIAL RISK ASSESSMENT SUITE
-- PLATAFORMA SOLCAN - LIBRE ACCESO Y REGISTRO PÚBLICO
-- ====================================================================

-- 1. CATÁLOGO DE CUESTIONARIOS (Guías de Referencia I, II y III)
CREATE TABLE IF NOT EXISTS public.nom035_cuestionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL, -- 'guia_i', 'guia_ii', 'guia_iii'
    nombre TEXT NOT NULL,
    descripcion TEXT,
    norma TEXT DEFAULT 'NOM-035-STPS-2018',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PREGUNTAS DEL CUESTIONARIO (Con categorías, dominios y dimensiones)
CREATE TABLE IF NOT EXISTS public.nom035_preguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuestionario_id UUID REFERENCES public.nom035_cuestionarios(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL, -- 1 a N
    seccion TEXT NOT NULL,
    texto TEXT NOT NULL,
    categoria TEXT, -- e.g., 'Factores propios de la actividad'
    dominio TEXT,   -- e.g., 'Carga de trabajo'
    dimension TEXT, -- e.g., 'Cargas cuantitativas'
    tipo_puntuacion TEXT NOT NULL CHECK (tipo_puntuacion IN ('directa', 'inversa', 'binaria')),
    CONSTRAINT unique_pregunta_cuestionario UNIQUE (cuestionario_id, numero)
);

-- 3. EVALUACIONES INDIVIDUALES (Sesiones de examen del personal - LIBRE ACCESO)
CREATE TABLE IF NOT EXISTS public.nom035_evaluaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE, -- Opcional/Nullable para libre acceso
    empleado_nombre TEXT NOT NULL DEFAULT 'Anónimo',
    empleado_departamento TEXT NOT NULL DEFAULT 'General',
    empleado_sucursal TEXT NOT NULL DEFAULT 'Sede Central',
    cuestionario_id UUID REFERENCES public.nom035_cuestionarios(id) ON DELETE RESTRICT,
    estado TEXT DEFAULT 'iniciada' CHECK (estado IN ('iniciada', 'completada')),
    score_total INTEGER,
    nivel_riesgo TEXT CHECK (nivel_riesgo IN ('Nulo', 'Bajo', 'Medio', 'Alto', 'Muy alto')),
    requiere_valoracion_clinica BOOLEAN DEFAULT FALSE, -- Especialmente para Guía I (ATS)
    fecha_aplicacion TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RESPUESTAS DETALLADAS (Pregunta por pregunta por sesión)
CREATE TABLE IF NOT EXISTS public.nom035_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id UUID REFERENCES public.nom035_evaluaciones(id) ON DELETE CASCADE,
    pregunta_id UUID REFERENCES public.nom035_preguntas(id) ON DELETE CASCADE,
    respuesta_seleccionada TEXT NOT NULL, -- e.g., 'Siempre', 'Nunca', 'SÍ', 'NO'
    puntos INTEGER NOT NULL CHECK (puntos BETWEEN 0 AND 4),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_respuesta_pregunta UNIQUE (evaluacion_id, pregunta_id)
);

-- Habilitar Row Level Security (RLS) para proteger los datos
ALTER TABLE public.nom035_cuestionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nom035_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nom035_evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nom035_respuestas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar duplicados/errores
DROP POLICY IF EXISTS "Lectura pública de cuestionarios" ON public.nom035_cuestionarios;
DROP POLICY IF EXISTS "Lectura pública de preguntas" ON public.nom035_preguntas;
DROP POLICY IF EXISTS "Inserción libre de evaluaciones" ON public.nom035_evaluaciones;
DROP POLICY IF EXISTS "Lectura para admin de evaluaciones" ON public.nom035_evaluaciones;
DROP POLICY IF EXISTS "Inserción libre de respuestas" ON public.nom035_respuestas;
DROP POLICY IF EXISTS "Lectura para admin de respuestas" ON public.nom035_respuestas;

-- POLÍTICAS DE RLS (Lectura pública de cuestionarios y preguntas)
CREATE POLICY "Lectura pública de cuestionarios" ON public.nom035_cuestionarios 
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de preguntas" ON public.nom035_preguntas 
    FOR SELECT USING (true);

-- Permitir que cualquier visitante inserte cuestionarios y preguntas (Útil para sembrado inicial)
DROP POLICY IF EXISTS "Inserción libre de cuestionarios" ON public.nom035_cuestionarios;
DROP POLICY IF EXISTS "Inserción libre de preguntas" ON public.nom035_preguntas;

CREATE POLICY "Inserción libre de cuestionarios" ON public.nom035_cuestionarios
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Inserción libre de preguntas" ON public.nom035_preguntas
    FOR INSERT WITH CHECK (true);

-- Permitir que cualquier visitante inserte su evaluación sin estar autenticado
CREATE POLICY "Inserción libre de evaluaciones" ON public.nom035_evaluaciones
    FOR INSERT WITH CHECK (true);

-- Permitir que cualquier visitante inserte sus respuestas sin estar autenticado
CREATE POLICY "Inserción libre de respuestas" ON public.nom035_respuestas
    FOR INSERT WITH CHECK (true);

-- Acceso completo de lectura para reportes y visualización en el Dashboard de RRHH/Administrador
CREATE POLICY "Lectura para admin de evaluaciones" ON public.nom035_evaluaciones
    FOR SELECT USING (true);

CREATE POLICY "Lectura para admin de respuestas" ON public.nom035_respuestas
    FOR SELECT USING (true);
