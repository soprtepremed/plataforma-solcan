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
          // Notificación Sonora inmediata al recibir en Matriz
          if (payload.new.status === 'Recibido' && payload.old.status !== 'Recibido') {
            playNotificationBeep();
            // Aquí se podría añadir un setAlert(true) para un toast visual
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
          Nuevo Envío
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
            <div key={envio.id} className={styles.shipmentCard}>
              <div className={styles.cardMain}>
                <div className={styles.shipMainInfo}>
                  <div className={styles.dateBox}>
                    <span className="material-symbols-rounded">calendar_today</span>
                    <div>
                      <strong>{new Date(envio.created_at).toLocaleDateString()}</strong>
                      <div className={styles.timeStr}>{new Date(envio.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${styles['status-' + envio.status.replace(/ /g, '')]}`}>
                    <span className="material-symbols-rounded">
                      {envio.status === 'Pendiente' ? 'schedule' : 
                       envio.status === 'En Tránsito' ? 'local_shipping' : 'verified'}
                    </span>
                    {envio.status}
                  </div>
                </div>

                <div className={styles.formalCargoReport}>
                  <div className={styles.reportHeader}>REPORTE DIGITAL DE CARGA (FO-DO-017)</div>
                  <div className={styles.dualTableContainer}>
                    <table className={styles.cargoTable}>
                      <thead>
                        <tr>
                          <th>Muestras / Biológicos</th>
                          <th>Cant.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {envio.s_lila > 0 && <tr><td>Tubo Lila (EDTA)</td><td>{envio.s_lila}</td></tr>}
                        {envio.s_rojo > 0 && <tr><td>Tubo Rojo (Suero)</td><td>{envio.s_rojo}</td></tr>}
                        {envio.s_dorado > 0 && <tr><td>Tubo Dorado (Separador)</td><td>{envio.s_dorado}</td></tr>}
                        {envio.s_celeste > 0 && <tr><td>Tubo Celeste (Citratos)</td><td>{envio.s_celeste}</td></tr>}
                        {envio.s_verde > 0 && <tr><td>Tubo Verde (Heparina)</td><td>{envio.s_verde}</td></tr>}
                        {envio.s_papel > 0 && <tr><td>Tubo Orina / Papel</td><td>{envio.s_papel}</td></tr>}
                        {envio.s_orina_24h > 0 && <tr><td>Orina 24 Horas</td><td>{envio.s_orina_24h}</td></tr>}
                        {envio.s_medio_transporte > 0 && <tr><td>Medio de Transporte</td><td>{envio.s_medio_transporte}</td></tr>}
                        {envio.s_hisopo > 0 && <tr><td>Tubo Vidrio con Hisopo</td><td>{envio.s_hisopo}</td></tr>}
                        {envio.s_laminilla_he > 0 && <tr><td>Laminilla HE (Hemato)</td><td>{envio.s_laminilla_he}</td></tr>}
                        {envio.s_laminilla_mi > 0 && <tr><td>Laminilla MI (Micro)</td><td>{envio.s_laminilla_mi}</td></tr>}
                        {envio.s_heces > 0 && <tr><td>Muestra de Heces</td><td>{envio.s_heces}</td></tr>}
                      </tbody>
                    </table>

                    <table className={styles.cargoTable}>
                      <thead>
                        <tr>
                          <th>Formatos de Control</th>
                          <th>Cant.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {envio.f_do_001 > 0 && <tr className={styles.rowFormat}><td>FO-DO-001 (Sol. Análisis)</td><td>{envio.f_do_001}</td></tr>}
                        {envio.f_da_001 > 0 && <tr className={styles.rowFormat}><td>FO-DA-001 (Control Mues.)</td><td>{envio.f_da_001}</td></tr>}
                        {envio.f_qc_020 > 0 && <tr className={styles.rowFormat}><td>FO-QC-020 (Bitácora Mens.)</td><td>{envio.f_qc_020}</td></tr>}
                        {envio.f_rm_004 > 0 && <tr className={styles.rowFormat}><td>FO-RM-004 (Inventario)</td><td>{envio.f_rm_004}</td></tr>}
                        
                        <tr className={styles.rowOtherHeader}>
                          <th colSpan="2">Otros Cargos</th>
                        </tr>
                        {envio.s_otros_cant ? (
                          <tr className={styles.rowOther}>
                            <td>{envio.s_otros_analisis || 'Otros'}</td>
                            <td>{envio.s_otros_cant}</td>
                          </tr>
                        ) : (
                          <tr><td colSpan="2" style={{color:'#CBD5E1', fontSize:'0.7rem', fontStyle:'italic'}}>Sin otros cargos registrados</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.logisticsDetails}>
                   <div className={styles.logItem}>
                      <span className="material-symbols-rounded">person</span>
                      <span>Mensajero: <strong>{envio.mensajero_id || 'Por asignar'}</strong></span>
                   </div>
                   <div className={styles.logItem}>
                      <span className="material-symbols-rounded">thermostat</span>
                      <span>Temp. Salida: <strong>{envio.temp_sale_amb || 'N/A'}°C / {envio.temp_sale_ref || 'N/A'}°C</strong></span>
                   </div>
                   {envio.status === 'Recibido' && (
                     <div className={styles.logItem} style={{color: '#059669'}}>
                        <span className="material-symbols-rounded">check_circle</span>
                        <span>Recibido por: <strong>{envio.recibido_por?.split(' ')[0]}</strong></span>
                     </div>
                   )}
                </div>
              </div>

              {envio.observaciones_recepcion && (
                <div className={styles.feedbackArea}>
                   <div className={styles.obsBadge}>
                      <span className="material-symbols-rounded">feedback</span>
                      Reporte de Matriz: <em>{envio.observaciones_recepcion}</em>
                   </div>
                </div>
              )}
              
              <div className={styles.cardFooter}>
                <span className={styles.shipId}>ID: {envio.id.slice(0,8).toUpperCase()}</span>
                {envio.hora_recoleccion && <span className={styles.footerTime}>Recolectado: {new Date(envio.hora_recoleccion).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
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
