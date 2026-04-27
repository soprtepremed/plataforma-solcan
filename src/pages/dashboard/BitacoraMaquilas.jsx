import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './InventarioHemato.module.css';

const LABS = ['CLAR', 'Diagnóstica', 'SYNLAB', 'Referencia Bioquímica', 'BioMed', 'Otro'];
const SUCURSALES = ['Matriz', 'CRAE', 'Tapachula', 'San Cristobal', 'Comitan', 'Arriaga', 'Pijijiapan', 'Palenque'];
const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'CANCELADO'];
const ESTADO_COLORS = {
  PENDIENTE:   { bg: '#FEF9C3', color: '#854D0E', border: '#FDE047' },
  EN_PROCESO:  { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  ENTREGADO:   { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  CANCELADO:   { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
};

const initialForm = {
  folio: '', paciente: '', estudio: '', laboratorio: LABS[0],
  sucursal: 'Matriz', fecha_envio: new Date().toISOString().substring(0,10),
  fecha_entrega_estimada: '', costo_maquila: '', costo_paciente: '',
  observaciones: '', estado: 'PENDIENTE'
};

export default function BitacoraMaquilas() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('maquilas_especiales')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        costo_maquila:   form.costo_maquila   ? parseFloat(form.costo_maquila)   : null,
        costo_paciente:  form.costo_paciente  ? parseFloat(form.costo_paciente)  : null,
        fecha_entrega_estimada: form.fecha_entrega_estimada || null,
        registrado_por: user?.name || user?.username || 'Especiales',
      };
      if (editingId) {
        await supabase.from('maquilas_especiales').update(payload).eq('id', editingId);
      } else {
        await supabase.from('maquilas_especiales').insert([payload]);
      }
      setShowModal(false);
      setForm(initialForm);
      setEditingId(null);
      fetchData();
    } catch(err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setForm({
      folio: item.folio || '', paciente: item.paciente, estudio: item.estudio,
      laboratorio: item.laboratorio, sucursal: item.sucursal || 'Matriz',
      fecha_envio: item.fecha_envio || '',
      fecha_entrega_estimada: item.fecha_entrega_estimada || '',
      costo_maquila: item.costo_maquila || '', costo_paciente: item.costo_paciente || '',
      observaciones: item.observaciones || '', estado: item.estado,
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const changeEstado = (item, nuevoEstado) => {
    setConfirm({
      show: true,
      msg: `¿Cambiar estado a "${nuevoEstado}"?`,
      onConfirm: async () => {
        const extra = nuevoEstado === 'ENTREGADO' ? { fecha_resultado: new Date().toISOString().substring(0,10) } : {};
        await supabase.from('maquilas_especiales').update({ estado: nuevoEstado, ...extra }).eq('id', item.id);
        setConfirm({ show: false });
        fetchData();
      }
    });
  };

  const now = new Date();
  const filtered = items.filter(i => {
    const matchSearch = [i.folio, i.paciente, i.estudio, i.laboratorio].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'TODOS' || i.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const pendientesVencidos = items.filter(i =>
    i.estado === 'PENDIENTE' && i.fecha_entrega_estimada && new Date(i.fecha_entrega_estimada) < now
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span className="material-symbols-rounded" style={{color:'#7C3AED', fontSize:'2.5rem'}}>labs</span>
          Bitácora de Estudios Especiales (Maquilas)
        </div>
        <button className={styles.btnPrimary} onClick={() => { setForm(initialForm); setEditingId(null); setShowModal(true); }}>
          <span className="material-symbols-rounded">add_box</span> Nueva Maquila
        </button>
      </header>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        {['PENDIENTE','EN_PROCESO','ENTREGADO','CANCELADO'].map(e => {
          const count = items.filter(i => i.estado === e).length;
          const c = ESTADO_COLORS[e];
          return (
            <div key={e} className={styles.statCard} style={{borderLeft:`6px solid ${c.border}`, cursor:'pointer'}} onClick={() => setFilterEstado(e === filterEstado ? 'TODOS' : e)}>
              <p className={styles.statLabel}>{e.replace('_',' ')}</p>
              <h3 className={styles.statValue} style={{color: c.color}}>{loading ? '...' : count}</h3>
            </div>
          );
        })}
      </div>

      {/* Alerta de vencidos */}
      {pendientesVencidos.length > 0 && (
        <div style={{background:'#FEE2E2',border:'1.5px solid #EF4444',borderRadius:'14px',padding:'1rem 1.25rem',marginBottom:'1.5rem',display:'flex',gap:'12px',alignItems:'center'}}>
          <span className="material-symbols-rounded" style={{color:'#DC2626',fontSize:'1.8rem'}}>alarm</span>
          <div>
            <strong style={{color:'#991B1B'}}>⚠️ {pendientesVencidos.length} maquila{pendientesVencidos.length>1?'s':''} con fecha estimada vencida</strong>
            <p style={{margin:0,fontSize:'0.85rem',color:'#DC2626'}}>
              {pendientesVencidos.map(i => `${i.paciente} (${i.laboratorio})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className={styles.inventoryTable}>
        <div className={styles.tableHeader}>
          <div className={styles.searchBox}>
            <span className="material-symbols-rounded">search</span>
            <input placeholder="Buscar folio, paciente, estudio o laboratorio..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {['TODOS','PENDIENTE','EN_PROCESO','ENTREGADO','CANCELADO'].map(e => (
              <button key={e} onClick={() => setFilterEstado(e)} style={{
                padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'0.78rem',
                background: filterEstado === e ? '#7C3AED' : '#F1F5F9',
                color: filterEstado === e ? 'white' : '#64748B',
                transition:'all 0.2s'
              }}>{e.replace('_',' ')}</button>
            ))}
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div style={{textAlign:'center',padding:'5rem'}}><div className={styles.loader}></div><p>Cargando bitácora...</p></div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'5rem',color:'#64748B'}}>
              <span className="material-symbols-rounded" style={{fontSize:'4rem'}}>labs</span>
              <p>No se encontraron registros.</p>
            </div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.88rem'}}>
              <thead>
                <tr style={{background:'#F8FAFC',borderBottom:'2px solid #E2E8F0'}}>
                  {['Folio','Paciente','Estudio','Laboratorio','Enviado','Estimado','Estado','Costo','Acciones'].map(h => (
                    <th key={h} style={{padding:'12px 16px',textAlign:'left',fontWeight:800,color:'#475569',fontSize:'0.75rem',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const c = ESTADO_COLORS[item.estado] || ESTADO_COLORS.PENDIENTE;
                  const isVencido = item.estado === 'PENDIENTE' && item.fecha_entrega_estimada && new Date(item.fecha_entrega_estimada) < now;
                  const diasPendiente = item.fecha_envio ? Math.floor((now - new Date(item.fecha_envio)) / 86400000) : null;
                  return (
                    <tr key={item.id} style={{borderBottom:'1px solid #F1F5F9', background: isVencido ? '#FFF5F5' : 'white'}}>
                      <td style={{padding:'12px 16px',fontWeight:700,color:'#64748B',fontFamily:'monospace'}}>{item.folio || '—'}</td>
                      <td style={{padding:'12px 16px',fontWeight:700}}>{item.paciente}</td>
                      <td style={{padding:'12px 16px'}}>{item.estudio}</td>
                      <td style={{padding:'12px 16px'}}>
                        <span style={{background:'#EDE9FE',color:'#6D28D9',padding:'3px 10px',borderRadius:'12px',fontWeight:700,fontSize:'0.78rem'}}>{item.laboratorio}</span>
                      </td>
                      <td style={{padding:'12px 16px',fontSize:'0.82rem'}}>
                        {item.fecha_envio ? new Date(item.fecha_envio).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : '—'}
                        {diasPendiente !== null && item.estado !== 'ENTREGADO' && (
                          <div style={{fontSize:'0.7rem',color:'#94A3B8'}}>{diasPendiente}d transcurridos</div>
                        )}
                      </td>
                      <td style={{padding:'12px 16px',fontSize:'0.82rem',color: isVencido ? '#DC2626':'inherit',fontWeight: isVencido ? 700 : 'normal'}}>
                        {item.fecha_entrega_estimada ? new Date(item.fecha_entrega_estimada).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : '—'}
                        {isVencido && <div style={{fontSize:'0.7rem',color:'#DC2626'}}>⚠️ VENCIDO</div>}
                      </td>
                      <td style={{padding:'12px 16px'}}>
                        <select
                          value={item.estado}
                          onChange={e => changeEstado(item, e.target.value)}
                          style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`,borderRadius:'20px',padding:'4px 10px',fontWeight:800,fontSize:'0.78rem',cursor:'pointer'}}
                        >
                          {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                        </select>
                      </td>
                      <td style={{padding:'12px 16px',fontSize:'0.82rem'}}>
                        {item.costo_paciente ? (
                          <div>
                            <div style={{color:'#15803D',fontWeight:700}}>${parseFloat(item.costo_paciente).toFixed(2)}</div>
                            {item.costo_maquila && <div style={{color:'#EF4444',fontSize:'0.72rem'}}>Costo: ${parseFloat(item.costo_maquila).toFixed(2)}</div>}
                            {item.costo_maquila && item.costo_paciente && (
                              <div style={{fontSize:'0.7rem',color: parseFloat(item.costo_paciente)-parseFloat(item.costo_maquila) >= 0 ? '#15803D':'#DC2626',fontWeight:700}}>
                                Margen: ${(parseFloat(item.costo_paciente)-parseFloat(item.costo_maquila)).toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{padding:'12px 16px'}}>
                        <button onClick={() => handleEdit(item)} style={{background:'#F1F5F9',border:'none',borderRadius:'8px',padding:'6px 10px',cursor:'pointer',color:'#475569'}}>
                          <span className="material-symbols-rounded" style={{fontSize:'1.1rem'}}>edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de registro */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <button className={styles.closeBtnOverlay} onClick={() => setShowModal(false)} type="button">
            <span className="material-symbols-rounded">close</span>
          </button>
          <div className={styles.modal}>
            <h2 style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'10px'}}>
              <span className="material-symbols-rounded" style={{color:'#7C3AED'}}>labs</span>
              {editingId ? 'Editar Maquila' : 'Registrar Nueva Maquila'}
            </h2>
            <form onSubmit={handleSave}>
              <div className={styles.qcTitle} style={{marginTop:0}}>
                <span className="material-symbols-rounded">person</span> DATOS DEL PACIENTE Y ESTUDIO
              </div>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}><label>Folio Solcan</label><input value={form.folio} onChange={e=>setForm({...form,folio:e.target.value})} placeholder="Ej. S-001234" /></div>
                <div className={styles.inputGroup}><label>Nombre del Paciente *</label><input required value={form.paciente} onChange={e=>setForm({...form,paciente:e.target.value})} /></div>
                <div className={`${styles.inputGroup} ${styles.spanFull}`}><label>Estudio Especial *</label><input required value={form.estudio} onChange={e=>setForm({...form,estudio:e.target.value})} placeholder="Ej. Western Blot, PCR VIH, Cultivo especial..." /></div>
                <div className={styles.inputGroup}>
                  <label>Laboratorio Externo *</label>
                  <select required value={form.laboratorio} onChange={e=>setForm({...form,laboratorio:e.target.value})}>
                    {LABS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Sucursal Origen</label>
                  <select value={form.sucursal} onChange={e=>setForm({...form,sucursal:e.target.value})}>
                    {SUCURSALES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.qcTitle} style={{marginTop:'1.5rem'}}>
                <span className="material-symbols-rounded">calendar_today</span> FECHAS Y ESTADO
              </div>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}><label>Fecha de Envío *</label><input required type="date" value={form.fecha_envio} onChange={e=>setForm({...form,fecha_envio:e.target.value})} /></div>
                <div className={styles.inputGroup}><label>Entrega Estimada</label><input type="date" value={form.fecha_entrega_estimada} onChange={e=>setForm({...form,fecha_entrega_estimada:e.target.value})} /></div>
                <div className={styles.inputGroup}>
                  <label>Estado</label>
                  <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} style={{fontWeight:700}}>
                    {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.qcTitle} style={{marginTop:'1.5rem'}}>
                <span className="material-symbols-rounded">payments</span> COSTOS
              </div>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}><label>Costo al Paciente ($)</label><input type="number" step="0.01" min="0" value={form.costo_paciente} onChange={e=>setForm({...form,costo_paciente:e.target.value})} placeholder="0.00" /></div>
                <div className={styles.inputGroup}><label>Costo de Maquila ($)</label><input type="number" step="0.01" min="0" value={form.costo_maquila} onChange={e=>setForm({...form,costo_maquila:e.target.value})} placeholder="0.00" /></div>
                {form.costo_paciente && form.costo_maquila && (
                  <div className={styles.inputGroup} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <label>Margen estimado</label>
                    <span style={{fontWeight:900,fontSize:'1.2rem',color: parseFloat(form.costo_paciente)-parseFloat(form.costo_maquila)>=0?'#15803D':'#DC2626'}}>
                      ${(parseFloat(form.costo_paciente||0)-parseFloat(form.costo_maquila||0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.inputGroup} style={{marginTop:'1rem'}}>
                <label>Observaciones</label>
                <textarea value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})} style={{width:'100%',borderRadius:'12px',minHeight:'70px',padding:'12px',border:'1px solid #CBD5E1'}} />
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:'15px',marginTop:'2rem'}}>
                <button type="button" onClick={()=>setShowModal(false)} className={styles.btnSecondary}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving?'Guardando...':'Confirmar Registro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm.show && (
        <div className={styles.modalOverlay} style={{zIndex:2000}}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmHeader}>
              <span className="material-symbols-rounded" style={{fontSize:'3rem',color:'#7C3AED'}}>help_outline</span>
              <h3>Confirmar Acción</h3>
            </div>
            <p className={styles.confirmMessage}>{confirm.msg}</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={()=>setConfirm({show:false})}>Cancelar</button>
              <button className={styles.btnConfirm} onClick={confirm.onConfirm}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
