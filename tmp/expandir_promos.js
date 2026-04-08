import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const newPromos = [
  {
    titulo: 'Perfil Diabético',
    descripcion: 'Control integral de glucosa, HbA1c y microalbuminuria.',
    precio_badge: '$680',
    color_acento: '#2ECC71',
    imagen_url: '/promos/diabetes.png'
  },
  {
    titulo: 'Química 45 Elementos',
    descripcion: 'El estudio más completo para una visión total de tu salud sanguínea.',
    precio_badge: '$1,290',
    color_acento: '#F1C40F',
    imagen_url: '/promos/elementos45.png'
  },
  {
    titulo: 'Antígeno Prostático',
    descripcion: 'Prevención vital para hombres mayores de 40 años.',
    precio_badge: '$350',
    color_acento: '#3498DB',
    imagen_url: '/promos/antigeno.png'
  },
  {
    titulo: 'Check-up Infantil',
    descripcion: 'Asegura el crecimiento saludable de los pequeños del hogar.',
    precio_badge: '$520',
    color_acento: '#E67E22',
    imagen_url: '/promos/infantil.png'
  }
];

async function seed() {
  console.log('🌱 Añadiendo 4 ofertas premium adicionales...');
  const { error } = await supabase.from('promociones').insert(newPromos);
  if (error) {
    console.error('❌ Error al sembrar:', error.message);
  } else {
    console.log('✅ Catálogo expandido con éxito.');
  }
}

seed();
