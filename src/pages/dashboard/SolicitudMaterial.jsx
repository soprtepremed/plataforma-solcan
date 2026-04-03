import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './AlmacenDashboard.module.css'; // Reutilizamos estilos por ahora

export default function SolicitudMaterial() {
    const { user } = useAuth();
    const [catalogo, setCatalogo] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [carrito, setCarrito] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prioridad, setPrioridad] = useState('Media');
    const [observaciones, setObservaciones] = useState('');

    useEffect(() => {
        const fetchCatalogo = async () => {
            const { data } = await supabase.from('materiales_catalogo').select('*').order('nombre', { ascending: true });
            if (data) setCatalogo(data);
            setLoading(false);
        };
        fetchCatalogo();
    }, []);

    const agregarAlCarrito = (item) => {
        const existe = carrito.find(c => c.id === item.id);
        if (existe) {
            setCarrito(carrito.map(c => c.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c));
        } else {
            setCarrito([...carrito, { ...item, cantidad: 1 }]);
        }
    };

    const actualizarCantidad = (id, delta) => {
        setCarrito(carrito.map(c => c.id === id ? { ...c, cantidad: Math.max(1, c.cantidad + delta) } : c));
    };

    const eliminarDelCarrito = (id) => {
        setCarrito(carrito.filter(c => c.id !== id));
    };

    const enviarSolicitud = async () => {
        if (carrito.length === 0) return alert('Selecciona al menos un material.');

        const { data: vale, error: valeErr } = await supabase.from('solicitudes_vale').insert([{
            folio: `VALE-${Date.now().toString().slice(-6)}`,
            solicitante_id: user.id,
            area_destino: user.branch || 'Matriz',
            prioridad: prioridad,
            observaciones: observaciones
        }]).select().single();

        if (valeErr) return alert('Error al crear vale: ' + valeErr.message);

        const items = carrito.map(c => ({
            vale_id: vale.id,
            material_catalogo_id: c.id,
            cantidad_solicitada: c.cantidad
        }));

        const { error: itemsErr } = await supabase.from('solicitudes_items').insert(items);

        if (!itemsErr) {
            alert('✅ Solicitud enviada correctamente.');
            setCarrito([]);
            setObservaciones('');
            setPrioridad('Media');
        } else {
            alert('Error al agregar items: ' + itemsErr.message);
        }
    };

    const filteredCatalogo = catalogo.filter(item => item.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>📝 Nueva Solicitud de Material</h1>
                    <p>Agrega los materiales que necesitas para tu área</p>
                </div>
            </header>

            <div className={styles.mainContent}>
                <section className={styles.panel}>
                    <div className={strings.panelHeader}>
                        <div style={{width: '100%'}}>
                             <input 
                                type="text" 
                                placeholder="🔍 Buscar material en el catálogo..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                style={{width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0'}}
                             />
                        </div>
                    </div>
                    <div className={styles.valeList} style={{maxHeight: '600px', overflowY: 'auto'}}>
                        {loading ? <p>Cargando catálogo...</p> : 
                         filteredCatalogo.map(item => (
                            <div key={item.id} className={styles.valeRow}>
                                <div>
                                    <h4>{item.nombre}</h4>
                                    <span style={{fontSize: '0.8rem', color: '#64748b'}}>Unidad: {item.unidad} | Prefijo: {item.prefijo}</span>
                                </div>
                                <button className={styles.confirmBtn} onClick={() => agregarAlCarrito(item)}>Agregar</button>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className={styles.sidePanel}>
                    <div className={styles.panel} style={{padding: '1.5rem'}}>
                        <h2 style={{fontSize: '1.2rem', marginBottom: '1.5rem'}}>Resumen del Vale</h2>
                        {carrito.length === 0 ? <p style={{color: '#94a3b8'}}>El carrito está vacío.</p> : (
                            <>
                                {carrito.map(item => (
                                    <div key={item.id} style={{marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <strong>{item.nombre}</strong>
                                            <button onClick={() => eliminarDelCarrito(item.id)} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer'}}>&times;</button>
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                                            <button onClick={() => actualizarCantidad(item.id, -1)} className={styles.actionBtn}>-</button>
                                            <span>{item.cantidad}</span>
                                            <button onClick={() => actualizarCantidad(item.id, 1)} className={styles.actionBtn}>+</button>
                                        </div>
                                    </div>
                                ))}

                                <div style={{marginTop: '1.5rem'}}>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 600}}>Prioridad</label>
                                    <select value={prioridad} onChange={e => setPrioridad(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                                        <option value="Baja">Baja</option>
                                        <option value="Media">Media</option>
                                        <option value="Urgente">Urgente 🔥</option>
                                    </select>
                                </div>

                                <div style={{marginTop: '1rem'}}>
                                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 600}}>Observaciones</label>
                                    <textarea 
                                        value={observaciones} 
                                        onChange={e => setObservaciones(e.target.value)}
                                        placeholder="Motivo de la solicitud..."
                                        style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px'}}
                                    />
                                </div>

                                <button onClick={enviarSolicitud} className={styles.confirmBtn} style={{width: '100%', marginTop: '1.5rem', padding: '15px'}}>
                                    Enviar Vale a Almacén
                                </button>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

const strings = { panelHeader: styles.panelHeader };
