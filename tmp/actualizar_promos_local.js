import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const updatedPromos = [
  {
    titulo: 'Check-up Básico',
    descripcion: 'Química Sanguínea de 6 elementos + EGO. ¡Resultados el mismo día!',
    precio_badge: '$450',
    color_acento: '#0BCECD',
    imagen_url: '/promos/checkup.png'
  },
  {
    titulo: 'Perfil Hormonal',
    descripcion: 'Estudio especializado para la salud integral de la mujer.',
    precio_badge: '20% OFF',
    color_acento: '#5D26C1',
    imagen_url: '/promos/hormonal.png'
  }
];

async function update() {
  console.log('🔄 Actualizando URLs de imágenes a local...');
  
  // Limpiar anteriores para evitar duplicados en la prueba
  await supabase.from('promociones').delete().neq('titulo', 'DUMMY');

  const { error } = await supabase.from('promociones').insert(updatedPromos);
  if (error) {
    console.error('❌ Error al actualizar:', error.message);
  } else {
    console.log('✅ URLs actualizadas. Ahora las imágenes cargan desde la carpeta local.');
  }
}

update();
