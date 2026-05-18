import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './InventarioHemato.module.css'; 

const formatLocalDate = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
};

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
                <div className={styles.quickItem}><label>Caducidad</label><span style={{ color: new Date(item.caducidad) < new Date() ? '#EF4444' : 'inherit', fontWeight: 700 }}>{formatLocalDate(item.caducidad)}</span></div>
                <div className={styles.quickItem}><label>Cód. Calidad</label><span className={item.aceptado ? styles.textSuccess : styles.textDanger}>{item.aceptado ? 'ACEPTADO' : 'RECHAZADO'}</span></div>
            </div>
            {isExpanded && (
                <div className={styles.cardExpandedContent}>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailRow}><label>Inicio Uso:</label><span>{item.fecha_inicio_uso ? formatLocalDate(item.fecha_inicio_uso) : 'PENDIENTE'}</span></div>
                        <div className={styles.detailRow}><label>Término Uso:</label><span>{item.fecha_termino_uso ? formatLocalDate(item.fecha_termino_uso) : '---'}</span></div>
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
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedLots, setExpandedLots] = useState(new Set());
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' or 'summary'
  const [minStocks, setMinStocks] = useState(() => {
    const saved = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('min_stock_')) {
        saved[key.replace('min_stock_', '')] = parseInt(localStorage.getItem(key));
      }
    }
    return saved;
  });

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

  const handleDelete = async (item) => {
    setConfirmDialog({ show: true, message: `¿Seguro que deseas ELIMINAR el lote ${item.lote || 'N/A'}? Se eliminarán todos los registros asociados y se descontará del stock.`, onConfirm: async () => {
      const ids = item.entries.map(e => e.id);
      const { error } = await supabase.from("inventario_areas").delete().in("id", ids);
      if (error) {
        alert("Error al eliminar: " + error.message);
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
        const isAuthorized = isAdmin || userRole === normalizedAreaId || window.location.hostname === 'localhost' || !userRole; // Permitir en local o si no hay rol para pruebas

    if (!isAuthorized) {
      alert(`⛔ ACCESO DENEGADO: Tu rol (${userRole}) no tiene permisos para corregir el inventario de ${displayTitle}.`);
      return;
    }

    setConfirmDialog({ show: true, message: "¿Confirmas el registro técnico auditado?", onConfirm: async () => {
        setSaving(true);
        try {
          const { id, consolidatedKey, consolidatekey, entries, stock_total, fechas_solicitud, esta_en_uso, esta_terminado, ...payload } = form;
          
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

  const toggleGroup = (name) => {
    const next = new Set(expandedGroups);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedGroups(next);
  };

  const toggleLot = (lotKey) => {
    const next = new Set(expandedLots);
    if (next.has(lotKey)) next.delete(lotKey);
    else next.add(lotKey);
    setExpandedLots(next);
  };

  // Obtener lista de sub-áreas únicas para los tabs
  const subAreas = ["TODAS", ...new Set(items.map(i => i.sub_area).filter(Boolean))];

  // Lógica de Agrupación Consolidada por Lote
  const groupedItems = filteredItems.reduce((acc, item) => {
    const materialKey = item.descripcion;
    if (!acc[materialKey]) acc[materialKey] = {};
    
    const lotKey = item.lote || 'SIN_LOTE';
    
    if (!acc[materialKey][lotKey]) {
      acc[materialKey][lotKey] = {
        ...item,
        consolidatedKey: `${materialKey}-${lotKey}`,
        entries: [item],
        stock_total: item.stock_actual || 0,
        fechas_solicitud: [item.fecha_solicitud_almacen].filter(Boolean),
        esta_en_uso: item.fecha_inicio_uso && !item.fecha_termino_uso,
        esta_terminado: !!item.fecha_termino_uso && (item.stock_actual === 0)
      };
    } else {
      const group = acc[materialKey][lotKey];
      group.entries.push(item);
      group.stock_total += (item.stock_actual || 0);
      if (item.fecha_solicitud_almacen) group.fechas_solicitud.push(item.fecha_solicitud_almacen);
      if (item.fecha_inicio_uso && !item.fecha_termino_uso) group.esta_en_uso = true;
      group.esta_terminado = group.esta_terminado && (!!item.fecha_termino_uso && item.stock_actual === 0);
    }
    
    return acc;
  }, {});

  // Convertir el objeto anidado en una estructura plana para el renderizado
  const finalGrouped = Object.entries(groupedItems).reduce((acc, [name, lotsObj]) => {
    acc[name] = Object.values(lotsObj);
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
        <div style={{display:'flex', gap:'12px'}}>
          <button 
            className={styles.viewToggleBtn}
            onClick={() => setViewMode(viewMode === 'detailed' ? 'summary' : 'detailed')}
          >
            <span className="material-symbols-rounded">
              {viewMode === 'detailed' ? 'list_alt' : 'inventory_2'}
            </span>
            {viewMode === 'detailed' ? 'Resumen Stock' : 'Ver Detalles'}
          </button>
          <button className={styles.btnPrimary} onClick={() => { 
            setForm({...initialForm, area_id: areaKey, sub_area: displayTitle.toUpperCase()}); 
            setModalMode('add'); 
            setEditingId(null); 
            setShowModal(true); 
          }}>
            <span className="material-symbols-rounded">add_box</span> Registrar Material
          </button>
        </div>
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
          ) : Object.keys(finalGrouped).length === 0 ? (
            <div style={{textAlign:'center', padding:'5rem', color: '#64748B'}}>
              <span className="material-symbols-rounded" style={{fontSize:'4rem'}}>inventory_2</span>
              <p>No se encontraron materiales registrados.</p>
            </div>
          ) : viewMode === 'summary' ? (
            <div className={styles.summaryContainer}>
              <table className={styles.summaryTable}>
                <thead>
                  <tr>
                    <th>Reactivo / Material</th>
                    <th style={{textAlign:'center'}}>Lotes Activos</th>
                    <th style={{textAlign:'center'}}>Stock Total</th>
                    <th style={{textAlign:'center'}}>Mínimo</th>
                    <th style={{textAlign:'center'}}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(finalGrouped).sort(([a],[b]) => a.localeCompare(b)).map(([name, lots]) => {
                    const totalStock = lots.reduce((sum, lot) => sum + lot.stock_total, 0);
                    const activeLots = lots.filter(l => l.esta_en_uso).length;
                    const minStock = minStocks[name] !== undefined ? minStocks[name] : 3;
                    const isLow = totalStock < minStock;
                    return (
                      <tr key={name} className={isLow ? styles.rowLowStock : ''}>
                        <td className={styles.materialNameCell}>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <span className="material-symbols-rounded" style={{color: '#0EA5E9'}}>science</span>
                              <span style={{fontWeight: 700, color: '#1E293B'}}>{name}</span>
                            </div>
                            <div style={{marginLeft: '32px', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', maxWidth: '300px'}}>
                              <table style={{width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse'}}>
                                <thead style={{background: '#F8FAFC'}}>
                                  <tr>
                                    <th style={{textAlign: 'left', padding: '4px 8px', color: '#64748B', fontWeight: 600}}>No. Lote</th>
                                    <th style={{textAlign: 'right', padding: '4px 8px', color: '#64748B', fontWeight: 600}}>Cantidad</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lots.map(lot => (
                                    <tr key={lot.consolidatedKey} style={{borderTop: '1px solid #E2E8F0'}}>
                                      <td style={{padding: '4px 8px', color: '#475569'}}>{lot.entries[0].lote || 'S/L'}</td>
                                      <td style={{padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#1E293B'}}>{lot.stock_total} unidades</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                        <td style={{textAlign:'center', fontWeight:700}}>{activeLots} de {lots.length}</td>
                        <td style={{textAlign:'center'}}>
                          <span className={`${styles.stockBadge} ${totalStock === 0 ? styles.stockEmpty : totalStock < minStock ? styles.stockLow : styles.stockOk}`}>
                            {totalStock} unidades
                          </span>
                        </td>
                        <td style={{textAlign:'center'}}>
                          <input 
                            type="number" 
                            min="0" 
                            value={minStock} 
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              const key = `min_stock_${name}`;
                              localStorage.setItem(key, val);
                              setMinStocks(prev => ({...prev, [name]: val}));
                            }} 
                            style={{width: '60px', textAlign: 'center', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '6px', fontSize: '0.9rem'}}
                          />
                        </td>
                        <td style={{textAlign:'center'}}>
                          {totalStock === 0 ? (
                            <span className={styles.statusTagOut}>AGOTADO</span>
                          ) : isLow ? (
                            <span className={styles.statusTagCritical}>CRÍTICO</span>
                          ) : (
                            <span className={styles.statusTagOk}>DISPONIBLE</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.groupedList}>
              {Object.entries(finalGrouped).map(([name, lots]) => {
                const isExpanded = expandedGroups.has(name);
                return (
                  <div key={name} className={`${styles.materialGroup} ${isExpanded ? styles.groupExpanded : ''}`}>
                    <div className={styles.groupHeader} onClick={() => toggleGroup(name)}>
                      <div className={styles.groupInfo}>
                        <span className="material-symbols-rounded">science</span>
                        <h3>{name}</h3>
                        <span className={styles.lotCount}>{lots.length} {lots.length === 1 ? 'lote' : 'lotes'}</span>
                      </div>
                      <span className={`material-symbols-rounded ${styles.expandIcon}`}>
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className={styles.lotsGrid}>
                        {lots.sort((a,b) => {
                          if (a.esta_en_uso) return -1;
                          if (b.esta_en_uso) return 1;
                          return 0;
                        }).map(item => {
                          const isLotExpanded = expandedLots.has(item.consolidatedKey);
                          const isActive = item.esta_en_uso;
                          const isFinished = item.esta_terminado && item.stock_total === 0;
                          
                          // Mostrar la fecha más reciente de solicitud
                          const latestReq = item.fechas_solicitud.length > 0 
                            ? new Date(Math.max(...item.fechas_solicitud.map(d => new Date(d))))
                            : null;

                          return (
                            <div key={item.consolidatedKey} className={`${styles.lotRow} ${isActive ? styles.lotActive : ''} ${isFinished ? styles.lotFinished : ''}`}>
                              <div className={styles.lotRowMain}>
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
                                      </span>
                                    </div>
                                    <div className={styles.detailItem}><label>Stock Total</label><span className={item.stock_total < 5 ? styles.textDanger : ''}>{item.stock_total}</span></div>
                                    <div className={styles.detailItem}>
                                      <label>F. Pedido</label>
                                      <span>{formatLocalDate(item.fecha_solicitud_almacen)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <label>Observaciones</label>
                                      <span style={{fontSize: '0.75rem', color: '#64748B'}}>{item.observaciones || 'N/A'}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                      <label>Estado</label>
                                      <span className={isActive ? styles.textSuccess : isFinished ? styles.textMuted : styles.textInfo}>
                                        {isActive ? 'EN USO' : isFinished ? 'TERMINADO' : 'EN RESERVA'}
                                      </span>
                                    </div>
                                    {item.entries.length > 1 && (
                                      <div className={styles.detailItem}>
                                        <label>Ver detalles</label>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); toggleLot(item.consolidatedKey); }}
                                          className={styles.historyBtn}
                                        >
                                          {item.entries.length} reg. <span className="material-symbols-rounded">{isLotExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className={styles.lotActions}>
                                  {!isActive && !isFinished && <button onClick={()=>handleQuickStart(item.entries[0].id)} className={styles.miniActionBtn} title="Iniciar Uso (FIFO)"><span className="material-symbols-rounded">play_arrow</span></button>}
                                  {isActive && <button onClick={()=>handleQuickEnd(item.entries.find(e => e.fecha_inicio_uso && !e.fecha_termino_uso)?.id || item.entries[0].id)} className={styles.miniActionBtn} style={{color:'#EF4444'}} title="Terminar Uso"><span className="material-symbols-rounded">stop</span></button>}
                                  <button onClick={()=>handleEdit(item)} className={styles.miniActionBtn} style={{color:'#64748B'}} title="Editar"><span className="material-symbols-rounded">edit</span></button>
                                  <button onClick={()=>handleDelete(item)} className={styles.miniActionBtn} style={{color:'#EF4444'}} title="Eliminar Lote"><span className="material-symbols-rounded">delete</span></button>
                                </div>
                              </div>

                              {isLotExpanded && (
                                <div className={styles.lotBreakdown}>
                                  <div className={styles.breakdownHeader}>Historial de Entradas (Individuales):</div>
                                  {item.entries.sort((a,b) => new Date(b.fecha_solicitud_almacen) - new Date(a.fecha_solicitud_almacen)).map((entry) => {
                                    const entryActive = entry.fecha_inicio_uso && !entry.fecha_termino_uso;
                                    const entryFinished = !!entry.fecha_termino_uso;
                                    
                                    return (
                                      <div key={entry.id} className={`${styles.lotRow} ${styles.subLot} ${entryActive ? styles.lotActive : ''} ${entryFinished ? styles.lotFinished : ''}`}>
                                        <div className={styles.lotRowMain}>
                                          <div className={styles.lotMain}>
                                            <div className={styles.lotTag}>
                                              <label>LOTE</label>
                                              <span style={{fontSize: '0.9rem'}}>{entry.lote || 'N/A'}</span>
                                            </div>
                                            <div className={styles.lotTag} style={{minWidth: '120px'}}>
                                              <label>Surtido el:</label>
                                              <span style={{fontSize: '0.8rem'}}>{formatLocalDate(entry.fecha_solicitud_almacen)}</span>
                                            </div>
                                            <div className={styles.lotDetails}>
                                              <div className={styles.detailItem}><label>Stock</label><span>{entry.stock_actual}</span></div>
                                              <div className={styles.detailItem}>
                                                <label>Estado</label>
                                                <span className={entryActive ? styles.textSuccess : entryFinished ? styles.textMuted : styles.textInfo}>
                                                  {entryActive ? 'EN USO' : entryFinished ? 'TERMINADO' : 'EN RESERVA'}
                                                </span>
                                              </div>
                                              <div className={styles.detailItem}><label>F. Pedido</label><span style={{fontSize: '0.75rem'}}>{formatLocalDate(entry.fecha_solicitud_almacen)}</span></div>
                                              <div className={styles.detailItem}><label>Obs.</label><span style={{fontSize: '0.7rem', color: '#64748B'}}>{entry.observaciones || 'N/A'}</span></div>
                                            </div>
                                          </div>
                                          <div className={styles.lotActions}>
                                            {!entry.fecha_inicio_uso && <button onClick={()=>handleQuickStart(entry.id)} className={styles.miniActionBtn} title="Iniciar"><span className="material-symbols-rounded">play_arrow</span></button>}
                                            {entry.fecha_inicio_uso && !entry.fecha_termino_uso && <button onClick={()=>handleQuickEnd(entry.id)} className={styles.miniActionBtn} style={{color:'#EF4444'}} title="Terminar"><span className="material-symbols-rounded">stop</span></button>}
                                            <button onClick={()=>handleEdit(entry)} className={styles.miniActionBtn} style={{color:'#64748B'}} title="Editar"><span className="material-symbols-rounded">edit</span></button>
                                            <button onClick={()=>handleDelete({ lote: entry.lote, entries: [entry] })} className={styles.miniActionBtn} style={{color:'#EF4444'}} title="Eliminar Unidad"><span className="material-symbols-rounded">delete</span></button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
                                <div className={`${styles.inputGroup} ${styles.spanFull}`}>
                  <label>SUB-ÁREA DE TRABAJO</label>
                  <select 
                    value={form.sub_area} 
                    onChange={e=>setForm({...form, sub_area:e.target.value})} 
                    style={{fontWeight: 700}} 
                  >
                    <option value="HEMATOLOGÍA">HEMATOLOGÍA</option>
                    <option value="INMUNOLOGÍA">INMUNOLOGÍA</option>
                    {subAreas.filter(sa => sa !== "TODAS" && sa !== "HEMATOLOGÍA" && sa !== "INMUNOLOGÍA").map(sa => (
                      <option key={sa} value={sa}>{sa}</option>
                    ))}
                  </select>
                </div>
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
                  <div className={styles.inputGroup}>
                    <label>APARIENCIA FÍSICA CORRECTA?</label>
                    <div className={styles.toggleGroup}>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${form.apariencia_fisica === 'SI' ? styles.activeYes : ''}`}
                        onClick={() => setForm({...form, apariencia_fisica: 'SI'})}
                      >
                        SÍ
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${form.apariencia_fisica === 'NO' ? styles.activeNo : ''}`}
                        onClick={() => setForm({...form, apariencia_fisica: 'NO'})}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>¿SE ACEPTA EL PRODUCTO?</label>
                    <div className={styles.toggleGroup}>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${form.aceptado ? styles.activeYes : ''}`}
                        onClick={() => setForm({...form, aceptado: true})}
                      >
                        SÍ (ACEPTADO)
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${!form.aceptado ? styles.activeNo : ''}`}
                        onClick={() => setForm({...form, aceptado: false})}
                      >
                        NO (RECHAZADO)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.qcSection} style={{marginTop: '1.5rem'}}>
                <div className={styles.qcTitle}><span className="material-symbols-rounded">analytics</span> DESEMPEÑO ANALÍTICO</div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>¿ES NUEVO LOTE?</label>
                    <div className={styles.toggleGroup}>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${form.nuevo_lote ? styles.activeYes : ''}`}
                        onClick={() => setForm({...form, nuevo_lote: true})}
                      >
                        SÍ
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${!form.nuevo_lote ? styles.activeNo : ''}`}
                        onClick={() => setForm({...form, nuevo_lote: false})}
                      >
                        NO / N/A
                      </button>
                    </div>
                  </div>
                  <div className={styles.inputGroup}><label>TIPO DE MUESTRA PARA EVALUAR</label><input value={form.analisis_desempeno} onChange={e => setForm({...form, analisis_desempeno: e.target.value})} /></div>
                  <div className={styles.inputGroup}>
                    <label>¿CUMPLE CONDICIONES FABRICANTE?</label>
                    <div className={styles.toggleGroup}>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${form.condiciones_fabricante ? styles.activeYes : ''}`}
                        onClick={() => setForm({...form, condiciones_fabricante: true})}
                      >
                        SÍ
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.toggleBtn} ${!form.condiciones_fabricante ? styles.activeNo : ''}`}
                        onClick={() => setForm({...form, condiciones_fabricante: false})}
                      >
                        NO
                      </button>
                    </div>
                  </div>
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
