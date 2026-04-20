import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './InventarioHemato.module.css'; 

const SUCURSALES = ["Matriz", "CRAE", "Tapachula", "San Cristobal", "Comitan", "Arriaga", "Pijijiapan", "Palenque"];

const AREA_ICONS = {
  'hematologia': 'bloodtype',
  'microbiologia': 'biotech',
  'urianalisis': 'science',
  'quimica-clinica': 'science',
  'serologia': 'bloodtype'
};

const AREA_NAMES = {
  'hematologia': 'Hematología',
  'microbiologia': 'Microbiología',
  'urianalisis': 'Urianálisis',
  'quimica-clinica': 'Química Clínica',
  'serologia': 'Serología'
};

const InventoryCard = ({ item, onEdit, onQuickStart, onQuickEnd }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className={`${styles.inventoryCard} ${isExpanded ? styles.isExpanded : ''}`} onClick={() => setIsExpanded(!isExpanded)}>
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
                    <span className={`${styles.stockCircle} ${item.stock_actual < 5 ? styles.stockCritical : styles.stockOk}`}>{item.stock_actual}</span>
                    <label>STOCK</label>
                </div>
            </div>
            <div className={styles.cardQuickInfo}>
                <div className={styles.quickItem}><label>Caducidad</label><span style={{ color: new Date(item.caducidad) < new Date() ? '#EF4444' : 'inherit', fontWeight: 700 }}>{item.caducidad ? new Date(item.caducidad).toLocaleDateString() : '---'}</span></div>
                <div className={styles.quickItem}><label>Cód. Calidad</label><span className={item.aceptado ? styles.textSuccess : styles.textDanger}>{item.aceptado ? 'ACEPTADO' : 'RECHAZADO'}</span></div>
            </div>
            {isExpanded && (
                <div className={styles.cardExpandedContent}>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailRow}><label>Inicio Uso:</label><span>{item.fecha_inicio_uso ? new Date(item.fecha_inicio_uso).toLocaleDateString() : 'PENDIENTE'}</span></div>
                        <div className={styles.detailRow}><label>Término Uso:</label><span>{item.fecha_termino_uso ? new Date(item.fecha_termino_uso).toLocaleDateString() : '---'}</span></div>
                        <div className={styles.detailRow}><label>Temperatura:</label><span>{item.temp_almacenamiento}</span></div>
                    </div>
                </div>
            )}
            <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <div className={styles.mainActions}>
                    {!item.fecha_inicio_uso && <button onClick={() => onQuickStart(item.id)} className={styles.mobileActionBtn} style={{background: '#0EA5E9'}}><span className="material-symbols-rounded">play_arrow</span> Iniciar</button>}
                    {item.fecha_inicio_uso && !item.fecha_termino_uso && <button onClick={() => onQuickEnd(item.id)} className={styles.mobileActionBtn} style={{background: '#EF4444'}}><span className="material-symbols-rounded">stop</span> Terminar</button>}
                </div>
                <button onClick={() => onEdit(item)} className={styles.mobileEditBtn}><span className="material-symbols-rounded">edit</span></button>
            </div>
            <div className={styles.expandTip}><span className="material-symbols-rounded">{isExpanded ? 'expand_less' : 'expand_more'}</span></div>
        </div>
    );
};

