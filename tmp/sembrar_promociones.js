import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const defaultPromos = [
  {
    titulo: 'Check-up Básico',
    descripcion: 'Química Sanguínea de 6 elementos + EGO. ¡Resultados el mismo día!',
    precio_badge: '$450',
    color_acento: '#0BCECD',
    imagen_url: 'https://images.unsplash.com/photo-1579154236594-e179d71680d9?auto=format&fit=crop&q=80&w=400'
  },
  {
    titulo: 'Perfil Hormonal',
    descripcion: 'Estudio especializado para la salud integral de la mujer.',
    precio_badge: '20% OFF',
    color_acento: '#5D26C1',
    imagen_url: 'https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?auto=format&fit=crop&q=80&w=400'
  }
];

async function seed() {
  console.log('🌱 Sembrando ofertas iniciales...');
  const { error } = await supabase.from('promociones').insert(defaultPromos);
  if (error) {
    console.error('❌ Error al sembrar:', error.message);
  } else {
    console.log('✅ ¡Ofertas iniciales creadas! Refresca el portal para verlas.');
  }
}

seed();
