import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPush() {
    console.log('🚀 Iniciando envio de prueba...');
    
    const testShipment = {
        sucursal: 'Mercado Central (MC)',
        status: 'Pendiente',
        s_rojo: 15,
        s_dorado: 5,
        s_lila: 20,
        s_celeste: 0,
        temp_sale_amb: 26.2,
        temp_sale_ref: 4.1,
        observaciones_sucursal: '📦 PRUEBA FINAL - MERCADO CENTRAL - DEBE SONAR EN MOVIL'
    };

    const { data: shipment, error: shipError } = await supabase
        .from('logistica_envios')
        .insert([testShipment])
        .select();

    if (shipError) {
        console.error('❌ Error enviando hielera:', shipError.message);
        return;
    }

    console.log('✅ Hielera registrada ID:', shipment[0].id);

    // Enviar notificación a varios roles para asegurar visibilidad
    const roles = ['admin', 'mensajero', 'recepcion', 'quimico'];
    
    for (const role of roles) {
        const { error: notifError } = await supabase
            .from('notificaciones')
            .insert([{
                role: role,
                title: '📦 NUEVA HIELERA: ' + testShipment.sucursal,
                message: 'Se ha registrado un envío de prueba para validar el sistema de avisos.',
                type: 'info',
                metadata: { sucursal: testShipment.sucursal, id: shipment[0].id }
            }]);

        if (notifError) {
            console.error(`❌ Error notificando a ${role}:`, notifError.message);
        } else {
            console.log(`🔔 Notificación enviada a: ${role}`);
        }
    }
    
    console.log('✨ Proceso completado. Revisa tu App!');
}

testPush();
