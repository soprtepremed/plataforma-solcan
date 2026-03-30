import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { playNotificationBeep } from "../../utils/audio";
import styles from "./LogisticaSede.module.css";

export default function LogisticaSede() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEnvios = async () => {
    if (!user?.branch) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("logistica_envios")
      .select("*")
      .eq("sucursal", user.branch)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) setEnvios(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEnvios();

    // SUSCRIPCIÓN TIEMPO REAL (Fase 8 Cierre)
    const channel = supabase
      .channel('cambios-logistica-' + user?.branch)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'logistica_envios', filter: `sucursal=eq.${user?.branch}` }, 
        (payload) => {
          console.log("Cambio detectado:", payload);
          fetchEnvios(); // Recargar datos

          // Notificación Sonora si Matriz envía feedback
          if (payload.new.status === 'Recibido' && payload.new.observaciones_recepcion) {
            playNotificationBeep();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const stats = {
    pendientes: envios.filter(e => e.status === 'Pendiente').length,
    transito: envios.filter(e => e.status === 'En Tránsito').length,
    recibidos: envios.filter(e => e.status === 'Recibido').length,
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>
          <h1>Logística de Sucursal</h1>
          <p>📍 {user?.branch} • Gestión de Cadena de Custodia</p>
        </div>
        <button className={styles.newBtn} onClick={() => navigate('/logistica/envio')}>
          <span className="material-symbols-rounded">add_circle</span>
          Nuevo Despacho
        </button>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon}`} style={{background: '#FEF3C7', color: '#D97706'}}>
            <span className="material-symbols-rounded">inventory</span>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.pendientes}</h3>
            <p>Hieleras Pendientes</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon}`} style={{background: '#DBEAFE', color: '#2563EB'}}>
            <span className="material-symbols-rounded">local_shipping</span>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.transito}</h3>
            <p>En Tránsito</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon}`} style={{background: '#D1FAE5', color: '#059669'}}>
            <span className="material-symbols-rounded">task_alt</span>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.recibidos}</h3>
            <p>Recibidos en Matriz</p>
          </div>
        </div>
      </div>

      <div className={styles.historyArea}>
        <h2 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">history</span>
          Historial de Envíos Recientes
        </h2>

        {loading ? (
          <div style={{textAlign: 'center', padding: '2rem'}}>Cargando historial...</div>
        ) : envios.length > 0 ? (
          envios.map(envio => (
            <div key={envio.id} className={styles.shipmentItem}>
              <div className={styles.shipDate}>
                <strong>{new Date(envio.created_at).toLocaleDateString()}</strong>
                <div style={{fontSize: '0.75rem'}}>{new Date(envio.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>

              <div className={`${styles.shipStatus} ${styles['status-' + envio.status.replace(' ', '')]}`}>
                <span className="material-symbols-rounded" style={{fontSize: '18px'}}>
                  {envio.status === 'Pendiente' ? 'schedule' : 
                   envio.status === 'En Tránsito' ? 'conveyor_belt' : 'done_all'}
                </span>
                {envio.status}
              </div>

              <div>
                {envio.observaciones_recepcion && (
                  <div className={styles.obsBadge}>
                    <span className="material-symbols-rounded" style={{fontSize: '16px'}}>feedback</span>
                    Reporte de Matriz
                  </div>
                )}
              </div>

              <div style={{color: 'var(--co-text-muted)', fontSize: '0.8rem'}}>
                ID: {envio.id.slice(0,8)}...
              </div>
            </div>
          ))
        ) : (
          <div style={{textAlign: 'center', color: 'var(--co-text-muted)', padding: '3rem'}}>
            No has realizado envíos aún. Comienza creando uno nuevo.
          </div>
        )}
      </div>
    </div>
  );
}
