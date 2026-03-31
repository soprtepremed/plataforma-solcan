import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
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
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alarmActive, setAlarmActive] = useState(false);
  const [filter, setFilter] = useState("En Tránsito");
  const [activeReceptionId, setActiveReceptionId] = useState(null);

  const fetchEnvios = async () => {
    setLoading(true);
    let query = supabase.from("logistica_envios").select("*");
    if (filter !== "Todos") query = query.eq("status", filter);
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
  }, [filter]);

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

  const startAlarm = () => setAlarmActive(true);
  const stopAlarm = () => setAlarmActive(false);

  useEffect(() => {
    let interval;
    if (alarmActive) {
      const ps = () => { playAlarm(); };
      ps();
      interval = setInterval(ps, 1200);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [alarmActive]);

  const handleFinalizar = async (envio) => {
    const isCrisis = envio.t_rec.amb > 29 || envio.t_rec.amb < 20 || envio.t_rec.ref > 7 || envio.t_rec.ref < 2;
    if (isCrisis) { startAlarm(); alert("¡ALERTA TÉRMICA DETECTADA!"); }

    const { error } = await supabase.from("logistica_envios").update({
      status: "Recibido",
      r_dorado: envio.rec_values.dorado,
      r_rojo: envio.rec_values.rojo,
      r_lila: envio.rec_values.lila,
      r_celeste: envio.rec_values.celeste,
      r_verde: envio.rec_values.verde,
      r_petri: envio.rec_values.petri,
      r_laminilla: envio.rec_values.laminilla,
      r_suero: envio.rec_values.suero,
      r_papel: envio.rec_values.orina,
      temp_entra_amb: parseFloat(envio.t_rec.amb),
      temp_entra_ref: parseFloat(envio.t_rec.ref),
      hora_recepcion: new Date().toISOString(),
      observaciones_recepcion: envio.obs,
      recibido_por: "Laboratorio Matriz"
    }).eq("id", envio.id);

    if (error) alert("Error: " + error.message);
    else { setActiveReceptionId(null); if (filter !== 'Todos') setEnvios(prev => prev.filter(e => e.id !== envio.id)); }
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
        {["Todos", "En Tránsito", "Recibido"].map(f => (
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
              <div key={envio.id} className={`${styles.card} ${isRecibido ? styles.cardReadOnly : ''}`}>
                <div className={styles.cardHeader}>
                  <h4>{envio.sucursal}</h4>
                  <span className={`${styles.statusBadge} ${styles['status_' + envio.status.replace(/ /g, '_')]}`}>{envio.status}</span>
                </div>

                {!isActive && !isRecibido ? (
                  <div className={styles.transitSummary}>
                    <p>Muestras en camino • Chofer: <strong>{envio.mensajero_id}</strong></p>
                    <button className={styles.startBtn} onClick={() => setActiveReceptionId(envio.id)}>📦 Iniciar Recepción Física</button>
                  </div>
                ) : (
                  <>
                    <div className={styles.evidenceSection}>
                       {envio.img_url && envio.img_url.split('|').map((url, i) => (
                         <img key={i} src={url} className={styles.miniThumb} onClick={() => window.open(url, '_blank')} />
                       ))}
                    </div>

                    <div className={styles.auditChecklist}>
                        <div className={styles.checklistGridHeader}>
                           <span>Material</span>
                           <span>Enviado</span>
                           <span>Recibido</span>
                           <span>¿Corrobora?</span>
                        </div>
                        {MATERIAL_KEYS.map(item => {
                          const sent = envio[`s_${item.key === 'lila' ? 'celeste' : item.key === 'orina' ? 'papel' : item.key}`] || 0;
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
                        <div className={styles.tempItem}>
                           <label>Ambiente Arribo</label>
                           {isRecibido ? <span>{envio.t_rec.amb}°C</span> : <input type="number" step="0.1" value={envio.t_rec.amb} onChange={(e) => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: e.target.value}} : ev))} />}
                        </div>
                        <div className={styles.tempItem}>
                           <label>Refri Arribo</label>
                           {isRecibido ? <span>{envio.t_rec.ref}°C</span> : <input type="number" step="0.1" value={envio.t_rec.ref} onChange={(e) => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, ref: e.target.value}} : ev))} />}
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
                        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                          <button className={styles.cancelBtn} onClick={() => setActiveReceptionId(null)}>Cancelar</button>
                          <button className={styles.saveBtn} onClick={() => handleFinalizar(envio)}>Finalizar Recepción</button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
