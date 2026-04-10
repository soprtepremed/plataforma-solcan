import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './SolicitudMaterial.module.css';
import ValeAlmacen from '../../components/documents/ValeAlmacen';

export default function SolicitudMaterial() {
    const { user } = useAuth();
    const [catalogo, setCatalogo] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [carrito, setCarrito] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null); // Para el modal de selección de lote
    const [lotesDisponibles, setLotesDisponibles] = useState([]);
    const [prioridad, setPrioridad] = useState('Media');
    const [observacionesGral, setObservacionesGral] = useState('');
    const [notification, setNotification] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [sucursalStock, setSucursalStock] = useState({});

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        fetchCatalogo();
    }, []);

    const fetchCatalogo = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('materiales_catalogo')
            .select('*')
            .order('nombre', { ascending: true });
        if (data) setCatalogo(data);
        
        // Cargar stock de la sucursal actual para la previsualización
        if (user?.branch || user?.area) {
            const { data: stockData } = await supabase
                .from('materiales_unidades')
                .select('catalogo_id')
                .or(`area_actual.eq.${user.area},area_actual.eq.${user.branch}`)
                .in('estatus', ['Almacenado', 'En Uso']);
            
            if (stockData) {
                const counts = stockData.reduce((acc, curr) => {
                    acc[curr.catalogo_id] = (acc[curr.catalogo_id] || 0) + 1;
                    return acc;
                }, {});
                setSucursalStock(counts);
            }
        }
        setLoading(false);
    };

    const fetchLotes = async (materialId) => {
        const { data } = await supabase
            .from('materiales_unidades')
            .select('lote_numero, caducidad')
            .eq('catalogo_id', materialId)
            .eq('estatus', 'Almacenado');
        
        // Agrupar y contar existencias por lote
        const agrp = data.reduce((acc, curr) => {
            const key = curr.lote_numero || 'SIN LOTE';
            if (!acc[key]) {
                acc[key] = { lote: key, caducidad: curr.caducidad, stock: 0 };
            }
            acc[key].stock += 1;
            return acc;
        }, {});
        
        setLotesDisponibles(Object.values(agrp));
    };

    const handleSelectMaterial = (item) => {
        setSelectedItem(item);
        fetchLotes(item.id);
    };

    const agregarAlCarrito = (loteObj) => {
        const idUnico = `${selectedItem.id}-${loteObj.lote}`;
        const existe = carrito.find(c => c.idUnico === idUnico);

        if (existe) {
            setCarrito(carrito.map(c => c.idUnico === idUnico ? { ...c, cantidad: c.cantidad + 1 } : c));
        } else {
            setCarrito([...carrito, { 
                idUnico,
                material_id: selectedItem.id,
                nombre: selectedItem.nombre,
                marca: selectedItem.marca,
                unidad: selectedItem.unidad,
                lote: loteObj.lote,
                caducidad: loteObj.caducidad,
                cantidad: 1,
                observaciones: ''
            }]);
        }
        setSelectedItem(null);
    };

    const actualizarCantidad = (idUnico, delta) => {
        setCarrito(carrito.map(c => c.idUnico === idUnico ? { ...c, cantidad: Math.max(1, c.cantidad + delta) } : c));
    };

    const eliminarDelCarrito = (idUnico) => {
        setCarrito(carrito.filter(c => c.idUnico !== idUnico));
    };

    const handleEnviarVale = async () => {
        if (carrito.length === 0) return setNotification({ type: 'error', text: 'El carrito está vacío' });
        setLoading(true);

        try {
            const { data: vale, error: valeErr } = await supabase
                .from('solicitudes_vale')
                .insert([{
                    folio: `VALE-${Date.now().toString().slice(-6)}`,
                    solicitante_id: user.id,
                    area_destino: user.area || user.branch || 'Sucursal Solcan',
                    prioridad,
                    observaciones: observacionesGral,
                    estatus: 'Pendiente'
                }])
                .select()
                .single();

            if (valeErr) throw valeErr;

            const items = carrito.map(c => ({
                vale_id: vale.id,
                material_catalogo_id: c.material_id,
                cantidad_solicitada: c.cantidad,
                lote_solicitado: c.lote !== 'SIN LOTE' ? c.lote : null,
                observaciones: c.observaciones
            }));

            const { error: itemsErr } = await supabase.from('solicitudes_items').insert(items);
            if (itemsErr) throw itemsErr;

            setNotification({ type: 'success', text: '¡Pedido enviado con éxito! El almacén lo recibirá pronto.' });
            setCarrito([]);
            setObservacionesGral('');
        } catch (err) {
            setNotification({ type: 'error', text: 'Error: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredCatalogo = catalogo.filter(c => 
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.marca?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">shopping_cart</span> Tienda de Materiales</h1>
                    <p>Solicita insumos eligiendo lotes específicos para tu proceso</p>
                </div>
                {notification && (
                    <div className={`${styles.notification} ${styles[notification.type]}`}>
                        <span className="material-symbols-rounded">
                            {notification.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {notification.text}
                    </div>
                )}
            </header>

            <div className={styles.mainLayout}>
                {/* Catálogo */}
                <section className={styles.catalogSection}>
                    <div className={styles.searchBar}>
                        <span className="material-symbols-rounded">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o marca..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className={styles.productGrid}>
                        {loading && catalogo.length === 0 ? <p>Cargando materiales...</p> : 
                        filteredCatalogo.map(item => (
                            <div key={item.id} className={styles.productCard} onClick={() => handleSelectMaterial(item)}>
                                <div className={styles.prodInfo}>
                                    <h3>{item.nombre}</h3>
                                    <span>{item.marca || 'Sin Marca'} • {item.unidad}</span>
                                </div>
                                <button className={styles.addBtn}><span className="material-symbols-rounded">add</span></button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Carrito Sidebar */}
                <aside className={styles.cartSidebar}>
                    <div className={styles.cartHeader}>
                        <h2>Mi Pedido</h2>
                        <span className={styles.countBadge}>{carrito.length} ítems</span>
                    </div>

                    <div className={styles.cartList}>
                        {carrito.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <span className="material-symbols-rounded">shopping_basket</span>
                                <p>Tu carrito está vacío</p>
                            </div>
                        ) : (
                            carrito.map(item => (
                                <div key={item.idUnico} className={styles.cartItem}>
                                    <div className={styles.itemHeader}>
                                        <div>
                                            <h4>{item.nombre}</h4>
                                            <span className={styles.loteBadge}>LOTE: {item.lote}</span>
                                        </div>
                                        <button onClick={() => eliminarDelCarrito(item.idUnico)} className={styles.removeBtn}>&times;</button>
                                    </div>
                                    <div className={styles.itemControls}>
                                        <div className={styles.qtyCounter}>
                                            <button onClick={() => actualizarCantidad(item.idUnico, -1)}>-</button>
                                            <span>{item.cantidad}</span>
                                            <button onClick={() => actualizarCantidad(item.idUnico, 1)}>+</button>
                                        </div>
                                        <input 
                                            placeholder="Obs..." 
                                            value={item.observaciones}
                                            onChange={(e) => setCarrito(carrito.map(c => c.idUnico === item.idUnico ? {...c, observaciones: e.target.value} : c))}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {carrito.length > 0 && (
                        <footer className={styles.cartFooter}>
                            <div className={styles.field}>
                                <label>Prioridad</label>
                                <select value={prioridad} onChange={e => setPrioridad(e.target.value)}>
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Urgente">Urgente</option>
                                </select>
                            </div>
                            <textarea 
                                placeholder="Observaciones generales del vale..."
                                value={observacionesGral}
                                onChange={e => setObservacionesGral(e.target.value)}
                            />
                            <button 
                                className={styles.checkoutBtn} 
                                onClick={() => setShowPreview(true)} 
                                disabled={loading}
                            >
                                Revisar Vale (FO-RM-004)
                            </button>
                        </footer>
                    )}
                </aside>
            </div>

            {/* Modal de Previsualización FO-RM-004 */}
            {showPreview && (
                <div className={styles.modalOverlay}>
                    <div className={styles.previewModal}>
                        <header className={styles.modalHeader}>
                            <h3>Previsualización de Vale</h3>
                            <div className={styles.headerActions}>
                                <button className={styles.cancelBtn} onClick={() => setShowPreview(false)}>Regresar</button>
                                <button className={styles.confirmBtn} onClick={() => { setShowPreview(false); handleEnviarVale(); }} disabled={loading}>
                                    {loading ? 'Enviando...' : 'Confirmar y Enviar'}
                                </button>
                            </div>
                        </header>
                        <div className={styles.previewContent}>
                            <ValeAlmacen 
                                vale={{ area_destino: user.area || user.branch, observaciones: observacionesGral }}
                                items={carrito}
                                solicitante={user}
                                sucursalStock={sucursalStock}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Selección Lote */}
            {selectedItem && (
                <div className={styles.modalOverlay}>
                    <div className={styles.lotModal}>
                        <header>
                            <h3>Seleccionar Lote</h3>
                            <button onClick={() => setSelectedItem(null)}>&times;</button>
                        </header>
                        <div className={styles.lotList}>
                            {lotesDisponibles.length === 0 ? <p>No hay lotes disponibles para este material.</p> :
                             lotesDisponibles.map(l => (
                                <div key={l.lote_numero} className={styles.lotRow} onClick={() => agregarAlCarrito(l)}>
                                    <div className={styles.lotInfo}>
                                        <strong>{l.lote_numero}</strong>
                                        <span>Cad: {l.caducidad}</span>
                                    </div>
                                    <div className={styles.lotStock}>
                                        Stock: {l.stock}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
