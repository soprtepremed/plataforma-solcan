import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { sendPushNotification } from "../../lib/pushNotifications";
import styles from "./MensajeroDashboard.module.css";

const MESSENGERS = [
  { id: "ALBERT", name: "Alberth", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alberth" },
  { id: "EDWARD", name: "Edward", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Edward" },
  { id: "ALEJANDRO", name: "Alejandro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alejandro" },
  { id: "BULMARO", name: "Bulmaro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bulmaro" },
  { id: "EDYR", name: "Edyr Arnaldo", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Edyr" },
];

export default function MensajeroDashboard() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  const fetchPendientes = async () => {
    setLoading(true);
    // Ahora traemos Pendientes (libre) y En Camino (asignadas)
    const { data, error } = await supabase
      .from("logistica_envios")
      .select("*")
      .in("status", ["Pendiente", "En Camino"])
      .order("created_at", { ascending: true });

    if (!error) setPendientes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendientes();
    
    // Auto-detección de mensajero por el usuario logeado
    if (user && user.name) {
       const matched = MESSENGERS.find(m => m.name.toLowerCase() === user.name.toLowerCase());
       if (matched) {
          setActiveId(matched.id);
       }
    }

    const channel = supabase
      .channel('recolecciones-nuevas')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'logistica_envios' }, 
        (payload) => {
          fetchPendientes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // PASO 1: Aceptar el pedido (ponerlo En Camino)
  const handleAceptar = async (envio) => {
    if (!activeId) {
      alert("Por favor selecciona tu ID de mensajero antes de aceptar.");
      return;
    }

    const { error } = await supabase
      .from("logistica_envios")
      .update({
        status: "En Camino",
        mensajero_id: activeId
      })
      .eq("id", envio.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      // Notificar a otros choferes
      await supabase.from("notificaciones").insert([{
        role: "mensajero",
        title: "Recolección Atendida",
        message: `${selectedMessenger?.name || 'Un compañero'} va por el material de ${envio.sucursal}.`,
        type: "success"
      }]);

      // Notificar a la SUCURSAL
      await supabase.from("notificaciones").insert([{
        sucursal: envio.sucursal,
        title: "🚐 Chofer en Camino",
        message: `${selectedMessenger?.name} ha iniciado el trayecto hacia tu sucursal para recolectar las muestras.`,
        type: "info",
        metadata: { sucursal: envio.sucursal }
      }]);

      // Push directo
      sendPushNotification({
        role: "mensajero",
        title: "Recolección Atendida",
        message: `${selectedMessenger?.name || 'Un chofer'} ya aceptó en ${envio.sucursal}.`,
        metadata: { url: '/logistica/mensajero' }
      });
      
      fetchPendientes();
    }
  };

  // PASO 2: Recolectar físicamente el paquete
  const handleRecolectar = async (envioId) => {
    const { error } = await supabase
      .from("logistica_envios")
      .update({
        status: "En Tránsito",
        hora_recoleccion: new Date().toISOString()
      })
      .eq("id", envioId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setShowSuccess(true);
      fetchPendientes();
    }
  };

  const selectedMessenger = MESSENGERS.find(m => m.id === activeId);

  // Si el usuario logeado ya es un mensajero, no es necesario mostrar el selector
  const isAutoMessenger = user && MESSENGERS.some(m => m.name.toLowerCase() === user.name.toLowerCase());

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate("/")}>
        <span className="material-symbols-rounded">arrow_back</span> Volver
      </button>

      {!isAutoMessenger && (
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
      )}

      <div className={styles.listArea}>
        <h3 className={styles.listTitle}>
          <span className="material-symbols-rounded">pending_actions</span>
          Hoja de Ruta: Recolecciones Pendientes
          {selectedMessenger && <small className={styles.activeTag}>Operando como: {selectedMessenger.name}</small>}
        </h3>

        {loading ? (
          <div className={styles.loadingPulse}>Cargando solicitudes...</div>
        ) : pendientes.length > 0 ? (
          pendientes.map(envio => {
            const photos = envio.img_url ? envio.img_url.split('|') : [];
            const isAssignedToMe = envio.mensajero_id === activeId;
            const isFree = envio.status === 'Pendiente';

            // Si está asignado a otro, no lo mostramos en la lista activa de este mensajero (opcional, por ahora lo dejamos para transparencia si aún no se refresca)
            if (envio.status === 'En Camino' && !isAssignedToMe) return null;

            return (
              <div key={envio.id} className={styles.envioCard}>
                <div className={styles.envioInfo}>
                  <div className={styles.headerRow}>
                    <span className="material-symbols-rounded" style={{ color: '#0BCECD', fontSize: '28px' }}>location_on</span>
                    <div>
                      <h4>Sucursal: {envio.sucursal}</h4>
                      <p className={styles.timestamp}>
                        <span className="material-symbols-rounded">schedule</span>
                        Registrado: {new Date(envio.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.envioMeta}>
                    {isFree ? (
                      <span className={`${styles.badge} ${styles.pendBadge}`}>
                        <span className="material-symbols-rounded">notifications_active</span>
                        NUEVA SOLICITUD
                      </span>
                    ) : (
                      <span className={`${styles.badge}`} style={{background: '#FEF3C7', color: '#D97706'}}>
                        <span className="material-symbols-rounded spin">sync</span>
                        VAS EN CAMINO
                      </span>
                    )}
                  </div>

                  <div className={styles.samplesSummary}>
                     {envio.s_rojo > 0 && <span className={styles.sampleTag} style={{borderLeft: '4px solid #FF0000'}}><strong>{envio.s_rojo}</strong> Rojos</span>}
                     {envio.s_dorado > 0 && <span className={styles.sampleTag} style={{borderLeft: '4px solid #FFD700'}}><strong>{envio.s_dorado}</strong> Dorados</span>}
                     {envio.s_lila > 0 && <span className={styles.sampleTag}><strong>{envio.s_lila}</strong> Lilas</span>}
                     {envio.s_celeste > 0 && <span className={styles.sampleTag}><strong>{envio.s_celeste}</strong> Celestes</span>}
                  </div>

                  {photos.length > 0 && (
                    <div className={styles.galleryWrapper}>
                      <span className={styles.galleryLabel}>Evidencias de Origen:</span>
                      <div className={styles.miniGallery}>
                        {photos.map((url, i) => (
                          <div key={i} className={styles.miniThumb} onClick={() => setPreviewImage(url)}>
                            <img src={url} alt={`Evidencia ${i+1}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={styles.actionArea}>
                  {isFree ? (
                    <button 
                      className={styles.acceptBtn}
                      onClick={() => handleAceptar(envio)}
                    >
                      <span className="material-symbols-rounded">check_circle</span>
                      Aceptar Pedido
                    </button>
                  ) : (
                    <button 
                      className={styles.acceptBtn}
                      style={{background: 'var(--co-gradient)'}}
                      onClick={() => handleRecolectar(envio.id)}
                    >
                      <span className="material-symbols-rounded">hail</span>
                      Confirmar Recogida
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.empty}>
            <span className="material-symbols-rounded" style={{ fontSize: '64px', marginBottom: '15px' }}>task_alt</span>
            <h3>Sin tareas pendientes</h3>
            <p>Todas las hieleras han sido recolectadas o asignadas.</p>
          </div>
        )}
      </div>

      {showSuccess && (
        <div className={styles.successOverlay}>
          <div className={styles.successCard}>
             <div className={styles.successIcon}><span className="material-symbols-rounded">local_shipping</span></div>
             <h2>¡Muestras Recolectadas!</h2>
             <p>El envío ahora está oficialmente "En Tránsito". Dirígete con precaución al laboratorio matriz.</p>
             <button onClick={() => setShowSuccess(false)} className={styles.successBtn}>Entendido</button>
          </div>
        </div>
      )}

      {previewImage && (
        <div className={styles.imagePreviewOverlay} onClick={() => setPreviewImage(null)}>
           <div className={styles.imagePreviewContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closePreviewBtn} onClick={() => setPreviewImage(null)}>
                <span className="material-symbols-rounded">close</span>
              </button>
              <img src={previewImage} alt="Vista previa" className={styles.previewFullImg} />
           </div>
        </div>
      )}
    </div>
  );
}
