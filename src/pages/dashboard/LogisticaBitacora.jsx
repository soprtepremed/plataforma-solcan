import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./LogisticaBitacora.module.css";

const AREAS = [
  { key: "hemato", label: "Hematología" },
  { key: "uro", label: "Uroanálisis" },
  { key: "quimica", label: "Química clínica e Inmunología" },
  { key: "archivo", label: "Control y Archivo" },
  { key: "calidad", label: "Dirección técnica y de calidad" },
  { key: "admin", label: "Dirección de administración y finanzas" },
  { key: "recursos", label: "Recursos materiales" }
];

export default function LogisticaBitacora() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from("logistica_envios").select("*");
    
    // Admin y Químico (Matriz) ven todo. Recepción de sucursal solo ve lo suyo.
    if (user && user.role !== 'admin' && user.role !== 'quimico') {
      query = query.eq("sucursal", user.branch);
    }

    const { data: logs, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (!error) setData(logs);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const ch = supabase.channel('bitacora').on('postgres_changes', { event: '*', schema: 'public', table: 'logistica_envios' }, () => {
      fetchLogs();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const signArea = async (envId, areaKey) => {
    // Si ya está firmado, no hacemos nada (o podrías permitir cambio)
    const initials = user?.email?.split('@')[0]?.substring(0, 3)?.toUpperCase() || "SOL";
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    
    const { error } = await supabase
      .from("logistica_envios")
      .update({
        [`a_${areaKey}_user`]: initials,
        [`a_${areaKey}_time`]: time
      })
      .eq("id", envId);

    if (!error) fetchLogs();
  };

  return (
    <div className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.backBtn}>
        <span className="material-symbols-rounded">arrow_back</span>
        Volver
      </button>

      <header className={styles.headerDoc}>
        <div className={styles.logoArea}>
           <img src="/logo_solcan.png" alt="Solcan" width="140" />
           <p style={{fontSize: '0.6rem', fontWeight: 800, margin: 0, color: 'var(--co-primary)'}}>Cuida tu salud</p>
        </div>
        <div className={styles.titleArea}>
           <h1>CONTROL DE RECOLECCIÓN DE MUESTRAS DE SUCURSALES</h1>
        </div>
        <div className={styles.docCode}>
           FO-DO-017<br/>Versión: 07<br/>Emisión: 01-07-2025
        </div>
      </header>

      <div className={styles.tableWrapper}>
        <table className={styles.bitacoraTable}>
          <thead>
            <tr>
              <th rowSpan="3" className={styles.smallTh}>Fecha</th>
              <th rowSpan="3">Sucursal</th>
              <th rowSpan="3" className={styles.smallTh}>Horario Salida</th>
              <th colSpan="5" className={styles.groupHeader}>Muestras Sanguíneas en Tubo</th>
              <th rowSpan="3" className={styles.smallTh}>Orina</th>
              <th colSpan="8" className={styles.groupHeader}>Muestras Varias</th>
              <th colSpan="4" className={styles.groupHeader}>Formatos</th>
              <th colSpan="14" className={styles.groupHeader}>AREA (Iniciales y Horario de Recepción)</th>
            </tr>
            <tr>
               <th colSpan="2">Suero</th>
               <th colSpan="3">Sangre total / Plasma</th>
               <th rowSpan="2">O-24h</th>
               <th rowSpan="2">Medio Trans.</th>
               <th rowSpan="2">Hisopo</th>
               <th colSpan="2">Laminilla</th>
               <th rowSpan="2">Heces</th>
               <th colSpan="2">Otros</th>
               <th rowSpan="2">F1</th>
               <th rowSpan="2">F2</th>
               <th rowSpan="2">F3</th>
               <th rowSpan="2">F4</th>
               {AREAS.map(a => <th key={a.key} colSpan="2" className={styles.areaGroupTh}>{a.label}</th>)}
            </tr>
            <tr>
               <th>Rojo</th><th>Dorado</th>
               <th>Lila</th><th>Celeste</th><th>Verde</th>
               <th>HE</th><th>MI</th>
               <th>Cant.</th><th>Análisis</th>
               {AREAS.map(a => (
                 <React.Fragment key={a.key}>
                    <th className={styles.subTh}>Usu.</th>
                    <th className={styles.subTh}>Hr.</th>
                 </React.Fragment>
               ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !loading && (
              <tr><td colSpan="36" className={styles.emptyState}>No hay registros para este periodo.</td></tr>
            )}
            {data.map(row => (
              <tr key={row.id}>
                <td style={{fontSize: '0.7rem'}}>{new Date(row.created_at).toLocaleDateString()}</td>
                <td><strong>{row.sucursal}</strong></td>
                <td>{row.hora_sale ? new Date(row.hora_sale).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '---'}</td>
                
                {/* Sanguineas */}
                <td className={styles.cellQty}>{row.s_rojo || ""}</td>
                <td className={styles.cellQty}>{row.s_dorado || ""}</td>
                <td className={styles.cellQty}>{row.s_lila || ""}</td>
                <td className={styles.cellQty}>{row.s_celeste || ""}</td>
                <td className={styles.cellQty}>{row.s_verde || ""}</td>
                
                {/* Orina */}
                <td className={styles.cellQty}>{row.s_papel || ""}</td>

                {/* Varias */}
                <td className={styles.cellQty}>{row.s_orina_24h || ""}</td>
                <td className={styles.cellQty}>{row.s_medio_transporte || ""}</td>
                <td className={styles.cellQty}>{row.s_hisopo || ""}</td>
                <td className={styles.cellQty}>{row.s_laminilla_he || ""}</td>
                <td className={styles.cellQty}>{row.s_laminilla_mi || ""}</td>
                <td className={styles.cellQty}>{row.s_heces || ""}</td>
                <td className={styles.cellQty}>{row.s_otros_cant || ""}</td>
                <td className={styles.cellQty}>{row.s_otros_analisis || ""}</td>

                {/* Formatos (X si es true) */}
                <td className={styles.cellFormat}>{row.f_do_001 ? "X" : ""}</td>
                <td className={styles.cellFormat}>{row.f_da_001 ? "X" : ""}</td>
                <td className={styles.cellFormat}>{row.f_qc_020 ? "X" : ""}</td>
                <td className={styles.cellFormat}>{row.f_rm_004 ? "X" : ""}</td>

                {/* AREAS (INTERACTIVA) */}
                {AREAS.map(a => (
                  <React.Fragment key={a.key}>
                    <td className={styles.areaCell} onClick={() => signArea(row.id, a.key)}>
                      {row[`a_${a.key}_user`] || ""}
                    </td>
                    <td className={styles.areaCell} onClick={() => signArea(row.id, a.key)}>
                      {row[`a_${a.key}_time`] || ""}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className={styles.refreshBtn} onClick={fetchLogs}>
        <span className="material-symbols-rounded">sync</span>
      </button>
    </div>
  );
}

