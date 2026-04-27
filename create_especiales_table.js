const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ybhfsvkwpmhzwuboynre.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc'
);

const sql = `
  CREATE TABLE IF NOT EXISTS public.maquilas_especiales (
    id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    folio                   text,
    paciente                text NOT NULL,
    estudio                 text NOT NULL,
    laboratorio             text NOT NULL,
    sucursal                text,
    fecha_envio             date NOT NULL DEFAULT CURRENT_DATE,
    fecha_entrega_estimada  date,
    fecha_resultado         date,
    estado                  text NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EN_PROCESO','ENTREGADO','CANCELADO')),
    costo_maquila           numeric(10,2),
    costo_paciente          numeric(10,2),
    observaciones           text,
    registrado_por          text,
    created_at              timestamptz DEFAULT now()
  );
  ALTER TABLE public.maquilas_especiales ENABLE ROW LEVEL SECURITY;
  CREATE POLICY IF NOT EXISTS "especiales_access" ON public.maquilas_especiales
    FOR ALL USING (true) WITH CHECK (true);
`;

async function run() {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.log('RPC no disponible, intentando via REST directo:', error.message);
  } else {
    console.log('Tabla maquilas_especiales creada OK');
  }
}
run();
