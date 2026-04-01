import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./VerificacionMatriz.module.css";

const MATERIAL_KEYS = [
  { key: "dorado", label: "Tubo Dorado", icon: "water_drop" },
  { key: "rojo", label: "Tubo Rojo", icon: "water_drop" },
  { key: "lila", label: "Tubo Lila", icon: "water_drop" },
  { key: "celeste", label: "Tubo Celeste", icon: "water_drop" },
  { key: "verde", label: "Tubo Verde", icon: "water_drop" },
  { key: "petri", label: "Cajas Petri", icon: "biotech" },
  { key: "laminilla", label: "Laminillas", icon: "layers" },
  { key: "suero", label: "Suero Separado", icon: "colorize" },
  { key: "orina", label: "Tubo con Orina", icon: "opacity" },
];

const playAlarm = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const triggerBeep = (freq, start, duration) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, audioContext.currentTime + start);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.1, audioContext.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + start + duration);
    osc.start(audioContext.currentTime + start);
    osc.stop(audioContext.currentTime + start + duration);
    return osc;
  };
  triggerBeep(1200, 0, 0.1);
  triggerBeep(1200, 0.2, 0.1);
  triggerBeep(1200, 0.4, 0.1);
  return { oscillator: { stop: () => {} }, audioContext };
};

