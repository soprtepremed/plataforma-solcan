import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './AlmacenDashboard.module.css';

export default function AlmacenDashboard() {
    const { user } = useAuth();
    const [vales, setVales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVale, setSelectedVale] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [stats, setStats] = useState({ pendientes: 0, surtidos: 0, urgentes: 0 });

    const fetchVales = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('solicitudes_vale')
            .select(`*, solicitante:empleados(nombre), items:solicitudes_items(*, material:materiales_catalogo(*))`)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setVales(data);
            const pend = data.filter(v => v.estatus === 'Pendiente').length;
            const surt = data.filter(v => v.estatus === 'Surtido Total').length;
            const urg = data.filter(v => v.prioridad === 'Urgente' && v.estatus === 'Pendiente').length;
            setStats({ pendientes: pend, surtidos: surt, urgentes: urg });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchVales();
    }, []);

    const handleSurtir = async (valeId, items) => {
        // Lógica simplificada: marcar como surtido
        const { error } = await supabase
            .from('solicitudes_vale')
            .update({ estatus: 'Surtido Total' })
            .eq('id', valeId);
        
        if (!error) {
            alert('✅ Vale surtido con éxito.');
            setShowDetail(false);
            fetchVales();
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>📦 Centro de Almacén</h1>
                    <p>Gestión centralizada de solicitudes y vales de materiales</p>
                </div>
                <button className={styles.confirmBtn} onClick={fetchVales}>
                    <span className="material-symbols-rounded">refresh</span>
                </button>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.blue}`}>
                        <span className="material-symbols-rounded">assignment</span>
                    </div>
                    <div className={styles.statInfo}>
                        <h3>Vales Totales</h3>
                        <div className={styles.statValue}>{vales.length}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.amber}`}>
                        <span className="material-symbols-rounded">pending_actions</span>
                    </div>
                    <div className={styles.statInfo}>
                        <h3>Pendientes</h3>
                        <div className={styles.statValue}>{stats.pendientes}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.emerald}`}>
                        <span className="material-symbols-rounded">task_alt</span>
                    </div>
                    <div className={styles.statInfo}>
                        <h3>Surtidos Hoy</h3>
                        <div className={styles.statValue}>{stats.surtidos}</div>
                    </div>
                </div>
            </div>

            <main className={styles.mainContent}>
                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Solicitudes Recientes</h2>
                    </div>
                    <div className={styles.valeList}>
                        {loading ? <p style={{padding: '2rem'}}>Cargando solicitudes...</p> : 
                         vales.length === 0 ? <p style={{padding: '2rem'}}>No hay solicitudes registradas.</p> :
                         vales.map(vale => (
                            <div key={vale.id} className={styles.valeRow} onClick={() => { setSelectedVale(vale); setShowDetail(true); }}>
                                <div className={styles.valeMainInfo}>
                                    <h4>{vale.folio} - {vale.solicitante?.nombre}</h4>
                                    <div className={styles.valeMeta}>
                                        <span>📍 {vale.area_destino}</span>
                                        <span>📅 {new Date(vale.created_at).toLocaleDateString()}</span>
                                        <span>🏷️ {vale.items?.length || 0} items</span>
                                    </div>
                                </div>
                                <div className={styles.valeActions}>
                                    <span className={`${styles.badge} ${styles['badge-' + (vale.prioridad === 'Urgente' ? 'urgente' : vale.estatus.toLowerCase().replace(' ', '-'))]}`}>
                                        {vale.estatus} {vale.prioridad === 'Urgente' && '🔥'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className={styles.sidePanel}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Alertas de Almacén</h2>
                        </div>
                        <div style={{padding: '1.5rem'}}>
                            <div className={styles.stockAlert}>
                                <strong>⚠️ Stock Bajo (Hematología)</strong>
                                <p>Tubos Rojos están por debajo del mínimo (80/100).</p>
                            </div>
                            <div className={styles.stockAlert} style={{background: '#fef2f2', borderColor: '#ef4444'}}>
                                <strong>🚨 Caducidad Próxima</strong>
                                <p>Lote RH-202 de Reactivo Química vence en 5 días.</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            {showDetail && selectedVale && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2>Detalle de Vale: {selectedVale.folio}</h2>
                                <p>Solicitante: {selectedVale.solicitante?.nombre} | Área: {selectedVale.area_destino}</p>
                            </div>
                            <button className={styles.actionBtn} onClick={() => setShowDetail(false)}>
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>

                        <table className={styles.itemTable}>
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th>Unidad</th>
                                    <th>Solicitado</th>
                                    <th>Stock Disp.</th>
                                    <th>Surtir Cant.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedVale.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.material?.nombre}</td>
                                        <td>{item.material?.unidad}</td>
                                        <td><strong>{item.cantidad_solicitada}</strong></td>
                                        <td>150 (Ejemplo)</td>
                                        <td>
                                            <input type="number" defaultValue={item.cantidad_solicitada} className={styles.inputQty} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className={styles.modalActions}>
                            <button className={styles.actionBtn} onClick={() => setShowDetail(false)}>Cerrar</button>
                            <button className={styles.confirmBtn} onClick={() => handleSurtir(selectedVale.id)}>Marcar como Surtido y Finalizar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
