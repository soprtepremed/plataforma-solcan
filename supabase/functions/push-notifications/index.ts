import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const VAPID_PUBLIC = "BDQcmHxsTZt5zXvSixGMkwgFhOYM0q7nJ76Xr11MAZidIOl7T-UGYpA-LwDtVARJwMNwwiXgjqu_IRjqhCmwfY4";
const VAPID_PRIVATE = "zDGwiZWstl8IGIu_ZlMpL98spgVVcM8i38uSqmWuigE";

webpush.setVapidDetails('mailto:soporte@solcan.com', VAPID_PUBLIC, VAPID_PRIVATE);

serve(async (req) => {
  try {
    const { record } = await req.json();
    console.log("🔔 Procesando notificación Push para:", record.title);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Lógica de destino: Buscar suscripciones relevantes
    let subscriptionsQuery = supabase.from('push_subscriptions').select('subscription, user_id');

    if (record.user_id) {
       subscriptionsQuery = subscriptionsQuery.eq('user_id', record.user_id);
    } else if (record.role || record.metadata?.sucursal) {
       // Si es por rol o sucursal, primero buscamos a qué empleados aplica
       let empQuery = supabase.from('empleados').select('id');
       if (record.role) empQuery = empQuery.eq('role', record.role);
       if (record.metadata?.sucursal) empQuery = empQuery.eq('sucursal', record.metadata.sucursal);
       
       const { data: emps } = await empQuery;
       if (emps && emps.length > 0) {
         subscriptionsQuery = subscriptionsQuery.in('user_id', emps.map(e => e.id));
       } else {
         return new Response(JSON.stringify({ message: "No recipients found" }), { status: 200 });
       }
    }

    const { data: subs, error: subError } = await subscriptionsQuery;
    
    if (subError) throw subError;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions registered" }), { status: 200 });
    }

    console.log(`📤 Enviando push a ${subs.length} dispositivos...`);

    const pushPayload = JSON.stringify({
      title: record.title,
      message: record.message,
      url: record.metadata?.url || '/'
    });

    const results = await Promise.allSettled(subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, pushPayload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
           // Suscripción expirada, la limpiamos
           await supabase.from('push_subscriptions').delete().eq('subscription', s.subscription);
        }
        throw err;
      }
    }));

    return new Response(JSON.stringify({ ok: true, sent: subs.length }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Error en Push Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
})
