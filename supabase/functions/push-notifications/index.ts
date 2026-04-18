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

    // 🚀 Seleccionamos dispositivos filtrando por destinatario
    console.log("📡 Buscando suscripciones para destinatario:", record.role || record.user_id || 'Global');
    
    let query = supabase
      .from('push_subscriptions')
      .select('subscription, token, user_id, platform');

    // FILTRO INTELIGENTE
    if (record.user_id) {
      // Notificación para un usuario específico (ej. un repartidor puntual)
      query = query.eq('user_id', record.user_id);
    } else if (record.role) {
      // Notificación por rol (ej. 'almacen', 'mensajero')
      // Necesitamos cruzar con la tabla empleados para saber quién tiene ese rol
      const { data: employees } = await supabase
        .from('empleados')
        .select('id')
        .eq('role', record.role);
      
      const employeeIds = employees?.map(e => e.id) || [];
      if (employeeIds.length > 0) {
        query = query.in('user_id', employeeIds);
      } else {
        return new Response(JSON.stringify({ message: "No employees found for this role" }), { status: 200 });
      }
    } else {
      // Si no hay rol ni user_id, por seguridad solo enviamos a administradores
      const { data: admins } = await supabase
        .from('empleados')
        .select('id')
        .eq('role', 'admin');
      
      const adminIds = admins?.map(a => a.id) || [];
      if (adminIds.length > 0) {
        query = query.in('user_id', adminIds);
      } else {
        return new Response(JSON.stringify({ message: "No specific recipient and no admins found" }), { status: 200 });
      }
    }

    const { data: subs, error: subError } = await query;
    
    if (subError) throw subError;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ message: "No relevant subscriptions found" }), { status: 200 });
    }

    const results = await Promise.all(subs.map(async (s) => {
      // --- CASO 1: EXPO PUSH TOKEN (MOBILE NATIVO) ---
      if (s.token && s.token.startsWith('ExponentPushToken')) {
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: s.token,
              title: record.title,
              body: record.message,
              data: record.metadata || {},
              sound: 'default'
            }),
          });
          const resData = await response.json();
          await supabase.from('push_logs').insert([{
            message: `✅ EXPO: Envio procesado`,
            details: { user_id: s.user_id, status: response.status, expo_response: resData }
          }]);
          return { ok: true, platform: 'expo' };
        } catch (err: any) {
          console.error('Error Expo Push:', err.message);
          return { ok: false, error: err.message };
        }
      }

      // --- CASO 2: WEB PUSH (VAPID) ---
      if (s.subscription) {
        try {
          const pushPayload = JSON.stringify({
            title: record.title,
            message: record.message,
            url: record.metadata?.url || '/'
          });
          await webpush.sendNotification(s.subscription, pushPayload);
          await supabase.from('push_logs').insert([{
            message: `✅ WEB: Éxito en envío`,
            details: { user_id: s.user_id }
          }]);
          return { ok: true, platform: 'web' };
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
             await supabase.from('push_subscriptions').delete().eq('subscription', s.subscription);
          }
          return { ok: false, error: err.message };
        }
      }

      return { ok: false, error: 'No valid subscription or token' };
    }));

    return new Response(JSON.stringify({ ok: true, processed: subs.length, results }), {
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
