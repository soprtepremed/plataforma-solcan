import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseNotas } from '../../utils/parseNotas';
import ModalNuevoPedido from '../../components/shared/ModalNuevoPedido';
import styles from './Proveedores.module.css';

export default function Proveedores() {
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados para el Expediente (Panel Lateral)
    const [selectedProv, setSelectedProv] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    
    // Estados para el Modal de CRUD
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, nombre: '', telefono: '', whatsapp: '', contacto_nombre: '', direccion: '', notas: '' });
    const [showPedidoModal, setShowPedidoModal] = useState(false);

    useEffect(() => {
        fetchProveedores();
    }, []);

    const fetchProveedores = async () => {
        setLoading(true);
        // Traemos los proveedores. Consideramos que la tabla podría no existir si el script no se ha corrido, pero lo manejamos.
        const { data, error } = await supabase.from('proveedores').select('*').order('nombre', { ascending: true });
        if (error) {
            console.error("Error cargando proveedores (probablemente falta crear la tabla):", error);
            // Ignoramos silent block si la tabla no existe para propósitos de UI
        } else {
            setProveedores(data || []);
        }
        setLoading(false);
    };

    const fetchExpediente = async (prov) => {
        setSelectedProv(prov);
        // Buscar el historial de pedidos de este proveedor
        const { data, error } = await supabase
            .from('pedidos_proveedor')
            .select('*')
            .eq('proveedor_id', prov.id)
            .order('fecha_pedido', { ascending: false });
        
        if (!error && data) {
            setPedidos(data);
        } else {
            setPedidos([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                nombre: form.nombre,
                telefono: form.telefono,
                whatsapp: form.whatsapp || form.telefono, // Usa mismo por defecto si está vacío
                contacto_nombre: form.contacto_nombre,
                direccion: form.direccion,
                notas: form.notas
            };

            if (isEditing) {
                const { error } = await supabase.from('proveedores').update(payload).eq('id', form.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('proveedores').insert([payload]);
                if (error) throw error;
            }
            setShowModal(false);
            setForm({ id: null, nombre: '', telefono: '', whatsapp: '', contacto_nombre: '', direccion: '', notas: '' });
            fetchProveedores();
        } catch (err) {
            alert('Error al guardar proveedor: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (prov, e) => {
        e.stopPropagation();
        setForm(prov);
        setIsEditing(true);
        setShowModal(true);
    };

    const confirmDelete = async (id, nombre, e) => {
        e.stopPropagation();
        if (window.confirm(`¿Inactivar a ${nombre}?`)) {
            const { error } = await supabase.from('proveedores').update({ estatus: 'Inactivo' }).eq('id', id);
            if (!error) {
                fetchProveedores();
                if (selectedProv && selectedProv.id === id) setSelectedProv(null);
            }
        }
    };

    const filteredProveedores = proveedores.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    const getBadgeClass = (status) => {
        if (status === 'Pendiente') return styles.badgePendiente;
        if (status === 'Surtido Total') return styles.badgeSurtido;
        if (status === 'Surtido Parcial') return styles.badgeParcial;
        return styles.badgeCancelado;
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">local_shipping</span> Directorio de Proveedores</h1>
                    <p>Gestión de contactos y expediente de pedidos de insumos.</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.searchBox}>
                        <span className="material-symbols-rounded">search</span>
                        <input type="text" placeholder="Buscar proveedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className={styles.primaryBtn} onClick={() => { setIsEditing(false); setForm({id:null, nombre:'', telefono:'', whatsapp:'', contacto_nombre:'', direccion:'', notas:''}); setShowModal(true); }}>
                        <span className="material-symbols-rounded">add</span> Nuevo Proveedor
                    </button>
                </div>
            </header>

            <div className={styles.mainLayout}>
                {/* Tabla/Listado */}
                <div className={styles.tableWrapper}>
                    <table className={styles.provTable}>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Contacto Principal</th>
                                <th>WhatsApp</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{textAlign: 'center'}}>Cargando directorio...</td></tr>
                            ) : filteredProveedores.length === 0 ? (
                                <tr><td colSpan="4" style={{textAlign: 'center'}}>No se encontraron proveedores. Asegúrate de haber ejecutado el script SQL.</td></tr>
                            ) : (
                                filteredProveedores.map(p => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => fetchExpediente(p)}
                                        className={selectedProv?.id === p.id ? styles.activeRow : ''}
                                    >
                                        <td>
                                            <strong>{p.nombre}</strong>
                                            {p.estatus === 'Inactivo' && <span style={{marginLeft:'8px', color: 'red', fontSize:'12px'}}>(Inactivo)</span>}
                                        </td>
                                        <td>{p.contacto_nombre || '---'}</td>
                                        <td>
                                            {p.whatsapp ? (
                                                <a href={`https://wa.me/${p.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className={styles.contactBadge} onClick={e => e.stopPropagation()}>
                                                    <span className="material-symbols-rounded" style={{fontSize: '16px'}}>chat</span> Chat
                                                </a>
                                            ) : (
                                                <span className={`${styles.contactBadge} ${styles.empty}`}>Sin Wa</span>
                                            )}
                                        </td>
                                        <td>
                                            <button className={styles.actionBtn} onClick={(e) => openEdit(p, e)} title="Editar"><span className="material-symbols-rounded">edit</span></button>
                                            {p.estatus === 'Activo' && <button className={styles.actionBtn} onClick={(e) => confirmDelete(p.id, p.nombre, e)} title="Inactivar"><span className="material-symbols-rounded">block</span></button>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Expediente Lateral */}
                <aside className={styles.expedienteSide}>
                    {!selectedProv ? (
                        <div className={styles.emptyState}>
                            <span className="material-symbols-rounded">contact_page</span>
                            <h4>Selecciona un proveedor</h4>
                            <p>Haz clic en un proveedor para ver sus datos de contacto y facturación, además de su historial de pedidos y pendientes.</p>
                        </div>
                    ) : (
                        <div>
                            <div className={styles.expedienteHeader}>
                                <h3>{selectedProv.nombre}</h3>
                                <p>Expediente y Contacto</p>
                            </div>
                            
                            <div className={styles.detailRow}>
                                <span className="material-symbols-rounded">person</span>
                                <div><strong>Atención:</strong> {selectedProv.contacto_nombre || 'No registrado'}</div>
                            </div>
                            <div className={styles.detailRow}>
                                <span className="material-symbols-rounded">call</span>
                                <div><strong>Tel:</strong> {selectedProv.telefono || 'No registrado'}</div>
                            </div>
                            <div className={styles.detailRow}>
                                <span className="material-symbols-rounded">location_on</span>
                                <div><strong>Dirección:</strong> {selectedProv.direccion || 'No registrada'}</div>
                            </div>
                            {selectedProv.notas && (
                                <div className={styles.detailRow} style={{marginTop: '1rem', background: '#fffbeb', padding: '10px', borderRadius:'8px', border:'1px solid #fde68a'}}>
                                    <span className="material-symbols-rounded" style={{color: '#d97706'}}>warning</span>
                                    <div><strong>Notas Internas:</strong><br/>{selectedProv.notas}</div>
                                </div>
                            )}

                            <div className={styles.pedidosList}>
                                <h4>Historial de Pedidos</h4>
                                <button className={`${styles.primaryBtn} ${styles.btnBlock}`} onClick={() => setShowPedidoModal(true)}>
                                    <span className="material-symbols-rounded">receipt_long</span> Registrar Pedido
                                </button>
                                
                                <div style={{marginTop: '1rem'}}>
                                    {pedidos.length === 0 ? (
                                        <p style={{fontSize: '0.9rem', color: '#64748b', textAlign:'center'}}>Este proveedor no tiene pedidos registrados aún.</p>
                                    ) : (
                                        pedidos.map(req => (
                                            <div key={req.id} className={styles.pedidoCard}>
                                                <div className={styles.pedidoHeader}>
                                                    <span>{req.folio || 'N/A'}</span>
                                                    <span className={`${getBadgeClass(req.estatus)}`}>{req.estatus}</span>
                                                </div>
                                                <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: req.notas ? '8px' : '0'}}>
                                                    Fecha: {new Date(req.fecha_pedido).toLocaleDateString()}
                                                </div>
                                                {req.notas && (
                                                    <div style={{fontSize: '0.8rem', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '4px', color: '#475569', border: '1px solid #e2e8f0'}}>
                                                        {parseNotas(req.notas).map((n, i) => (
                                                            <div key={i} style={{marginBottom: i === parseNotas(req.notas).length - 1 ? '0' : '6px', paddingBottom: i === parseNotas(req.notas).length - 1 ? '0' : '6px', borderBottom: i === parseNotas(req.notas).length - 1 ? 'none' : '1px solid #cbd5e1'}}>
                                                                <span style={{color: '#94a3b8', fontSize: '0.7rem', display: 'block'}}>{n.fecha ? new Date(n.fecha).toLocaleDateString() : 'Original'}</span>
                                                                {n.texto}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {/* Modal CRUD Proveedor */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGrid}>
                                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                    <label>Razón Social / Nombre Comercial</label>
                                    <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Distribuidora Médica del Sur" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Nombre de Contacto</label>
                                    <input value={form.contacto_nombre} onChange={e => setForm({...form, contacto_nombre: e.target.value})} placeholder="Ej: Lic. Juan Pérez" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Teléfono (Fijo)</label>
                                    <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} placeholder="Ej: 55-1234-5678" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>WhatsApp (Móvil)</label>
                                    <input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="Incluir código país (Ej: 52155...)" />
                                </div>
                                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                    <label>Dirección</label>
                                    <input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} placeholder="Calle, Número, Colonia, Ciudad..." />
                                </div>
                                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                    <label>Notas Internas (Opcional)</label>
                                    <textarea rows="3" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="Tiempo de entrega estimado, condiciones especiales de crédito..."></textarea>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Proveedor'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para generar Pedidos */}
            {showPedidoModal && selectedProv && (
                <ModalNuevoPedido 
                    proveedor={selectedProv}
                    onClose={() => setShowPedidoModal(false)}
                    onSave={() => {
                        setShowPedidoModal(false);
                        fetchExpediente(selectedProv);
                    }}
                />
            )}
        </div>
    );
}
