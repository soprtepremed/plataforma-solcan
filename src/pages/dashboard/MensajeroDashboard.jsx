import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./MensajeroDashboard.module.css";

const MESSENGERS = [
  { id: "M1", name: "Mensajero 1" },
  { id: "M2", name: "Mensajero 2" },
  { id: "M3", name: "Mensajero 3" },
  { id: "M4", name: "Mensajero 4" },
  { id: "M5", name: "Mensajero 5" },
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

    // SUSCRIPCIÓN TIEMPO REAL (Fase 8 Cierre - Mensajería)
    const channel = supabase
      .channel('recolecciones-nuevas')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'logistica_envios' }, 
        (payload) => {
          console.log("Nuevo envío listo para recoger:", payload);
          fetchPendientes(); // Recargar lista completa
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'logistica_envios' },
        (payload) => {
          // Si otro mensajero ya la tomó, quitarla de la lista
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

  return (
    <div className={styles.container}>
      <div className={styles.selectorCard}>
        <h2 className={styles.title}>¿Quién está recolectando hoy?</h2>
        <div className={styles.idGrid}>
          {MESSENGERS.map(m => (
            <button 
              key={m.id}
              className={`${styles.idBtn} ${activeId === m.id ? styles.activeId : ''}`}
              onClick={() => setActiveId(m.id)}
            >
              <span className="material-symbols-rounded">person_pin</span>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.listArea}>
        <h3 className={styles.listTitle}>
          <span className="material-symbols-rounded">pending_actions</span>
          Hieleras Pendientes por Recolección
        </h3>

        {loading ? (
          <div className={styles.empty}>Cargando solicitudes...</div>
        ) : pendientes.length > 0 ? (
          pendientes.map(envio => (
            <div key={envio.id} className={styles.envioCard}>
              <div className={styles.envioInfo}>
                <h4>Sucursal: {envio.sucursal}</h4>
                <div className={styles.envioMeta}>
                  <span className={`${styles.badge} ${styles.pendBadge}`}>Pendiente</span>
                  <span style={{ marginLeft: '12px' }}>
                    Registrado: {new Date(envio.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <button 
                className={styles.acceptBtn}
                onClick={() => handleRecolectar(envio.id)}
              >
                <span className="material-symbols-rounded">check_circle</span>
                Aceptar Recolección
              </button>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px', marginBottom: '10px' }}>task_alt</span>
            <p>No hay hieleras pendientes por recoger en este momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
