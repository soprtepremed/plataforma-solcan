import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './ModalNuevoPedido.module.css';

export default function ModalNuevoPedido({ proveedor, onClose, onSave }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cart, setCart] = useState([]);
    
    // Generar Folio Automático (Ej. SOLCAN-PED-20260410-XYZ)
    const [folio, setFolio] = useState('');
    const [notas, setNotas] = useState('');
    
    // Nuevos estados comerciales
    const [requiereFactura, setRequiereFactura] = useState(false);
    const [incluyeIva, setIncluyeIva] = useState(false);
    const [condicionPago, setCondicionPago] = useState('Contado');

    const [loading, setLoading] = useState(false);
    const searchRef = useRef(null);
    
    // --- ESTADO: ALERTAS PROPIAS ---
    const [toastMsg, setToastMsg] = useState(null);

    const showToast = (message, type = 'success') => {
        setToastMsg({ message, type });
        setTimeout(() => setToastMsg(null), 3300);
    };

    useEffect(() => {
        // Init default folio
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const randomStr = Math.floor(1000 + Math.random() * 9000);
        setFolio(`PED-${dateStr}-${randomStr}`);
    }, []);

    // Effect for debounced search
    useEffect(() => {
        if (!searchTerm.trim() || searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }
        
        const delaySearch = setTimeout(async () => {
            const { data } = await supabase
                .from('materiales_catalogo')
                .select('id, nombre, prefijo, presentacion, unidad, costo_unitario, categoria')
                .ilike('nombre', `%${searchTerm}%`)
                .eq('estatus', 'Activo')
                .limit(10);
                
            setSearchResults(data || []);
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    // Handle clicking outside of search results to close them
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addToCart = (item) => {
        // Puede ser item de catálogo o item manual (donde item es string)
        const isCustom = typeof item === 'string';
        const uuid = isCustom ? `custom-${Date.now()}` : item.id;

        // Evitar duplicados (solo para catálogos)
        if (!isCustom && cart.find(c => c.material_id === uuid)) {
            setSearchTerm('');
            setSearchResults([]);
            return;
        }

        const newItem = {
            id: uuid, // UI Key internal
            material_id: isCustom ? null : item.id,
            nombre_custom: isCustom ? item.toUpperCase() : null,
            nombre: isCustom ? item.toUpperCase() : item.nombre,
            presentacion: isCustom ? 'N/A' : (item.presentacion || item.unidad || 'Pieza'),
            cantidad: 1,
            costo_unitario: isCustom ? 0 : (item.costo_unitario || 0)
        };

        setCart([...cart, newItem]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeCartItem = (id) => {
        setCart(cart.filter(c => c.id !== id));
    };

    const updateCartItem = (id, field, value) => {
        setCart(cart.map(c => {
            if (c.id === id) {
                return { ...c, [field]: value };
            }
            return c;
        }));
    };

    const calculateTotal = () => {
        return cart.reduce((acc, item) => acc + (item.cantidad * item.costo_unitario), 0);
    };

    const handleSubmit = async () => {
        if (cart.length === 0) {
            showToast("El pedido no puede estar vacío.", "error");
            return;
        }
        if (!folio.trim()) {
            showToast("El folio del pedido es obligatorio.", "error");
            return;
        }

        setLoading(true);
        try {
            const total = calculateTotal();

            // Formatear la primera nota oficial
            const notasFinales = notas.trim() ? JSON.stringify([{
                fecha: new Date().toISOString(),
                texto: notas.trim()
            }]) : null;

            // 1. Crear el Maestro de Pedido
            const { data: pedidoData, error: pedidoError } = await supabase
                .from('pedidos_proveedor')
                .insert([{
                    proveedor_id: proveedor.id,
                    folio: folio,
                    monto_total: total,
                    notas: notasFinales,
                    requiere_factura: requiereFactura,
                    incluye_iva: incluyeIva,
                    condicion_pago: condicionPago,
                    estatus: 'Pendiente'
                }])
                .select()
                .single();

            if (pedidoError) throw pedidoError;

            // 2. Insertar los Items
            const itemsToInsert = cart.map(item => ({
                pedido_id: pedidoData.id,
                material_id: item.material_id,
                nombre_custom: item.nombre_custom,
                cantidad_solicitada: parseInt(item.cantidad) || 1,
                cantidad_recibida: 0,
                costo_unitario: parseFloat(item.costo_unitario) || 0
            }));

            const { error: itemsError } = await supabase
                .from('pedidos_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Success
            showToast("Pedido generado exitosamente.", "success");
            setTimeout(() => onSave(), 2000);
        } catch (error) {
            console.error(error);
            showToast("Error al generar el pedido: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* TOAST FLOTANTE */}
                {toastMsg && (
                    <div style={{
                        position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, 
                        background: toastMsg.type === 'error' ? '#fee2e2' : '#1e293b', 
                        color: toastMsg.type === 'error' ? '#991b1b' : '#fff',
                        padding: '12px 24px', borderRadius: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '0.9rem',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <span className="material-symbols-rounded" style={{color: toastMsg.type === 'success' ? '#10b981' : 'inherit'}}>{toastMsg.type === 'error' ? 'error' : 'task_alt'}</span>
                        {toastMsg.message}
                    </div>
                )}
                <div className={styles.header}>
                    <h2><span className="material-symbols-rounded">shopping_cart_checkout</span> Nuevo Pedido: {proveedor.nombre}</h2>
                    <button className={styles.closeBtn} onClick={onClose} disabled={loading}>
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.topSection}>
                        <div className={styles.field}>
                            <label>Folio del Pedido</label>
                            <input 
                                type="text" 
                                value={folio} 
                                onChange={e => setFolio(e.target.value)} 
                                placeholder="Ej: PED-0001"
                            />
                        </div>
                        <div className={styles.field}>
                            <label>Notas de Compra / Requerimientos Especiales</label>
                            <input 
                                type="text" 
                                value={notas} 
                                onChange={e => setNotas(e.target.value)} 
                                placeholder="Ej: Pago a contra-entrega, entregar por la mañana, pedir facturación urgente..."
                            />
                        </div>
                    </div>

                    {/* Fila Financiera */}
                    <div className={styles.topSection} style={{ gridTemplateColumns: '1fr 1fr 1fr', paddingTop: '1rem', paddingBottom: '1rem', marginTop: '-1rem' }}>
                        <div className={styles.field}>
                            <label>Condición de Pago</label>
                            <select 
                                value={condicionPago} 
                                onChange={e => setCondicionPago(e.target.value)}
                                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            >
                                <option value="Contado">Contado</option>
                                <option value="Crédito">Crédito</option>
                                <option value="Transferencia">Transferencia Bancaria</option>
                            </select>
                        </div>
                        <div className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                            <input 
                                type="checkbox" 
                                id="chkFactura" 
                                checked={requiereFactura} 
                                onChange={e => setRequiereFactura(e.target.checked)} 
                                style={{ width: '20px', height: '20px' }}
                            />
                            <label htmlFor="chkFactura" style={{ fontSize: '1rem', cursor: 'pointer', margin: 0, color: '#334155' }}>Requiere Factura</label>
                        </div>
                        <div className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                            <input 
                                type="checkbox" 
                                id="chkIva" 
                                checked={incluyeIva} 
                                onChange={e => setIncluyeIva(e.target.checked)} 
                                style={{ width: '20px', height: '20px' }}
                            />
                            <label htmlFor="chkIva" style={{ fontSize: '1rem', cursor: 'pointer', margin: 0, color: '#334155' }}>Precios Incluyen IVA</label>
                        </div>
                    </div>

                    <div className={styles.cartSection}>
                        <div className={styles.searchSection} ref={searchRef}>
                            <span className={`material-symbols-rounded ${styles.searchIcon}`}>search</span>
                            <input 
                                type="text" 
                                className={styles.searchInput}
                                placeholder="Buscar en el catálogo de materiales (teclea para buscar)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm.length >= 2 && (
                                <div className={styles.searchResults}>
                                    {searchResults.map(item => (
                                        <div key={item.id} className={styles.resultItem} onClick={() => addToCart(item)}>
                                            <div>
                                                <span className={styles.resultName}>{item.nombre}</span>
                                                <span className={styles.resultCat}>{item.categoria} | Ref: {item.prefijo}</span>
                                            </div>
                                            <span style={{color: 'var(--co-accent)', fontWeight: 'bold'}}>+ Añadir</span>
                                        </div>
                                    ))}
                                    {/* Botón para custom item */}
                                    <div className={styles.resultItem} style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }} onClick={() => addToCart(searchTerm)}>
                                        <div>
                                            <span className={styles.resultName}>"{searchTerm}"</span>
                                            <span className={styles.resultCat} style={{color: '#d97706'}}>Crear concepto manual (No existe en catálogo)</span>
                                        </div>
                                        <span style={{color: '#d97706', fontWeight: 'bold'}}>+ Cotizar</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <span className="material-symbols-rounded" style={{fontSize: '3rem'}}>inventory_2</span>
                                <h3>Carrito Vacío</h3>
                                <p>Busca materiales arriba para agregarlos a tu pedido.</p>
                            </div>
                        ) : (
                            <table className={styles.cartTable}>
                                <thead>
                                    <tr>
                                        <th>Material</th>
                                        <th>Presentación</th>
                                        <th style={{textAlign: 'right'}}>Cant. a Pedir</th>
                                        <th style={{textAlign: 'right'}}>Costo Unitario ($)</th>
                                        <th style={{textAlign: 'right'}}>Subtotal</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <strong>{item.nombre}</strong>
                                                {item.nombre_custom && <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 'bold', marginTop: '4px' }}>Fuera de Catálogo</div>}
                                            </td>
                                            <td>{item.presentacion}</td>
                                            <td style={{textAlign: 'right'}}>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    className={styles.qtyInput}
                                                    value={item.cantidad}
                                                    onChange={e => updateCartItem(item.id, 'cantidad', e.target.value)}
                                                />
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className={styles.costoInput}
                                                    value={item.costo_unitario}
                                                    onChange={e => updateCartItem(item.id, 'costo_unitario', e.target.value)}
                                                />
                                            </td>
                                            <td style={{textAlign: 'right', fontWeight: 'bold'}}>
                                                ${((item.cantidad || 0) * (item.costo_unitario || 0)).toFixed(2)}
                                            </td>
                                            <td style={{textAlign: 'center'}}>
                                                <button className={styles.removeBtn} onClick={() => removeCartItem(item.id)}>
                                                    <span className="material-symbols-rounded">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <div className={styles.totalArea}>
                        TOTAL: ${calculateTotal().toFixed(2)}
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading || cart.length === 0}>
                            {loading ? (
                                <>Generando...</>
                            ) : (
                                <><span className="material-symbols-rounded">send</span> Generar Pedido</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
