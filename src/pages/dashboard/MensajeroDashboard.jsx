import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import styles from "./MensajeroDashboard.module.css";

const MESSENGERS = [
  { id: "ALBERT", name: "Albert", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Albert" },
  { id: "EDWARD", name: "Edward", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Edward" },
  { id: "ALEJANDRO", name: "Alejandro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alejandro" },
  { id: "BULMARO", name: "Bulmaro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bulmaro" },
];

export default function MensajeroDashboard() {
  const [activeId, setActiveId] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("logistica_envios")
      .select("*")
      .eq("status", "Pendiente")
      .order("created_at", { ascending: true });

    if (!error) setPendientes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendientes();

    const channel = supabase
      .channel('recolecciones-nuevas')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'logistica_envios' }, 
        (payload) => {
          fetchPendientes();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'logistica_envios' },
        (payload) => {
          if (payload.new.status !== 'Pendiente') {
            fetchPendientes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRecolectar = async (envioId) => {
    if (!activeId) {
      alert("Por favor selecciona tu ID de mensajero antes de recolectar.");
      return;
    }

    const { error } = await supabase
      .from("logistica_envios")
      .update({
        status: "En Tránsito",
        mensajero_id: activeId,
        hora_recoleccion: new Date().toISOString()
      })
      .eq("id", envioId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setPendientes(prev => prev.filter(e => e.id !== envioId));
    }
  };

  const selectedMessenger = MESSENGERS.find(m => m.id === activeId);

  return (
    <div className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.backBtn}>
        <span className="material-symbols-rounded">arrow_back</span>
        Volver
      </button>

      <div className={styles.selectorCard}>
        <h2 className={styles.title}>¿Quién está recolectando hoy?</h2>
        <div className={styles.idGrid}>
          {MESSENGERS.map(m => (
            <button 
              key={m.id}
              className={`${styles.idBtn} ${activeId === m.id ? styles.activeId : ''}`}
              onClick={() => setActiveId(m.id)}
            >
              <div className={styles.avatarWrapper}>
                <img src={m.avatar} alt={m.name} className={styles.avatarImg} />
                {activeId === m.id && <span className={styles.activeDot}></span>}
              </div>
              <span className={styles.messengerName}>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.listArea}>
        <h3 className={styles.listTitle}>
          <span className="material-symbols-rounded">pending_actions</span>
          Hieleras Pendientes por Recolección
          {selectedMessenger && <small className={styles.activeTag}>Operando como: {selectedMessenger.name}</small>}
        </h3>

        {loading ? (
          <div className={styles.loadingPulse}>Cargando solicitudes...</div>
        ) : pendientes.length > 0 ? (
          pendientes.map(envio => {
            const photos = envio.img_url ? envio.img_url.split('|') : [];
            return (
              <div key={envio.id} className={styles.envioCard}>
                <div className={styles.envioInfo}>
                  <div className={styles.headerRow}>
                    <span className="material-symbols-rounded" style={{ color: '#0BCECD', fontSize: '28px' }}>location_on</span>
                    <div>
                      <h4>Sucursal: {envio.sucursal}</h4>
                      <p className={styles.timestamp}>
                        <span className="material-symbols-rounded">schedule</span>
                        Listo hace: {new Date(envio.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.envioMeta}>
                    <span className={`${styles.badge} ${styles.pendBadge}`}>
                      <span className="material-symbols-rounded">check_circle</span>
                      LISTO PARA RECOLECCIÓN
                    </span>
                  </div>

                  <div className={styles.samplesSummary}>
                     {envio.s_dorado > 0 && <span className={styles.sampleTag}><strong>{envio.s_dorado}</strong> Dorados</span>}
                     {envio.s_rojo > 0 && <span className={styles.sampleTag}><strong>{envio.s_rojo}</strong> Rojos</span>}
                     {envio.s_lila > 0 && <span className={styles.sampleTag}><strong>{envio.s_lila}</strong> Lilas</span>}
                     {envio.s_suero > 0 && <span className={styles.sampleTag}><strong>{envio.s_suero}</strong> Sueros</span>}
                  </div>

                  {photos.length > 0 && (
                    <div className={styles.galleryWrapper}>
                      <span className={styles.galleryLabel}>Evidencias de Origen:</span>
                      <div className={styles.miniGallery}>
                        {photos.map((url, i) => (
                          <div key={i} className={styles.miniThumb} onClick={() => window.open(url, '_blank')}>
                            <img src={url} alt={`Evidencia ${i+1}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={styles.actionArea}>
                  <button 
                    className={styles.acceptBtn}
                    onClick={() => handleRecolectar(envio.id)}
                  >
                    <span className="material-symbols-rounded">local_shipping</span>
                    Confirmar Recolección
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.empty}>
            <span className="material-symbols-rounded" style={{ fontSize: '64px', marginBottom: '15px' }}>task_alt</span>
            <h3>Rutas al día</h3>
            <p>No hay hieleras pendientes en este sector.</p>
          </div>
        )}
      </div>
    </div>
  );
}

