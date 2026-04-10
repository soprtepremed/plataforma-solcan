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

    const [lowStock, setLowStock] = useState([]);
    const [expiringItems, setExpiringItems] = useState([]);

    const fetchVales = async () => {
        setLoading(true);
        // 1. Vales y solicitudes
        const { data: valesData, error: valesErr } = await supabase
            .from('solicitudes_vale')
            .select(`*, solicitante:empleados(nombre), items:solicitudes_items(*, material:materiales_catalogo(*))`)
            .order('created_at', { ascending: false });

        if (!valesErr && valesData) {
            setVales(valesData);
            const pend = valesData.filter(v => v.estatus === 'Pendiente').length;
            const surt = valesData.filter(v => v.estatus === 'Surtido Total').length;
            const urg = valesData.filter(v => v.prioridad === 'Urgente' && v.estatus === 'Pendiente').length;
            setStats({ pendientes: pend, surtidos: surt, urgentes: urg });
        }

        // 2. Alertas de Inventario (Real)
        const { data: catData } = await supabase.from('materiales_catalogo').select('id, nombre, stock_minimo');
        const { data: unitData } = await supabase.from('materiales_unidades').select('catalogo_id, estatus, caducidad');

        if (catData && unitData) {
            const low = catData.filter(item => {
                const count = unitData.filter(u => u.catalogo_id === item.id && u.estatus === 'Almacenado').length;
                return count < item.stock_minimo;
            }).map(item => ({
                nombre: item.nombre,
                actual: unitData.filter(u => u.catalogo_id === item.id && u.estatus === 'Almacenado').length,
                minimo: item.stock_minimo
            }));
            setLowStock(low);

            // Caducidades próximas (30 días)
            const hoy = new Date();
            const limite = new Date();
            limite.setDate(hoy.getDate() + 30);

            const expiring = unitData.filter(u => u.estatus === 'Almacenado' && u.caducidad && new Date(u.caducidad) < limite)
                .map(u => ({
                    nombre: catData.find(c => c.id === u.catalogo_id)?.nombre || 'Material',
                    caducidad: u.caducidad
                }));
            setExpiringItems(expiring.slice(0, 5)); // Top 5
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchVales();
    }, []);

    const handleSurtir = async (valeId, items, areaDestino) => {
        if (!items || items.length === 0) return;
        
        setLoading(true);
        try {
            for (const item of items) {
                // 1. Buscar unidades disponibles (Almacenado) de este material
                const { data: units, error: fetchErr } = await supabase
                    .from('materiales_unidades')
                    .select('id')
                    .eq('catalogo_id', item.catalogo_id)
                    .eq('estatus', 'Almacenado')
                    .limit(item.cantidad_solicitada);

                if (fetchErr) throw fetchErr;

                if (units && units.length > 0) {
                    // 2. Mover estas unidades al área técnica destino
                    const unitIds = units.map(u => u.id);
                    const { error: updErr } = await supabase
                        .from('materiales_unidades')
                        .update({ 
                            area_actual: areaDestino.toLowerCase(),
                            // Registramos quién lo surtió si queremos (opcional)
                        })
                        .in('id', unitIds);
                    
                    if (updErr) throw updErr;

                    // 3. Registrar cantidad surtida en el ítem del vale
                    await supabase
                        .from('solicitudes_items')
                        .update({ cantidad_surtida: units.length })
                        .eq('id', item.id);
                }
            }

            // 4. Marcar vale como Surtido Total
            const { error: finalErr } = await supabase
                .from('solicitudes_vale')
                .update({ estatus: 'Surtido Total' })
                .eq('id', valeId);
            
            if (finalErr) throw finalErr;

            alert('Vale surtido con éxito e inventario actualizado.');
            setShowDetail(false);
            fetchVales();
        } catch (err) {
            console.error('Error al surtir:', err);
            alert('Error al procesar el surtido: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded" style={{verticalAlign: 'middle', marginRight: '8px', fontSize: '28px'}}>inventory_2</span> Centro de Almacén</h1>
                    <p>Gestión centralizada de solicitudes y vales de materiales</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.secondaryBtn} onClick={() => navigate('/almacen/registro')}>
                        <span className="material-symbols-rounded">add_box</span> Registrar Entrada
                    </button>
                    <button className={styles.confirmBtn} onClick={fetchVales}>
                        <span className="material-symbols-rounded">refresh</span>
                    </button>
                </div>
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
                                        <span><span className="material-symbols-rounded" style={{fontSize: '14px', verticalAlign: 'middle'}}>location_on</span> {vale.area_destino}</span>
                                        <span><span className="material-symbols-rounded" style={{fontSize: '14px', verticalAlign: 'middle'}}>calendar_today</span> {new Date(vale.created_at).toLocaleDateString()}</span>
                                        <span><span className="material-symbols-rounded" style={{fontSize: '14px', verticalAlign: 'middle'}}>sell</span> {vale.items?.length || 0} items</span>
                                    </div>
                                </div>
                                <div className={styles.valeActions}>
                                    <span className={`${styles.badge} ${styles['badge-' + (vale.prioridad === 'Urgente' ? 'urgente' : vale.estatus.toLowerCase().replace(' ', '-'))]}`}>
                                        {vale.estatus} {vale.prioridad === 'Urgente' && <span className="material-symbols-rounded" style={{fontSize: '16px', verticalAlign: 'middle', color: '#f59e0b'}}>local_fire_department</span>}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className={styles.sidePanel}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Alertas de Almacén (Real)</h2>
                        </div>
                        <div style={{padding: '1.5rem'}}>
                            {lowStock.length === 0 && expiringItems.length === 0 && (
                                <p style={{fontSize: '0.8rem', color: '#64748B'}}>No hay alertas críticas detectadas.</p>
                            )}
                            {lowStock.map((item, idx) => (
                                <div key={`low-${idx}`} className={styles.stockAlert}>
                                    <strong><span className="material-symbols-rounded" style={{fontSize: '18px', verticalAlign: 'middle', marginRight: '4px'}}>warning</span> Stock Bajo</strong>
                                    <p>{item.nombre} está bajo el mínimo ({item.actual}/{item.minimo}).</p>
                                </div>
                            ))}
                            {expiringItems.map((item, idx) => (
                                <div key={`exp-${idx}`} className={styles.stockAlert} style={{background: '#fef2f2', borderColor: '#ef4444'}}>
                                    <strong><span className="material-symbols-rounded" style={{fontSize: '18px', verticalAlign: 'middle', marginRight: '4px'}}>notifications_active</span> Caducidad Próxima</strong>
                                    <p>{item.nombre} vence el {new Date(item.caducidad).toLocaleDateString()}.</p>
                                </div>
                            ))}
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
                                        <td>{item.material?.unidad || 'Pieza'}</td>
                                        <td><strong>{item.cantidad_solicitada}</strong></td>
                                        <td>{item.material?.stock_actual || 'Consultando...'}</td>
                                        <td>
                                            <input type="number" defaultValue={item.cantidad_solicitada} className={styles.inputQty} readOnly />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className={styles.modalActions}>
                            <button className={styles.actionBtn} onClick={() => setShowDetail(false)}>Cerrar</button>
                            <button 
                                className={styles.confirmBtn} 
                                onClick={() => handleSurtir(selectedVale.id, selectedVale.items, selectedVale.area_destino)}
                                disabled={selectedVale.estatus === 'Surtido Total'}
                            >
                                {selectedVale.estatus === 'Surtido Total' ? 'Vale ya Finalizado' : 'Surtir y Transferir Material'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
