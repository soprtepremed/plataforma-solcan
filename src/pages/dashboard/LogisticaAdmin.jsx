import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./LogisticaAdmin.module.css";

const AREAS_SOLCAN = [
  { key: "hemato", label: "Hematología" },
  { key: "uro", label: "Uroanálisis" },
  { key: "quimica", label: "Química clínica e Inmunología" },
  { key: "archivo", label: "Control y Archivo" },
  { key: "calidad", label: "Dirección técnica y de calidad" },
  { key: "admin", label: "Dirección de administración y finanzas" },
  { key: "recursos", label: "Recursos materiales" }
];

export default function LogisticaAdmin() {
  const [activeTab, setActiveTab] = useState("auditoria");
  const [data, setData] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSucursal, setFilterSucursal] = useState("Todas");
  const [searchUser, setSearchUser] = useState("");

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from("logistica_envios").select("*").order("created_at", { ascending: false });
    if (filterSucursal !== "Todas") { query = query.eq("sucursal", filterSucursal); }
    const { data, error } = await query;
    if (!error) setData(data);
    setLoading(false);
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("empleados").select("*").order("username", { ascending: true });
    if (!error) setUsuarios(data);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "auditoria") fetchData();
    else fetchUsuarios();
  }, [activeTab, filterSucursal]);

  const handleUpdateUsuario = async (uId, field, value) => {
    const { error } = await supabase.from("empleados").update({ [field]: value }).eq("id", uId);
    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === uId ? { ...u, [field]: value } : u));
    }
  };

  const toggleArea = async (uId, areaKey, currentAreas) => {
    const areas = currentAreas || [];
    const newAreas = areas.includes(areaKey) ? areas.filter(a => a !== areaKey) : [...areas, areaKey];
    const { error } = await supabase.from("empleados").update({ areas_asignadas: newAreas }).eq("id", uId);
    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === uId ? { ...u, areas_asignadas: newAreas } : u));
    }
  };

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
        <h1 className={styles.title}>Panel Administrativo Solcan</h1>
        <div className={styles.tabContainer}>
          <button className={`${styles.tabBtn} ${activeTab === 'auditoria' ? styles.tabActive : ''}`} onClick={() => setActiveTab('auditoria')}>
             <span className="material-symbols-rounded">analytics</span> Trazabilidad de Envíos
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'usuarios' ? styles.tabActive : ''}`} onClick={() => setActiveTab('usuarios')}>
             <span className="material-symbols-rounded">group</span> Gestión de Usuarios
          </button>
        </div>
      </header>

      {activeTab === "auditoria" ? (
        <>
          <div className={styles.summary}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>Total Envíos</div>
              <div className={styles.kpiValue}><span className="material-symbols-rounded">package</span> {stats.total}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>Incidencias Térmicas</div>
              <div className={styles.kpiValue} style={{color: '#EF4444'}}><span className="material-symbols-rounded">thermostat</span> {stats.conAlarma}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>Observaciones Matriz</div>
              <div className={styles.kpiValue} style={{color: '#D97706'}}><span className="material-symbols-rounded">warning</span> {stats.conObs}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTitle}>Tránsito Promedio (Min)</div>
              <div className={styles.kpiValue}><span className="material-symbols-rounded">schedule</span> {stats.avgTransit}</div>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label>FILTRAR POR SUCURSAL</label>
              <select className={styles.selectInput} value={filterSucursal} onChange={(e) => setFilterSucursal(e.target.value)}>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.masterTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Sucursal</th>
                  <th>Mensajero</th>
                  <th>Material Recibido</th>
                  <th>Temperaturas (A/R)</th>
                  <th>Recibió</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{textAlign: 'center', padding: '3rem'}}>Cargando auditoría...</td></tr>
                ) : data.map(envio => {
                  const isThermalIncident = envio.temp_entra_amb > 29 || envio.temp_entra_ref > 7 || envio.temp_entra_ref < 2;
                  return (
                    <tr key={envio.id}>
                      <td>{new Date(envio.created_at).toLocaleDateString()}</td>
                      <td>{envio.sucursal}</td>
                      <td>{envio.mensajero_id || '---'}</td>
                      <td>
                        <div className={styles.miniStatsArea}>
                           <div className={styles.statCol}>
                             <label>DORADO</label>
                             <span>S: {envio.s_dorado} | R: {envio.r_dorado || 0}</span>
                           </div>
                           <div className={styles.statCol}>
                             <label>LILA</label>
                             <span>S: {envio.s_lila} | R: {envio.r_lila || 0}</span>
                           </div>
                           <div className={styles.statCol}>
                             <label>ORINA</label>
                             <span>S: {envio.s_papel} | R: {envio.r_papel || 0}</span>
                           </div>
                        </div>
                      </td>
                      <td>
                        <span className={isThermalIncident ? styles.critCol : ''}>
                          {envio.temp_entra_amb ? `${envio.temp_entra_amb}° / ${envio.temp_entra_ref}°` : "Pendiente"}
                        </span>
                      </td>
                      <td>{envio.recibido_por || '---'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles['status_' + (envio.status || 'Pendiente').replace(/ /g, '_')]}`}>
                          {envio.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label>BUSCAR POR NOMBRE O USUARIO</label>
              <input 
                className={styles.selectInput} 
                placeholder="Ej. Roberto Ruiz..." 
                value={searchUser} 
                onChange={(e) => setSearchUser(e.target.value)} 
              />
            </div>
          </div>

          <div className={styles.userGrid}>
            {usuarios.filter(u => (u.nombre?.toLowerCase() || "").includes(searchUser.toLowerCase()) || (u.username?.toLowerCase() || "").includes(searchUser.toLowerCase())).map(usr => (
              <div key={usr.id} className={styles.userCard}>
                 <div className={styles.userHeader}>
                    <div className={styles.userAvatar}>
                      {usr.foto_url ? (
                        <img src={usr.foto_url} alt={usr.nombre} className={styles.avatarImg} />
                      ) : (
                        usr.nombre[0]
                      )}
                    </div>
                    <div className={styles.userInfo}>
                       <input 
                         className={styles.userEditName} 
                         value={usr.nombre} 
                         onChange={(e) => handleUpdateUsuario(usr.id, 'nombre', e.target.value)} 
                       />
                       <span className={styles.userRoleTag}>{usr.role} - {usr.username}</span>
                    </div>
                 </div>

                 <div className={styles.userSection}>
                    <label>Sucursal Asignada</label>
                    <input 
                      className={styles.userEditBranch} 
                      value={usr.sucursal} 
                      onChange={(e) => handleUpdateUsuario(usr.id, 'sucursal', e.target.value)} 
                    />
                 </div>

                 <div className={styles.userSection}>
                    <label>Áreas Técnicas Permitidas (FO-DO-017)</label>
                    <div className={styles.areaCheckgrid}>
                       {AREAS_SOLCAN.map(area => (
                         <div 
                           key={area.key} 
                           className={`${styles.areaBadge} ${(usr.areas_asignadas || []).includes(area.key) ? styles.areaActive : ''}`}
                           onClick={() => toggleArea(usr.id, area.key, usr.areas_asignadas)}
                         >
                            {area.label}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
