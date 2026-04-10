import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./VerificacionMatriz.module.css";

const MATERIAL_KEYS = [
  { key: "dorado", label: "Tubo Dorado", icon: "water_drop", area: "quimica" },
  { key: "rojo", label: "Tubo Rojo", icon: "water_drop", area: "quimica" },
  { key: "lila", label: "Tubo Lila", icon: "water_drop", area: "hemato" },
  { key: "celeste", label: "Tubo Celeste", icon: "water_drop", area: "hemato" },
  { key: "verde", label: "Tubo Verde", icon: "water_drop", area: "hemato" },
  { key: "petri", label: "Cajas Petri", icon: "biotech", area: "uro" },
  { key: "laminilla_he", label: "Laminilla HE", icon: "layers", area: "hemato" },
  { key: "laminilla_mi", label: "Laminilla MI", icon: "layers_clear", area: "uro" },
  { key: "suero", label: "Suero Separado", icon: "colorize", area: "quimica" },
  { key: "orina", label: "Tubo con Orina", icon: "opacity", area: "uro" },
];

export default function VerificacionMatriz() {
  // Gestión de Alarma Singleton (Optimización de Recursos)
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
      triggerBeep(1200, 0, 0.1);
      triggerBeep(1200, 0.2, 0.1);
      triggerBeep(1200, 0.4, 0.1);
    } catch (err) {
      console.warn("Audio blocked:", err);
    }
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
    { key: "archivo", label: "Control y Archivo" },
    { key: "calidad", label: "Dirección técnica y de calidad" },
    { key: "admin", label: "Dirección de administración y finanzas" },
    { key: "recursos", label: "Recursos materiales" }
  ];

  const FORMATOS_TYPES = [
    { key: "f_do_001", label: "FO-DO-001 (Sol. Análisis)", area: "archivo" },
    { key: "f_da_001", label: "FO-DA-001 (Control Muestras)", area: "archivo" },
    { key: "f_qc_020", label: "FO-QC-020 (Bitácora Mensual)", area: "archivo" },
    { key: "f_rm_004", label: "FO-RM-004 (Inventario Suministros)", area: "archivo" }
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
        const mapped = data.map(env => ({
          ...env,
          rec_values: {
            dorado: env.status === 'Recibido' ? (env.r_dorado || 0) : (env.s_dorado || 0),
            rojo: env.status === 'Recibido' ? (env.r_rojo || 0) : (env.s_rojo || 0),
            lila: env.status === 'Recibido' ? (env.r_lila || 0) : (env.s_lila || 0),
            celeste: env.status === 'Recibido' ? (env.r_celeste || 0) : (env.s_celeste || 0),
            verde: env.status === 'Recibido' ? (env.r_verde || 0) : (env.s_verde || 0),
            petri: env.status === 'Recibido' ? (env.r_petri || 0) : (env.s_petri || 0),
            laminilla_he: env.status === 'Recibido' ? (env.r_laminilla_he || 0) : (env.s_laminilla_he || 0),
            laminilla_mi: env.status === 'Recibido' ? (env.r_laminilla_mi || 0) : (env.s_laminilla_mi || 0),
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
            laminilla_he: env.status === 'Recibido',
            laminilla_mi: env.status === 'Recibido',
            suero: env.status === 'Recibido',
            orina: env.status === 'Recibido'
          },
          t_rec: { 
            amb: (env.temp_entra_amb || 25), 
            ref: (env.temp_entra_ref || 4) 
          },
          t_sale: {
            amb: env.temp_sale_amb || 0,
            ref: env.temp_sale_ref || 0
          },
          formatos: {
            f_do_001: env.f_do_001 || 0,
            f_da_001: env.f_da_001 || 0,
            f_qc_020: env.f_qc_020 || 0,
            f_rm_004: env.f_rm_004 || 0
          },
          formatos_rec: {
            f_do_001: env.status === 'Recibido' ? (env.r_f_do_001 || 0) : (env.f_do_001 || 0),
            f_da_001: env.status === 'Recibido' ? (env.r_f_da_001 || 0) : (env.f_da_001 || 0),
            f_qc_020: env.status === 'Recibido' ? (env.r_f_qc_020 || 0) : (env.f_qc_020 || 0),
            f_rm_004: env.status === 'Recibido' ? (env.r_f_rm_004 || 0) : (env.f_rm_004 || 0)
          },
          formatos_verified: {
            f_do_001: env.status === 'Recibido',
            f_da_001: env.status === 'Recibido',
            f_qc_020: env.status === 'Recibido',
            f_rm_004: env.status === 'Recibido'
          },
          signatures: {
            hemato: env.a_hemato_user,
            uro: env.a_uro_user,
            quimica: env.a_quimica_user,
            archivo: env.a_archivo_user,
            calidad: env.a_calidad_user,
            admin: env.a_admin_user,
            recursos: env.a_recursos_user
          },
          obs: env.status === 'Recibido' ? (env.observaciones_recepcion || "") : "",
        }));
        setEnvios(mapped);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnvios(false);
  }, [filter]);

  useEffect(() => {
    fetchEnvios(true);
  }, [areaRecibe]);

  useEffect(() => {
    const channel = supabase.channel('cambios-logistica').on('postgres_changes', { event: '*', schema: 'public', table: 'logistica_envios' }, () => {
      fetchEnvios(true);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpdateRec = (envId, key, val) => {
    setEnvios(prev => prev.map(e => e.id === envId ? { 
      ...e, 
      rec_values: { ...e.rec_values, [key]: Math.max(0, parseInt(val) || 0) } 
    } : e));
  };

  const handleUpdateFormatRec = (envId, key, val) => {
    setEnvios(prev => prev.map(e => e.id === envId ? {
      ...e,
      formatos_rec: { ...e.formatos_rec, [key]: Math.max(0, parseInt(val) || 0) }
    } : e));
  };

  const toggleVerify = (envId, key) => {
    setEnvios(prev => prev.map(e => e.id === envId ? {
      ...e,
      verified: { ...e.verified, [key]: !e.verified[key] }
    } : e));
  };

  const toggleFormatVerify = (envId, key) => {
    setEnvios(prev => prev.map(e => e.id === envId ? {
      ...e,
      formatos_verified: { ...e.formatos_verified, [key]: !e.formatos_verified[key] }
    } : e));
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const startAlarm = () => setAlarmActive(true);
  const stopAlarm = () => setAlarmActive(false);

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
      temp_entra_amb: parseFloat(envio.t_rec.amb),
      temp_entra_ref: parseFloat(envio.t_rec.ref),
      hora_recepcion: new Date().toISOString(),
      recibido_por: user?.name || "Usuario Sistema",
      // Persistencia de Auditoría Física (Recibido)
      r_dorado: envio.rec_values.dorado,
      r_rojo: envio.rec_values.rojo,
      r_lila: envio.rec_values.lila,
      r_celeste: envio.rec_values.celeste,
      r_verde: envio.rec_values.verde,
      r_petri: envio.rec_values.petri,
      r_laminilla_he: envio.rec_values.laminilla_he,
      r_laminilla_mi: envio.rec_values.laminilla_mi,
      r_suero: envio.rec_values.suero,
      r_papel: envio.rec_values.orina,
      // Persistencia de Formatos
      r_f_do_001: envio.formatos_rec.f_do_001,
      r_f_da_001: envio.formatos_rec.f_da_001,
      r_f_qc_020: envio.formatos_rec.f_qc_020,
      r_f_rm_004: envio.formatos_rec.f_rm_004,
      observaciones_recepcion: envio.obs
    }).eq("id", envio.id);

    if (error) alert("Error: " + error.message);
    else { 
      // Notificar al Chofer (si hay mensajero_id)
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
    const { error } = await supabase.from("logistica_envios").update({
      status: 'Recibido',
      hora_recepcion: new Date().toISOString(),
      recibido_por: user?.name || "Usuario Sistema",
      // En cierre global también aseguramos persistencia si se editó algo
      r_dorado: envio.rec_values.dorado,
      r_rojo: envio.rec_values.rojo,
      r_lila: envio.rec_values.lila,
      r_celeste: envio.rec_values.celeste,
      r_verde: envio.rec_values.verde,
      r_petri: envio.rec_values.petri,
      r_laminilla_he: envio.rec_values.laminilla_he,
      r_laminilla_mi: envio.rec_values.laminilla_mi,
      r_suero: envio.rec_values.suero,
      r_papel: envio.rec_values.orina,
      r_f_do_001: envio.formatos_rec.f_do_001,
      r_f_da_001: envio.formatos_rec.f_da_001,
      r_f_qc_020: envio.formatos_rec.f_qc_020,
      r_f_rm_004: envio.formatos_rec.f_rm_004,
      observaciones_recepcion: envio.obs
    }).eq("id", envio.id);
    if (error) alert("Error: " + error.message);
    else { 
      // Notificar al Chofer 
      if (envio.mensajero_id) {
        await supabase.from("notificaciones").insert([{
          role: "mensajero",
          title: "Envío Recibido en Matriz",
          message: `Tu entrega de la sucursal ${envio.sucursal} ha sido cerrada y aceptada globalmente por ${user?.name}.`,
          type: "success"
        }]);
      }

      setActiveReceptionId(null); 
      setEnvios(prev => prev.filter(e => e.id !== envio.id));
      setExpandedIds(prev => prev.filter(id => id !== envio.id));
      setShowSuccess(true);
    }
  };

  return (
    <div className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.backBtn}>
        <span className="material-symbols-rounded">arrow_back</span> Volver
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

      {loading ? (
        <div className={styles.emptyState}>
          <span className="material-symbols-rounded spin">sync</span>
          <p>Cargando información de matriz...</p>
        </div>
      ) : envios.length === 0 ? (
        <div className={styles.emptyState}>
            <div className={styles.emptyIconBox}>
              <span className="material-symbols-rounded">inventory_2</span>
            </div>
            <h3 className={styles.emptyTitle}>Sin envíos pendientes</h3>
            <p className={styles.emptyDesc}>Por el momento no hay ningún envío en la sucursal que requiera atención técnica o física.</p>
            <button onClick={fetchEnvios} className={styles.refreshBtnPill}>
               <span className="material-symbols-rounded">refresh</span> Reintentar actualización
            </button>
        </div>
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
                    <div>
                      <h4 style={{marginBottom:'4px'}}>{envio.sucursal}</h4>
                      <div className={styles.miniAreaStatusLine}>
                        {AREAS_SOLCAN.map(area => {
                          const isSigned = !!envio.signatures[area.key];
                          // Lógica de Requerido (Basada en muestras y formatos)
                          const hasContent = 
                            MATERIAL_KEYS.some(m => m.area === area.key && (envio[`s_${m.key === 'orina' ? 'papel' : m.key}`] > 0)) ||
                            (area.key === 'archivo' && (envio.f_do_001 > 0 || envio.f_da_001 > 0 || envio.f_qc_020 > 0 || envio.f_rm_004 > 0));

                          return (
                            <span 
                              key={area.key} 
                              className={`${styles.miniAreaBadge} ${isSigned ? styles.badgeSigned : hasContent ? styles.badgeRequired : styles.badgeNotNeeded}`}
                              title={isSigned ? `Firmado por ${envio.signatures[area.key]}` : area.label}
                            >
                              {area.key.substring(0,2).toUpperCase()}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${styles['status_' + envio.status.replace(/ /g, '_')]}`}>{envio.status}</span>
                </div>

                {isRecibido && !expandedIds.includes(envio.id) && (
                  <div className={styles.collapsedSummary} onClick={() => toggleExpand(envio.id)}>
                    <div className={styles.summaryInfo}>
                      <span><span className="material-symbols-rounded" style={{fontSize: '14px', verticalAlign: 'middle', marginRight: '4px'}}>calendar_today</span> {new Date(envio.hora_recepcion || envio.created_at).toLocaleDateString()} <span style={{marginLeft:'5px', color:'var(--co-accent)'}}><span className="material-symbols-rounded" style={{fontSize: '14px', verticalAlign: 'middle', marginRight: '4px'}}>schedule</span> {new Date(envio.hora_recepcion || envio.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span></span>
                      <span><span className="material-symbols-rounded" style={{fontSize: '14px', verticalAlign: 'middle', marginRight: '4px'}}>person</span> {envio.recibido_por || 'Sistema'}</span>
                    </div>
                  </div>
                )}

                {(!isRecibido || expandedIds.includes(envio.id)) && (
                  <div className={styles.cardContent}>
                  {!isActive && !isRecibido ? (
                    <div className={styles.transitSummary}>
                      {envio.status === 'Pendiente' ? (
                        <>
                          <p><span className="material-symbols-rounded" style={{fontSize: '18px', verticalAlign: 'middle', marginRight: '4px'}}>local_shipping</span> <strong>Esperando Recolección</strong> • Sucursal solicitó transporte</p>
                          <div className={styles.waitingNotice}><span className="material-symbols-rounded" style={{fontSize: '16px', verticalAlign: 'middle', marginRight: '4px'}}>location_on</span> No se puede recibir en Matriz hasta que un chofer lo recolecte.</div>
                        </>
                      ) : envio[`a_${areaRecibe}_user`] ? (
                        <div className={styles.areaAlreadyDone}>
                          <div className={styles.areaBadgeInfo}>
                            <span className="material-symbols-rounded">verified_user</span>
                            <div>
                              <p><strong>{AREAS_SOLCAN.find(a => a.key === areaRecibe)?.label} Procesado</strong></p>
                              <small>Firmado por: {envio[`a_${areaRecibe}_user`]} a las {envio[`a_${areaRecibe}_time`]}h</small>
                            </div>
                          </div>
                          <div className={styles.shortcutActions}>
                             <button className={styles.reviewBtn} onClick={() => setActiveReceptionId(envio.id)}>
                               <span className="material-symbols-rounded">visibility</span> Revisar Detalle
                             </button>
                             {AREAS_SOLCAN.some(area => envio[`a_${area.key}_user`]) && (
                               <button className={styles.globalCloseBtnMini} onClick={() => setConfirmInfo(envio)}>
                                 <span className="material-symbols-rounded">task_alt</span> Cierre Global
                               </button>
                             )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <p><span className="material-symbols-rounded" style={{fontSize: '18px', verticalAlign: 'middle', marginRight: '4px'}}>local_shipping</span> Muestras en camino • Chofer: <strong>{envio.mensajero_id}</strong></p>
                          <button className={styles.startBtn} onClick={() => setActiveReceptionId(envio.id)}><span className="material-symbols-rounded" style={{marginRight: '8px'}}>inventory_2</span> Iniciar Recepción Física</button>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className={styles.receptionHeader}>
                         {envio.observaciones_sucursal && (
                           <div className={styles.branchObsNoticeInline}>
                              <strong>Observación de Origen:</strong> {envio.observaciones_sucursal}
                           </div>
                         )}
                         <div className={styles.evidenceSection}>
                         {envio.img_url && envio.img_url.split('|').map((url, i) => (
                           <img key={i} src={url} className={styles.miniThumb} onClick={() => window.open(url, '_blank')} />
                         ))}
                        </div>
                      </div>

                      <div className={styles.areaSelectorBox}>
                        <label><span className="material-symbols-rounded" style={{fontSize: '18px', verticalAlign: 'middle', marginRight: '4px'}}>location_on</span> ¿Para qué área técnica recibe?</label>
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
                            const isLocked = !!envio.signatures[item.area];
                            
                            return (
                              <div key={item.key} className={`${styles.auditRow} ${isVerified ? styles.vRowSuccess : ''} ${isLocked ? styles.vRowLocked : ''}`}>
                                <span className={styles.vLabel}>{item.label}</span>
                                <span className={styles.vSent}>{sent}</span>
                                {(isRecibido || isLocked) ? <span className={styles.vConfirmed}>{rec}</span> : 
                                 <input 
                                   type="number" 
                                   min="0"
                                   className={styles.vInput} 
                                   value={rec} 
                                   onChange={(e) => handleUpdateRec(envio.id, item.key, e.target.value)} 
                                 />}
                                <div className={styles.vVerifyAction}>
                                   {(isRecibido || isLocked) ? (
                                      <span className="material-symbols-rounded" style={{color: isLocked ? '#94A3B8' : '#10B981'}}>
                                        {isLocked ? 'lock' : 'verified'}
                                      </span>
                                   ) : (
                                      <input type="checkbox" checked={isVerified} onChange={() => toggleVerify(envio.id, item.key)} />
                                   )}
                                </div>
                              </div>
                            )
                          })}
                      </div>

                      <div className={styles.checklistSection}>
                          <h4 className={styles.sectionSubTitle}>Formatos de Sucursal</h4>
                          <div className={styles.checklistGridHeader}>
                              <span>Formato</span>
                              <span>Enviado</span>
                              <span>Recibido</span>
                              <span>¿Corrobora?</span>
                          </div>
                          {FORMATOS_TYPES.map(f => {
                            const isVerified = envio.formatos_verified[f.key];
                            const recVal = envio.formatos_rec[f.key];
                            const isLocked = !!envio.signatures[f.area];
                            return (
                              <div key={f.key} className={`${styles.auditRow} ${isVerified ? styles.vRowSuccess : ''} ${isLocked ? styles.vRowLocked : ''}`}>
                                 <span className={styles.vLabel}>{f.label}</span>
                                 <span className={styles.vSent}>{envio.formatos[f.key]}</span>
                                 {(isRecibido || isLocked) ? (
                                    <span className={styles.vConfirmed}>{recVal}</span>
                                 ) : (
                                    <input 
                                      type="number" 
                                      min="0"
                                      className={styles.vInput} 
                                      value={recVal} 
                                      onChange={(e) => handleUpdateFormatRec(envio.id, f.key, e.target.value)} 
                                    />
                                 )}
                                 <div className={styles.vVerifyAction}>
                                    {(isRecibido || isLocked) ? (
                                       <div className={styles.receivedBadge}>
                                         <span className="material-symbols-rounded" style={{fontSize:'1rem'}}>check_circle</span>
                                         <span>RECIBIDO</span>
                                       </div>
                                    ) : (
                                       <input 
                                         type="checkbox" 
                                         checked={isVerified} 
                                         onChange={() => toggleFormatVerify(envio.id, f.key)} 
                                       />
                                    )}
                                 </div>
                              </div>
                            )
                          })}
                      </div>

                      <div className={styles.tempBox}>
                          <div className={`${styles.tempItem} ${(!isNaN(parseFloat(envio.t_rec.amb)) && (parseFloat(envio.t_rec.amb) < 20 || parseFloat(envio.t_rec.amb) > 29)) ? styles.tempDanger : ''}`}>
                             <div className={styles.tempLabels}>
                                <label><span className="material-symbols-rounded">device_thermostat</span> Ambiente Arribo (°C)</label>
                                <small className={styles.sourceTemp}>Salida: {envio.t_sale.amb}°C</small>
                             </div>
                             {isRecibido ? <span>{envio.t_rec.amb}°C</span> : (
                               <div className={styles.stepperContainer}>
                                 <button className={styles.stepperBtn} onClick={() => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: parseFloat((parseFloat(ev.t_rec.amb) - 0.5).toFixed(1))}} : ev))}>-</button>
                                 <input type="number" step="0.1" value={envio.t_rec.amb} onChange={(e) => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: e.target.value}} : ev))} />
                                 <button className={styles.stepperBtn} onClick={() => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: parseFloat((parseFloat(ev.t_rec.amb) + 0.5).toFixed(1))}} : ev))}>+</button>
                               </div>
                             )}
                          </div>
                          <div className={`${styles.tempItem} ${(!isNaN(parseFloat(envio.t_rec.ref)) && (parseFloat(envio.t_rec.ref) < 2 || parseFloat(envio.t_rec.ref) > 7)) ? styles.tempDanger : ''}`}>
                             <div className={styles.tempLabels}>
                                <label><span className="material-symbols-rounded">ac_unit</span> Refri Arribo (°C)</label>
                                <small className={styles.sourceTemp}>Salida: {envio.t_sale.ref}°C</small>
                             </div>
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
                          <div className={styles.actionsContainer}>
                            <button className={styles.cancelBtn} onClick={() => setActiveReceptionId(null)}>Cancelar</button>
                            <button className={styles.saveBtn} onClick={() => handleFinalizar(envio)}>
                              <span className="material-symbols-rounded">signature</span> Firmar {AREAS_SOLCAN.find(a => a.key === areaRecibe)?.label}
                            </button>
                            {/* Solo el Administrador puede Cerrar Globalmente el Recibo */}
                            {!isRecibido && (user?.role === 'admin' || user?.role === 'administrador') && (
                              <button 
                                className={styles.finishBtnGlobal}
                                onClick={() => handleFinalizarGlobal(envio.id)}
                              >
                                <span className="material-symbols-rounded">done_all</span>
                                Cerrar Recibo de Hielera
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
            );
          })}
        </div>
      )}

      {showSuccess && (
        <div className={styles.modalOverlay} onClick={() => setShowSuccess(false)}>
          <div className={styles.successModal} onClick={e => e.stopPropagation()}>
            <div className={styles.successIcon}>
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <h2>¡Recepción Exitosa!</h2>
            <p>La bitácora ha sido actualizada y firmada correctamente.</p>
            <button className={styles.premiumBtn} onClick={() => setShowSuccess(false)}>Entendido</button>
          </div>
        </div>
      )}

      {confirmInfo && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.warningIcon}>
              <span className="material-symbols-rounded">warning</span>
            </div>
            <h2>¿Cierre Definitivo?</h2>
            <p>¿Estás seguro de cerrar {confirmInfo.sucursal} definitivamente? <br/><b>Esto lo marcará como RECIBIDO para todas las áreas.</b></p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmInfo(null)}>Cancelar</button>
              <button className={styles.confirmBtn} onClick={() => handleFinalizarGlobal(confirmInfo)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
