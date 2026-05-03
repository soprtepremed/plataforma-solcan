import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './SolicitudMaterial.module.css';
import ValeAlmacen from '../../components/documents/ValeAlmacen';
import SignaturePad from '../../components/SignaturePad';
import html2pdf from 'html2pdf.js';

export default function SolicitudMaterial() {
    const { user } = useAuth();
    const printAreaRef = useRef(null);
    const [catalogo, setCatalogo] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [carrito, setCarrito] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null); // Para el modal de selección de lote
    const [lotesDisponibles, setLotesDisponibles] = useState([]);
    const [prioridad, setPrioridad] = useState('Media');
    const [observacionesGral, setObservacionesGral] = useState('');
    const [signature, setSignature] = useState(null);
    const [generatedFolio, setGeneratedFolio] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [sucursalStock, setSucursalStock] = useState({});
    const [selectedArea, setSelectedArea] = useState('TODOS');
    const [centralStock, setCentralStock] = useState({});
    const [showDropdown, setShowDropdown] = useState(false);

    const resetForm = () => {
        setCarrito([]);
        setSignature(null);
        setObservacionesGral('');
        setSelectedItem(null);
        setSearchTerm('');
        setShowSuccessModal(false);
        setGeneratedFolio(null);
    };

    const downloadPDF = (folio) => {
        if (!printAreaRef.current) return;
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `FO-RM-004_${folio}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(printAreaRef.current).set(opt).save();
    };
    const areas = ['TODOS', 'QUÍMICA CLÍNICA', 'HEMATOLOGÍA', 'MICROBIOLOGÍA', 'URIANÁLISIS', 'SEROLOGÍA', 'GENERAL'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(`.${styles.searchCard}`)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        fetchCatalogo();
    }, []);


    useEffect(() => {
        if (user) {
            const role = user.role?.toLowerCase() || '';
            if (role.includes('quimico')) setSelectedArea('QUÍMICA CLÍNICA');
            else if (role.includes('uria')) setSelectedArea('URIANÁLISIS');
            else if (role.includes('micro')) setSelectedArea('MICROBIOLOGÍA');
            else if (role.includes('hemato')) setSelectedArea('HEMATOLOGÍA');
            else if (role.includes('serolo')) setSelectedArea('SEROLOGÍA');
            else setSelectedArea('TODOS');
        }
    }, [user]);

    const fetchCatalogo = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('materiales_catalogo')
                .select('*')
                .order('nombre', { ascending: true });
            
            if (error) throw error;
            if (data) setCatalogo(data);
            
            // Cargar stock de Almacén Central (Global para solicitud)
            const { data: centralData } = await supabase
                .from('materiales_unidades')
                .select('catalogo_id')
                .eq('estatus', 'Almacenado');
            
            if (centralData) {
                const cCounts = centralData.reduce((acc, curr) => {
                    acc[curr.catalogo_id] = (acc[curr.catalogo_id] || 0) + 1;
                    return acc;
                }, {});
                setCentralStock(cCounts);
            }

            // Cargar stock de la sucursal actual para la previsualización
            const userArea = user?.area;
            const userBranch = user?.branch;
            
            if (userArea || userBranch) {
                let query = supabase
                    .from('materiales_unidades')
                    .select('catalogo_id')
                    .in('estatus', ['Almacenado', 'En Uso']);
                
                if (userArea && userBranch) {
                    query = query.or(`area_actual.eq.${userArea},area_actual.eq.${userBranch}`);
                } else if (userArea) {
                    query = query.eq('area_actual', userArea);
                } else {
                    query = query.eq('area_actual', userBranch);
                }

                const { data: stockData } = await query;
                
                if (stockData) {
                    const counts = stockData.reduce((acc, curr) => {
                        acc[curr.catalogo_id] = (acc[curr.catalogo_id] || 0) + 1;
                        return acc;
                    }, {});
                    setSucursalStock(counts);
                }
            }
        } catch (err) {
            console.error("Error fetching catalog:", err);
            setNotification({ type: 'error', text: 'Error al cargar el catálogo: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const fetchLotes = async (materialId) => {
        const { data } = await supabase
            .from('materiales_unidades')
            .select('lote_numero, caducidad')
            .eq('catalogo_id', materialId)
            .eq('estatus', 'Almacenado');
        
        // Agrupar y contar existencias por lote
        const agrp = (data || []).reduce((acc, curr) => {
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
                prefijo: selectedItem.prefijo,
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
        if (!signature) return setNotification({ type: 'error', text: 'Por favor, firma el documento antes de enviar' });
        
        setLoading(true);

        try {
            const folio = `VALE-${Date.now().toString().slice(-6)}`;
            const { data: vale, error: valeErr } = await supabase
                .from('solicitudes_vale')
                .insert([{
                    folio: folio,
                    solicitante_id: user.id,
                    area_destino: user.area || user.branch || 'Sucursal Solcan',
                    prioridad,
                    observaciones: observacionesGral,
                    firma_solicitante: signature,
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

            setGeneratedFolio(folio);
            setShowSuccessModal(true);
            setNotification({ type: 'success', text: `¡Pedido ${folio} enviado con éxito!` });
            
            // Descarga automática del PDF
            setTimeout(() => {
                downloadPDF(folio);
                setTimeout(() => {
                    setCarrito([]);
                    setSignature(null);
                    setObservacionesGral('');
                    setGeneratedFolio(null);
                }, 1000);
            }, 600);

        } catch (err) {
            setNotification({ type: 'error', text: 'Error: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredCatalogo = catalogo.filter(c => {
        const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.marca?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (selectedArea === 'TODOS') return matchesSearch;
        
        const itemArea = (c.area_tecnica || 'GENERAL').toUpperCase();
        const filterArea = selectedArea.toUpperCase();
        
        // Manejo de acentos simplificado para comparación
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        if (filterArea === 'GENERAL') return matchesSearch && (!c.area_tecnica || normalize(itemArea) === 'GENERAL');
        
        return matchesSearch && normalize(itemArea) === normalize(filterArea);
    }).slice(0, 15);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">shopping_cart</span> Solicitud de Material</h1>
                    <p>Pedido Interno para Resurtido de Almacén (FO-RM-004)</p>
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

            <div className={styles.mainGrid}>
                {/* Panel de Selección Izquierdo */}
                <aside className={styles.selectionPanel}>
                    <div className={styles.searchCard}>
                        <h3><span className="material-symbols-rounded">manage_search</span> Buscar en Catálogo</h3>
                        
                        <div className={styles.autocompleteWrapper}>
                            {/* Selector de Área (Dropdown Compacto) */}
                            <div className={styles.areaSelectorWrapper}>
                                <span className="material-symbols-rounded">filter_alt</span>
                                <select 
                                    className={styles.areaSelector}
                                    value={selectedArea}
                                    onChange={(e) => {
                                        setSelectedArea(e.target.value);
                                        setSearchTerm('');
                                    }}
                                >
                                    {areas.map(area => (
                                        <option key={area} value={area}>{area}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.searchInputWrapper}>
                                <span className="material-symbols-rounded">search</span>
                                <input 
                                    type="text" 
                                    placeholder={selectedArea === 'TODOS' ? "Ej: Gasas, Tubos..." : `Buscar en ${selectedArea}...`}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                />
                            </div>

                            {/* Lista Desplegable de Resultados (Estilo Autocomplete) */}
                            {showDropdown && searchTerm.length > 0 && (
                                <div className={styles.resultsDrop}>
                                    {filteredCatalogo.length === 0 ? (
                                        <div className={styles.noResults}>No se encontraron coincidencias</div>
                                    ) : (
                                        filteredCatalogo.map(item => (
                                            <div 
                                                key={item.id} 
                                                className={styles.resultItem}
                                                onClick={() => {
                                                    handleSelectMaterial(item);
                                                    setShowDropdown(false);
                                                    setSearchTerm('');
                                                }}
                                            >
                                                <span className={styles.resPrefix}>{item.prefijo}</span>
                                                <span className={styles.resName}>{item.nombre}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Detalle del Material Seleccionado */}
                        {selectedItem ? (
                            <div className={styles.itemDetailArea}>
                                <div className={styles.detailHeader}>
                                    <div className={styles.detailTitle}>
                                        <span className={styles.detailCode}>{selectedItem.prefijo}</span>
                                        <h2>{selectedItem.nombre}</h2>
                                    </div>
                                    <button className={styles.closeDetail} onClick={() => setSelectedItem(null)}>
                                        <span className="material-symbols-rounded">close</span>
                                    </button>
                                </div>
                                
                                <div className={styles.detailMeta}>
                                    <span><strong>Marca:</strong> {selectedItem.marca || '---'}</span>
                                    <span><strong>Unidad:</strong> {selectedItem.unidad || '---'}</span>
                                    <span><strong>Área:</strong> {selectedItem.area_tecnica || 'GENERAL'}</span>
                                </div>

                                <div className={styles.lotesSection}>
                                    <h3>Lotes y Existencias en Almacén</h3>
                                    {lotesDisponibles.length === 0 ? (
                                        <div className={styles.noLotesAlert}>
                                            <span className="material-symbols-rounded">warning</span>
                                            <p>No hay existencias con lote. ¿Desea solicitar de todos modos?</p>
                                            <button className={styles.forceAddDetail} onClick={() => agregarAlCarrito({lote: 'SIN LOTE', stock: 0})}>
                                                Solicitar sin Lote (Pendiente)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.loteGrid}>
                                            {lotesDisponibles.map(l => (
                                                <div key={l.lote} className={styles.loteCard} onClick={() => agregarAlCarrito(l)}>
                                                    <div className={styles.loteMain}>
                                                        <strong>LOTE: {l.lote}</strong>
                                                        <span>Caducidad: {l.caducidad ? new Date(l.caducidad).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                    <div className={styles.loteStock}>
                                                        {l.stock} <small>Pzs</small>
                                                    </div>
                                                    <span className="material-symbols-rounded">add_circle</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.emptyPrompt}>
                                <span className="material-symbols-rounded">manage_search</span>
                                <p>Busque un reactivo por código o nombre para comenzar la solicitud.</p>
                            </div>
                        )}
                    </div>

                    <div className={styles.actionsCard}>
                        <div className={styles.field}>
                            <label style={{fontSize: '0.8rem', fontWeight: 800, color: 'var(--co-primary)', marginBottom: '5px', display: 'block'}}>Prioridad del Pedido</label>
                            <select value={prioridad} onChange={e => setPrioridad(e.target.value)}>
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Urgente">Urgente</option>
                            </select>
                        </div>
                        <textarea 
                            placeholder="Observaciones generales para Almacén..."
                            value={observacionesGral}
                            onChange={e => setObservacionesGral(e.target.value)}
                            rows={2}
                        />
                        
                        <div className={styles.signatureSection}>
                            <SignaturePad 
                                onSave={(data) => setSignature(data)}
                                onClear={() => setSignature(null)}
                            />
                        </div>

                        <button 
                            className={styles.checkoutBtn} 
                            onClick={handleEnviarVale} 
                            disabled={loading || carrito.length === 0}
                        >
                            <span className="material-symbols-rounded">send</span> 
                            {loading ? 'Enviando...' : 'Confirmar y Enviar Vale'}
                        </button>
                    </div>
                </aside>

                {/* Vista Previa Documento Derecho */}
                <main className={styles.previewPanel}>
                    <div className={styles.documentWrapper}>
                        <header className={styles.docHeader}>
                            <span>VISTA PREVIA DEL VALE (FO-RM-004)</span>
                            {carrito.length > 0 && (
                                <button className={styles.clearBtn} onClick={() => { setCarrito([]); setSignature(null); }}>
                                    Limpiar Pedido
                                </button>
                            )}
                        </header>
                        <div className={styles.docContent} ref={printAreaRef}>
                            <ValeAlmacen 
                                vale={{ 
                                    area_destino: user.area || user.branch || 'Sucursal Solcan', 
                                    observaciones: observacionesGral,
                                    prioridad,
                                    firma_solicitante: signature
                                }}
                                items={carrito}
                                solicitante={user}
                                sucursalStock={sucursalStock}
                            />
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal Selección Lote */}
            {/* Modal de Lote Eliminado ya que ahora se muestra en el panel lateral */}
            {/* Modal de Éxito Premium */}
            {showSuccessModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.successModal}>
                        <div className={styles.successIcon}>
                            <span className="material-symbols-rounded">check_circle</span>
                        </div>
                        <h2>¡Solicitud Generada!</h2>
                        <p>El vale <strong>{generatedFolio}</strong> ha sido registrado y enviado al Almacén Central correctamente.</p>
                        
                        <div className={styles.modalActions}>
                            <button className={styles.secondaryBtn} onClick={() => navigate('/')}>
                                <span className="material-symbols-rounded">home</span> Regresar al Menú
                            </button>
                            <button className={styles.primaryBtn} onClick={resetForm}>
                                <span className="material-symbols-rounded">add_circle</span> Nueva Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
