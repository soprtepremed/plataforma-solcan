import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './SolicitudesSurtido.module.css';
import ValeAlmacen from '../../components/documents/ValeAlmacen';
import html2pdf from 'html2pdf.js';

export default function SolicitudesSurtido() {
    const [loading, setLoading] = useState(true);
    const [vales, setVales] = useState([]);
    const [selectedVale, setSelectedVale] = useState(null);
    const [showModal, setShowModal] = useState(false);
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

            // 2. Extraer IDs únicos de solicitantes para traer sus nombres
            const solicitanteIds = [...new Set(valesData.map(v => v.solicitante_id).filter(Boolean))];
            
            let solicitantesMap = {};
            if (solicitanteIds.length > 0) {
                const { data: empData } = await supabase
                    .from('empleados')
                    .select('id, name')
                    .in('id', solicitanteIds);
                
                if (empData) {
                    empData.forEach(emp => {
                        solicitantesMap[emp.id] = emp.name;
                    });
                }
            }

            // 3. Combinar datos
            const finalData = valesData.map(v => ({
                ...v,
                solicitante: { name: solicitantesMap[v.solicitante_id] || 'Usuario desconocido' }
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
            .select('*, material:materiales_catalogo(nombre, unidad, ubicacion, marca, presentacion)')
            .eq('vale_id', vale.id);
        
        setSelectedVale({ ...vale, items: data || [] });
        setShowModal(true);
    };

    const handleSurtir = async () => {
        if (!selectedVale) return;
        if (!confirm('¿Confirmas que has surtido físicamente los materiales? El stock se descontará automáticamente.')) return;
        
        setLoading(true);
        try {
            // Procesar cada material del vale
            for (const item of selectedVale.items) {
                // Buscar unidades disponibles (FIFO o por Lote solicitado)
                let query = supabase
                    .from('materiales_unidades')
                    .select('id, lote_numero')
                    .eq('catalogo_id', item.material_catalogo_id)
                    .eq('estatus', 'Almacenado')
                    .limit(item.cantidad_solicitada);
                
                if (item.lote_solicitado) {
                    query = query.eq('lote_numero', item.lote_solicitado);
                }

                const { data: unidades, error: findErr } = await query;
                if (findErr) throw findErr;

                if (!unidades || unidades.length < item.cantidad_solicitada) {
                    throw new Error(`Stock insuficiente para ${item.material?.nombre}${item.lote_solicitado ? ' (Lote: ' + item.lote_solicitado + ')' : ''}.`);
                }

                // Marcar unidades como despachadas
                const unidadIds = unidades.map(u => u.id);
                const { error: updErr } = await supabase
                    .from('materiales_unidades')
                    .update({ estatus: 'Despachado' })
                    .in('id', unidadIds);

                if (updErr) throw updErr;
            }

            // Marcar el vale como surtido
            const { error: valeErr } = await supabase
                .from('solicitudes_vale')
                .update({ estatus: 'Surtido', fecha_surtido: new Date().toISOString() })
                .eq('id', selectedVale.id);

            if (valeErr) throw valeErr;

            setNotification({ type: 'success', text: `Vale ${selectedVale.folio} surtido correctamente. El inventario ha sido actualizado.` });
            setShowModal(false);
            fetchVales();
        } catch (err) {
            setNotification({ type: 'error', text: 'Error al surtir: ' + err.message });
        } finally {
            setLoading(false);
        }
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
                                <button className={styles.surtirBtn} onClick={handleSurtir}>
                                    <span className="material-symbols-rounded">check_circle</span> Marcar como Surtido
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
