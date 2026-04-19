import React, { useState, useEffect, memo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseNotas } from '../../utils/parseNotas';
import { useNavigate } from 'react-router-dom';
import ModalNuevoPedido from '../../components/shared/ModalNuevoPedido';
import styles from './Proveedores.module.css';

const ProveedorCard = memo(({ p, isExpanded, onToggle, onEdit, onBlock, onFetchExpediente, pedidos, getBadgeClass }) => {
    return (
        <div className={`${styles.materialCard} ${isExpanded ? styles.isExpanded : ''}`} onClick={() => { onToggle(); if(!isExpanded) onFetchExpediente(p); }}>
            <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                    <span className={styles.cardPrefix}>PROVEEDOR</span>
                    <h3>{p.nombre} {p.estatus === 'Inactivo' && <span className={styles.inactivoTag}>(Inactivo)</span>}</h3>
                </div>
                <div className={styles.cardActions}>
                    <button className={styles.actionBtnSmall} onClick={(e) => { e.stopPropagation(); onEdit(p, e); }}>
                        <span className="material-symbols-rounded">edit</span>
                    </button>
                    {p.estatus === 'Activo' && (
                        <button className={styles.actionBtnSmall} onClick={(e) => { e.stopPropagation(); onBlock(p.id, p.nombre, e); }}>
                            <span className="material-symbols-rounded">block</span>
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.cardInfoGrid}>
                    <div className={styles.infoItem}>
                        <label>Atiende</label>
                        <span>{p.contacto_nombre || 'No registrado'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <label>Contacto</label>
                        <div className={styles.miniActions}>
                            {p.whatsapp && (
                                <a href={`https://wa.me/${p.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className={styles.contactBtnMini} onClick={e => e.stopPropagation()}>
                                    <span className="material-symbols-rounded">chat</span>
                                </a>
                            )}
                            {p.telefono && (
                                <a href={`tel:${p.telefono.replace(/\D/g,'')}`} className={styles.contactBtnMini} style={{background: '#e0f2fe', color: '#0284c7'}} onClick={e => e.stopPropagation()}>
                                    <span className="material-symbols-rounded">call</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {!isExpanded && (
                    <div className={styles.tapTip}>
                        <span className="material-symbols-rounded">expand_more</span> Toca para ver dirección e historial
                    </div>
                )}

                {isExpanded && (
                    <div className={styles.cardDetails}>
                        <div className={styles.detailSection}>
                            <label><span className="material-symbols-rounded">location_on</span> Dirección</label>
                            <p>{p.direccion || 'Sin dirección registrada'}</p>
                        </div>
                        
                        {p.notas && (
                            <div className={styles.cardNotas}>
                                <strong>Notas Internas:</strong>
                                <p>{p.notas}</p>
                            </div>
                        )}

                        <div className={styles.pedidosMobile}>
                            <h4>Historial de Pedidos</h4>
                            {pedidos.length === 0 ? (
                                <p className={styles.emptyPedidos}>Sin pedidos registrados</p>
                            ) : (
                                pedidos.map(req => (
                                    <div key={req.id} className={styles.pedidoMiniCard}>
                                        <div className={styles.pHeader}>
                                            <strong>{req.folio || 'N/A'}</strong>
                                            <span className={getBadgeClass(req.estatus)}>{req.estatus}</span>
                                        </div>
                                        <span>Fecha: {new Date(req.fecha_pedido).toLocaleDateString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default function Proveedores() {
    const navigate = useNavigate();
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados para el Expediente (Panel Lateral / Expandible)
    const [selectedProv, setSelectedProv] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [expandedCardId, setExpandedCardId] = useState(null);
    
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
        const { data, error } = await supabase.from('proveedores').select('*').order('nombre', { ascending: true });
        if (!error) setProveedores(data || []);
        setLoading(false);
    };

    const fetchExpediente = async (prov) => {
        setSelectedProv(prov);
        const { data, error } = await supabase
            .from('pedidos_proveedor')
            .select('*')
            .eq('proveedor_id', prov.id)
            .order('fecha_pedido', { ascending: false });
        
        if (!error && data) setPedidos(data);
        else setPedidos([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                nombre: form.nombre,
                telefono: form.telefono,
                whatsapp: form.whatsapp || form.telefono,
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
        if(e) e.stopPropagation();
        setForm(prov);
        setIsEditing(true);
        setShowModal(true);
    };

    const confirmDelete = async (id, nombre, e) => {
        if(e) e.stopPropagation();
        if (window.confirm(`¿Inactivar a ${nombre}?`)) {
            const { error } = await supabase.from('proveedores').update({ estatus: 'Inactivo' }).eq('id', id);
            if (!error) {
                fetchProveedores();
                if (selectedProv && selectedProv.id === id) setSelectedProv(null);
            }
        }
    };

    const filteredProveedores = proveedores.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.contacto_nombre && p.contacto_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getBadgeClass = (status) => {
        if (status === 'Pendiente') return styles.badgePendiente;
        if (status === 'Surtido Total') return styles.badgeSurtido;
        if (status === 'Surtido Parcial') return styles.badgeParcial;
        return styles.badgeCancelado;
    };

    return (
        <div className={styles.container}>
            <button className={styles.mobileBackBtn} onClick={() => navigate('/almacen')}>
                <span className="material-symbols-rounded">arrow_back</span>
                Menú Almacén
            </button>

            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">local_shipping</span> Directorio de Proveedores</h1>
                    <p>Gestión de contactos y pedidos de insumos.</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.searchBox}>
                        <span className="material-symbols-rounded">search</span>
                        <input type="text" placeholder="Buscar proveedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className={styles.primaryBtn} onClick={() => { setIsEditing(false); setForm({id:null, nombre:'', telefono:'', whatsapp:'', contacto_nombre:'', direccion:'', notas:''}); setShowModal(true); }}>
                        <span className="material-symbols-rounded">add</span> <span className={styles.btnText}>Nuevo Proveedor</span>
                    </button>
                </div>
            </header>

            <div className={styles.mainLayout}>
                {/* Escritorio: Tabla */}
                <div className={`${styles.tableWrapper} ${styles.desktopView}`}>
                    <table className={styles.provTable}>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Contacto Principal</th>
                                <th>Contacto Directo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{textAlign: 'center'}}>Cargando directorio...</td></tr>
                            ) : filteredProveedores.length === 0 ? (
                                <tr><td colSpan="4" style={{textAlign: 'center'}}>No se encontraron proveedores.</td></tr>
                            ) : (
                                filteredProveedores.map(p => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => fetchExpediente(p)}
                                        className={selectedProv?.id === p.id ? styles.activeRow : ''}
                                    >
                                        <td>
                                            <strong>{p.nombre}</strong>
                                            {p.estatus === 'Inactivo' && <span className={styles.inactivoTag}>(Inactivo)</span>}
                                        </td>
                                        <td>{p.contacto_nombre || '---'}</td>
                                        <td>
                                            <div style={{display:'flex', gap:'8px'}}>
                                                {p.whatsapp && (
                                                    <a href={`https://wa.me/${p.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className={styles.contactBadge} onClick={e => e.stopPropagation()}>
                                                        <span className="material-symbols-rounded" style={{fontSize: '16px'}}>chat</span> WA
                                                    </a>
                                                )}
                                                {p.telefono && (
                                                    <a href={`tel:${p.telefono.replace(/\D/g,'')}`} className={styles.contactBadge} style={{background: '#e0f2fe', color: '#0284c7'}} onClick={e => e.stopPropagation()}>
                                                        <span className="material-symbols-rounded" style={{fontSize: '16px'}}>call</span> Llamar
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <button className={styles.actionBtn} onClick={(e) => openEdit(p, e)}><span className="material-symbols-rounded">edit</span></button>
                                            {p.estatus === 'Activo' && <button className={styles.actionBtn} onClick={(e) => confirmDelete(p.id, p.nombre, e)}><span className="material-symbols-rounded">block</span></button>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Móvil: Lista de Tarjetas */}
                <div className={styles.mobileView}>
                    {loading ? (
                        <div className={styles.mobileLoader}>Cargando proveedores...</div>
                    ) : filteredProveedores.length === 0 ? (
                        <div className={styles.mobileEmpty}>No hay resultados</div>
                    ) : (
                        filteredProveedores.map(p => (
                            <ProveedorCard 
                                key={p.id} 
                                p={p} 
                                isExpanded={expandedCardId === p.id} 
                                onToggle={() => setExpandedCardId(expandedCardId === p.id ? null : p.id)}
                                onEdit={openEdit}
                                onBlock={confirmDelete}
                                onFetchExpediente={fetchExpediente}
                                pedidos={pedidos}
                                getBadgeClass={getBadgeClass}
                            />
                        ))
                    )}
                </div>

                {/* Escritorio: Expediente Lateral */}
                <aside className={`${styles.expedienteSide} ${styles.desktopView}`}>
                    {!selectedProv ? (
                        <div className={styles.emptyState}>
                            <span className="material-symbols-rounded">contact_page</span>
                            <h4>Selecciona un proveedor</h4>
                            <p>Haz clic en un proveedor para ver sus datos de contacto e historial.</p>
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
                                <div className={styles.cardNotas}>
                                    <strong>Notas Internas:</strong>
                                    <p>{selectedProv.notas}</p>
                                </div>
                            )}

                            <div className={styles.pedidosList}>
                                <h4>Historial de Pedidos</h4>
                                <button className={`${styles.primaryBtn} ${styles.btnBlock}`} onClick={() => setShowPedidoModal(true)}>
                                    <span className="material-symbols-rounded">receipt_long</span> Registrar Pedido
                                </button>
                                
                                <div style={{marginTop: '1rem'}}>
                                    {pedidos.length === 0 ? (
                                        <p style={{fontSize: '0.9rem', color: '#64748b', textAlign:'center'}}>Sin historial aún.</p>
                                    ) : (
                                        pedidos.map(req => (
                                            <div key={req.id} className={styles.pedidoCard}>
                                                <div className={styles.pedidoHeader}>
                                                    <span>{req.folio || 'N/A'}</span>
                                                    <span className={`${getBadgeClass(req.estatus)}`}>{req.estatus}</span>
                                                </div>
                                                <div style={{fontSize: '0.85rem', color: '#64748b'}}>
                                                    Fecha: {new Date(req.fecha_pedido).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {/* Modal CRUD */}
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
                                    <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre de la empresa" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Nombre de Contacto</label>
                                    <input value={form.contacto_nombre} onChange={e => setForm({...form, contacto_nombre: e.target.value})} placeholder="Persona que atiende" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>WhatsApp (Móvil)</label>
                                    <input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="52155..." />
                                </div>
                                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                    <label>Dirección</label>
                                    <input value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} placeholder="Calle, Número, Ciudad..." />
                                </div>
                                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                    <label>Notas Internas</label>
                                    <textarea rows="3" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="Observaciones especiales..."></textarea>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
