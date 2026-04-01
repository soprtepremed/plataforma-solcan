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
  const navigate = useNavigate();
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

  const renderQty = (val) => {
    if (val === 0 || val === "0" || val === null || val === undefined || val === "") {
      return <div className={styles.diagonalWrapper}><div className={styles.diagonalLine}></div></div>;
    }
    return val;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <div className={styles.actionHeader}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <span className="material-symbols-rounded">arrow_back</span>
          Volver
        </button>
        <button onClick={handlePrint} className={styles.printBtn}>
          <span className="material-symbols-rounded">print</span>
          Imprimir FO-DO-017
        </button>
      </div>

      <header className={styles.headerDoc}>
        <div className={styles.logoArea}>
           <img src="/solcan-logo-mark.jpg" alt="Solcan" className={styles.logoImg} />
           <div className={styles.slogan}>
             <p className={styles.brandName}>SOLCAN</p>
             <p className={styles.tagline}>Pasión por la vida</p>
           </div>
        </div>
        <div className={styles.titleArea}>
           <h1>CONTROL DE RECOLECCIÓN DE MUESTRAS</h1>
        </div>
        <div className={styles.docCode}>
           FO-DO-017<br/>Versión: 07<br/>Emisión: 01-07-2025
        </div>
      </header>

       <div className={styles.transportBar}>
          <div className={styles.transportLabel}>RESPONSABLE DE TRANSPORTE:</div>
          <div className={styles.transportValue}>Alberth Ventura Coutiño</div>
       </div>

      <div className={styles.tableWrapper}>
        <table className={styles.bitacoraTable}>
          <thead>
            {/* FILA 1: Macro Grupos */}
            <tr className={styles.groupHeader}>
               <th rowSpan="4" style={{width: '90px', fontSize: '0.65rem'}}>Fecha</th>
                <th rowSpan="4" style={{width: '90px', fontSize: '0.65rem'}}>*Sucursal</th>
               <th rowSpan="4" className={styles.verticalTh}>Horario de salida de muestras</th>
               <th colSpan="5" className={styles.darkHeader}>MUESTRAS SANGUINEAS EN TUBO</th>
               <th colSpan="9" className={styles.darkHeader}>MUESTRAS VARIAS</th>
               <th colSpan="4" className={styles.darkHeader}>FORMATOS</th>
               <th colSpan={AREAS.length * 2} className={styles.darkHeader}>AREA</th>
               <th rowSpan="4" style={{minWidth: '100px'}}>Observaciones Sucursal</th>
               <th rowSpan="4" style={{minWidth: '100px'}}>Observaciones Laboratorio</th>
            </tr>

            {/* FILA 2: Nivel secundario */}
            <tr className={styles.groupHeader}>
               <th colSpan="2" rowSpan="2" style={{fontSize: '0.55rem'}}>Suero</th>
               <th colSpan="3" style={{fontSize: '0.55rem'}}>Sangre total</th>
               
               <th rowSpan="3" className={styles.verticalTh}>Orina</th>
               <th rowSpan="3" className={styles.verticalTh}>Orina de 24 hrs</th>
               <th rowSpan="3" className={styles.verticalTh}>Medio de transporte</th>
               <th rowSpan="3" className={styles.verticalTh}>Tubo de vidrio con hisopo</th>
               
               <th colSpan="2" rowSpan="2" style={{fontSize: '0.55rem'}}>Laminilla</th>
               
               <th rowSpan="3" className={styles.verticalTh}>Heces</th>
               
               <th colSpan="2" style={{fontSize: '0.55rem'}}>Otros</th>

               <th rowSpan="3" className={styles.verticalTh}>FO-DO-001</th>
               <th rowSpan="3" className={styles.verticalTh}>FO-DA-001</th>
               <th rowSpan="3" className={styles.verticalTh}>FO-GC-020</th>
               <th rowSpan="3" className={styles.verticalTh}>FO-RM-004</th>

               <th colSpan={AREAS.length * 2} className={styles.instructionTh}>
                 Colocar iniciales de usuario y horario de recepción
               </th>
            </tr>

            {/* FILA 3: Nivel terciario */}
            <tr className={styles.groupHeader}>
               <th colSpan="3" style={{fontSize: '0.55rem'}}>Plasma</th>
               
               <th rowSpan="2" className={styles.verticalTh} style={{height: '40px'}}>Cantidad</th>
               <th rowSpan="2" style={{fontSize: '0.55rem', width: '80px'}}>Análisis</th>

               {/* Áreas Técnicas */}
               {AREAS.map(a => (
                 <th key={a.key} colSpan="2" className={styles.areaLabelHeader}>{a.label}</th>
               ))}
            </tr>

            {/* FILA 4: Final Nivel (Titulos Verticales finales) */}
            <tr className={styles.groupHeader}>
               <th className={styles.verticalTh} style={{height: '40px', minWidth: '55px'}}>Rojo</th>
               <th className={styles.verticalTh} style={{height: '40px', minWidth: '55px'}}>Dorado</th>
               <th className={styles.verticalTh} style={{height: '40px', minWidth: '55px'}}>Lila</th>
               <th className={styles.verticalTh} style={{height: '40px', minWidth: '55px'}}>Celeste</th>
               <th className={styles.verticalTh} style={{height: '40px', minWidth: '55px'}}>Verde</th>

               <th className={styles.verticalTh} style={{height: '40px'}}>HE</th>
               <th className={styles.verticalTh} style={{height: '40px'}}>MI</th>

               {/* Usuario / Horario Final */}
               {AREAS.map(a => (
                 <React.Fragment key={a.key}>
                    <th className={styles.verticalTh} style={{height: '110px'}}>Usuario</th>
                    <th className={styles.verticalTh} style={{height: '110px'}}>Horario</th>
                 </React.Fragment>
               ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !loading && (
              <tr><td colSpan="37" className={styles.emptyState}>No hay registros para este periodo.</td></tr>
            )}
            {data.map(row => (
              <tr key={row.id}>
                <td style={{fontSize: '0.55rem'}}>{new Date(row.created_at).toLocaleDateString()}</td>
                <td style={{fontSize: '0.55rem'}}>
                   <strong>
                     {row.sucursal?.includes('(SZ)') ? 'SZ' : 
                      row.sucursal?.includes('(SA)') ? 'SA' : 
                      row.sucursal?.includes('(SS)') ? 'SS' : 
                      row.sucursal?.includes('(ST)') ? 'ST' : 
                      row.sucursal === 'Paso Limón' ? 'PL' : 
                      row.sucursal === 'Plaza Cedros' ? 'PC' : row.sucursal}
                   </strong>
                </td>
                <td>{row.hora_recoleccion ? new Date(row.hora_recoleccion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '---'}</td>
                
                {/* Sanguineas */}
                <td className={styles.cellQty}>{renderQty(row.s_rojo)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_dorado)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_lila)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_celeste)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_verde)}</td>
                
                {/* Orina */}
                <td className={styles.cellQty}>{renderQty(row.s_papel)}</td>

                {/* Varias */}
                <td className={styles.cellQty}>{renderQty(row.s_orina_24h)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_medio_transporte)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_hisopo)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_laminilla_he)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_laminilla_mi)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_heces)}</td>
                <td className={styles.cellQty}>{renderQty(row.s_otros_cant)}</td>
                <td className={styles.cellQty}>{row.s_otros_analisis || ""}</td>

                {/* Formatos (Cantidad física) */}
                <td className={styles.cellQty}>{renderQty(row.f_do_001)}</td>
                <td className={styles.cellQty}>{renderQty(row.f_da_001)}</td>
                <td className={styles.cellQty}>{renderQty(row.f_qc_020)}</td>
                <td className={styles.cellQty}>{renderQty(row.f_rm_004)}</td>

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

                {/* OBSERVACIONES */}
                <td className={styles.cellObs} style={{fontSize: '0.75rem'}}>{row.observaciones_sucursal || ""}</td>
                <td className={styles.cellObs} style={{fontSize: '0.75rem'}}>{row.observaciones_recepcion || ""}</td>
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

