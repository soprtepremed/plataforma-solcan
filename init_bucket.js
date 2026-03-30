import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
// Usamos la service_role para tener permisos de administrador y crear el bucket
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function initBucket() {
  console.log('📦 Intentando crear el bucket "evidencia-envios"...');
  
  const { data, error } = await supabase.storage.createBucket('evidencia-envios', {
    public: true, // Queremos que las evidencias sean accesibles via URL pública
    fileSizeLimit: 5242880, // Límite de 5MB por foto para ahorrar espacio
    allowedMimeTypes: ['image/jpeg', 'image/png']
  });

  if (error) {
    if (error.message.includes('already exists')) {
       console.log('✅ El bucket ya existe.');
    } else {
       console.error('❌ Error creandolo:', error.message);
    }
  } else {
    console.log('✅ Bucket creado con éxito.');
  }

  // Verificar ahora
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Buckets actuales:', buckets.map(b => b.name));
}

initBucket();
