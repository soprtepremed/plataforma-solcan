import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simulateDispatch() {
  const folio = 'VALE-542679';
  console.log(`=== Simulando despacho de ${folio} ===`);

  // 1. Obtener vale y solicitante
  const { data: vale, error: vErr } = await supabase
    .from('solicitudes_vale')
    .select('*, solicitante:empleados(*)')
    .eq('folio', folio)
    .single();

  if (vErr) {
    console.error('Error obteniendo vale:', vErr);
    return;
  }

  // 2. Obtener items del vale
  const { data: items, error: iErr } = await supabase
    .from('solicitudes_items')
    .select('*, material:materiales_catalogo(*)')
    .eq('vale_id', vale.id);

  if (iErr) {
    console.error('Error obteniendo items:', iErr);
    return;
  }

  const dispatchData = {
    receiverName: 'Test Receiver',
    signature: 'data:image/png;base64,test_sig',
    items: items.map(item => ({
      ...item,
      cantidad_surtida: item.cantidad_solicitada // surtir todo lo solicitado
    }))
  };

  try {
    for (const item of dispatchData.items) {
      if (item.cantidad_surtida <= 0) continue;

      // Buscar unidades
      let query = supabase
        .from('materiales_unidades')
        .select('id, lote_numero, caducidad, catalogo_id')
        .eq('catalogo_id', item.material_catalogo_id)
        .eq('estatus', 'Almacenado')
        .limit(item.cantidad_surtida);

      if (item.lote_solicitado && item.lote_solicitado !== 'SIN LOTE') {
        query = query.eq('lote_numero', item.lote_solicitado);
      }

      const { data: unidades, error: findErr } = await query;
      if (findErr) throw findErr;

      console.log(`Encontradas ${unidades ? unidades.length : 0} unidades en stock de las ${item.cantidad_surtida} requeridas para ${item.material?.nombre}`);

      if (!unidades || unidades.length < item.cantidad_surtida) {
        throw new Error(`Stock insuficiente en almacén para ${item.material?.nombre}. Se requieren ${item.cantidad_surtida} unidades.`);
      }

      // Marcar unidades como despachadas
      const unidadIds = unidades.map(u => u.id);
      const { error: updErr } = await supabase
        .from('materiales_unidades')
        .update({ estatus: 'Despachado' })
        .in('id', unidadIds);

      if (updErr) throw updErr;
      console.log(`Marcadas ${unidadIds.length} unidades como Despachadas.`);

      // Anexar al inventario de área
      const areaKey = vale.solicitante?.role || 'general';
      const sucursalName = vale.solicitante?.sucursal || 'Matriz';
      const areaTitle = vale.solicitante?.role === 'quimica_clinica' ? 'QUÍMICA CLÍNICA' : 
                        vale.solicitante?.role === 'hematologia' ? 'HEMATOLOGÍA' : 
                        vale.solicitante?.role === 'urianalisis' ? 'URIANÁLISIS' : 
                        vale.solicitante?.role === 'microbiologia' ? 'MICROBIOLOGÍA' : 
                        vale.solicitante?.role === 'serologia' ? 'SEROLOGÍA' : 'GENERAL';

      const unitsByLot = unidades.reduce((acc, u) => {
        acc[u.lote_numero] = acc[u.lote_numero] || { qty: 0, caducidad: u.caducidad };
        acc[u.lote_numero].qty++;
        return acc;
      }, {});

      for (const [lote, info] of Object.entries(unitsByLot)) {
        const { error: invErr } = await supabase
          .from('inventario_areas')
          .insert([{
            area_id: areaKey,
            codigo: item.material?.prefijo,
            descripcion: item.material?.nombre,
            lote: lote,
            caducidad: info.caducidad,
            stock_actual: info.qty,
            solicitud_id: vale.folio,
            fecha_solicitud_almacen: new Date().toISOString().substring(0, 10),
            aceptado: true,
            sucursal: sucursalName,
            sub_area: areaTitle,
            temp_almacenamiento: item.material?.presentacion || 'T/A'
          }]);

        if (invErr) throw invErr;
        console.log(`Registrada unidad en inventario_areas para ${areaKey} (${lote})`);
      }

      // Actualizar cantidad_surtida en solicitudes_items
      const { error: itemsErr } = await supabase
        .from('solicitudes_items')
        .update({ cantidad_surtida: item.cantidad_surtida })
        .eq('id', item.id);

      if (itemsErr) throw itemsErr;
      console.log(`Actualizada cantidad_surtida en solicitudes_items para item ${item.id}`);
    }

    // Actualizar solicitudes_vale
    const { error: valeErr } = await supabase
      .from('solicitudes_vale')
      .update({
        estatus: 'Surtido',
        fecha_surtido: new Date().toISOString(),
        firma_receptor: dispatchData.signature,
        nombre_receptor: dispatchData.receiverName
      })
      .eq('id', vale.id);

    if (valeErr) throw valeErr;
    console.log(`ÉXITO: Vale ${folio} marcado como Surtido en la base de datos!`);

  } catch (err) {
    console.error('ERROR EN SIMULACIÓN:', err.message || err);
  }
}

simulateDispatch();
