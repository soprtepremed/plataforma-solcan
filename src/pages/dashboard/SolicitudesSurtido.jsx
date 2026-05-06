import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './SolicitudesSurtido.module.css';
import ValeAlmacen from '../../components/documents/ValeAlmacen';
import SignaturePad from '../../components/SignaturePad';
import html2pdf from 'html2pdf.js';

export default function SolicitudesSurtido() {
    const [loading, setLoading] = useState(true);
    const [vales, setVales] = useState([]);
    const [selectedVale, setSelectedVale] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [dispatchData, setDispatchData] = useState({
        receiverName: '',
        signature: '',
        items: []
    });
    const [notification, setNotification] = useState(null);
    const voucherRef = useRef(null);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        fetchVales();
    }, []);

    const fetchVales = async () => {
        setLoading(true);
        try {
            // 1. Obtener los vales primero
            const { data: valesData, error: valesErr } = await supabase
                .from('solicitudes_vale')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (valesErr) throw valesErr;
            if (!valesData) return setVales([]);

            // 2. Extraer IDs únicos de solicitantes para traer sus nombres, roles y sucursales
            const solicitanteIds = [...new Set(valesData.map(v => v.solicitante_id).filter(Boolean))];
            
            let solicitantesMap = {};
            if (solicitanteIds.length > 0) {
                const { data: empData } = await supabase
                    .from('empleados')
                    .select('id, nombre, role, sucursal')
                
                if (empData) {
                    empData.forEach(emp => {
                        solicitantesMap[emp.id] = {
                            name: emp.nombre,
                            role: emp.role,
                            sucursal: emp.sucursal
                        };
                    });
                }
            }

            // 3. Combinar datos
            const finalData = valesData.map(v => ({
                ...v,
                solicitante: solicitantesMap[v.solicitante_id] || { name: 'Usuario desconocido', role: 'general', sucursal: 'Matriz' }
            }));

            setVales(finalData);
        } catch (err) {
            console.error("Error fetching vales:", err);
            setNotification({ type: 'error', text: 'Error al cargar solicitudes: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const fetchValeDetails = async (vale) => {
        const { data } = await supabase
            .from('solicitudes_items')
            .select('*, material:materiales_catalogo(nombre, prefijo, unidad, ubicacion, marca, presentacion)')
            .eq('vale_id', vale.id);
        
        setSelectedVale({ ...vale, items: data || [] });
        setShowModal(true);
    };

    const openConfirmModal = () => {
        if (!selectedVale) return;
        setDispatchData({
            receiverName: '',
            signature: '',
            items: selectedVale.items.map(item => ({
                ...item,
                cantidad_surtida: item.cantidad_solicitada // Por defecto todo surtido
            }))
        });
        setShowConfirmModal(true);
    };

    const handleSurtir = async () => {
        if (!selectedVale) return;
        if (!dispatchData.signature) {
            alert('Por favor, capture la firma de quien recibe.');
            return;
        }
        if (!dispatchData.receiverName.trim()) {
            alert('Por favor, ingrese el nombre de quien recibe.');
            return;
        }
        
        console.log("=== [INICIO] PROCESO DE SURTIDO EN ALMACÉN ===");
        console.log("Vale Seleccionado:", selectedVale);
        console.log("Datos de Despacho Capturados:", dispatchData);

        setLoading(true);
        try {
            // 1. Procesar cada material del vale
            for (const item of dispatchData.items) {
                if (item.cantidad_surtida <= 0) {
                    console.log(`[Paso 1] Saltando item ${item.material?.nombre} porque cantidad_surtida es 0 o menor.`);
                    continue;
                }

                console.log(`[Paso 1] Buscando stock disponible para: "${item.material?.nombre}" (ID Catálogo: ${item.material_catalogo_id})`);
                console.log(`Lote solicitado específico: ${item.lote_solicitado || 'Sin lote específico (FIFO)'}`);

                // Buscar unidades disponibles (FIFO o por Lote solicitado)
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
                if (findErr) {
                    console.error("[Paso 1 ERROR] Error al buscar unidades de stock:", findErr);
                    throw findErr;
                }

                console.log(`[Paso 1 RESULTADO] Se encontraron ${unidades?.length || 0} unidades disponibles de las ${item.cantidad_surtida} requeridas:`, unidades);

                if (!unidades || unidades.length < item.cantidad_surtida) {
                    throw new Error(`Stock insuficiente en almacén para ${item.material?.nombre || 'este reactivo'}. Se requieren ${item.cantidad_surtida} unidades en estatus 'Almacenado'.`);
                }

                // 2. Marcar unidades como despachadas
                const unidadIds = unidades.map(u => u.id);
                console.log(`[Paso 2] Marcando ${unidadIds.length} unidades en materiales_unidades como 'Despachado'. IDs:`, unidadIds);
                
                const { error: updErr } = await supabase
                    .from('materiales_unidades')
                    .update({ estatus: 'Despachado' })
                    .in('id', unidadIds);

                if (updErr) {
                    console.error("[Paso 2 ERROR] No se pudieron marcar las unidades como despachadas:", updErr);
                    throw updErr;
                }
                console.log("[Paso 2 ÉXITO] Estatus de unidades en almacén actualizado a 'Despachado'.");

                // 3. AUTOMATIZACIÓN: Anexar al inventario del área usando datos reales del solicitante
                const areaKey = selectedVale.solicitante?.role || 'general';
                const sucursalName = selectedVale.solicitante?.sucursal || 'Matriz';
                const areaTitle = selectedVale.solicitante?.role === 'quimica_clinica' ? 'QUÍMICA CLÍNICA' : 
                                  selectedVale.solicitante?.role === 'hematologia' ? 'HEMATOLOGÍA' : 
                                  selectedVale.solicitante?.role === 'urianalisis' ? 'URIANÁLISIS' : 
                                  selectedVale.solicitante?.role === 'microbiologia' ? 'MICROBIOLOGÍA' : 
                                  selectedVale.solicitante?.role === 'serologia' ? 'SEROLOGÍA' : 'GENERAL';
                
                console.log(`[Paso 3] Preparando envío automático al inventario técnico de ${areaTitle} (${areaKey}) en la sucursal ${sucursalName}.`);

                // Agrupar por lote para crear registros consolidados si es necesario
                const unitsByLot = unidades.reduce((acc, u) => {
                    acc[u.lote_numero] = acc[u.lote_numero] || { qty: 0, caducidad: u.caducidad };
                    acc[u.lote_numero].qty++;
                    return acc;
                }, {});

                for (const [lote, info] of Object.entries(unitsByLot)) {
                    console.log(`[Paso 3] Insertando en inventario_areas: Lote "${lote}", Cantidad: ${info.qty}`);
                    const { error: invErr } = await supabase
                        .from('inventario_areas')
                        .insert([{
                            area_id: areaKey,
                            codigo: item.material?.prefijo,
                            descripcion: item.material?.nombre,
                            lote: lote,
                            caducidad: info.caducidad,
                            stock_actual: info.qty,
                            solicitud_id: selectedVale.folio,
                            fecha_solicitud_almacen: new Date().toISOString().substring(0, 10),
                            aceptado: true,
                            sucursal: sucursalName,
                            sub_area: areaTitle,
                            temp_almacenamiento: item.material?.presentacion || 'T/A'
                        }]);
                    
                    if (invErr) {
                        console.error("[Paso 3 ERROR] Falló la inserción en el inventario del área:", invErr);
                    } else {
                        console.log(`[Paso 3 ÉXITO] Lote "${lote}" insertado correctamente en inventario_areas.`);
                    }
                }

                // 4. Actualizar cantidad_surtida en solicitudes_items
                console.log(`[Paso 4] Actualizando cantidad_surtida a ${item.cantidad_surtida} para el item ID: ${item.id} (solicitudes_items)`);
                const { data: itemUpdateData, error: itemsErr } = await supabase
                    .from('solicitudes_items')
                    .update({ cantidad_surtida: item.cantidad_surtida })
                    .eq('id', item.id)
                    .select();
                
                console.log("[Paso 4 RESULTADO] Respuesta de actualización de solicitudes_items:", itemUpdateData);
                
                if (itemsErr) {
                    console.error("[Paso 4 ERROR] Falló la actualización de cantidad_surtida:", itemsErr);
                    throw itemsErr;
                }

                if (!itemUpdateData || itemUpdateData.length === 0) {
                    console.warn("[Paso 4 ADVERTENCIA] Array vacío devuelto en solicitudes_items. ¡Alerta de bloqueo por políticas RLS!");
                    throw new Error(`Actualización bloqueada por políticas RLS en la tabla solicitudes_items para el material "${item.material?.nombre}".`);
                }
                console.log("[Paso 4 ÉXITO] Registro de item de solicitud actualizado.");
            }
 
            // 5. Marcar el vale como surtido
            console.log(`[Paso 5] Actualizando estatus del vale ID: ${selectedVale.id} a 'Surtido'...`);
            const { data: valeUpdateData, error: valeErr } = await supabase
                .from('solicitudes_vale')
                .update({ 
                    estatus: 'Surtido', 
                    fecha_surtido: new Date().toISOString(),
                    firma_receptor: dispatchData.signature,
                    nombre_receptor: dispatchData.receiverName
                })
                .eq('id', selectedVale.id)
                .select();

            console.log("[Paso 5 RESULTADO] Respuesta de actualización de solicitudes_vale:", valeUpdateData);

            if (valeErr) {
                console.error("[Paso 5 ERROR] Falló la actualización del vale:", valeErr);
                throw valeErr;
            }

            if (!valeUpdateData || valeUpdateData.length === 0) {
                console.warn("[Paso 5 ADVERTENCIA] Array vacío devuelto en solicitudes_vale. ¡Alerta de bloqueo por políticas RLS!");
                throw new Error("Actualización bloqueada por políticas RLS en la tabla solicitudes_vale (Almacén no tiene permisos de UPDATE).");
            }
            console.log("[Paso 5 ÉXITO] Vale marcado como Surtido en la base de datos.");

            setNotification({ type: 'success', text: `Vale ${selectedVale.folio} despachado. El inventario de ${selectedVale.area_destino} ha sido actualizado automáticamente.` });
            setShowConfirmModal(false);
            setShowModal(false);
            fetchVales();
            setLoading(false);
        } catch (err) {
            console.error("=== [ERROR CRÍTICO] EL PROCESO DE SURTIDO FALLÓ ===");
            console.error(err);
            const errorText = err.message ? err.message : JSON.stringify(err);
            setNotification({ type: 'error', text: 'Error al surtir: ' + errorText });
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!voucherRef.current || !selectedVale) return;

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `FO-RM-004_${selectedVale.folio}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().from(voucherRef.current).set(opt).save();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">assignment_turned_in</span> Solicitudes Pendientes</h1>
                    <p>Surtido y despacho de materiales para las sedes de Solcan</p>
                </div>
                {notification && (
                    <div className={`${styles.notification} ${styles[notification.type]}`}>
                        <span className="material-symbols-rounded">
                            {notification.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {notification.text}
                    </div>
                )}
                <button className={styles.refreshBtn} onClick={fetchVales}>
                    <span className="material-symbols-rounded">refresh</span>
                </button>
            </header>

            <main className={styles.mainContent}>
                {loading ? (
                    <div className={styles.loader}>Cargando solicitudes...</div>
                ) : vales.length === 0 ? (
                    <div className={styles.emptyList}>
                        <span className="material-symbols-rounded" style={{fontSize: '48px', marginBottom: '1rem'}}>inbox</span>
                        <p>No hay solicitudes de material registradas por el momento.</p>
                    </div>
                ) : (
                    <div className={styles.valeGrid}>
                        {vales.map(vale => (
                            <div 
                                key={vale.id} 
                                className={`${styles.valeCard} ${vale.prioridad === 'Urgente' ? styles.urgent : ''}`}
                                onClick={() => fetchValeDetails(vale)}
                            >
                                <div className={styles.cardHeader}>
                                    <span className={styles.folio}>{vale.folio}</span>
                                    <span className={`${styles.badge} ${styles['badge' + (vale.estatus || 'Pendiente')]}`}>{vale.estatus}</span>
                                </div>
                                <div className={styles.cardBody}>
                                    <h4>{vale.area_destino}</h4>
                                    <p>Solicitado por: {vale.solicitante?.name || 'Usuario desconocido'}</p>
                                    <div className={styles.meta}>
                                        <span className="material-symbols-rounded">calendar_today</span>
                                        {new Date(vale.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.priorityLabel}>{vale.prioridad}</span>
                                    <span className="material-symbols-rounded">chevron_right</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showModal && selectedVale && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <header className={`${styles.modalHeader} ${styles.noPrint}`}>
                            <h3>Gestión de Vale {selectedVale.folio}</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </header>
                        
                        <div className={styles.modalBody}>
                            <div className={styles.voucherPreview}>
                                <ValeAlmacen 
                                    ref={voucherRef}
                                    vale={selectedVale}
                                    items={selectedVale.items}
                                    solicitante={selectedVale.solicitante}
                                />
                            </div>

                            {/* Panel de control de almacén */}
                            <div className={`${styles.pickingHelper} ${styles.noPrint}`}>
                                <h4>Guía de Surtido (Ubicaciones)</h4>
                                <div className={styles.locationList}>
                                    {selectedVale.items.map(item => (
                                        <div key={item.id} className={styles.locationItem}>
                                            <strong>{item.material?.nombre}:</strong> {item.material?.ubicacion || 'Sin Ubicación'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <footer className={`${styles.modalActions} ${styles.noPrint}`}>
                            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cerrar</button>
                            <button className={styles.printBtn} onClick={handleDownloadPDF}>
                                <span className="material-symbols-rounded">picture_as_pdf</span> Descargar PDF (FO-RM-004)
                            </button>
                            {selectedVale.estatus === 'Pendiente' && (
                                <button className={styles.surtirBtn} onClick={openConfirmModal}>
                                    <span className="material-symbols-rounded">check_circle</span> Marcar como Surtido
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}

            {showConfirmModal && selectedVale && (
                <div className={styles.modalOverlay}>
                    <div className={styles.confirmDispatchModal}>
                        <header className={styles.modalHeader}>
                            <h3>Confirmación de Despacho {selectedVale.folio}</h3>
                            <button className={styles.closeBtn} onClick={() => setShowConfirmModal(false)}>&times;</button>
                        </header>

                        <div className={styles.modalBody}>
                            <p className={styles.modalIntro}>Ajuste las cantidades realmente entregadas y capture la firma del receptor.</p>
                            
                            <div className={styles.checklistSection}>
                                <h4>1. Lista de Materiales (Checklist)</h4>
                                <table className={styles.checklistTable}>
                                    <thead>
                                        <tr>
                                            <th>Material</th>
                                            <th>Lote Solicitado</th>
                                            <th>Pedido</th>
                                            <th>Surtido Ahora</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dispatchData.items.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <strong>{item.material?.nombre}</strong>
                                                    <div style={{fontSize: '0.75rem', color: '#64748b'}}>{item.material?.prefijo}</div>
                                                </td>
                                                <td><span className={styles.lotBadge}>{item.lote_solicitado || 'CUALQUIERA'}</span></td>
                                                <td style={{textAlign: 'center'}}><strong>{item.cantidad_solicitada}</strong></td>
                                                <td>
                                                    <div className={styles.qtyAdjuster}>
                                                        <button onClick={() => {
                                                            const newItems = [...dispatchData.items];
                                                            newItems[idx].cantidad_surtida = Math.max(0, newItems[idx].cantidad_surtida - 1);
                                                            setDispatchData({...dispatchData, items: newItems});
                                                        }}>-</button>
                                                        <input 
                                                            type="number" 
                                                            value={item.cantidad_surtida}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                const newItems = [...dispatchData.items];
                                                                newItems[idx].cantidad_surtida = Math.min(item.cantidad_solicitada, val);
                                                                setDispatchData({...dispatchData, items: newItems});
                                                            }}
                                                        />
                                                        <button onClick={() => {
                                                            const newItems = [...dispatchData.items];
                                                            newItems[idx].cantidad_surtida = Math.min(item.cantidad_solicitada, newItems[idx].cantidad_surtida + 1);
                                                            setDispatchData({...dispatchData, items: newItems});
                                                        }}>+</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.signatureSection}>
                                <h4>2. Recepción de Material</h4>
                                <div className={styles.receiverInputGroup}>
                                    <label>Nombre de quien recibe:</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej. Juan Pérez"
                                        value={dispatchData.receiverName}
                                        onChange={(e) => setDispatchData({...dispatchData, receiverName: e.target.value})}
                                    />
                                </div>
                                <div className={styles.sigPadWrapper}>
                                    <SignaturePad 
                                        onSave={(sig) => setDispatchData({...dispatchData, signature: sig})}
                                        onClear={() => setDispatchData({...dispatchData, signature: ''})}
                                    />
                                </div>
                            </div>
                        </div>

                        <footer className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowConfirmModal(false)}>Cancelar</button>
                            <button 
                                className={styles.confirmDispatchBtn} 
                                onClick={handleSurtir}
                                disabled={loading}
                            >
                                {loading ? 'Procesando...' : (
                                    <>
                                        <span className="material-symbols-rounded">inventory_2</span>
                                        Confirmar Despacho y Transferir Stock
                                    </>
                                )}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
