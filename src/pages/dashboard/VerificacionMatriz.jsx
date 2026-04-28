import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./VerificacionMatriz.module.css";

const MATERIAL_KEYS = [
  // Hematología
  { key: "lila", label: "Tubo Lila", icon: "water_drop", area: "hemato" },
  { key: "celeste", label: "Tubo Celeste", icon: "water_drop", area: "hemato" },
  { key: "verde", label: "Tubo Verde", icon: "water_drop", area: "hemato" },
  { key: "laminilla_he", label: "Laminillas", icon: "layers", area: "hemato" },
  
  // Química Clínica
  { key: "rojo", label: "Tubo Rojo", icon: "water_drop", area: "quimica" },
  { key: "dorado", label: "Tubo Dorado", icon: "water_drop", area: "quimica" },
  { key: "suero", label: "Suero (Secundario)", icon: "opacity", area: "quimica" },
  { key: "sec_edta", label: "Plasma EDTA", icon: "opacity", area: "quimica" },
  { key: "sec_citrato", label: "Plasma Citrato", icon: "opacity", area: "quimica" },
  { key: "pcr_covid", label: "PCR-COVID", icon: "coronavirus", area: "quimica" },

  // Microbiología
  { key: "petri", label: "Cajas Petri", icon: "label", area: "micro" },
  { key: "cultivos_detalle", label: "Cultivos", icon: "pet_supplies", area: "micro", isText: true },
  { key: "hisopo", label: "Hisopos (Cant.)", icon: "straighten", area: "micro" },
  { key: "hisopo_detalle", label: "Hisopos (Detalle)", icon: "straighten", area: "micro", isText: true },
  { key: "esputo", label: "Esputo", icon: "masks", area: "micro" },
  { key: "heces", label: "Muestra de Heces", icon: "medication", area: "micro" },
  { key: "hemo_micologico", label: "Hemo/Micológico", icon: "experiment", area: "micro" },
  { key: "mycoplasma", label: "Mycoplasma / UU", icon: "bug_report", area: "micro" },

  // Uroanálisis
  { key: "papel", label: "Orina (Azar/Alic.)", icon: "opacity", area: "uro" },
  { key: "orina_24h", label: "Orina 24h", icon: "hourglass_empty", area: "uro" },
  { key: "sec_dialisis", label: "Líq. Diálisis", icon: "opacity", area: "uro" },

  // Administración / Control
  { key: "f_do_001", label: "FO-DO-001", icon: "description", area: "admin" },
  { key: "adm_sobres_caja", label: "Cortes de Caja", icon: "payments", area: "admin" },
  { key: "adm_encuestas", label: "Encuestas SC", icon: "poll", area: "admin" },
  { key: "adm_quejas", label: "Quejas", icon: "rate_review", area: "admin" },
  { key: "adm_recibos", label: "Recibos/Contab.", icon: "receipt_long", area: "admin" },
];

