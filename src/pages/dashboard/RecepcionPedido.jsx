import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseNotas } from '../../utils/parseNotas';
import styles from './RecepcionPedido.module.css';

export default function RecepcionPedido() {
    // --- ESTADOS: LISTA GENERAL ---
    const [pedidosList, setPedidosList] = useState([]);
    const [filtroEstatus, setFiltroEstatus] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingList, setLoadingList] = useState(true);

    // --- ESTADOS: DETALLE DE RECEPCION ---
    const [vistaActual, setVistaActual] = useState('lista'); // 'lista' o 'detalle'
    const [pedido, setPedido] = useState(null);
    const [items, setItems] = useState([]);
    const [arregloNotas, setArregloNotas] = useState([]);
    const [nuevaNota, setNuevaNota] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    
    // --- ESTADO: ALERTAS PROPIAS ---
    const [toastMsg, setToastMsg] = useState(null);

    const showToast = (message, type = 'success') => {
        setToastMsg({ message, type });
        setTimeout(() => setToastMsg(null), 3300);
    };

    useEffect(() => {
        if (vistaActual === 'lista') {
            fetchPedidos();
        }
    }, [vistaActual]);

    const fetchPedidos = async () => {
        setLoadingList(true);
        const { data, error } = await supabase
            .from('pedidos_proveedor')
            .select('*, proveedores(nombre)')
            .order('fecha_pedido', { ascending: false });
        
        if (!error && data) {
            setPedidosList(data);
        }
        setLoadingList(false);
    };

    const verDetalle = async (pedidoMaestro) => {
        setLoadingAction(true);
        try {
            setPedido(pedidoMaestro);
            setArregloNotas(parseNotas(pedidoMaestro.notas));
            setNuevaNota('');

            const { data: iData, error: iError } = await supabase
                .from('pedidos_items')
                .select('*, materiales_catalogo(nombre, prefijo, unidad)')
                .eq('pedido_id', pedidoMaestro.id);

            if (iError) throw iError;

            setItems(iData.map(i => ({
                ...i,
                cantidad_recibida_local: i.cantidad_recibida || 0
            })));
            
            setVistaActual('detalle');
        } catch (err) {
            showToast('Error cargando los detalles del pedido: ' + err.message, 'error');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleQtyChange = (id, newQty) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const validQty = Math.max(0, parseInt(newQty) || 0);
                return { ...item, cantidad_recibida_local: validQty };
            }
            return item;
        }));
    };

    const procesarRecepcion = async () => {
        setLoadingAction(true);
        try {
            let totalSolicitado = 0;
            let totalRecibido = 0;

            for (const item of items) {
                totalSolicitado += item.cantidad_solicitada;
                totalRecibido += item.cantidad_recibida_local;

                await supabase.from('pedidos_items')
                    .update({ cantidad_recibida: item.cantidad_recibida_local })
                    .eq('id', item.id);
            }

            let nuevoEstatus = 'Pendiente';
            if (totalRecibido >= totalSolicitado && totalSolicitado > 0) {
                nuevoEstatus = 'Surtido Total';
            } else if (totalRecibido > 0) {
                nuevoEstatus = 'Surtido Parcial';
            }

            let notasFinales = pedido.notas;
            if (nuevaNota.trim()) {
                const arr = [...arregloNotas, { fecha: new Date().toISOString(), texto: nuevaNota.trim() }];
                notasFinales = JSON.stringify(arr);
            }

            const { error: updErr } = await supabase.from('pedidos_proveedor')
                .update({ 
                    estatus: nuevoEstatus,
                    notas: notasFinales
                })
                .eq('id', pedido.id);

            if (updErr) throw updErr;

            showToast(`Recepcion registrada correctamente. Nuevo estatus: ${nuevoEstatus}`, 'success');
            setVistaActual('lista');
        } catch (err) {
            showToast('Error al guardar recepcion: ' + err.message, 'error');
        } finally {
            setLoadingAction(false);
        }
    };

    const guardarSoloNota = async () => {
        if (!nuevaNota.trim()) return;
        setLoadingAction(true);
        try {
            const arr = [...arregloNotas, { fecha: new Date().toISOString(), texto: nuevaNota.trim() }];
            const notasFinales = JSON.stringify(arr);

            const { error: updErr } = await supabase.from('pedidos_proveedor')
                .update({ notas: notasFinales })
                .eq('id', pedido.id);

            if (updErr) throw updErr;

            setArregloNotas(arr);
            setNuevaNota('');
            setPedido(prev => ({ ...prev, notas: notasFinales }));
            setPedidosList(prev => prev.map(p => p.id === pedido.id ? { ...p, notas: notasFinales } : p));
            showToast('Bitácora actualizada correctamente.', 'success');
        } catch (err) {
            showToast('Error al guardar la nota: ' + err.message, 'error');
        } finally {
            setLoadingAction(false);
        }
    };

    const renderUltimaNota = (rawNotas) => {
        const arr = parseNotas(rawNotas);
        if (!arr || arr.length === 0) return null;
        const last = arr[arr.length - 1];
        if (!last.texto) return null;
        return (
            <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={last.texto}>
                <span className="material-symbols-rounded" style={{fontSize: '12px', verticalAlign: 'middle', marginRight: '2px'}}>edit_note</span>
                <i>{last.texto}</i>
            </div>
        );
    };

    // Filtros de UI para la lista
    const filteredPedidos = pedidosList.filter(p => {
        const matchesStatus = filtroEstatus === 'Todos' || p.estatus === filtroEstatus;
        const matchesSearch = 
            p.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.proveedores?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesStatus && matchesSearch;
    });

    const renderStatus = (status) => {
        if (status === 'Pendiente') return <span className={`${styles.statusIndicator} ${styles.statusWarning}`}>Pendiente</span>;
        if (status === 'Surtido Total') return <span className={`${styles.statusIndicator} ${styles.statusOk}`}>Completado</span>;
        if (status === 'Surtido Parcial') return <span className={`${styles.statusIndicator} ${styles.statusWarning}`} style={{background:'#cffafe', color:'#0891b2'}}>Parcial</span>;
        return <span className={`${styles.statusIndicator} ${styles.statusDanger}`}>{status}</span>;
    };

    const getStatusIndicatorDetail = (solicitado, recibido) => {
        if (recibido === 0) return <span className={`${styles.statusIndicator} ${styles.statusDanger}`}>Pendiente</span>;
        if (recibido < solicitado) return <span className={`${styles.statusIndicator} ${styles.statusWarning}`}>Incompleto</span>;
        return <span className={`${styles.statusIndicator} ${styles.statusOk}`}>Completo</span>;
    };

    return (
        <div className={styles.container}>
            {/* TOAST FLOTANTE */}
            {toastMsg && (
                <div style={{
                    position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, 
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

            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">inventory</span> Recepción de Mercancía</h1>
                </div>
            </header>

            <div className={styles.contentWrapper}>
                {vistaActual === 'lista' ? (
                    // ==========================================
                    //  VISTA GENERAL DE PEDIDOS (LIST ROW)
                    // ==========================================
                    <div>
                        <div className={styles.searchSection}>
                            <div className={styles.searchBox}>
                                <span className="material-symbols-rounded" style={{color: '#94a3b8'}}>search</span>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por Folio (PED-001) o Proveedor..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                            </div>
                            <div className={styles.filtersRow}>
                                {['Todos', 'Pendiente', 'Surtido Parcial', 'Surtido Total'].map(status => (
                                    <button 
                                        key={status}
                                        className={`${styles.pillBtn} ${filtroEstatus === status ? styles.pillActive : ''}`}
                                        onClick={() => setFiltroEstatus(status)}
                                    >
                                        {status === 'Surtido Total' ? 'Completos' : status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loadingList ? (
                            <div style={{textAlign: 'center', padding: '3rem', color: '#94a3b8'}}>Cargando pedidos...</div>
                        ) : filteredPedidos.length === 0 ? (
                            <div style={{textAlign: 'center', padding: '3rem', color: '#94a3b8'}}>No se encontraron pedidos.</div>
                        ) : (
                            <table className={styles.mainTable}>
                                <thead>
                                    <tr>
                                        <th>Folio</th>
                                        <th>Proveedor</th>
                                        <th>Fecha del Pedido</th>
                                        <th>Estatus</th>
                                        <th style={{textAlign: 'center'}}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPedidos.map(p => (
                                        <tr key={p.id}>
                                            <td><strong>{p.folio || 'S/F'}</strong></td>
                                            <td>
                                                <div>{p.proveedores?.nombre}</div>
                                                {renderUltimaNota(p.notas)}
                                            </td>
                                            <td>{new Date(p.fecha_pedido).toLocaleDateString()}</td>
                                            <td>{renderStatus(p.estatus)}</td>
                                            <td style={{textAlign: 'center'}}>
                                                <button className={styles.actionBtn} onClick={() => verDetalle(p)}>
                                                    <span className="material-symbols-rounded" style={{fontSize: '18px'}}>checklist</span> Ver / Recibir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    // ==========================================
                    //  VISTA DE DETALLES DE RECEPCION (CHECKLIST)
                    // ==========================================
                    <div className={styles.checklistArea}>
                        <div className={styles.topBarDetalle}>
                            <button className={styles.btnBack} onClick={() => setVistaActual('lista')}>
                                <span className="material-symbols-rounded">arrow_back</span> Regresar a la lista
                            </button>
                            <h2 style={{margin: 0, color: 'var(--co-primary)'}}>Comprobación de Pedido</h2>
                        </div>

                        <div className={styles.pedidoInfoBanner}>
                            <div>
                                <strong>Folio:</strong> {pedido?.folio} <br/>
                                <strong>Proveedor:</strong> {pedido?.proveedores?.nombre}<br/>
                                <span style={{fontSize: '0.9rem', color: '#64748b'}}>Fecha de Emisión: {new Date(pedido?.fecha_pedido).toLocaleDateString()}</span>
                            </div>
                            <div style={{textAlign: 'right'}}>
                                <strong>Estatus Actual:</strong><br/>
                                <span className={styles.statusIndicator} style={{background: 'white', border: '1px solid #cbd5e1', color: 'black'}}>{pedido?.estatus}</span>
                            </div>
                        </div>

                        <h3>Lista de Materiales y Faltantes</h3>
                        <table className={styles.recepcionTable}>
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th style={{textAlign: 'center'}}>Solicitado</th>
                                    <th style={{textAlign: 'center'}}>Recibido Anteriormente</th>
                                    <th style={{textAlign: 'center'}}>Ingresando Ahora</th>
                                    <th>Estatus Item</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>{item.materiales_catalogo ? item.materiales_catalogo.nombre : item.nombre_custom}</strong><br/>
                                            {item.materiales_catalogo ? (
                                                <span style={{fontSize:'0.85rem', color:'#64748b'}}>{item.materiales_catalogo.prefijo} - {item.materiales_catalogo.unidad}</span>
                                            ) : (
                                                <span style={{fontSize:'0.85rem', color:'#d97706', fontWeight: 'bold'}}>No catalogado (Cotización especial)</span>
                                            )}
                                        </td>
                                        <td style={{textAlign: 'center', fontWeight: 'bold'}}>{item.cantidad_solicitada}</td>
                                        <td style={{textAlign: 'center'}}>{item.cantidad_recibida}</td>
                                        <td style={{textAlign: 'center'}}>
                                            <input 
                                                type="number" 
                                                className={styles.qtyInput}
                                                value={item.cantidad_recibida_local}
                                                onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                            />
                                        </td>
                                        <td>{getStatusIndicatorDetail(item.cantidad_solicitada, item.cantidad_recibida_local)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{marginTop: '2rem'}}>
                            <div style={{marginBottom: '1.5rem'}}>
                                <h4 style={{color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <span className="material-symbols-rounded">history</span> Historial de Observaciones
                                </h4>
                                <div style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', maxHeight: '250px', overflowY: 'auto'}}>
                                    {arregloNotas.length === 0 ? (
                                        <p style={{fontSize: '0.9rem', color: '#94a3b8', margin: 0, textAlign: 'center'}}>Aún no hay reportes en la bitácora.</p>
                                    ) : (
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                            {arregloNotas.map((n, i) => (
                                                <div key={i} style={{background: 'white', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
                                                    <div style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', fontWeight: 'bold'}}>
                                                        {n.fecha ? new Date(n.fecha).toLocaleString() : 'Nota original sin fecha'}
                                                    </div>
                                                    <div style={{fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-line'}}>
                                                        {n.texto}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom:'0.5rem'}}>
                                <label style={{fontWeight: 'bold', color: '#1e293b'}}>Agregar Nueva Observación</label>
                                <button className={styles.secondaryBtn} style={{padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}} onClick={guardarSoloNota} disabled={loadingAction || !nuevaNota.trim()}>
                                    <span className="material-symbols-rounded" style={{fontSize: '16px'}}>add</span> Registrar en Bitácora
                                </button>
                            </div>
                            <textarea 
                                style={{width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily:'inherit'}}
                                rows="3"
                                value={nuevaNota}
                                onChange={(e) => setNuevaNota(e.target.value)}
                                placeholder="Escribe aquí tu observación para añadirla al historial..."
                            ></textarea>
                        </div>

                        <div className={styles.footerActions}>
                            <button className={styles.secondaryBtn} onClick={() => setVistaActual('lista')}>Cancelar</button>
                            <button className={styles.primaryBtn} onClick={procesarRecepcion} disabled={loadingAction}>
                                {loadingAction ? 'Guardando...' : <><span className="material-symbols-rounded">save</span> Confirmar Recepción</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