export default function InventarioArea() {
  const { areaId } = useParams();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [editingId, setEditingId] = useState(null);
  const [catalogo, setCatalogo] = useState([]); 
  const [loteStatus, setLoteStatus] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: "", onConfirm: null });

  const areaKey = areaId?.toLowerCase() || 'area';
  const displayTitle = AREA_NAMES[areaKey] || areaKey.toUpperCase();
  const displayIcon = AREA_ICONS[areaKey] || 'inventory_2';

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
    sub_area: displayTitle.toUpperCase() // Usamos el nombre del área como sub-área por defecto
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchInventory(); fetchCatalogo();
  }, [areaId]);

  useEffect(() => {
    if (!form.codigo) { setForm(p => ({ ...p, descripcion: "" })); return; }
    const match = catalogo.find(c => c.prefijo?.toUpperCase() === form.codigo.toUpperCase());
    if (match && form.descripcion !== match.nombre) setForm(p => ({ ...p, descripcion: match.nombre }));
  }, [form.codigo, catalogo]);

  useEffect(() => {
    const checkLote = async () => {
      if (!form.lote || form.lote.length < 3 || !form.codigo) { setLoteStatus(null); return; }
      const { data } = await supabase.from('inventario_areas').select('id').eq('codigo', form.codigo).eq('lote', form.lote).eq('area_id', areaKey).limit(1);
      if (data && data.length > 0) { setLoteStatus('existing'); setForm(p => ({...p, nuevo_lote: false})); }
      else { setLoteStatus('new'); setForm(p => ({...p, nuevo_lote: true})); }
    };
    checkLote();
  }, [form.lote, form.codigo, areaKey]);

  const handleManualSearch = () => {
    if (!form.codigo) return;
    const item = catalogo.find(c => c.prefijo?.toUpperCase() === form.codigo.toUpperCase());
    if (item) setForm(prev => ({ ...prev, descripcion: item.nombre }));
  };

  const fetchCatalogo = async () => {
    const { data } = await supabase.from('materiales_catalogo').select('nombre, prefijo');
    if (data) setCatalogo(data);
  };

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("inventario_areas").select("*").eq("area_id", areaKey).order("descripcion", { ascending: true });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const handleEdit = (item) => {
    setForm({ ...item, fecha_solicitud_almacen: item.fecha_solicitud_almacen ? item.fecha_solicitud_almacen.substring(0, 16) : "" });
    setEditingId(item.id); setModalMode('edit'); setShowModal(true);
  };

  const handleQuickStart = async (id) => {
    setConfirmDialog({ show: true, message: "¿Deseas marcar el INICIO para hoy?", onConfirm: async () => {
      await supabase.from("inventario_areas").update({ fecha_inicio_uso: new Date().toISOString() }).eq("id", id);
      fetchInventory(); setConfirmDialog({ show: false });
    }});
  };

  const handleQuickEnd = async (id) => {
    setConfirmDialog({ show: true, message: "¿Seguro que deseas TERMINAR uso? Stock será cero.", onConfirm: async () => {
      await supabase.from("inventario_areas").update({ fecha_termino_uso: new Date().toISOString(), stock_actual: 0 }).eq("id", id);
      fetchInventory(); setConfirmDialog({ show: false });
    }});
  };

  const handleSave = async (e) => {
    e.preventDefault(); if (saving) return;
    setConfirmDialog({ show: true, message: "¿Confirmas el registro técnico auditado?", onConfirm: async () => {
        setSaving(true);
        const { id, ...payload } = form;
        const cleanPayload = { ...payload, area_id: areaKey, stock_actual: payload.stock_actual || 0 };
        const response = modalMode === 'edit' ? await supabase.from("inventario_areas").update(cleanPayload).eq("id", editingId) : await supabase.from("inventario_areas").insert([cleanPayload]);
        if (!response.error) { setShowModal(false); setModalMode('add'); setEditingId(null); setForm({...initialForm, sub_area: displayTitle.toUpperCase()}); fetchInventory(); }
        setSaving(false); setConfirmDialog({ show: false });
    }});
  };

  const filteredItems = items.filter(i => (i.descripcion||"").toLowerCase().includes(searchTerm.toLowerCase()) || (i.codigo||"").toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}><span className="material-symbols-rounded" style={{color: '#0EA5E9', fontSize: '2.5rem'}}>{displayIcon}</span> {displayTitle}</div>
        <button className={styles.btnPrimary} onClick={() => { setForm({...initialForm, area_id: areaKey, sub_area: displayTitle.toUpperCase()}); setShowModal(true); }}>
          <span className="material-symbols-rounded">add_box</span> Registrar Material
        </button>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statIcon} style={{background:'#E0F2FE'}}><span className="material-symbols-rounded">inventory</span></div>
          <div><p>Ítems en Stock</p><h3>{items.length}</h3></div>
        </div>
      </div>

      <div className={styles.inventoryTable}>
        <div className={styles.tableHeader}>
          <div className={styles.searchBox}><span className="material-symbols-rounded">search</span>
            <input placeholder="Buscar por código o descripción..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className={styles.tableContainer}>
          <div className={styles.desktopView}>
            <table>
              <thead>
                <tr><th>ID#</th><th>Descripción</th><th>Código</th><th>Lote</th><th>Caducidad</th><th>Inicio Uso</th><th>Stock</th><th>QC</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {loading ? (<tr><td colSpan="9" style={{textAlign:'center', padding:'3rem'}}>Cargando...</td></tr>) : filteredItems.length === 0 ? (<tr><td colSpan="9" style={{textAlign:'center', padding:'3rem'}}>No hay materiales registrados.</td></tr>) : filteredItems.map(item => (
                  <tr key={item.id}>
                    <td style={{fontWeight: 700}}>{item.solicitud_id || '---'}</td>
                    <td style={{fontWeight: 700}}>{item.descripcion}</td>
                    <td><span className={styles.badge} style={{background:'#F1F5F9'}}>{item.codigo}</span></td>
                    <td>{item.lote || 'N/A'}</td>
                    <td style={{color: new Date(item.caducidad) < new Date() ? 'red' : 'inherit'}}>{item.caducidad ? new Date(item.caducidad).toLocaleDateString() : '---'}</td>
                    <td>{item.fecha_inicio_uso ? new Date(item.fecha_inicio_uso).toLocaleDateString() : 'PENDIENTE'}</td>
                    <td><span className={`${styles.badge} ${item.stock_actual < 5 ? styles.badgeDanger : styles.badgeSuccess}`}>{item.stock_actual}</span></td>
                    <td><span className={item.aceptado ? styles.badgeSuccess : styles.badgeDanger}>{item.aceptado ? 'ACEPTADO' : 'RECH'}</span></td>
                    <td>
                      <div style={{display:'flex', gap:'5px'}}>
                        {!item.fecha_inicio_uso && <button onClick={()=>handleQuickStart(item.id)} className={styles.btnAction} style={{background:'#0EA5E9', color:'white'}}><span className="material-symbols-rounded">play_arrow</span></button>}
                        {item.fecha_inicio_uso && !item.fecha_termino_uso && <button onClick={()=>handleQuickEnd(item.id)} className={styles.btnAction} style={{background:'#EF4444', color:'white'}}><span className="material-symbols-rounded">stop</span></button>}
                        <button onClick={()=>handleEdit(item)} className={styles.btnAction} style={{background:'#F1F5F9'}}><span className="material-symbols-rounded">edit</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileView}>
            <div className={styles.cardsGridMobile}>{filteredItems.map(item => (<InventoryCard key={item.id} item={item} onEdit={handleEdit} onQuickStart={handleQuickStart} onQuickEnd={handleQuickEnd} />))}</div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <button className={styles.closeBtnOverlay} onClick={() => setShowModal(false)} type="button"><span className="material-symbols-rounded">close</span></button>
          <div className={styles.modal}>
            <h2 style={{marginBottom: '1.5rem', display:'flex', alignItems:'center', gap:'10px'}}>
              <span className="material-symbols-rounded" style={{color:'#0EA5E9'}}>add_circle</span> Entrada técnica: {displayTitle} (Auditado)
            </h2>
            <form onSubmit={handleSave}>
              <div className={styles.qcTitle} style={{marginTop: '0'}}><span className="material-symbols-rounded">inventory_2</span> DATOS DE IDENTIFICACIÓN DEL MATERIAL</div>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}><label>ID# (Identificador)</label><input value={form.solicitud_id} onChange={e => setForm({...form, solicitud_id: e.target.value})} placeholder="Ej. ID#AA..." /></div>
                <div className={styles.inputGroup}>
                  <label>Código del Producto</label>
                  <div style={{display: 'flex', gap: '8px'}}><input required value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})} style={{flex: 1}} /><button type="button" onClick={handleManualSearch} className={styles.searchBtnInside}><span className="material-symbols-rounded">search</span></button></div>
                </div>
                <div className={`${styles.inputGroup} ${styles.spanFull}`}><label>SUB-ÁREA DE TRABAJO</label><input value={form.sub_area} onChange={e=>setForm({...form, sub_area:e.target.value.toUpperCase()})} placeholder="Ej. ÁREA PRINCIPAL" style={{fontWeight: 700}} /></div>
                <div className={styles.inputGroup}><label>Descripción / Nombre del Reactivo</label><input required value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
                <div className={styles.inputGroup}><label>Número de Lote</label><input required value={form.lote} onChange={e => setForm({...form, lote: e.target.value})} />
                  {loteStatus === 'new' && <div style={{fontSize: '0.7rem', fontWeight: 800, color: '#0369A1', marginTop: '4px', background: '#E0F2FE', padding: '4px 8px', borderRadius: '6px'}}>✨ ¡NUEVO LOTE DETECTADO!</div>}
                </div>
                <div className={styles.inputGroup}><label>FECHA DE SOLICITUD A ALMACÉN</label><input type="datetime-local" value={form.fecha_solicitud_almacen} onChange={e => setForm({...form, fecha_solicitud_almacen: e.target.value})} /></div>
              </div>

              <div className={styles.formGrid} style={{marginTop: '1rem'}}>
                <div className={styles.inputGroup}><label>FECHA DE INICIO</label><input type="date" value={form.fecha_inicio_uso} onChange={e => setForm({...form, fecha_inicio_uso: e.target.value})} /></div>
                <div className={styles.inputGroup}><label>FECHA DE TÉRMINO</label><input type="date" value={form.fecha_termino_uso} onChange={e => setForm({...form, fecha_termino_uso: e.target.value})} /></div>
                <div className={styles.inputGroup}><label>CANTIDAD QUE INGRESA</label><input type="number" required value={form.stock_actual} onChange={e => setForm({...form, stock_actual: parseInt(e.target.value)})} /></div>
              </div>

              <div className={styles.qcSection} style={{marginTop: '1.5rem'}}>
                <div className={styles.qcTitle}><span className="material-symbols-rounded">fact_check</span> CRITERIOS DE ACEPTACIÓN</div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}><label>FECHA DE CADUCIDAD</label><input type="date" required value={form.caducidad} onChange={e => setForm({...form, caducidad: e.target.value})} /></div>
                  <div className={styles.inputGroup}><label>TEMPERATURA ALMACENAMIENTO</label><input value={form.temp_almacenamiento} onChange={e => setForm({...form, temp_almacenamiento: e.target.value})} /></div>
                  <div className={styles.inputGroup}><label>APARIENCIA FÍSICA CORRECTA?</label><select value={form.apariencia_fisica} onChange={e => setForm({...form, apariencia_fisica: e.target.value})}><option value="SI">SÍ</option><option value="NO">NO</option></select></div>
                  <div className={styles.inputGroup}><label>¿SE ACEPTA EL PRODUCTO?</label><select value={form.aceptado} onChange={e => setForm({...form, aceptado: e.target.value === 'true'})} style={{color: form.aceptado ? '#10B981' : '#EF4444', fontWeight: 700}}><option value="true">SÍ (ACEPTADO)</option><option value="false">NO (RECHAZADO)</option></select></div>
                </div>
              </div>

              <div className={styles.qcSection} style={{marginTop: '1.5rem'}}>
                <div className={styles.qcTitle}><span className="material-symbols-rounded">analytics</span> DESEMPEÑO ANALÍTICO</div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}><label>¿ES NUEVO LOTE?</label><select value={form.nuevo_lote} onChange={e => setForm({...form, nuevo_lote: e.target.value === 'true'})}><option value="false">NO / N/A</option><option value="true">SÍ</option></select></div>
                  <div className={styles.inputGroup}><label>TIPO DE MUESTRA PARA EVALUAR</label><input value={form.analisis_desempeno} onChange={e => setForm({...form, analisis_desempeno: e.target.value})} /></div>
                  <div className={styles.inputGroup}><label>¿CUMPLE CONDICIONES FABRICANTE?</label><select value={form.condiciones_fabricante} onChange={e => setForm({...form, condiciones_fabricante: e.target.value === 'true'})}><option value="true">SÍ</option><option value="false">NO</option></select></div>
                </div>
              </div>

              <div className={styles.inputGroup} style={{marginTop: '1rem'}}><label>OBSERVACIONES TÉCNICAS</label><textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} style={{width: '100%', borderRadius: '12px', minHeight: '80px', padding: '12px', border: '1px solid #CBD5E1'}} /></div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '2rem'}}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.btnSecondary}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} style={{padding: '0.8rem 2.5rem'}} disabled={saving}>{saving ? 'Guardando...' : 'Confirmar Registro Auditado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDialog.show && (
        <div className={styles.modalOverlay} style={{zIndex: 2000}}>
          <div className={styles.confirmBox}><h3>Confirmar Acción</h3><p>{confirmDialog.message}</p>
            <div className={styles.confirmActions}><button onClick={() => setConfirmDialog({show: false})}>Cancelar</button><button onClick={confirmDialog.onConfirm}>Aceptar y Continuar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
