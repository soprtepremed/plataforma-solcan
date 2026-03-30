import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./VerificacionMatriz.module.css";

const MATERIAL_KEYS = ["dorado", "rojo", "celeste", "petri", "laminilla", "suero", "papel"];

const playAlarm = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  oscillator.start();
  
  return { oscillator, audioContext };
};

export default function VerificacionMatriz() {
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alarmActive, setAlarmActive] = useState(false);
  const alarmRef = useRef(null);

  const fetchTransito = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("logistica_envios")
      .select("*")
      .eq("status", "En Tránsito")
      .order("created_at", { ascending: true });

    if (!error) {
      // Inicializar estado editable por cada envio
      const mapped = data.map(env => ({
        ...env,
        rec_values: {
          dorado: env.s_dorado,
          rojo: env.s_rojo,
          celeste: env.s_celeste,
          petri: env.s_petri,
          laminilla: env.s_laminilla,
          suero: env.s_suero,
          papel: env.s_papel
        },
        t_rec: { amb: 25, ref: 4 },
        obs: "",
        showVerify: false
      }));
      setEnvios(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransito();

    // SUSCRIPCIÓN TIEMPO REAL (Recepción Matriz)
    const channel = supabase
      .channel('recepcion-matriz')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'logistica_envios' }, 
        (payload) => {
          // Si una hielera cambia a "En Tránsito", mostrarla en Matriz
          if (payload.new.status === 'En Tránsito') {
            console.log("Hielera en camino a Matriz:", payload.new);
            fetchTransito();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateRec = (envId, key, val) => {
    setEnvios(prev => prev.map(e => e.id === envId ? {
      ...e,
      rec_values: { ...e.rec_values, [key]: parseInt(val) || 0 }
    } : e));
  };

  const startAlarm = () => {
    if (!alarmActive) {
      const { oscillator, audioContext } = playAlarm();
      alarmRef.current = { oscillator, audioContext };
      setAlarmActive(true);
    }
  };

  const stopAlarm = () => {
    if (alarmRef.current) {
      alarmRef.current.oscillator.stop();
      alarmRef.current.audioContext.close();
      alarmRef.current = null;
    }
    setAlarmActive(false);
  };

  const checkAlerts = (tempAmb, tempRef) => {
    const ambAlert = tempAmb > 29 || tempAmb < 20;
    const refAlert = tempRef > 7 || tempRef < 2;
    return ambAlert || refAlert;
  };

  const handleFinalizar = async (envio) => {
    const isCrisis = checkAlerts(envio.t_rec.amb, envio.t_rec.ref);
    
    if (isCrisis) {
      startAlarm();
      alert("¡ALERTA!: Temperaturas fuera de rango. Alarma sonora activada.");
    }

    const { error } = await supabase
      .from("logistica_envios")
      .update({
        status: "Recibido",
        r_dorado: envio.rec_values.dorado,
        r_rojo: envio.rec_values.rojo,
        r_celeste: envio.rec_values.celeste,
        r_petri: envio.rec_values.petri,
        r_laminilla: envio.rec_values.laminilla,
        r_suero: envio.rec_values.suero,
        r_papel: envio.rec_values.papel,
        temp_entra_amb: parseFloat(envio.t_rec.amb),
        temp_entra_ref: parseFloat(envio.t_rec.ref),
        hora_recepcion: new Date().toISOString(),
        observaciones_recepcion: envio.obs,
        recibido_por: "Laboratorio Matriz"
      })
      .eq("id", envio.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setEnvios(prev => prev.filter(e => e.id !== envio.id));
      if (!isCrisis) alert("Recepción guardada correctamente.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleArea}>
        <h1 className={styles.title}>Recepción en Laboratorio Matriz</h1>
        <button onClick={fetchTransito} className={styles.iconBtn}>
          <span className="material-symbols-rounded">refresh</span>
        </button>
      </div>

      {alarmActive && (
        <div className={styles.alarmBanner}>
          <div className={styles.alarmInfo}>
            <span className="material-symbols-rounded" style={{ fontSize: '40px' }}>warning</span>
            <div>
              <strong>¡ALARMA DE BIO-SEGURIDAD ACTIVA!</strong>
              <p>Muestras en riesgo térmico. Verifica la hielera de inmediato.</p>
            </div>
          </div>
          <button onClick={stopAlarm} className={styles.alarmBtn}>DETENER ALARMA</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Buscando envíos en tránsito...</div>
      ) : envios.length > 0 ? (
        <div className={styles.grid}>
          {envios.map(envio => (
            <div key={envio.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h4 style={{ margin: 0 }}>Desde: {envio.sucursal}</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Sale: {new Date(envio.hora_sale).toLocaleTimeString()} • <strong>{envio.mensajero_id}</strong>
                  </span>
                </div>
                {new Date(envio.hora_sale).getDate() < new Date().getDate() && (
                   <span className="material-symbols-rounded" style={{ color: '#ef4444' }} title="Muestra del día anterior">history</span>
                )}
              </div>

              {envio.img_url && <img src={envio.img_url} className={styles.originalPhoto} alt="Evidencia Origen" />}

              <table className={styles.checklistTable}>
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Enviado</th>
                    <th>Recibido</th>
                  </tr>
                </thead>
                <tbody>
                  {MATERIAL_KEYS.map(key => {
                    const sent = envio[`s_${key}`];
                    const rec = envio.rec_values[key];
                    const isMissing = rec < sent;
                    return (
                      <tr key={key} className={isMissing ? styles.missingRow : ''}>
                        <td style={{ fontWeight: 600 }}>{key.toUpperCase()}</td>
                        <td>{sent}</td>
                        <td>
                          <input 
                            type="number" 
                            className={styles.inputQty} 
                            value={rec}
                            onChange={(e) => handleUpdateRec(envio.id, key, e.target.value)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className={styles.tempBox}>
                <div className={styles.tempItem}>
                  <label>T. Amb Arribo</label>
                  <input type="number" step="0.1" className={styles.tempInput} value={envio.t_rec.amb} onChange={(e) => {
                    setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, amb: e.target.value}} : ev))
                  }} />
                </div>
                <div className={styles.tempItem}>
                  <label>T. Ref Arribo</label>
                  <input type="number" step="0.1" className={styles.tempInput} value={envio.t_rec.ref} onChange={(e) => {
                    setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, t_rec: {...ev.t_rec, ref: e.target.value}} : ev))
                  }} />
                </div>
              </div>

              <textarea 
                placeholder="Observaciones de recepción (ej: Tubo roto, faltante...)" 
                className={styles.observationBox}
                value={envio.obs}
                onChange={(e) => setEnvios(prev => prev.map(ev => ev.id === envio.id ? {...ev, obs: e.target.value} : ev))}
              />

              <button className={styles.saveBtn} onClick={() => handleFinalizar(envio)} style={{ marginTop: '1.5rem' }}>
                Confirmar y Cerrar Recepción
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '6rem', color: '#64748b' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px' }}>check_circle</span>
          <p>No hay envíos en tránsito hacia Matriz.</p>
        </div>
      )}
    </div>
  );
}