export default function VerificacionMatriz() {
  const [audioCtx, setAudioCtx] = useState(null);
  useEffect(() => {
    return () => { if (audioCtx) audioCtx.close(); };
  }, [audioCtx]);

  const playAlarm = () => {
    try {
      let ctx = audioCtx;
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioCtx(ctx);
      }
      const triggerBeep = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
        return osc;
      };
      triggerBeep(1200, 0, 0.1); triggerBeep(1200, 0.2, 0.1); triggerBeep(1200, 0.4, 0.1);
    } catch (err) { console.warn("Audio blocked:", err); }
  };

  const navigate = useNavigate();
  const { user } = useAuth();
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alarmActive, setAlarmActive] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filter, setFilter] = useState("Pendiente"); 
  const [activeReceptionId, setActiveReceptionId] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [areaRecibe, setAreaRecibe] = useState("hemato");
  const [confirmInfo, setConfirmInfo] = useState(null);

  const AREAS_SOLCAN = [
    { key: "hemato", label: "Hematología" },
    { key: "uro", label: "Uroanálisis" },
    { key: "quimica", label: "Química clínica e Inmunología" },
    { key: "micro", label: "Microbiología" },
    { key: "admin", label: "Administración / Control" }
  ];

  const fetchEnvios = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      let query = supabase
        .from("logistica_envios")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "Pendiente") {
        query = query.or(`status.eq.Pendiente,status.eq.En Tránsito`)
                     .is(`a_${areaRecibe}_user`, null);
      } else if (filter !== "Todos") {
        query = query.eq("status", filter);
      }
    
      const { data, error } = await query;
      if (!error) {
        const mapped = data.map(env => {
          const recValues = {};
          const verified = {};
          MATERIAL_KEYS.forEach(m => {
            // Mapping Logic: Some columns use s_ prefix, others are f_ or adm_
            let dbKey = `s_${m.key}`;
            if (m.key.startsWith('f_') || m.key.startsWith('adm_')) {
              dbKey = m.key;
            }
            
            const rKey = `r_${m.key}`;
            recValues[m.key] = env.status === 'Recibido' ? (env[rKey] || (m.isText ? "" : 0)) : (env[dbKey] || (m.isText ? "" : 0));
            verified[m.key] = env.status === 'Recibido';
          });

          return {
            ...env,
            rec_values: recValues,
            verified,
            t_rec: { amb: (env.temp_entra_amb || 25), ref: (env.temp_entra_ref || 4) },
            t_sale: { amb: env.temp_sale_amb || 0, ref: env.temp_sale_ref || 0 },
            signatures: {
              hemato: env.a_hemato_user,
              uro: env.a_uro_user,
              quimica: env.a_quimica_user,
              micro: env.a_micro_user,
              admin: env.a_admin_user
            },
            obs: env.status === 'Recibido' ? (env.observaciones_recepcion || "") : "",
          };
        });
        setEnvios(mapped);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchEnvios(false); }, [filter]);
  useEffect(() => { fetchEnvios(true); }, [areaRecibe]);

  useEffect(() => {
    const channel = supabase.channel('cambios-logistica').on('postgres_changes', { event: '*', schema: 'public', table: 'logistica_envios' }, () => {
      fetchEnvios(true);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpdateRec = (envId, key, val) => {
    setEnvios(prev => prev.map(e => e.id === envId ? { 
      ...e, 
      rec_values: { ...e.rec_values, [key]: val } 
    } : e));
  };

  const toggleVerify = (envId, key) => {
    setEnvios(prev => prev.map(e => e.id === envId ? {
      ...e,
      verified: { ...e.verified, [key]: !e.verified[key] }
    } : e));
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const startAlarm = () => setAlarmActive(true);
  const stopAlarm = () => setAlarmActive(false);

  useEffect(() => {
    if (!activeReceptionId) { stopAlarm(); return; }
    const envioActivo = envios.find(e => e.id === activeReceptionId);
    if (!envioActivo) { stopAlarm(); return; }
    const tAmb = parseFloat(envioActivo.t_rec.amb);
    const tRef = parseFloat(envioActivo.t_rec.ref);
    if (tAmb < 20 || tAmb > 29 || tRef < 2 || tRef > 7) {
      if (!alarmActive) startAlarm();
    } else {
      if (alarmActive) stopAlarm();
    }
  }, [envios, activeReceptionId]);

  useEffect(() => {
    let interval;
    if (alarmActive) {
      const ps = () => { playAlarm(); }; ps();
      interval = setInterval(ps, 1500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [alarmActive]);

  const handleFinalizar = async (envio) => {
    const initials = user?.name?.split(" ").map(n => n[0]).join("").substring(0, 3).toUpperCase() || "SOL";
    const timeShort = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
    
    const updatePayload = {
      [`a_${areaRecibe}_user`]: initials,
      [`a_${areaRecibe}_time`]: timeShort,
      temp_entra_amb: parseFloat(envio.t_rec.amb),
      temp_entra_ref: parseFloat(envio.t_rec.ref),
      hora_recepcion: new Date().toISOString(),
      recibido_por: user?.name || "Usuario Sistema",
      observaciones_recepcion: envio.obs
    };

    // Dinámicamente mapear r_key
    MATERIAL_KEYS.filter(m => m.area === areaRecibe).forEach(m => {
      updatePayload[`r_${m.key}`] = envio.rec_values[m.key];
    });

    const { error } = await supabase.from("logistica_envios").update(updatePayload).eq("id", envio.id);

    if (error) alert("Error: " + error.message);
    else { 
      if (envio.mensajero_id) {
        await supabase.from("notificaciones").insert([{
          role: "mensajero",
          title: "Área Recibida en Matriz",
          message: `El área de ${AREAS_SOLCAN.find(a => a.key === areaRecibe)?.label} ha aceptado tu entrega de ${envio.sucursal}.`,
          type: "success"
        }]);
      }
      setActiveReceptionId(null); 
      if (filter !== 'Todos') setEnvios(prev => prev.filter(e => e.id !== envio.id));
      setShowSuccess(true);
    }
  };

  const handleFinalizarGlobal = async (envioParam) => {
    const envio = envioParam || confirmInfo;
    if (!envio) return;
    setConfirmInfo(null);
    
    const updatePayload = {
      status: 'Recibido',
      hora_recepcion: new Date().toISOString(),
      recibido_por: user?.name || "Usuario Sistema",
      observaciones_recepcion: envio.obs
    };

    MATERIAL_KEYS.forEach(m => {
      updatePayload[`r_${m.key}`] = envio.rec_values[m.key];
    });

    const { error } = await supabase.from("logistica_envios").update(updatePayload).eq("id", envio.id);
    if (error) alert("Error: " + error.message);
    else { 
      setShowSuccess(true);
      setActiveReceptionId(null);
      setEnvios(prev => prev.filter(e => e.id !== envio.id));
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <span className="material-symbols-rounded">arrow_back</span> Volver
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Panel de Control Matriz</h1>
          <p className={styles.subtitle}>Supervisión global de la cadena de custodia</p>
        </div>
      </header>

      <div className={styles.filterBar}>
        {["Todos", "Pendiente", "En Tránsito", "Recibido"].map(f => (
          <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className={styles.mainContent}>
        {loading ? (
          <div className={styles.emptyState}><span className="material-symbols-rounded spin">sync</span><p>Cargando información...</p></div>
        ) : envios.length === 0 ? (
          <div className={styles.emptyState}>
              <div className={styles.emptyIconBox}><span className="material-symbols-rounded">inventory_2</span></div>
              <h3 className={styles.emptyTitle}>Sin envíos pendientes</h3>
          </div>
        ) : (
          <div className={styles.grid}>
            {envios.map(envio => {
              const isRecibido = envio.status === 'Recibido';
              const isActive = activeReceptionId === envio.id;

              return (
                <div key={envio.id} className={`${styles.card} ${isRecibido ? styles.cardReadOnly : ''} ${expandedIds.includes(envio.id) ? styles.cardExpanded : ''}`}>
                  <div className={styles.cardHeader} onClick={() => isRecibido && toggleExpand(envio.id)}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      {isRecibido && <span className="material-symbols-rounded">{expandedIds.includes(envio.id) ? 'expand_less' : 'expand_more'}</span>}
                      <div>
                        <h4 style={{marginBottom:'4px'}}>{envio.sucursal}</h4>
                        <div className={styles.miniAreaStatusLine}>
                          {AREAS_SOLCAN.map(area => (
                            <span key={area.key} className={`${styles.miniAreaBadge} ${envio.signatures[area.key] ? styles.badgeSigned : styles.badgeNotNeeded}`}>
                              {area.key.substring(0,2).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`${styles.statusBadge} ${styles['status_' + envio.status.replace(/ /g, '_')]}`}>{envio.status}</span>
                  </div>

                  {(!isRecibido || expandedIds.includes(envio.id)) && (
                    <div className={styles.cardContent}>
                    {!isActive && !isRecibido ? (
                      <div className={styles.transitSummary}>
                         <p><span className="material-symbols-rounded">local_shipping</span> <strong>{envio.status}</strong></p>
                         <button className={styles.startBtn} onClick={() => setActiveReceptionId(envio.id)}>Iniciar Recepción</button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.receptionHeader}>
                           {envio.observaciones_sucursal && <div className={styles.branchObsNoticeInline}><strong>Observación Origen:</strong> {envio.observaciones_sucursal}</div>}
                           <div className={styles.evidenceSection}>
                             {envio.img_url && envio.img_url.split('|').map((url, i) => <img key={i} src={url} className={styles.miniThumb} onClick={() => window.open(url, '_blank')} />)}
                           </div>
                        </div>

                        <div className={styles.areaSelectorBox}>
                          <div className={styles.areaQuickSelect}>
                            {AREAS_SOLCAN.map(a => (
                              <button key={a.key} className={`${styles.areaBtnPill} ${areaRecibe === a.key ? styles.areaBtnPillActive : ''}`} onClick={() => setAreaRecibe(a.key)}>{a.label}</button>
                            ))}
                          </div>
                        </div>

                        <div className={styles.auditChecklist}>
                            <div className={styles.checklistGridHeader}><span>Material / Formato</span><span>Enviado</span><span>Recibido</span><span>Check</span></div>
                            {MATERIAL_KEYS.filter(m => m.area === areaRecibe).map(item => {
                              const sent = envio[`s_${item.key}`] || (item.isText ? "" : 0);
                              const rec = envio.rec_values[item.key];
                              return (
                                <div key={item.key} className={`${styles.auditRow} ${envio.verified[item.key] ? styles.vRowSuccess : ''}`}>
                                  <span className={styles.vLabel}>{item.label}</span>
                                  <span className={styles.vSent}>{sent}</span>
                                  {isRecibido ? <span className={styles.vConfirmed}>{rec}</span> : (
                                    item.isText ? <input className={styles.vInput} value={rec} onChange={e => handleUpdateRec(envio.id, item.key, e.target.value)} /> :
                                    <input type="number" className={styles.vInput} value={rec} onChange={e => handleUpdateRec(envio.id, item.key, e.target.value)} />
                                  )}
                                  <div className={styles.checkCol}>
                                     <input type="checkbox" checked={envio.verified[item.key]} onChange={() => toggleVerify(envio.id, item.key)} disabled={isRecibido} />
                                  </div>
                                </div>
                              )
                            })}
                        </div>

                        <div className={styles.tempReceptionBox}>
                            <div className={`${styles.tempItem} ${parseFloat(envio.t_rec.amb) > 29 || parseFloat(envio.t_rec.amb) < 20 ? styles.tempDanger : ''}`}>
                               <label>Ambiente Matriz (°C)</label>
                               <input type="number" step="0.1" value={envio.t_rec.amb} onChange={e => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: e.target.value}} : ev))} disabled={isRecibido} />
                            </div>
                            <div className={`${styles.tempItem} ${parseFloat(envio.t_rec.ref) > 7 || parseFloat(envio.t_rec.ref) < 2 ? styles.tempDanger : ''}`}>
                               <label>Refri Matriz (°C)</label>
                               <input type="number" step="0.1" value={envio.t_rec.ref} onChange={e => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, ref: e.target.value}} : ev))} disabled={isRecibido} />
                            </div>
                        </div>

                        {!isRecibido && (
                          <div className={styles.actionsContainer}>
                            <button className={styles.saveBtn} onClick={() => handleFinalizar(envio)}>Firmar {AREAS_SOLCAN.find(a => a.key === areaRecibe)?.label}</button>
                            {(user?.role === 'admin' || user?.role === 'administrador') && <button className={styles.finishBtnGlobal} onClick={() => setConfirmInfo(envio)}>Cierre Global</button>}
                          </div>
                        )}
                      </>
                    )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSuccess && <div className={styles.modalOverlay} onClick={() => setShowSuccess(false)}><div className={styles.successModal}><h2>¡Recepción Exitosa!</h2><button className={styles.premiumBtn} onClick={() => setShowSuccess(false)}>Entendido</button></div></div>}
      {confirmInfo && <div className={styles.modalOverlay}><div className={styles.confirmModal}><h2>¿Cierre Definitivo?</h2><p>Marcar hielera como recibida globalmente.</p><div className={styles.confirmActions}><button className={styles.cancelBtn} onClick={() => setConfirmInfo(null)}>Cancelar</button><button className={styles.confirmBtn} onClick={() => handleFinalizarGlobal()}>Confirmar</button></div></div></div>}
    </div>
  );
}
