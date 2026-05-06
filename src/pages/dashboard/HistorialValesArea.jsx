import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import ValeAlmacen from '../../components/documents/ValeAlmacen';
import styles from './SolicitudesSurtido.module.css';
import html2pdf from 'html2pdf.js';

export default function HistorialValesArea() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [vales, setVales] = useState([]);
    const [selectedVale, setSelectedVale] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const voucherRef = useRef(null);

    useEffect(() => {
        fetchHistorial();
    }, [user]);

    const fetchHistorial = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('solicitudes_vale')
                .select('*')
                .eq('solicitante_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setVales(data || []);
        } catch (err) {
            console.error("Error fetching historial de vales:", err);
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
            // 1. Primero eliminamos los items del vale para evitar errores de llave foránea
            const { error: itemsErr } = await supabase
                .from('solicitudes_items')
                .delete()
                .eq('vale_id', deleteId);
            
            if (itemsErr) throw itemsErr;

            // 2. Luego eliminamos el vale principal
            const { error } = await supabase
                .from('solicitudes_vale')
                .delete()
                .eq('id', deleteId);
            
            if (error) throw error;
            
            setShowConfirm(false);
            setDeleteId(null);
            fetchHistorial();
        } catch (err) {
            console.error("Error al eliminar vale:", err);
            alert("No se pudo cancelar el vale: " + err.message);
        }
    };

    const handleViewDetail = async (vale) => {
        const { data: items, error } = await supabase
            .from('solicitudes_items')
            .select('*, material:materiales_catalogo(nombre, prefijo, unidad, ubicacion, marca, presentacion)')
            .eq('vale_id', vale.id);
        
        if (error) {
            alert("Error al cargar detalles: " + error.message);
            return;
        }

        setSelectedVale({ ...vale, items: items || [] });
        setShowModal(true);
    };

    const downloadPDF = () => {
        if (!voucherRef.current || !selectedVale) return;
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `FO-RM-004_${selectedVale.folio}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(voucherRef.current).set(opt).save();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">history_edu</span> Mis Vales de Material (FO-RM-004)</h1>
                    <p>Seguimiento de pedidos internos realizados al almacén central</p>
                </div>
                <button className={styles.refreshBtn} onClick={fetchHistorial}>
                    <span className="material-symbols-rounded">refresh</span>
                </button>
            </header>

            <main className={styles.mainContent}>
                {loading ? (
                    <div className={styles.loader}>Consultando bitácora de vales...</div>
                ) : vales.length === 0 ? (
                    <div className={styles.emptyList}>
                        <span className="material-symbols-rounded" style={{fontSize: '48px', marginBottom: '1rem'}}>shopping_basket</span>
                        <p>No tienes vales de material registrados.</p>
                    </div>
                ) : (
                    <div className={styles.valeGrid}>
                        {vales.map(vale => (
                            <div key={vale.id} className={styles.valeCard} onClick={() => handleViewDetail(vale)}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.folio}>{vale.folio}</span>
                                    <span className={`${styles.badge} ${styles['badge' + (vale.estatus || 'Pendiente')]}`}>{vale.estatus}</span>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.meta}>
                                        <span className="material-symbols-rounded">event</span>
                                        {new Date(vale.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <p style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>Prioridad: <strong>{vale.prioridad}</strong></p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <button className={styles.primaryActionBtn}>
                                        <span className="material-symbols-rounded">visibility</span> Ver Vale
                                    </button>
                                    {vale.estatus === 'Pendiente' && (
                                        <button className={styles.deleteBtn} onClick={(e) => confirmDelete(e, vale.id)}>
                                            <span className="material-symbols-rounded">delete</span>
                                        </button>
                                    )}
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
                        <h3>¿Cancelar Vale?</h3>
                        <p>Esta acción eliminará el pedido pendiente del sistema de almacén.</p>
                        <div className={styles.confirmActions}>
                             <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>Cerrar</button>
                             <button className={styles.dangerConfirmBtn} onClick={handleDelete}>Cancelar Vale</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DEL DOCUMENTO OFICIAL */}
            {showModal && selectedVale && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px', background: '#f8fafc'}}>
                        <header className={styles.modalHeader}>
                            <div className={styles.modalTitleBox}>
                                <h2>Vale {selectedVale.folio}</h2>
                                <span className={styles.modalSubtitle}>Formato FO-RM-004 - Vale de Almacén</span>
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
                            <div ref={voucherRef}>
                                <ValeAlmacen 
                                    vale={selectedVale} 
                                    items={selectedVale.items} 
                                    solicitante={user} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
