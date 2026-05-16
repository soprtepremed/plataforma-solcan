import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log('--- VERIFICANDO CREACIÓN DE TABLAS NOM-035 ---');
  
  // Verify nom035_evaluaciones
  const { data: evData, error: evError } = await supabase
    .from('nom035_evaluaciones')
    .select('count')
    .limit(1);

  if (evError) {
    console.error('❌ Error al acceder a nom035_evaluaciones:', evError.message, evError.code);
  } else {
    console.log('✅ Tabla public.nom035_evaluaciones existe y es accesible.');
  }

  // Verify nom035_respuestas
  const { data: respData, error: respError } = await supabase
    .from('nom035_respuestas')
    .select('count')
    .limit(1);

  if (respError) {
    console.error('❌ Error al acceder a nom035_respuestas:', respError.message, respError.code);
  } else {
    console.log('✅ Tabla public.nom035_respuestas existe y es accesible.');
  }

  // Verify nom035_preguntas
  const { data: pregData, error: pregError } = await supabase
    .from('nom035_preguntas')
    .select('count')
    .limit(1);

  if (pregError) {
    console.error('❌ Error al acceder a nom035_preguntas:', pregError.message, pregError.code);
  } else {
    console.log('✅ Tabla public.nom035_preguntas existe y es accesible.');
  }

  console.log('\n--- VERIFICACIÓN FINALIZADA ---');
}

verify().catch(console.error);
