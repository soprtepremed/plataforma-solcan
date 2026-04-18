import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import RequisicionDocument from '../../components/documents/RequisicionDocument';
import styles from './SolicitudesSurtido.module.css';
import html2pdf from 'html2pdf.js';

export default function HistorialRequisicionesArea() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requisiciones, setRequisiciones] = useState([]);
    const [selectedReq, setSelectedReq] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const printAreaRef = useRef(null);

    useEffect(() => {
        fetchHistorial();
    }, [user]);

    const fetchHistorial = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const areaId = user.role === 'hematologia' ? 'hematologia' : 'general';
            const { data, error } = await supabase
                .from('requisiciones_compra')
                .select('*')
                .eq('area_id', areaId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setRequisiciones(data || []);
        } catch (err) {
            console.error("Error fetching historial:", err);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (e, id) => {
        e.stopPropagation();
        setDeleteId(id);
        setShowConfirm(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase
                .from('requisiciones_compra')
                .delete()
                .eq('id', deleteId);
            
            if (error) throw error;
            setShowConfirm(false);
            setDeleteId(null);
            fetchHistorial();
        } catch (err) {
            alert("Error al eliminar: " + err.message);
        }
    };

    const handleViewDetail = async (req) => {
        // Traer los items de esta requisición
        const { data: items, error } = await supabase
            .from('requisiciones_items')
            .select('*, material:materiales_catalogo(nombre, prefijo, unidad)')
            .eq('requisicion_id', req.id);
        
        if (error) {
            alert("Error al cargar detalles: " + error.message);
            return;
        }

        // Mapear items para que el documento los entienda
        const mappedItems = items.map(i => ({
            nombre: i.material?.nombre || i.nombre_manual,
            prefijo: i.material?.prefijo || '---',
            cantidad: i.cantidad_solicitada,
            existencia: 0, // En el historial no es crítico ver la existencia de ese momento
            fechaRequerida: i.fecha_requerida
        }));

        setSelectedReq({ ...req, items: mappedItems });
        setShowModal(true);
    };

    const downloadPDF = () => {
        if (!printAreaRef.current || !selectedReq) return;
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
                    <h1><span className="material-symbols-rounded">history</span> Mis Requisiciones (FO-RM-001)</h1>
                    <p>Consulta y reimpresión de comprobantes de compra enviados</p>
                </div>
                <button className={styles.refreshBtn} onClick={fetchHistorial}>
                    <span className="material-symbols-rounded">refresh</span>
                </button>
            </header>

            <main className={styles.mainContent}>
                {loading ? (
                    <div className={styles.loader}>Cargando bitácora de suministros...</div>
                ) : requisiciones.length === 0 ? (
                    <div className={styles.emptyList}>
                        <span className="material-symbols-rounded" style={{fontSize: '48px', marginBottom: '1rem'}}>inventory_2</span>
                        <p>No tienes requisiciones registradas.</p>
                    </div>
                ) : (
                    <div className={styles.valeGrid}>
                        {requisiciones.map(req => (
                            <div key={req.id} className={styles.valeCard} onClick={() => handleViewDetail(req)}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.folio}>{req.folio}</span>
                                    <span className={`${styles.badge} ${styles['badge' + (req.estatus || 'Pendiente')]}`}>{req.estatus}</span>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.meta}>
                                        <span className="material-symbols-rounded">event</span>
                                        {new Date(req.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <button className={styles.primaryActionBtn}>
                                        <span className="material-symbols-rounded">visibility</span> Ver Formato
                                    </button>
                                    <button className={styles.deleteBtn} onClick={(e) => confirmDelete(e, req.id)}>
                                        <span className="material-symbols-rounded">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
            {showConfirm && (
                <div className={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
                    <div className={styles.confirmSmallModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.warnIcon}>
                             <span className="material-symbols-rounded">warning</span>
                        </div>
                        <h3>¿Eliminar Requisición?</h3>
                        <p>Esta acción es permanente y no podrá recuperarse el folio ni los materiales asociados.</p>
                        <div className={styles.confirmActions}>
                             <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>Cancelar</button>
                             <button className={styles.dangerConfirmBtn} onClick={handleDelete}>Eliminar Definitivamente</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DEL DOCUMENTO OFICIAL */}
            {showModal && selectedReq && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px', background: '#f8fafc'}}>
                        <header className={styles.modalHeader}>
                            <div className={styles.modalTitleBox}>
                                <h2>Requisición {selectedReq.folio}</h2>
                                <span className={styles.modalSubtitle}>Comprobante Oficial Solcan Lab</span>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.downloadBtn} onClick={downloadPDF}>
                                    <span className="material-symbols-rounded">download</span> Descargar PDF
                                </button>
                                <button className={styles.closeModalCircle} onClick={() => setShowModal(false)}>
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>
                        </header>
                        <div className={styles.modalBody} style={{padding: '20px'}}>
                            <div ref={printAreaRef}>
                                <RequisicionDocument 
                                    items={selectedReq.items} 
                                    area={user?.role} 
                                    solicitante={user} 
                                    requisicion={selectedReq}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
