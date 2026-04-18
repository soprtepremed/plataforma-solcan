import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './SolicitudesSurtido.module.css';
import RequisicionDocument from '../../components/documents/RequisicionDocument';
import SignaturePad from '../../components/SignaturePad';
import html2pdf from 'html2pdf.js';

export default function GestionRequisiciones() {
    const [loading, setLoading] = useState(true);
    const [requisiciones, setRequisiciones] = useState([]);
    const [selectedReq, setSelectedReq] = useState(null);
    const [signatureAlmacen, setSignatureAlmacen] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const printAreaRef = useRef(null);

    useEffect(() => {
        fetchRequisiciones();
    }, []);

    const fetchRequisiciones = async () => {
        setLoading(true);
        try {
            const { data: reqs, error } = await supabase
                .from('requisiciones_compra')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            if (!reqs) return setRequisiciones([]);

            // Traer nombres de solicitantes
            const userIds = [...new Set(reqs.map(r => r.solicitante_id).filter(Boolean))];
            let nameMap = {};
            if (userIds.length > 0) {
                const { data: emps } = await supabase.from('empleados').select('id, nombre').in('id', userIds);
                emps?.forEach(e => nameMap[e.id] = e.nombre);
            }

            setRequisiciones(reqs.map(r => ({ ...r, solicitante: { name: nameMap[r.solicitante_id] || '---' } })));
        } catch (err) {
            console.error("Error fetching requisiciones:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (req) => {
        const { data: items } = await supabase
            .from('requisiciones_items')
            .select('*, material:materiales_catalogo(nombre, prefijo)')
            .eq('requisicion_id', req.id);
        
        // Formatear items para el documento
        const formattedItems = items?.map(i => ({
            ...i,
            nombre: i.nombre_manual || i.material?.nombre,
            prefijo: i.material?.prefijo,
            cantidad: i.cantidad_solicitada,
            fechaRequerida: i.fecha_requerida
        })) || [];

        setSelectedReq({ ...req, items: formattedItems });
        setShowModal(true);
    };

    const updateStatus = async (newStatus) => {
        if (!selectedReq) return;
        if (newStatus === 'Surtido' && !signatureAlmacen) {
            alert('Por favor, firma la entrega antes de surtir la requisición.');
            return;
        }

        try {
            const updateData = { estatus: newStatus };
            if (newStatus === 'Surtido') updateData.firma_almacen = signatureAlmacen;

            const { error } = await supabase
                .from('requisiciones_compra')
                .update(updateData)
                .eq('id', selectedReq.id);
            
            if (error) throw error;
            setShowModal(false);
            setSignatureAlmacen(null);
            fetchRequisiciones();
        } catch (err) {
            alert("Error al actualizar estatus: " + err.message);
        }
    };

    const downloadPDF = () => {
        if (!printAreaRef.current) return;
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `FO-RM-001_${selectedReq.folio}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(printAreaRef.current).set(opt).save();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">shopping_bag</span> Gestión de Compras</h1>
                    <p>Revision de Requisiciones FO-RM-001 enviadas por las áreas</p>
                </div>
                <button className={styles.refreshBtn} onClick={fetchRequisiciones}>
                    <span className="material-symbols-rounded">refresh</span>
                </button>
            </header>

            <main className={styles.mainContent}>
                {loading ? <div className={styles.loader}>Cargando requisiciones...</div> : (
                    <div className={styles.valeGrid}>
                        {requisiciones.map(req => (
                            <div key={req.id} className={styles.valeCard} onClick={() => handleViewDetail(req)}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.folio}>{req.folio}</span>
                                    <span className={`${styles.badge} ${styles['badge' + (req.estatus || 'Pendiente')]}`}>{req.estatus}</span>
                                </div>
                                <div className={styles.cardBody}>
                                    <h4>Área: {req.area_id.toUpperCase()}</h4>
                                    <p>Solicitante: <strong>{req.solicitante.name}</strong></p>
                                    <div className={styles.meta}>
                                        <span className="material-symbols-rounded">calendar_today</span>
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <button className={styles.primaryActionBtn}>
                                        <span className="material-symbols-rounded">visibility</span> Ver Solicitud
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showModal && selectedReq && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{maxWidth: '950px'}}>
                        <header className={styles.modalHeader}>
                            <div className={styles.modalTitleBox}>
                                <h2>{selectedReq.folio} - {selectedReq.area_id.toUpperCase()}</h2>
                                <span className={styles.modalSubtitle}>Gestión de Surtido de Requisición</span>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.downloadBtn} onClick={downloadPDF}>
                                    <span className="material-symbols-rounded">download</span> PDF
                                </button>
                                <button className={styles.closeModalCircle} onClick={() => setShowModal(false)}>
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>
                        </header>
                        <div className={styles.modalBody}>
                             <div ref={printAreaRef}>
                                <RequisicionDocument 
                                    requisicion={{ ...selectedReq, firma_almacen: signatureAlmacen }}
                                    items={selectedReq.items}
                                    area={selectedReq.area_id}
                                    solicitante={selectedReq.solicitante}
                                />
                             </div>
                             
                             <div className={styles.adminActions}>
                                <h4>Gestión de Despacho (Almacen)</h4>
                                
                                {selectedReq.estatus !== 'Surtido' && (
                                    <div className={styles.signatureInModal}>
                                        <SignaturePad 
                                            onSave={(data) => setSignatureAlmacen(data)}
                                            onClear={() => setSignatureAlmacen(null)}
                                        />
                                    </div>
                                )}

                                <div className={styles.actionRow}>
                                    <button className={styles.btnReview} onClick={() => updateStatus('En Proceso')}>
                                        <span className="material-symbols-rounded">pending_actions</span> Procesar Solicitud
                                    </button>
                                    <button className={styles.btnSuccess} onClick={() => updateStatus('Surtido')}>
                                        <span className="material-symbols-rounded">task_alt</span> Surtir / Completar
                                    </button>
                                    <button className={styles.btnDanger} onClick={() => updateStatus('Rechazado')}>
                                        <span className="material-symbols-rounded">cancel</span> Rechazar
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
