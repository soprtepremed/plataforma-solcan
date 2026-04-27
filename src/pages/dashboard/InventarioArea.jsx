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
  'quimica_clinica': 'science',
  'serologia': 'bloodtype',
  'inmunologia': 'verified',
  'parasitologia': 'pest_control'
};

const AREA_NAMES = {
  'hematologia': 'Hematología',
  'microbiologia': 'Microbiología',
  'urianalisis': 'Urianálisis',
  'quimica-clinica': 'Química Clínica',
  'quimica_clinica': 'Química Clínica',
  'serologia': 'Serología',
  'inmunologia': 'Inmunología',
  'parasitologia': 'Parasitología'
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
  const [filterSubArea, setFilterSubArea] = useState("TODAS");
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
    fecha_solicitud_almacen: new Date().toISOString().substring(0, 10),
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
    const normalizedAreaId = areaKey.replace('-', '_');
    const { data, error } = await supabase
      .from("inventario_areas")
      .select("*")
      .or(`area_id.eq.${areaKey},area_id.eq.${normalizedAreaId}`)
      .order("descripcion", { ascending: true });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const handleEdit = (item) => {
    setForm({ ...item, fecha_solicitud_almacen: item.fecha_solicitud_almacen ? item.fecha_solicitud_almacen.substring(0, 10) : "" });
    setEditingId(item.id); setModalMode('edit'); setShowModal(true);
  };

  const handleQuickStart = async (id) => {
    setConfirmDialog({ show: true, message: "¿Deseas marcar el INICIO para hoy?", onConfirm: async () => {
      const { error } = await supabase.from("inventario_areas").update({ fecha_inicio_uso: new Date().toISOString() }).eq("id", id);
      if (error) {
        alert("Error al marcar inicio: " + error.message);
      } else {
        fetchInventory();
      }
      setConfirmDialog({ show: false });
    }});
  };

  const handleQuickEnd = async (id) => {
    setConfirmDialog({ show: true, message: "¿Seguro que deseas TERMINAR uso? Stock será cero.", onConfirm: async () => {
      const { error } = await supabase.from("inventario_areas").update({ fecha_termino_uso: new Date().toISOString(), stock_actual: 0 }).eq("id", id);
      if (error) {
        alert("Error al marcar término: " + error.message);
      } else {
        fetchInventory();
      }
      setConfirmDialog({ show: false });
    }});
  };

  const handleSave = async (e) => {
    e.preventDefault(); if (saving) return;
    
    // VERIFICACIÓN DE SEGURIDAD FRONTEND
    const normalizedAreaId = areaKey.replace('-', '_');
    const userRole = user?.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrador';
    const isAuthorized = isAdmin || userRole === normalizedAreaId;

    if (!isAuthorized) {
      alert(`⛔ ACCESO DENEGADO: Tu rol (${userRole}) no tiene permisos para corregir el inventario de ${displayTitle}.`);
      return;
    }

    setConfirmDialog({ show: true, message: "¿Confirmas el registro técnico auditado?", onConfirm: async () => {
        setSaving(true);
        try {
          const { id, ...payload } = form;
          
          // Limpiar el payload: Convertir strings vacíos de fechas a null real
          const cleanPayload = { 
            ...payload, 
            area_id: normalizedAreaId, 
            stock_actual: payload.stock_actual || 0,
            fecha_inicio_uso: payload.fecha_inicio_uso || null,
            fecha_termino_uso: payload.fecha_termino_uso || null,
            fecha_solicitud_almacen: payload.fecha_solicitud_almacen || null,
            caducidad: payload.caducidad || null
          };
          
          const response = modalMode === 'edit' 
            ? await supabase.from("inventario_areas").update(cleanPayload).eq("id", editingId) 
            : await supabase.from("inventario_areas").insert([cleanPayload]);
          
          if (!response.error) { 
            setShowModal(false); 
            setModalMode('add'); 
            setEditingId(null); 
            setForm({...initialForm, sub_area: displayTitle.toUpperCase()}); 
            fetchInventory(); 
          } else {
            console.error("Error de Supabase:", response.error);
            alert(`Error al guardar en ${displayTitle}: ${response.error.message}\n\nDetalle: ${response.error.details || 'No especificado'}`);
          }
        } catch (err) {
          console.error("Error crítico:", err);
          alert("Ocurrió un error inesperado: " + err.message);
        } finally {
          setSaving(false); 
          setConfirmDialog({ show: false });
        }
    }});
  };

  const filteredItems = items.filter(i => {
    const desc = (i.descripcion || "").toLowerCase();
    const cod = (i.codigo || "").toLowerCase();
    const search = (searchTerm || "").toLowerCase();
    const matchesSearch = desc.includes(search) || cod.includes(search);
    const matchesSubArea = filterSubArea === "TODAS" || i.sub_area === filterSubArea;
    return matchesSearch && matchesSubArea;
  });

  // Obtener lista de sub-áreas únicas para los tabs
  const subAreas = ["TODAS", ...new Set(items.map(i => i.sub_area).filter(Boolean))];

  // Lógica de Agrupación
  const groupedItems = filteredItems.reduce((acc, item) => {
    const key = item.descripcion;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Alarmas de caducidad (sobre todos los ítems sin filtro de sub-área)
  const now = new Date();
  const in7  = new Date(); in7.setDate(now.getDate() + 7);
  const in30 = new Date(); in30.setDate(now.getDate() + 30);
  const expiryAlarms = items
    .filter(i => i.caducidad && !i.fecha_termino_uso) // solo lotes activos/pendientes
    .map(i => ({ ...i, expDate: new Date(i.caducidad) }))
    .filter(i => i.expDate <= in30)
    .sort((a, b) => a.expDate - b.expDate);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}><span className="material-symbols-rounded" style={{color: '#0EA5E9', fontSize: '2.5rem'}}>{displayIcon}</span> {displayTitle}</div>
        <button className={styles.btnPrimary} onClick={() => { 
          setForm({...initialForm, area_id: areaKey, sub_area: displayTitle.toUpperCase()}); 
          setModalMode('add'); 
          setEditingId(null); 
          setShowModal(true); 
        }}>
          <span className="material-symbols-rounded">add_box</span> Registrar Material
        </button>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statIcon} style={{background:'#E0F2FE'}}><span className="material-symbols-rounded">inventory</span></div>
          <div><p>Ítems Únicos</p><h3>{Object.keys(groupedItems).length}</h3></div>
        </div>
        <div className={styles.statCard}><div className={styles.statIcon} style={{background:'#DCFCE7'}}><span className="material-symbols-rounded">layers</span></div>
          <div><p>Total de Lotes</p><h3>{filteredItems.length}</h3></div>
        </div>
      </div>

      {/* ── PANEL DE ALARMAS DE CADUCIDAD ── */}
      {expiryAlarms.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)',
          border: '1.5px solid #F59E0B',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 12px rgba(245,158,11,0.12)'
        }}>
          <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'0.75rem'}}>
            <span className="material-symbols-rounded" style={{color:'#D97706', fontSize:'1.5rem'}}>warning</span>
            <strong style={{color:'#92400E', fontSize:'0.95rem'}}>ALERTAS DE CADUCIDAD — {expiryAlarms.length} lote{expiryAlarms.length > 1 ? 's' : ''} próximo{expiryAlarms.length > 1 ? 's' : ''} a vencer</strong>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
            {expiryAlarms.map(item => {
              const isExpired  = item.expDate < now;
              const isCritical = !isExpired && item.expDate <= in7;
              const color  = isExpired ? '#EF4444' : isCritical ? '#F97316' : '#F59E0B';
              const bgColor = isExpired ? '#FEE2E2' : isCritical ? '#FFEDD5' : '#FEF9C3';
              const label   = isExpired ? '⛔ VENCIDO' : isCritical ? '🔴 CRÍTICO' : '⚠️ PRÓXIMO';
              const daysLeft = Math.ceil((item.expDate - now) / (1000 * 60 * 60 * 24));
              return (
                <div key={item.id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background: bgColor, borderRadius:'10px', padding:'8px 12px',
                  border: `1px solid ${color}22`
                }}>
                  <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
                    <span style={{fontWeight:700, fontSize:'0.85rem', color:'#1E293B'}}>{item.descripcion}</span>
                    <span style={{fontSize:'0.75rem', color:'#64748B'}}>Lote: <strong>{item.lote || 'N/A'}</strong></span>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{fontSize:'0.8rem', color:'#475569'}}>
                      Cad: <strong>{item.expDate.toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})}</strong>
                    </span>
                    <span style={{
                      fontSize:'0.72rem', fontWeight:800, color:'white',
                      background: color, borderRadius:'20px', padding:'3px 10px', whiteSpace:'nowrap'
                    }}>
                      {isExpired ? label : `${label} (${daysLeft}d)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subAreas.length > 2 && (
        <div className={styles.tabContainer} style={{marginBottom: '1.5rem', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px'}}>
          {subAreas.map(sa => (
            <button 
              key={sa} 
              className={filterSubArea === sa ? styles.tabActive : styles.tab}
              onClick={() => setFilterSubArea(sa)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: filterSubArea === sa ? '#0EA5E9' : '#F1F5F9',
                color: filterSubArea === sa ? 'white' : '#64748B',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {sa === "TODAS" ? "TODAS LAS SUB-ÁREAS" : sa}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inventoryTable}>
        <div className={styles.tableHeader}>
          <div className={styles.searchBox}><span className="material-symbols-rounded">search</span>
            <input placeholder="Buscar reactivo o código..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div style={{textAlign:'center', padding:'5rem'}}><div className={styles.loader}></div><p>Cargando inventario técnico...</p></div>
          ) : Object.keys(groupedItems).length === 0 ? (
            <div style={{textAlign:'center', padding:'5rem', color: '#64748B'}}>
              <span className="material-symbols-rounded" style={{fontSize:'4rem'}}>inventory_2</span>
              <p>No se encontraron materiales registrados.</p>
            </div>
          ) : (
            <div className={styles.groupedList}>
              {Object.entries(groupedItems).map(([name, lots]) => (
                <div key={name} className={styles.materialGroup}>
                  <div className={styles.groupHeader}>
                    <div className={styles.groupInfo}>
                      <span className="material-symbols-rounded">label</span>
                      <h3>{name}</h3>
                      <span className={styles.lotCount}>{lots.length} {lots.length === 1 ? 'lote' : 'lotes'}</span>
                    </div>
                  </div>
                  <div className={styles.lotsGrid}>
                    {lots.sort((a,b) => {
                      // Priorizar el que está en uso
                      if (a.fecha_inicio_uso && !a.fecha_termino_uso) return -1;
                      if (b.fecha_inicio_uso && !b.fecha_termino_uso) return 1;
                      return 0;
                    }).map(item => {
                      const isActive = item.fecha_inicio_uso && !item.fecha_termino_uso;
                      const isPending = !item.fecha_inicio_uso;
                      const isFinished = item.fecha_termino_uso;

                      return (
                        <div key={item.id} className={`${styles.lotRow} ${isActive ? styles.lotActive : ''} ${isFinished ? styles.lotFinished : ''}`}>
                          <div className={styles.lotMain}>
                            <div className={styles.lotTag}>
                              <label>LOTE</label>
                              <span>{item.lote || 'N/A'}</span>
                            </div>
                            <div className={styles.lotDetails}>
                              <div className={styles.detailItem}>
                                <label>Caducidad</label>
                                <span style={{
                                  color: item.caducidad && new Date(item.caducidad) < now ? '#EF4444'
                                       : item.caducidad && new Date(item.caducidad) <= in7 ? '#F97316'
                                       : item.caducidad && new Date(item.caducidad) <= in30 ? '#F59E0B'
                                       : 'inherit',
                                  fontWeight: item.caducidad && new Date(item.caducidad) <= in30 ? 700 : 'inherit'
                                }}>
                                  {item.caducidad ? new Date(item.caducidad).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'}) : '---'}
                                  {item.caducidad && new Date(item.caducidad) < now && <span style={{fontSize:'0.65rem', marginLeft:'4px', background:'#EF4444', color:'white', borderRadius:'4px', padding:'1px 4px'}}>VENCIDO</span>}
                                  {item.caducidad && new Date(item.caducidad) >= now && new Date(item.caducidad) <= in7 && <span style={{fontSize:'0.65rem', marginLeft:'4px', background:'#F97316', color:'white', borderRadius:'4px', padding:'1px 4px'}}>CRÍTICO</span>}
                                </span>
                              </div>
                              <div className={styles.detailItem}><label>Stock</label><span className={item.stock_actual < 5 ? styles.textDanger : ''}>{item.stock_actual}</span></div>
                              <div className={styles.detailItem}>
                                <label>Estado</label>
                                <span className={isActive ? styles.textSuccess : isFinished ? styles.textMuted : styles.textInfo}>
                                  {isActive ? 'EN USO' : isFinished ? 'TERMINADO' : 'EN RESERVA'}
                                </span>
                              </div>
                              <div className={styles.detailItem}>
                                <label>Sol. Almacén</label>
                                <span style={{fontSize:'0.78rem', color:'#64748B'}}>
                                  {item.fecha_solicitud_almacen
                                    ? new Date(item.fecha_solicitud_almacen).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})
                                    : '---'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className={styles.lotActions}>
                            {!item.fecha_inicio_uso && <button onClick={()=>handleQuickStart(item.id)} className={styles.miniActionBtn} title="Iniciar Uso"><span className="material-symbols-rounded">play_arrow</span></button>}
                            {item.fecha_inicio_uso && !item.fecha_termino_uso && <button onClick={()=>handleQuickEnd(item.id)} className={styles.miniActionBtn} style={{color:'#EF4444'}} title="Terminar Uso"><span className="material-symbols-rounded">stop</span></button>}
                            <button onClick={()=>handleEdit(item)} className={styles.miniActionBtn} style={{color:'#64748B'}} title="Editar"><span className="material-symbols-rounded">edit</span></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <div className={styles.inputGroup}><label>FECHA DE SOLICITUD A ALMACÉN</label><input type="date" value={form.fecha_solicitud_almacen} onChange={e => setForm({...form, fecha_solicitud_almacen: e.target.value})} /></div>
              </div>

              <div className={styles.formGrid} style={{marginTop: '1rem'}}>
                <div className={styles.inputGroup}>
                  <label>FECHA DE INICIO</label>
                  <div className={styles.dateInputWrapper}>
                    <input type="date" value={form.fecha_inicio_uso} onChange={e => setForm({...form, fecha_inicio_uso: e.target.value})} />
                    {form.fecha_inicio_uso && (
                      <button type="button" className={styles.clearDateBtn} onClick={() => setForm({...form, fecha_inicio_uso: ""})}>
                        <span className="material-symbols-rounded">close</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>FECHA DE TÉRMINO</label>
                  <div className={styles.dateInputWrapper}>
                    <input type="date" value={form.fecha_termino_uso} onChange={e => setForm({...form, fecha_termino_uso: e.target.value})} />
                    {form.fecha_termino_uso && (
                      <button type="button" className={styles.clearDateBtn} onClick={() => setForm({...form, fecha_termino_uso: ""})}>
                        <span className="material-symbols-rounded">close</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>CANTIDAD QUE INGRESA</label>
                  <div className={styles.quantityStepper}>
                    <button type="button" onClick={() => setForm({...form, stock_actual: Math.max(0, (form.stock_actual || 0) - 1)})} className={styles.stepperBtn}>
                      <span className="material-symbols-rounded">remove</span>
                    </button>
                    <input type="number" required min="0" value={form.stock_actual} onChange={e => setForm({...form, stock_actual: Math.max(0, parseInt(e.target.value) || 0)})} />
                    <button type="button" onClick={() => setForm({...form, stock_actual: (form.stock_actual || 0) + 1})} className={styles.stepperBtn}>
                      <span className="material-symbols-rounded">add</span>
                    </button>
                  </div>
                </div>
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
          <div className={styles.confirmBox}>
            <div className={styles.confirmHeader}>
              <span className="material-symbols-rounded" style={{fontSize: '3rem', color: '#0EA5E9'}}>help_outline</span>
              <h3>Confirmar Acción</h3>
            </div>
            <p className={styles.confirmMessage}>{confirmDialog.message}</p>
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