export default function VerificacionMatriz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alarmActive, setAlarmActive] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filter, setFilter] = useState("Pendiente"); // Cambiamos default para ver lo nuevo primero
  const [activeReceptionId, setActiveReceptionId] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [areaRecibe, setAreaRecibe] = useState("hemato");

  const AREAS_SOLCAN = [
    { key: "hemato", label: "Hematología" },
    { key: "uro", label: "Uroanálisis" },
    { key: "quimica", label: "Química clínica e Inmunología" },
    { key: "archivo", label: "Control y Archivo" },
    { key: "calidad", label: "Dirección técnica y de calidad" },
    { key: "admin", label: "Dirección de administración y finanzas" },
    { key: "recursos", label: "Recursos materiales" }
  ];

  const fetchEnvios = async () => {
    setLoading(true);
    let query = supabase.from("logistica_envios").select("*");
    
    if (filter === "Pendiente") {
        // Vemos tanto lo solicitado como lo que ya está en camino,
        // pero solo si MI ÁREA aún no lo ha firmado.
        query = query.or(`status.eq.Pendiente,status.eq.En Tránsito`)
                     .is(`a_${areaRecibe}_user`, null);
    } else if (filter !== "Todos") {
        query = query.eq("status", filter);
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error) {
      const mapped = data.map(env => ({
        ...env,
        rec_values: {
          dorado: env.status === 'Recibido' ? (env.r_dorado || 0) : (env.s_dorado || 0),
          rojo: env.status === 'Recibido' ? (env.r_rojo || 0) : (env.s_rojo || 0),
          lila: env.status === 'Recibido' ? (env.r_lila || 0) : (env.s_lila || 0),
          celeste: env.status === 'Recibido' ? (env.r_celeste || 0) : (env.s_celeste || 0),
          verde: env.status === 'Recibido' ? (env.r_verde || 0) : (env.s_verde || 0),
          petri: env.status === 'Recibido' ? (env.r_petri || 0) : (env.s_petri || 0),
          laminilla: env.status === 'Recibido' ? (env.r_laminilla || 0) : (env.s_laminilla || 0),
          suero: env.status === 'Recibido' ? (env.r_suero || 0) : (env.s_suero || 0),
          orina: env.status === 'Recibido' ? (env.r_papel || 0) : (env.s_papel || 0)
        },
        verified: {
          dorado: env.status === 'Recibido',
          rojo: env.status === 'Recibido',
          lila: env.status === 'Recibido',
          celeste: env.status === 'Recibido',
          verde: env.status === 'Recibido',
          petri: env.status === 'Recibido',
          laminilla: env.status === 'Recibido',
          suero: env.status === 'Recibido',
          orina: env.status === 'Recibido'
        },
        t_rec: { 
          amb: env.status === 'Recibido' ? (env.temp_entra_amb || 24) : 25, 
          ref: env.status === 'Recibido' ? (env.temp_entra_ref || 4) : 4 
        },
        obs: env.status === 'Recibido' ? (env.observaciones_recepcion || "") : "",
      }));
      setEnvios(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnvios();
    const channel = supabase.channel('cambios-logistica').on('postgres_changes', { event: '*', schema: 'public', table: 'logistica_envios' }, () => {
      fetchEnvios();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter, areaRecibe]);

  const handleUpdateRec = (envId, key, val) => {
    setEnvios(prev => prev.map(e => e.id === envId ? { 
      ...e, 
      rec_values: { ...e.rec_values, [key]: parseInt(val) || 0 } 
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

  // Lógica de Alarma Térmica en Tiempo Real: Ambiente (20-29°C) / Refri (2-7°C)
  useEffect(() => {
    if (!activeReceptionId) {
      stopAlarm();
      return;
    }

    const envioActivo = envios.find(e => e.id === activeReceptionId);
    if (!envioActivo) {
        stopAlarm();
        return;
    }

    const tAmb = parseFloat(envioActivo.t_rec.amb);
    const tRef = parseFloat(envioActivo.t_rec.ref);

    // Verificamos si los valores son numéricos y están fuera de rango
    const isAmbFuera = !isNaN(tAmb) && (tAmb < 20 || tAmb > 29);
    const isRefFuera = !isNaN(tRef) && (tRef < 2 || tRef > 7);

    if (isAmbFuera || isRefFuera) {
      if (!alarmActive) startAlarm();
    } else {
      if (alarmActive) stopAlarm();
    }
  }, [envios, activeReceptionId]);

  useEffect(() => {
    let interval;
    if (alarmActive) {
      const ps = () => { playAlarm(); };
      ps();
      interval = setInterval(ps, 1500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [alarmActive]);

  const handleFinalizar = async (envio) => {
    const isCrisis = envio.t_rec.amb > 29 || envio.t_rec.amb < 20 || envio.t_rec.ref > 7 || envio.t_rec.ref < 2;
    if (isCrisis) { startAlarm(); alert("¡ALERTA TÉRMICA DETECTADA!"); }

    const initials = user?.name?.split(" ").map(n => n[0]).join("").substring(0, 3).toUpperCase() || "SOL";
    const timeShort = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    const { error } = await supabase.from("logistica_envios").update({
      [`a_${areaRecibe}_user`]: initials,
      [`a_${areaRecibe}_time`]: timeShort,
      // Solo actualizamos estos datos fundamentales la primera vez o si están vacíos
      temp_entra_amb: parseFloat(envio.t_rec.amb),
      temp_entra_ref: parseFloat(envio.t_rec.ref),
      hora_recepcion: new Date().toISOString(),
      recibido_por: user?.name || "Usuario Sistema",
    }).eq("id", envio.id);

    if (error) alert("Error: " + error.message);
    else { 
      setActiveReceptionId(null); 
      if (filter !== 'Todos') setEnvios(prev => prev.filter(e => e.id !== envio.id));
      setShowSuccess(true);
    }
  };

  const handleFinalizarGlobal = async (envio) => {
    if (!window.confirm("¿Estás seguro de cerrar este envío definitivamente? Esto lo marcará como RECIBIDO para todas las áreas.")) return;

    const { error } = await supabase.from("logistica_envios").update({
      status: 'Recibido',
      hora_recepcion: new Date().toISOString(),
      recibido_por: user?.name || "Usuario Sistema"
    }).eq("id", envio.id);

    if (error) alert("Error: " + error.message);
    else { 
      setActiveReceptionId(null); 
      setEnvios(prev => prev.filter(e => e.id !== envio.id));
      setExpandedIds(prev => prev.filter(id => id !== envio.id));
      setShowSuccess(true);
    }
  };

  return (
    <div className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.backBtn}>
        <span className="material-symbols-rounded">arrow_back</span>
        Volver
      </button>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Panel de Control Matriz</h1>
          <p className={styles.subtitle}>Supervisión global de la cadena de custodia</p>
        </div>
        <button onClick={fetchEnvios} className={styles.premiumRefreshBtn}>
          <span className={`material-symbols-rounded ${loading ? 'spin' : ''}`}>sync</span> Actualizar
        </button>
      </div>

      <div className={styles.filterBar}>
        {["Todos", "Pendiente", "En Tránsito", "Recibido"].map(f => (
          <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading && envios.length === 0 ? (
        <div className={styles.emptyState}><span className="material-symbols-rounded spin">sync</span></div>
      ) : (
        <div className={styles.grid}>
          {envios.map(envio => {
            const isRecibido = envio.status === 'Recibido';
            const isActive = activeReceptionId === envio.id;

            return (
              <div key={envio.id} className={`${styles.card} ${isRecibido ? styles.cardReadOnly : ''} ${expandedIds.includes(envio.id) ? styles.cardExpanded : ''}`}>
                <div className={styles.cardHeader} onClick={() => isRecibido && toggleExpand(envio.id)} style={{cursor: isRecibido ? 'pointer' : 'default'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    {isRecibido && (
                      <span className="material-symbols-rounded">
                        {expandedIds.includes(envio.id) ? 'expand_less' : 'expand_more'}
                      </span>
                    )}
                    <h4>{envio.sucursal}</h4>
                  </div>
                  <span className={`${styles.statusBadge} ${styles['status_' + envio.status.replace(/ /g, '_')]}`}>{envio.status}</span>
                </div>

                {isRecibido && !expandedIds.includes(envio.id) && (
                  <div className={styles.collapsedSummary} onClick={() => toggleExpand(envio.id)}>
                    <div className={styles.summaryInfo}>
                      <span>📅 {new Date(envio.hora_recepcion || envio.created_at).toLocaleDateString()} <span style={{marginLeft:'5px', color:'var(--co-accent)'}}>🕒 {new Date(envio.hora_recepcion || envio.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span></span>
                      <span>👤 {envio.recibido_por || 'Sistema'}</span>
                    </div>
                  </div>
                )}

                {(!isRecibido || expandedIds.includes(envio.id)) && (
                  <div className={styles.cardContent}>
                {!isActive && !isRecibido ? (
                  <div className={styles.transitSummary}>
                    {envio.status === 'Pendiente' ? (
                      <>
                        <p>🚛 <strong>Esperando Recolección</strong> • Sucursal solicitó transporte</p>
                        <div className={styles.waitingNotice}>📍 No se puede recibir en Matriz hasta que un chofer lo recolecte.</div>
                      </>
                    ) : envio[`a_${areaRecibe}_user`] ? (
                      <div className={styles.areaAlreadyDone}>
                        <span className="material-symbols-rounded">verified_user</span>
                        <div>
                          <p><strong>{AREAS_SOLCAN.find(a => a.key === areaRecibe)?.label} Procesado</strong></p>
                          <small>Firmado por: {envio[`a_${areaRecibe}_user`]} a las {envio[`a_${areaRecibe}_time`]}h</small>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>🚚 Muestras en camino • Chofer: <strong>{envio.mensajero_id}</strong></p>
                        <button className={styles.startBtn} onClick={() => setActiveReceptionId(envio.id)}>📦 Iniciar Recepción Física</button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className={styles.receptionHeader}>
                       {envio.observaciones_sucursal && (
                         <div className={styles.branchObsNoticeInline}>
                            <strong>⚠️ Observación de Origen:</strong> {envio.observaciones_sucursal}
                         </div>
                       )}
                       <div className={styles.evidenceSection}>
                       {envio.img_url && envio.img_url.split('|').map((url, i) => (
                         <img key={i} src={url} className={styles.miniThumb} onClick={() => window.open(url, '_blank')} />
                       ))}
                      </div>
                    </div>

                    <div className={styles.auditChecklist}>
                        <div className={styles.checklistGridHeader}>
                           <span>Material</span>
                           <span>Enviado</span>
                           <span>Recibido</span>
                           <span>¿Corrobora?</span>
                        </div>
                        {MATERIAL_KEYS.map(item => {
                          const sent = envio[`s_${item.key === 'orina' ? 'papel' : item.key}`] || 0;
                          const rec = envio.rec_values[item.key];
                          const isVerified = envio.verified[item.key];
                          
                          return (
                            <div key={item.key} className={`${styles.auditRow} ${isVerified ? styles.vRowSuccess : ''}`}>
                              <span className={styles.vLabel}>{item.label}</span>
                              <span className={styles.vSent}>{sent}</span>
                              {isRecibido ? <span className={styles.vConfirmed}>{rec}</span> : 
                               <input type="number" className={styles.vInput} value={rec} onChange={(e) => handleUpdateRec(envio.id, item.key, e.target.value)} />}
                              
                              <div className={styles.vVerifyAction}>
                                 {isRecibido ? (
                                    <span className="material-symbols-rounded" style={{color: '#10B981'}}>verified</span>
                                 ) : (
                                    <input type="checkbox" checked={isVerified} onChange={() => toggleVerify(envio.id, item.key)} />
                                 )}
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    <div className={styles.tempBox}>
                        <div className={`${styles.tempItem} ${(!isNaN(parseFloat(envio.t_rec.amb)) && (parseFloat(envio.t_rec.amb) < 20 || parseFloat(envio.t_rec.amb) > 29)) ? styles.tempDanger : ''}`}>
                           <label><span className="material-symbols-rounded">device_thermostat</span> Ambiente Arribo (°C)</label>
                           {isRecibido ? <span>{envio.t_rec.amb}°C</span> : (
                             <div className={styles.stepperContainer}>
                               <button className={styles.stepperBtn} onClick={() => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: parseFloat((parseFloat(ev.t_rec.amb) - 0.5).toFixed(1))}} : ev))}>-</button>
                               <input type="number" step="0.1" value={envio.t_rec.amb} onChange={(e) => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: e.target.value}} : ev))} />
                               <button className={styles.stepperBtn} onClick={() => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: parseFloat((parseFloat(ev.t_rec.amb) + 0.5).toFixed(1))}} : ev))}>+</button>
                             </div>
                           )}
                        </div>
                        <div className={`${styles.tempItem} ${(!isNaN(parseFloat(envio.t_rec.ref)) && (parseFloat(envio.t_rec.ref) < 2 || parseFloat(envio.t_rec.ref) > 7)) ? styles.tempDanger : ''}`}>
                           <label><span className="material-symbols-rounded">ac_unit</span> Refri Arribo (°C)</label>
                           {isRecibido ? <span>{envio.t_rec.ref}°C</span> : (
                             <div className={styles.stepperContainer}>
                               <button className={styles.stepperBtn} onClick={() => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, ref: parseFloat((parseFloat(ev.t_rec.ref) - 0.5).toFixed(1))}} : ev))}>-</button>
                               <input type="number" step="0.1" value={envio.t_rec.ref} onChange={(e) => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, ref: e.target.value}} : ev))} />
                               <button className={styles.stepperBtn} onClick={() => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, ref: parseFloat((parseFloat(ev.t_rec.ref) + 0.5).toFixed(1))}} : ev))}>+</button>
                             </div>
                           )}
                        </div>
                    </div>

                    {!isRecibido && (
                      <>
                        <textarea 
                          placeholder="Si algo no coincide, escribe aquí tus comentarios de discrepancia..." 
                          className={styles.observationBox}
                          value={envio.obs}
                          onChange={(e) => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, obs: e.target.value} : ev))}
                        />
                     <div className={styles.areaSelectorBox}>
                        <label>📍 ¿Para qué área técnica recibe?</label>
                        <div className={styles.areaQuickSelect}>
                          {AREAS_SOLCAN.map(a => (
                            <button 
                              key={a.key} 
                              className={`${styles.areaBtnPill} ${areaRecibe === a.key ? styles.areaBtnPillActive : ''}`}
                              onClick={() => setAreaRecibe(a.key)}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                     </div>

                        <div className={styles.actionsContainer}>
                          <button className={styles.cancelBtn} onClick={() => setActiveReceptionId(null)}>Cancelar</button>
                          <button className={styles.saveBtn} onClick={() => handleFinalizar(envio)}>
                            <span className="material-symbols-rounded">signature</span> Firmar {AREAS_SOLCAN.find(a => a.key === areaRecibe)?.label}
                          </button>
                          
                          {/* Botón de Cierre Global: Solo aparece si ya hay al menos una firma técnica */}
                          {AREAS_SOLCAN.some(area => envio[`a_${area.key}_user`]) && (
                            <button className={styles.globalCloseBtn} onClick={() => handleFinalizarGlobal(envio)}>
                              <span className="material-symbols-rounded">task_alt</span> Finalizar Envío Global
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
                </div>
              )}
              </div>
            )
          })}
        </div>
      )}

      {showSuccess && (
        <div className={styles.successOverlay}>
          <div className={styles.successCard}>
             <div className={styles.successIcon}><span className="material-symbols-rounded">verified_user</span></div>
             <h2>¡Recepción Técnica Exitosa!</h2>
             <p>Se ha registrado tu firma de cadena de custodia correctamente.</p>
             <button onClick={() => setShowSuccess(false)} className={styles.successBtn}>Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
}
