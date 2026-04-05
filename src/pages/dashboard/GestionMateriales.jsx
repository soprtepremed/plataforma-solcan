import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './GestionMateriales.module.css';

const AREAS_LAB = [
    { key: 'hemato', label: 'Hematología', days: [3, 6] },
    { key: 'uro', label: 'Uroanálisis', days: [1, 2] },
    { key: 'quimica', label: 'Química Clínica', days: [2, 4] },
    { key: 'archivo', label: 'Archivo/Gral', days: [1, 3, 5] }
];

export default function GestionMateriales() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [scanValue, setScanValue] = useState('');
    const [activeArea, setActiveArea] = useState('hemato');
    const [isOnRole, setIsOnRole] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para Modales
    const [showStockModal, setShowStockModal] = useState(false);
    const [showCatalogModal, setShowCatalogModal] = useState(false);

    // Formulario de Stock
    const [stockForm, setStockForm] = useState({
        catalogo_id: '',
        lote: '',
        caducidad: '',
        cantidad: 1
    });

    // Formulario de Catálogo
    const [catalogForm, setCatalogForm] = useState({
        nombre: '',
        prefijo: '',
        unidad: 'Pieza', // Default
        stock_minimo: 10
    });

    // Determinar si hoy es día de resurtido para el área activa
    useEffect(() => {
        const today = new Date().getDay();
        const areaConfig = AREAS_LAB.find(a => a.key === activeArea);
        setIsOnRole(areaConfig?.days.includes(today));
    }, [activeArea]);

    const fetchData = async () => {
        setLoading(true);
        // Traer catálogo con stock actual (conteo de unidades almacenadas)
        const { data: catData } = await supabase
            .from('materiales_catalogo')
            .select('*')
            .eq('area_tecnica', activeArea)
            .order('nombre', { ascending: true });
        
        // Traer unidades individuales
        const { data: unitData } = await supabase.from('materiales_unidades')
            .select(`*, materiales_catalogo(nombre, prefijo, unidad)`)
            .eq('area_actual', activeArea)
            .order('created_at', { ascending: false });

        setStats(catData || []);
        setUnidades(unitData || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [activeArea]);

    const handleApertura = async (e) => {
        if (e) e.preventDefault();
        if (!scanValue) return;

        const { data, error } = await supabase.from('materiales_unidades')
            .select('*')
            .eq('codigo_barras_unico', scanValue)
            .single();

        if (error || !data) {
            alert('❌ Código no encontrado o inválido.');
            setScanValue('');
            return;
        }

        if (data.estatus !== 'Almacenado') {
            alert(`⚠️ Esta unidad ya está en estatus: ${data.estatus}`);
            setScanValue('');
            return;
        }

        const { error: updErr } = await supabase.from('materiales_unidades')
            .update({
                estatus: 'En Uso',
                fecha_inicio_uso: new Date().toISOString(),
                quimico_inicio_id: user.id
            })
            .eq('id', data.id);

        if (!updErr) {
            alert(`✅ Unidad ${scanValue} abierta con éxito.`);
            setScanValue('');
            fetchData();
        } else {
            alert('❌ Error al procesar apertura.');
        }
    };

    const handleFinalizar = async (unitId) => {
        if (!confirm('¿Seguro que deseas dar de baja este material? Se eliminará del inventario activo.')) return;
        try {
            const { error } = await supabase.from('materiales_unidades')
                .update({ estatus: 'Agotado', fecha_finalizacion: new Date().toISOString() })
                .eq('id', unitId);
            
            if (error) throw error;
            alert('✅ Material dado de baja correctamente.');
            fetchData();
        } catch (err) {
            console.error('Error al finalizar material:', err);
            alert('❌ Error al dar de baja el material: ' + err.message);
        }
    };

    const handlePrintLabel = (unitId) => {
        navigate(`/logistica/impresion?ids=${unitId}`);
    };

    // Funciones de Guardado
    const saveNewCatalogItem = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('materiales_catalogo').insert([{
                ...catalogForm,
                area_tecnica: activeArea
            }]);

            if (error) throw error;

            alert('✅ Material registrado en catálogo correctamente.');
            setShowCatalogModal(false);
            setCatalogForm({ nombre: '', prefijo: '', unidad: 'Pieza', stock_minimo: 10 });
            fetchData();
        } catch (err) {
            console.error('Error catálogo:', err);
            alert('❌ Error al registrar en catálogo: ' + err.message);
        }
    };

    const saveStockEntry = async (e) => {
        e.preventDefault();
        if (!stockForm.catalogo_id || !stockForm.lote) return;

        try {
            const catalogItem = stats.find(s => s.id === stockForm.catalogo_id);
            const areaCode = activeArea.slice(0, 2).toUpperCase();
            const year = new Date().getFullYear().toString().slice(-2);
            
            let newUnits = [];
            for (let i = 1; i <= stockForm.cantidad; i++) {
                const unitCode = i.toString().padStart(2, '0');
                const uniqueID = `${areaCode}-${catalogItem.prefijo}-${year}-${stockForm.lote}/${unitCode}`;
                
                newUnits.push({
                    catalogo_id: stockForm.catalogo_id,
                    codigo_barras_unico: uniqueID,
                    lote_numero: stockForm.lote,
                    caducidad: stockForm.caducidad,
                    area_actual: activeArea,
                    estatus: 'Almacenado'
                });
            }

            const { error } = await supabase.from('materiales_unidades').insert(newUnits);

            if (error) throw error;

            alert(`✅ ${stockForm.cantidad} unidades ingresadas a stock correctamente.`);
            setShowStockModal(false);
            setStockForm({ catalogo_id: '', lote: '', caducidad: '', cantidad: 1 });
            fetchData();
        } catch (err) {
            console.error('Error stock:', err);
            alert('❌ Error al registrar entrada de stock: ' + err.message);
        }
    };

    const filteredStats = stats.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={styles.container}>
            {/* Modal: Registrar Catálogo */}
            {showCatalogModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>➕ Nuevo Material en Catálogo</h2>
                        <form onSubmit={saveNewCatalogItem} className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label>Nombre del Material</label>
                                <input required value={catalogForm.nombre} onChange={e => setCatalogForm({...catalogForm, nombre: e.target.value})} placeholder="Ej: Tubo Rojo Vacutainer" />
                            </div>
                            <div className={styles.formSplit}>
                                <div className={styles.formGroup}>
                                    <label>Prefijo ID (2-3 Letras)</label>
                                    <input required maxLength={3} value={catalogForm.prefijo} onChange={e => setCatalogForm({...catalogForm, prefijo: e.target.value.toUpperCase()})} placeholder="TR" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Unidad de Medida</label>
                                    <select value={catalogForm.unidad} onChange={e => setCatalogForm({...catalogForm, unidad: e.target.value})}>
                                        <option value="Pieza">Pieza</option>
                                        <option value="Caja">Caja</option>
                                        <option value="Frasco">Frasco</option>
                                        <option value="Mililitros">Mililitros</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Stock Mínimo de Alerta</label>
                                <input type="number" required value={catalogForm.stock_minimo} onChange={e => setCatalogForm({...catalogForm, stock_minimo: parseInt(e.target.value)})} />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowCatalogModal(false)} className={styles.cancelBtn}>Cancelar</button>
                                <button type="submit" className={styles.confirmBtn}>Registrar en {AREAS_LAB.find(a=>a.key===activeArea)?.label}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Registro de Stock */}
            {showStockModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>📥 Entrada de Almacén (Stock)</h2>
                        <form onSubmit={saveStockEntry} className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label>Seleccionar Material</label>
                                <select required value={stockForm.catalogo_id} onChange={e => setStockForm({...stockForm, catalogo_id: e.target.value})}>
                                    <option value="">Selecciona un item...</option>
                                    {stats.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.prefijo})</option>)}
                                </select>
                            </div>
                            <div className={styles.formSplit}>
                                <div className={styles.formGroup}>
                                    <label>Número de Lote</label>
                                    <input required value={stockForm.lote} onChange={e => setStockForm({...stockForm, lote: e.target.value})} placeholder="Ej: 100" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Cantidad de Unidades</label>
                                    <input type="number" min="1" required value={stockForm.cantidad} onChange={e => setStockForm({...stockForm, cantidad: parseInt(e.target.value)})} />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Fecha de Caducidad</label>
                                <input type="date" required value={stockForm.caducidad} onChange={e => setStockForm({...stockForm, caducidad: e.target.value})} />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowStockModal(false)} className={styles.cancelBtn}>Cancelar</button>
                                <button type="submit" className={styles.confirmBtn}>Generar e Ingresar Unidades</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>📦 Inventario de Materiales</h1>
                    <p>Control centralizado de reactivos e insumos biológicos</p>
                </div>

                <div className={styles.headerControls}>
                    <div className={styles.areaSelector}>
                        {AREAS_LAB.map(area => (
                            <button key={area.key} className={`${styles.areaBtn} ${activeArea === area.key ? styles.areaActive : ''}`} onClick={() => setActiveArea(area.key)}>
                                {area.label}
                            </button>
                        ))}
                    </div>
                    {(user?.role === 'admin' || user?.role === 'administrador') && (
                        <div className={styles.adminBtns}>
                            <button className={styles.plusBtn} onClick={() => setShowCatalogModal(true)} title="Nuevo Material">
                                <span className="material-symbols-rounded">add_circle</span>
                            </button>
                            <button className={styles.entryBtn} onClick={() => setShowStockModal(true)}>
                                <span className="material-symbols-rounded">inventory_2</span>
                                Registrar Entrada
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {!isOnRole && (
                <div className={styles.roleNotice}>
                    <span className="material-symbols-rounded">event_busy</span>
                    <div>
                        <strong>Aviso de Operación:</strong> Hoy no es día programado de resurtido para {AREAS_LAB.find(a=>a.key===activeArea)?.label}. 
                        Las aperturas serán registradas como "Excepción por demanda".
                    </div>
                </div>
            )}

            <section className={styles.topActions}>
                <div className={styles.scannerHero}>
                    <div className={styles.scanBox}>
                        <span className="material-symbols-rounded">qr_code_scanner</span>
                        <form onSubmit={handleApertura}>
                            <input placeholder="Escanear material para apertura..." value={scanValue} onChange={(e) => setScanValue(e.target.value)} autoFocus />
                            <button type="submit">Abrir Insumo</button>
                        </form>
                    </div>
                </div>
                
                <div className={styles.quickStats}>
                    <div className={styles.statMiniCard}>
                        <span className={styles.statLabel}>Total Materiales</span>
                        <span className={styles.statValue}>{stats.length}</span>
                    </div>
                    <div className={styles.statMiniCard}>
                        <span className={styles.statLabel}>Críticos / Bajos</span>
                        <span className={styles.statValue} style={{color: '#EF4444'}}>
                            {stats.filter(s => unidades.filter(u => u.catalogo_id === s.id && u.estatus === 'Almacenado').length < s.stock_minimo).length}
                        </span>
                    </div>
                </div>
            </section>

            <main className={styles.inventoryMain}>
                <div className={styles.tableWrapper}>
                    <div className={styles.panelHeader}>
                        <h3>🧾 Catálogo de Existencias - {AREAS_LAB.find(a=>a.key===activeArea)?.label}</h3>
                        <div className={styles.searchBox}>
                             <span className="material-symbols-rounded">search</span>
                             <input type="text" placeholder="Filtrar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <table className={styles.materialTable}>
                        <thead>
                            <tr>
                                <th>Item / Prefijo</th>
                                <th>Piezas Almacén</th>
                                <th>En Uso</th>
                                <th>Total</th>
                                <th>Stock Mín.</th>
                                <th>Estatus</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className={styles.emptyTable}>No se encontraron materiales.</td>
                                </tr>
                            ) : filteredStats.map(item => {
                                const inWarehouse = unidades.filter(u => u.catalogo_id === item.id && u.estatus === 'Almacenado').length;
                                const inUse = unidades.filter(u => u.catalogo_id === item.id && u.estatus === 'En Uso').length;
                                const total = inWarehouse + inUse;
                                const isLow = inWarehouse < item.stock_minimo;
                                const isCritical = inWarehouse === 0;

                                return (
                                    <tr key={item.id} className={isLow ? styles.rowWarning : ''}>
                                        <td className={styles.cellName}>
                                            <strong>{item.nombre}</strong>
                                            <span>{item.prefijo}</span>
                                        </td>
                                        <td className={styles.cellStock}>{inWarehouse} {item.unidad}s</td>
                                        <td className={styles.cellInUse}>{inUse}</td>
                                        <td className={styles.cellTotal}>{total}</td>
                                        <td className={styles.cellMin}>{item.stock_minimo}</td>
                                        <td>
                                            {isCritical ? ( <span className={`${styles.statusBadge} ${styles.badgeCritical}`}>AGOTADO</span> ) 
                                            : isLow ? ( <span className={`${styles.statusBadge} ${styles.badgeLow}`}>BAJO STOCK</span> ) 
                                            : ( <span className={`${styles.statusBadge} ${styles.badgeOk}`}>SUFICIENTE</span> )}
                                        </td>
                                        <td className={styles.cellActions}>
                                            <button className={styles.actionBtn} title="Ver detalle de unidades" onClick={() => fetchData()}>
                                                <span className="material-symbols-rounded">list_alt</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <aside className={styles.sidePanel}>
                    <div className={styles.sideHeader}>
                        <h3>🔓 Insumos en Uso</h3>
                        <span className={styles.countTag}>{unidades.filter(u => u.estatus === 'En Uso').length}</span>
                    </div>
                    <div className={styles.unitsList}>
                        {unidades.filter(u => u.estatus === 'En Uso').length === 0 ? (
                            <div className={styles.emptySide}>Todo el material está actualmente sellado.</div>
                        ) : (
                            unidades.filter(u => u.estatus === 'En Uso').map(u => (
                                <div key={u.id} className={styles.unitSideRow}>
                                    <div className={styles.unitInfo}>
                                        <strong>{u.materiales_catalogo?.nombre}</strong>
                                        <p>{u.codigo_barras_unico}</p>
                                        <span>Abierto: {new Date(u.fecha_inicio_uso).toLocaleDateString()}</span>
                                    </div>
                                    <div className={styles.unitActions}>
                                        <button className={styles.labelBtn} onClick={() => handlePrintLabel(u.id)} title="Imprimir Etiqueta">
                                            <span className="material-symbols-rounded">print</span>
                                        </button>
                                        <button className={styles.closeBtn} onClick={() => handleFinalizar(u.id)} title="Finalizar Uso">
                                            <span className="material-symbols-rounded">close</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
}
