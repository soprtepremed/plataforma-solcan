import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./InventarioHemato.module.css";

const SUCURSALES = [
  "Matriz", "CRAE", "Tapachula", "San Cristobal", "Comitan", "Arriaga", "Pijijiapan", "Palenque"
];

// Optimized Inventory Card for Mobile
const InventoryCard = ({ item, onEdit, onQuickStart, onQuickEnd }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div 
            className={`${styles.inventoryCard} ${isExpanded ? styles.isExpanded : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                    <div className={styles.cardID}>{item.solicitud_id || 'SIN ID'}</div>
                    <h3>{item.descripcion}</h3>
                    <div className={styles.cardSubDetails}>
                        <span className={styles.badgeCode}>{item.codigo}</span>
                        <span className={styles.badgeLote}>Lote: {item.lote || 'N/A'}</span>
                    </div>
                </div>
                <div className={styles.cardStock}>
                    <span className={`${styles.stockCircle} ${item.stock_actual < 5 ? styles.stockCritical : styles.stockOk}`}>
                        {item.stock_actual}
                    </span>
                    <label>STOCK</label>
                </div>
            </div>

            <div className={styles.cardQuickInfo}>
                <div className={styles.quickItem}>
                    <label>Caducidad</label>
                    <span style={{ color: new Date(item.caducidad) < new Date() ? '#EF4444' : 'inherit', fontWeight: 700 }}>
                        {item.caducidad ? new Date(item.caducidad).toLocaleDateString() : '---'}
                    </span>
                </div>
                <div className={styles.quickItem}>
                    <label>Cód. Calidad</label>
                    <span className={item.aceptado ? styles.textSuccess : styles.textDanger}>
                        {item.aceptado ? 'ACEPTADO' : 'RECHAZADO'}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.cardExpandedContent}>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailRow}>
                            <label>Inicio Uso:</label>
                            <span>{item.fecha_inicio_uso ? new Date(item.fecha_inicio_uso).toLocaleDateString() : 'PENDIENTE'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <label>Término Uso:</label>
                            <span>{item.fecha_termino_uso ? new Date(item.fecha_termino_uso).toLocaleDateString() : '---'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <label>Temperatura:</label>
                            <span>{item.temp_almacenamiento}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <label>Apariencia:</label>
                            <span>{item.apariencia_fisica === 'SI' ? 'Apariencia OK' : 'Falla Apariencia'}</span>
                        </div>
                        {item.nuevo_lote && (
                            <div className={styles.newLotBadge}>NUEVO LOTE DETECTADO</div>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <div className={styles.mainActions}>
                    {!item.fecha_inicio_uso && (
                        <button onClick={() => onQuickStart(item.id)} className={styles.mobileActionBtn} style={{background: '#0EA5E9'}}>
                            <span className="material-symbols-rounded">play_arrow</span> Iniciar
                        </button>
                    )}
                    {item.fecha_inicio_uso && !item.fecha_termino_uso && (
                        <button onClick={() => onQuickEnd(item.id)} className={styles.mobileActionBtn} style={{background: '#EF4444'}}>
                            <span className="material-symbols-rounded">stop</span> Terminar
                        </button>
                    )}
                </div>
                <button onClick={() => onEdit(item)} className={styles.mobileEditBtn}>
                    <span className="material-symbols-rounded">edit</span>
                </button>
            </div>
            
            <div className={styles.expandTip}>
                <span className="material-symbols-rounded">{isExpanded ? 'expand_less' : 'expand_more'}</span>
            </div>
        </div>
    );
};

export default function InventarioHemato() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubArea, setFilterSubArea] = useState("TODAS");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [editingId, setEditingId] = useState(null);
  const [currentBranch, setCurrentBranch] = useState("TODAS");
  const [catalogo, setCatalogo] = useState([]); 
  const [loteStatus, setLoteStatus] = useState(null); 
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: "", onConfirm: null });
  
  const initialForm = {
    codigo: "",
    descripcion: "",
    sucursal: "Matriz",
    lote: "",
    caducidad: "",
    stock_actual: 0,
    apariencia_fisica: "SI",
    temp_almacenamiento: "T/A",
    analisis_desempeno: "ST/SUERO",
    observaciones: "N/A",
    solicitud_id: "",
    fecha_solicitud_almacen: new Date().toISOString().substring(0, 16),
    fecha_inicio_uso: "",
    fecha_termino_uso: "",
    nuevo_lote: false,
    condiciones_fabricante: true,
    aceptado: true,
    sub_area: "HEMATOLOGÍA"
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchInventory();
    fetchCatalogo();
  }, [currentBranch]);

  // Lógica de Autollenado por Código
  useEffect(() => {
    if (!form.codigo) {
      setForm(prev => ({ ...prev, descripcion: "" }));
      return;
    }
    const itemEncontrado = catalogo.find(c => 
      c.prefijo?.toUpperCase() === form.codigo.toUpperCase()
    );
    if (itemEncontrado && form.descripcion !== itemEncontrado.nombre) {
      setForm(prev => ({ ...prev, descripcion: itemEncontrado.nombre }));
    }
  }, [form.codigo, catalogo]);

  // Lógica de Validación de Lote
  useEffect(() => {
    const checkLote = async () => {
      if (!form.lote || form.lote.length < 3 || !form.codigo) {
        setLoteStatus(null);
        return;
      }
      
      const { data } = await supabase
        .from('hematologia_inventario')
        .select('id')
        .eq('codigo', form.codigo)
        .eq('lote', form.lote)
        .limit(1);
      
      if (data && data.length > 0) {
        setLoteStatus('existing');
        setForm(prev => ({...prev, nuevo_lote: false}));
      } else {
        setLoteStatus('new');
        setForm(prev => ({...prev, nuevo_lote: true}));
      }
    };
    checkLote();
  }, [form.lote, form.codigo]);

  // Lógica de Autollenado por ID#
  useEffect(() => {
    const lookupID = async () => {
      if (!form.solicitud_id) {
        setForm(prev => ({ ...prev, descripcion: "" }));
        return;
      }
      if (form.solicitud_id.length > 8) {
        const { data } = await supabase
          .from('materiales_unidades')
          .select('*, materiales_catalogo(nombre, prefijo)')
          .eq('codigo_barras_unico', form.solicitud_id)
          .single();
        
        if (data && data.materiales_catalogo) {
          setForm(prev => ({
            ...prev,
            descripcion: data.materiales_catalogo.nombre // Solo jala la descripción
          }));
        }
      }
    };
    lookupID();
  }, [form.solicitud_id]);

  const handleManualSearch = () => {
    if (!form.codigo) return;
    const item = catalogo.find(c => c.prefijo?.toUpperCase() === form.codigo.toUpperCase());
    if (item) {
      setForm(prev => ({ ...prev, descripcion: item.nombre }));
    } else {
      alert("No se encontró ningún producto con ese código en el catálogo.");
    }
  };

  const fetchCatalogo = async () => {
    const { data } = await supabase.from('materiales_catalogo').select('nombre, prefijo');
    if (data) setCatalogo(data);
  };

  const fetchInventory = async () => {
    setLoading(true);
    let query = supabase
      .from("inventario_areas")
      .select("*")
      .eq("area_id", "hematologia")
      .order("descripcion", { ascending: true });

    if (currentBranch && currentBranch !== "TODAS") {
      query = query.eq("sucursal", currentBranch);
    }
    
    const { data, error } = await query;
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const handleEdit = (item) => {
    setForm({
      ...item,
      fecha_solicitud_almacen: item.fecha_solicitud_almacen ? item.fecha_solicitud_almacen.substring(0, 16) : "",
    });
    setEditingId(item.id);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleQuickStart = async (id) => {
    setConfirmDialog({
      show: true,
      message: "¿Deseas marcar el INICIO de uso de este reactivo para el día de hoy?",
      onConfirm: async () => {
        const now = new Date().toISOString(); // Timestamp completo para mayor precisión
        const { error } = await supabase
          .from("inventario_areas")
          .update({ fecha_inicio_uso: now })
          .eq("id", id);
        if (!error) fetchInventory();
        setConfirmDialog({ show: false });
      }
    });
  };

  const handleQuickEnd = async (id) => {
    setConfirmDialog({
      show: true,
      message: "¿Seguro que deseas TERMINAR el uso de este reactivo? El stock se pondrá en cero automáticamente.",
      onConfirm: async () => {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("inventario_areas")
          .update({ 
            fecha_termino_uso: now, 
            stock_actual: 0 
          })
          .eq("id", id);
        if (!error) fetchInventory();
        setConfirmDialog({ show: false });
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    
    setConfirmDialog({
      show: true,
      message: "¿Confirmas que la información ingresada es correcta para el registro técnico?",
      onConfirm: async () => {
        setSaving(true);
        try {
          const { id, ...payload } = form; // Quitar el ID del cuerpo para evitar errores
          
          // Lógica de recuperación de stock:
          // Si borramos la fecha de término y el stock estaba en 0, le devolvemos 1 unidad
          let finalStock = payload.stock_actual;
          if (!payload.fecha_termino_uso && payload.stock_actual === 0) {
            finalStock = 1;
            console.log("Restaurando stock por eliminación de fecha de término");
          }

          const cleanPayload = {
            ...payload,
            stock_actual: finalStock,
            area_id: 'hematologia', // Forzar el ID de área correcto
            fecha_inicio_uso: payload.fecha_inicio_uso || null,
            fecha_termino_uso: payload.fecha_termino_uso || null,
            fecha_solicitud_almacen: payload.fecha_solicitud_almacen || null,
            caducidad: payload.caducidad || null
          };

          const response = modalMode === 'edit' 
            ? await supabase.from("inventario_areas").update(cleanPayload).eq("id", editingId)
            : await supabase.from("inventario_areas").insert([cleanPayload]);

          if (!response.error) {
            setForm(initialForm); 
            setShowModal(false);
            setModalMode('add');
            setEditingId(null);
            await fetchInventory();
          } else {
            alert("Error al guardar: " + response.error.message);
          }
        } catch (err) {
          alert("Error crítico: " + err.message);
        } finally {
          setSaving(false);
          setConfirmDialog({ show: false });
        }
      }
    });
  };

  const filteredItems = items.filter(i => {
    const desc = (i.descripcion || "").toLowerCase();
    const cod = (i.codigo || "").toLowerCase();
    const search = (searchTerm || "").toLowerCase();
    return (desc.includes(search) || cod.includes(search)) &&
           (filterSubArea === "TODAS" || i.sub_area === filterSubArea);
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span className="material-symbols-rounded" style={{color: '#DC2626', fontSize: '2.5rem'}}>bloodtype</span>
          Inventario y Control de Hematología
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          <span className="material-symbols-rounded">add_box</span> Registrar Reactivo
        </button>
      </header>

      {/* Tarjetas de Resumen */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.badgeSuccess}`} style={{background: '#DCFCE7'}}>
            <span className="material-symbols-rounded">inventory</span>
          </div>
          <div>
            <p style={{fontSize: '0.8rem', color: '#64748B'}}>Ítems en Stock</p>
            <h3 style={{fontSize: '1.5rem', fontWeight: 800}}>{items.length}</h3>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.badgeDanger}`} style={{background: '#FEE2E2'}}>
            <span className="material-symbols-rounded">error</span>
          </div>
          <div>
            <p style={{fontSize: '0.8rem', color: '#64748B'}}>Por Caducar</p>
            <h3 style={{fontSize: '1.5rem', fontWeight: 800}}>0</h3>
          </div>
        </div>
      </div>

      <div className={styles.tabContainer}>
        <button className={filterSubArea === 'TODAS' ? styles.tabActive : styles.tab} onClick={() => setFilterSubArea('TODAS')}>TODAS LAS SUB-ÁREAS</button>
        <button className={filterSubArea === 'HEMATOLOGÍA GENERAL' ? styles.tabActive : styles.tab} onClick={() => setFilterSubArea('HEMATOLOGÍA GENERAL')}>HEMATOLOGÍA GENERAL</button>
        <button className={filterSubArea === 'INMUNOLOGÍA HEMATOLÓGICA' ? styles.tabActive : styles.tab} onClick={() => setFilterSubArea('INMUNOLOGÍA HEMATOLÓGICA')}>INMUNOLOGÍA HEMATOLÓGICA</button>
      </div>

      <div className={styles.inventoryTable}>
        <div className={styles.tableHeader}>
          <div className={styles.searchBox}>
            <span className="material-symbols-rounded">search</span>
            <input 
              placeholder="Buscar por código o descripción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>


        <div className={styles.tableContainer}>
          <div className={styles.desktopView}>
            <table>
              <thead>
                <tr>
                  <th>ID# / Solicitud</th>
                  <th>Descripción / Nombre</th>
                  <th>Código</th>
                  <th>Lote</th>
                  <th>Caducidad</th>
                  <th>Inicio de Uso</th>
                  <th>Término</th>
                  <th>Stock</th>
                  <th>Calidad / QC</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{textAlign:'center', padding:'3rem'}}>Cargando inventario...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan="10" style={{textAlign:'center', padding:'3rem'}}>No se encontraron reactivos.</td></tr>
                ) : filteredItems.map(item => (
                  <tr key={item.id}>
                    <td style={{fontSize: '0.8rem', fontWeight: 700}}>
                      <div style={{color: '#64748B'}}>{item.solicitud_id || '---'}</div>
                      <div style={{fontSize: '0.7rem', opacity: 0.6}}>Solicitud: {item.fecha_solicitud_almacen ? new Date(item.fecha_solicitud_almacen).toLocaleDateString() : 'N/A'}</div>
                    </td>
                    <td style={{fontWeight: 700}}>{item.descripcion}</td>
                    <td><span className={styles.badge} style={{background: '#F1F5F9', color: '#475569'}}>{item.codigo}</span></td>
                    <td style={{fontFamily: 'monospace'}}>{item.lote || 'N/A'}</td>
                    <td style={{color: new Date(item.caducidad) < new Date() ? 'red' : 'inherit', fontWeight: 600}}>
                      {item.caducidad ? new Date(item.caducidad).toLocaleDateString() : '---'}
                    </td>
                    <td style={{fontSize: '0.85rem'}}>{item.fecha_inicio_uso ? new Date(item.fecha_inicio_uso).toLocaleDateString() : 'PENDIENTE'}</td>
                    <td style={{fontSize: '0.85rem'}}>{item.fecha_termino_uso ? new Date(item.fecha_termino_uso).toLocaleDateString() : '---'}</td>
                    <td>
                      <span className={`${styles.badge} ${item.stock_actual < 5 ? styles.badgeDanger : styles.badgeSuccess}`} style={{fontSize: '1rem'}}>
                        {item.stock_actual}
                      </span>
                    </td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px'}}>
                        <span className={item.aceptado ? styles.badgeSuccess : styles.badgeDanger} style={{fontSize: '0.7rem', textAlign:'center'}}>
                          {item.aceptado ? 'ACEPTADO' : 'RECHAZADO'}
                        </span>
                        <span style={{fontSize: '0.7rem', opacity: 0.7}}>🌡️ {item.temp_almacenamiento}</span>
                        <span style={{fontSize: '0.7rem', opacity: 0.7}}>📦 {item.apariencia_fisica === 'SI' ? 'Apariencia OK' : 'Falla Apariencia'}</span>
                        {item.nuevo_lote && <span style={{fontSize: '0.7rem', background:'#FEF3C7', color:'#92400E', padding:'1px 4px', borderRadius:'4px', textAlign:'center', fontWeight:700}}>NUEVO LOTE</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '5px'}}>
                        {!item.fecha_inicio_uso && (
                          <button title="Iniciar Uso" onClick={() => handleQuickStart(item.id)} className={styles.btnAction} style={{background: '#0EA5E9', color:'white'}}>
                            <span className="material-symbols-rounded" style={{fontSize: '1.2rem'}}>play_arrow</span>
                          </button>
                        )}
                        {item.fecha_inicio_uso && !item.fecha_termino_uso && (
                          <button title="Terminar Uso" onClick={() => handleQuickEnd(item.id)} className={styles.btnAction} style={{background: '#EF4444', color:'white'}}>
                            <span className="material-symbols-rounded" style={{fontSize: '1.2rem'}}>stop</span>
                          </button>
                        )}
                        <button title="Editar / Completar" onClick={() => handleEdit(item)} className={styles.btnAction} style={{background: '#F1F5F9', color:'#475569'}}>
                          <span className="material-symbols-rounded" style={{fontSize: '1.2rem'}}>edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileView}>
            {loading ? (
                <div style={{padding: '3rem', textAlign: 'center'}}>Cargando inventario...</div>
            ) : filteredItems.length === 0 ? (
                <div style={{padding: '3rem', textAlign: 'center'}}>No se encontraron reactivos.</div>
            ) : (
                <div className={styles.cardsGridMobile}>
                    {filteredItems.map(item => (
                        <InventoryCard 
                            key={item.id} 
                            item={item} 
                            onEdit={handleEdit} 
                            onQuickStart={handleQuickStart} 
                            onQuickEnd={handleQuickEnd} 
                        />
                    ))}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE REGISTRO CON CHECKLIST DE CALIDAD COMPLETO */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <button className={styles.closeBtnOverlay} onClick={() => setShowModal(false)} type="button">
            <span className="material-symbols-rounded">close</span>
          </button>
          <div className={styles.modal}>
            <h2 style={{marginBottom: '1.5rem', display:'flex', alignItems:'center', gap:'10px', paddingRight: '40px'}}>
              <span className="material-symbols-rounded" style={{color:'#DC2626'}}>add_circle</span> 
              Entrada Técnica de Reactivo (Auditado)
            </h2>
            
            <form onSubmit={handleSave}>
              {/* BLOQUE DE IDENTIFICACIÓN */}
              <div className={styles.qcTitle} style={{marginTop: '0'}}>
                <span className="material-symbols-rounded" style={{color: '#64748B'}}>inventory_2</span>
                DATOS DE IDENTIFICACIÓN DEL MATERIAL
              </div>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>ID# (Identificador)</label>
                  <input value={form.solicitud_id} onChange={e => setForm({...form, solicitud_id: e.target.value})} placeholder="Ej. ID#AAAB..." />
                </div>
                <div className={styles.inputGroup}>
                  <label>Código del Producto</label>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <input required value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})} placeholder="P. ej. BS01" style={{flex: 1}} />
                    <button type="button" onClick={handleManualSearch} className={styles.searchBtnInside} title="Buscar en Catálogo">
                      <span className="material-symbols-rounded">search</span>
                    </button>
                  </div>
                </div>
                <div className={`${styles.inputGroup} ${styles.spanFull}`}>
                  <label>SUB-ÁREA DE TRABAJO</label>
                  <select value={form.sub_area} onChange={e => setForm({...form, sub_area: e.target.value})} style={{fontWeight: 700}}>
                    <option value="HEMATOLOGÍA">HEMATOLOGÍA GENERAL</option>
                    <option value="INMUNOLOGÍA">INMUNOLOGÍA HEMATOLÓGICA</option>
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Descripción / Nombre del Reactivo</label>
                  <input required value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Nombre técnico completo..." />
                </div>
                <div className={styles.inputGroup}>
                  <label>Número de Lote</label>
                  <input required value={form.lote} onChange={e => setForm({...form, lote: e.target.value})} placeholder="Ej. LOT12345" />
                  {loteStatus === 'new' && (
                    <div style={{fontSize: '0.75rem', fontWeight: 800, color: '#0369A1', marginTop: '4px', display:'flex', alignItems:'center', gap:'4px', background:'#E0F2FE', padding:'4px 8px', borderRadius:'6px'}}>
                      <span className="material-symbols-rounded" style={{fontSize:'1rem'}}>new_releases</span> ✨ ¡NUEVO LOTE DETECTADO! 
                    </div>
                  )}
                  {loteStatus === 'existing' && (
                    <div style={{fontSize: '0.75rem', fontWeight: 800, color: '#15803D', marginTop: '4px', display:'flex', alignItems:'center', gap:'4px', background:'#DCFCE7', padding:'4px 8px', borderRadius:'6px'}}>
                      <span className="material-symbols-rounded" style={{fontSize:'1rem'}}>history</span> ✅ LOTE CON IDENTIFICADO (Historial Existente)
                    </div>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <label>FECHA DE SOLICITUD A ALMACÉN</label>
                  <input type="datetime-local" value={form.fecha_solicitud_almacen} onChange={e => setForm({...form, fecha_solicitud_almacen: e.target.value})} />
                </div>
              </div>

              <div className={styles.formGrid} style={{marginTop: '1rem'}}>
                <div className={styles.inputGroup}>
                  <label>FECHA DE INICIO</label>
                  <input type="date" value={form.fecha_inicio_uso} onChange={e => setForm({...form, fecha_inicio_uso: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>FECHA DE TÉRMINO</label>
                  <input type="date" value={form.fecha_termino_uso} onChange={e => setForm({...form, fecha_termino_uso: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>CANTIDAD QUE INGRESA</label>
                  <input type="number" required value={form.stock_actual} onChange={e => setForm({...form, stock_actual: parseInt(e.target.value)})} />
                </div>
              </div>

              {/* SECCIÓN 1: ACEPTACIÓN DE PRODUCTO */}
              <div className={styles.qcSection} style={{marginTop: '1.5rem'}}>
                <div className={styles.qcTitle}>
                  <span className="material-symbols-rounded" style={{color: '#0EA5E9'}}>fact_check</span>
                  CRITERIOS DE ACEPTACIÓN DE PRODUCTO
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>FECHA DE CADUCIDAD</label>
                    <input type="date" required value={form.caducidad} onChange={e => setForm({...form, caducidad: e.target.value})} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>TEMPERATURA DE ALMACENAMIENTO</label>
                    <input value={form.temp_almacenamiento} onChange={e => setForm({...form, temp_almacenamiento: e.target.value})} placeholder="Ej. 2-8°C o T/A" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>¿CUMPLE CON LA APARIENCIA FÍSICA?</label>
                    <select value={form.apariencia_fisica} onChange={e => setForm({...form, apariencia_fisica: e.target.value})}>
                      <option value="SI">SÍ</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>¿SE ACEPTA EL PRODUCTO?</label>
                    <select value={form.aceptado} onChange={e => setForm({...form, aceptado: e.target.value === 'true'})} style={{fontWeight: 700, color: form.aceptado ? '#10B981' : '#EF4444'}}>
                      <option value="true">SÍ (ACEPTADO)</option>
                      <option value="false">NO (RECHAZADO)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DESEMPEÑO ANALÍTICO */}
              <div className={styles.qcSection} style={{marginTop: '1.5rem'}}>
                <div className={styles.qcTitle}>
                  <span className="material-symbols-rounded" style={{color: '#F59E0B'}}>analytics</span>
                  CRITERIOS DE ACEPTACIÓN PARA EL DESEMPEÑO ANALÍTICO
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>¿ES NUEVO LOTE?</label>
                    <select value={form.nuevo_lote} onChange={e => setForm({...form, nuevo_lote: e.target.value === 'true'})}>
                      <option value="false">NO / N/A</option>
                      <option value="true">SÍ</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>TIPO DE MUESTRA PARA EVALUAR</label>
                    <input value={form.analisis_desempeno} onChange={e => setForm({...form, analisis_desempeno: e.target.value})} placeholder="Ej. ST / SUERO" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>¿CUMPLE CONDICIONES DEL FABRICANTE?</label>
                    <select value={form.condiciones_fabricante} onChange={e => setForm({...form, condiciones_fabricante: e.target.value === 'true'})}>
                      <option value="true">SÍ (CUMPLE)</option>
                      <option value="false">NO CUMPLE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.inputGroup} style={{marginTop: '1.5rem'}}>
                <label>OBSERVACIONES</label>
                <textarea 
                  value={form.observaciones} 
                  onChange={e => setForm({...form, observaciones: e.target.value})}
                  style={{width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #E2E8F0', minHeight: '80px'}}
                />
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '2.5rem'}}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} style={{padding: '0.8rem 2.5rem'}} disabled={saving}>
                  {saving ? 'Guardando...' : (modalMode === 'add' ? 'Confirmar Recepción Técnica' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMACIÓN PERSONALIZADO */}
      {confirmDialog.show && (
        <div className={styles.modalOverlay} style={{zIndex: 2000}}>
          <div className={styles.confirmBox}>
            <span className="material-symbols-rounded" style={{fontSize: '3rem', color: '#DC2626'}}>help</span>
            <h3>Confirmar Acción</h3>
            <p>{confirmDialog.message}</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmDialog({show: false})}>Cancelar</button>
              <button className={styles.btnConfirm} onClick={confirmDialog.onConfirm}>Aceptar y Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
