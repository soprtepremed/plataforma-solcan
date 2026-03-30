import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./LogisticaAdmin.module.css";

export default function LogisticaAdmin() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSucursal, setFilterSucursal] = useState("Todas");

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from("logistica_envios").select("*").order("created_at", { ascending: false });
    
    if (filterSucursal !== "Todas") {
      query = query.eq("sucursal", filterSucursal);
    }

    const { data, error } = await query;
    if (!error) setData(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filterSucursal]);

  const stats = {
    total: data.length,
    conAlarma: data.filter(e => e.temp_entra_amb > 29 || e.temp_entra_ref > 7 || e.temp_entra_ref < 2).length,
    conObs: data.filter(e => e.observaciones_recepcion).length,
    avgTransit: data.filter(e => e.hora_recepcion).length > 0 
      ? (data.filter(e => e.hora_recepcion).reduce((acc, curr) => {
          const transit = (new Date(curr.hora_recepcion) - new Date(curr.hora_sale)) / (1000 * 60);
          return acc + transit;
        }, 0) / data.filter(e => e.hora_recepcion).length).toFixed(0) : "N/A"
  };

  const branches = ["Todas", ...new Set(data.map(d => d.sucursal))];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Auditoría Global de Logística</h1>
        <p style={{color: 'var(--co-text-muted)'}}>Monitoreo central de cadena de frio y transporte.</p>
      </header>

      <div className={styles.summary}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>Total Envíos</div>
          <div className={styles.kpiValue}>{stats.total}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>Incidencias Térmicas</div>
          <div className={styles.kpiValue} style={{color: '#EF4444'}}>{stats.conAlarma}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>Observaciones Matriz</div>
          <div className={styles.kpiValue} style={{color: '#D97706'}}>{stats.conObs}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>Tránsito Promedio (Min)</div>
          <div className={styles.kpiValue}>{stats.avgTransit}</div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label>FILTRAR POR SUCURSAL</label>
          <select 
            className={styles.selectInput} 
            value={filterSucursal} 
            onChange={(e) => setFilterSucursal(e.target.value)}
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <button onClick={fetchData} className={styles.obsBtn}>Refrescar Auditoría</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.masterTable}>
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Sede Origen</th>
              <th>Estado</th>
              <th>Mensajero</th>
              <th>Temp. Matriz (A/R)</th>
              <th>Alertas/Obs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '3rem'}}>Cargando auditoría...</td></tr>
            ) : data.map(envio => {
              const isThermalIncident = envio.temp_entra_amb > 29 || envio.temp_entra_ref > 7 || envio.temp_entra_ref < 2;
              return (
                <tr key={envio.id}>
                  <td>
                    <strong>{new Date(envio.created_at).toLocaleDateString()}</strong>
                    <div style={{fontSize: '0.75rem'}}>{new Date(envio.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td>{envio.sucursal}</td>
                  <td>
                    <span style={{fontWeight: 700, color: envio.status === 'Recibido' ? '#059669' : '#2563EB'}}>
                      {envio.status}
                    </span>
                  </td>
                  <td>{envio.mensajero_id || '---'}</td>
                  <td>
                    {envio.temp_entra_amb ? (
                      <span className={envio.temp_entra_amb > 29 ? styles.critCol : ''}>
                        {envio.temp_entra_amb}° / {envio.temp_entra_ref}°
                      </span>
                    ) : '---'}
                  </td>
                  <td>
                    <div style={{display: 'flex', gap: '5px', flexDirection: 'column'}}>
                      {isThermalIncident && (
                        <span className={styles.alertTag}>
                           <span className="material-symbols-rounded" style={{fontSize: '14px'}}>warning</span>
                           Falla Térmica
                        </span>
                      )}
                      {envio.observaciones_recepcion && (
                        <button className={styles.obsBtn} title={envio.observaciones_recepcion}>
                          Ver Observación
                        </button>
                      )}
                      {!isThermalIncident && !envio.observaciones_recepcion && envio.status === 'Recibido' && (
                        <span style={{color: '#059669', fontSize: '0.75rem'}}>Sin incidencias</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
