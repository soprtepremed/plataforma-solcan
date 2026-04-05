import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
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

const MESSENGERS_MAP = {
  "ALBERT": "Alberth",
  "EDWARD": "Edward",
  "ALEJANDRO": "Alejandro",
  "BULMARO": "Bulmaro",
  "EDYR": "Edyr Arnaldo"
};

const SUC_MAP = {
  "Paso Limon": "Paso Limón (SL)",
  "Paso Limón": "Paso Limón (SL)",
  "Plaza Cedros": "Plaza Cedros (SC)",
  "Arenal": "Arenal (SA)",
  "San Andrés": "San Andrés (SA)",
  "Chiapa de Corzo": "Chiapa de Corzo (SZ)",
  "San Cristóbal": "San Cristóbal (SS)",
  "Tapachula": "Tapachula (ST)"
};

export default function LogisticaBitacora() {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const printAreaRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const getLocalDateString = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedDriver, setSelectedDriver] = useState("Todos");
  const [selectedSucursal, setSelectedSucursal] = useState("Todas");
  
  const [availableSucursales, setAvailableSucursales] = useState(["Todas"]);
  const [availableDrivers, setAvailableDrivers] = useState(["Todos"]);

  const { user } = useAuth();

  const fetchFilters = async () => {
     // Obtenemos sucursales de empleados (catálogo oficial indirecto)
     const { data: empData } = await supabase.from("empleados").select("sucursal");
     // Obtenemos sucursales y choferes de envíos (realidad operativa)
     const { data: envData } = await supabase
       .from("logistica_envios")
       .select("sucursal, mensajero_id");
     
     const sucsSet = new Set(["Todas"]);
     const excludeKeywords = ["MATRIZ", "CENTRAL", "OFICINA", "TRANSPORTE", "TUXTLA"];

     const filterBranch = (name) => {
        if (!name) return false;
        const upper = name.toUpperCase();
        return !excludeKeywords.some(key => upper.includes(key));
     }

     if (empData) empData.forEach(e => { if (filterBranch(e.sucursal)) sucsSet.add(e.sucursal); });
     if (envData) envData.forEach(e => { if (filterBranch(e.sucursal)) sucsSet.add(e.sucursal); });
     
     const driversSet = new Set(["Todos"]);
     if (envData) envData.forEach(e => { if (e.mensajero_id) driversSet.add(e.mensajero_id); });

     setAvailableSucursales([...sucsSet].sort());
     setAvailableDrivers([...driversSet]);
  };

  const fetchLogs = async () => {
    setLoading(true);
    const dStart = new Date(`${selectedDate}T00:00:00`);
    const dEnd = new Date(`${selectedDate}T23:59:59`);
    
    const startOfDay = dStart.toISOString();
    const endOfDay = dEnd.toISOString();

    let query = supabase
      .from("logistica_envios")
      .select("*")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);
    
    if (user && user.role !== 'admin' && user.role !== 'quimico') {
      query = query.eq("sucursal", user.branch);
    }

    if (selectedDriver !== "Todos") {
      query = query.eq("mensajero_id", selectedDriver);
    }

    if (selectedSucursal !== "Todas") {
      query = query.eq("sucursal", selectedSucursal);
    }

    const { data: logs, error } = await query.order("created_at", { ascending: true });
    if (!error) setData(logs);
    setLoading(false);
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs();
    const ch = supabase.channel('bitacora').on('postgres_changes', { event: '*', schema: 'public', table: 'logistica_envios' }, () => {
      fetchLogs();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedDate, selectedDriver, selectedSucursal]);


  const renderQty = (val) => {
    if (val === 0 || val === "0" || val === null || val === undefined || val === "") {
      return <div className={styles.diagonalWrapper}><div className={styles.diagonalLine}></div></div>;
    }
    return val;
  };



  const getShorterSucursal = (name) => {
    if (name?.includes('(SZ)')) return 'SZ';
    if (name?.includes('(SA)')) return 'SA';
    if (name?.includes('(SS)')) return 'SS';
    if (name?.includes('(ST)')) return 'ST';
    if (name === 'Paso Limón') return 'PL';
    if (name === 'Plaza Cedros') return 'PC';
    return name || '';
  };

  const handleExportExcelHighFidelity = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("FO-DO-017 Bitácora");

    const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const verticalAlign = { vertical: 'middle', horizontal: 'center', textRotation: 90 };
    const boldFont = { bold: true };
    const smallFont = { size: 9 };

    const startAreaCol = 22;
    const endAreaCol = 22 + AREAS.length * 2 - 1;

    // Fila 1: Grupos Principales
    worksheet.getCell('A1').value = 'Fecha';
    worksheet.mergeCells('A1:A3');
    worksheet.getCell('B1').value = '*Sucursal';
    worksheet.mergeCells('B1:B3');
    worksheet.getCell('C1').value = 'Horario de salida de muestras';
    worksheet.mergeCells('C1:C3');
    worksheet.getCell('C1').alignment = verticalAlign;

    worksheet.getCell('D1').value = 'MUESTRAS SANGUINEAS EN TUBO';
    worksheet.mergeCells('D1:H1');
    worksheet.getCell('I1').value = 'MUESTRAS VARIAS';
    worksheet.mergeCells('I1:Q1');
    worksheet.getCell('R1').value = 'FORMATOS';
    worksheet.mergeCells('R1:U1');

    // AREA COMBINADA GLOBAL
    const areaStartCol = startAreaCol;
    const areaEndCol = endAreaCol;
    
    const areaStartLetter = worksheet.getColumn(areaStartCol).letter;
    const areaEndLetter = worksheet.getColumn(areaEndCol).letter;
    
    const headerRow1 = worksheet.getRow(1);
    const areaMainCell = headerRow1.getCell(areaStartCol);
    areaMainCell.value = 'AREA';
    worksheet.mergeCells(`${areaStartLetter}1:${areaEndLetter}1`);

    // Fila 2: Subgrupos y Nombres de Area
    worksheet.getCell('D2').value = 'Suero';
    worksheet.mergeCells('D2:E2');
    worksheet.getCell('F2').value = 'Sangre total / Plasma';
    worksheet.mergeCells('F2:H2');

    worksheet.getCell('I2').value = 'Orina';
    worksheet.mergeCells('I2:I3');
    worksheet.getCell('I2').alignment = verticalAlign;
    worksheet.getCell('J2').value = 'Orina de 24 hrs';
    worksheet.mergeCells('J2:J3');
    worksheet.getCell('J2').alignment = verticalAlign;
    worksheet.getCell('K2').value = 'Medio de transporte';
    worksheet.mergeCells('K2:K3');
    worksheet.getCell('K2').alignment = verticalAlign;
    worksheet.getCell('L2').value = 'Tubo de vidrio con hisopo';
    worksheet.mergeCells('L2:L3');
    worksheet.getCell('L2').alignment = verticalAlign;
    
    worksheet.getCell('M2').value = 'Laminilla';
    worksheet.mergeCells('M2:N2');

    worksheet.getCell('O2').value = 'Heces';
    worksheet.mergeCells('O2:O3');
    worksheet.getCell('O2').alignment = verticalAlign;
    worksheet.getCell('P2').value = 'Otros';
    worksheet.mergeCells('P2:Q2');

    worksheet.getCell('R2').value = 'FO-DO-001';
    worksheet.mergeCells('R2:R3');
    worksheet.getCell('R2').alignment = verticalAlign;
    worksheet.getCell('S2').value = 'FO-DA-001';
    worksheet.mergeCells('S2:S3');
    worksheet.getCell('S2').alignment = verticalAlign;
    worksheet.getCell('T2').value = 'FO-GC-020';
    worksheet.mergeCells('T2:T3');
    worksheet.getCell('T2').alignment = verticalAlign;
    worksheet.getCell('U2').value = 'FO-RM-004';
    worksheet.mergeCells('U2:U3');
    worksheet.getCell('U2').alignment = verticalAlign;

    let currentColumn = startAreaCol;
    AREAS.forEach((area) => {
      const colLetterStart = worksheet.getColumn(currentColumn).letter;
      const colLetterEnd = worksheet.getColumn(currentColumn + 1).letter;
      worksheet.getCell(`${colLetterStart}2`).value = area.label;
      worksheet.mergeCells(`${colLetterStart}2:${colLetterEnd}2`);
      currentColumn += 2;
    });

    // Fila 3: Finales (Tubos y Usuario/Horario)
    worksheet.getCell('D3').value = 'Rojo';
    worksheet.getCell('D3').alignment = verticalAlign;
    worksheet.getCell('E3').value = 'Dorado';
    worksheet.getCell('E3').alignment = verticalAlign;
    worksheet.getCell('F3').value = 'Lila';
    worksheet.getCell('F3').alignment = verticalAlign;
    worksheet.getCell('G3').value = 'Celeste';
    worksheet.getCell('G3').alignment = verticalAlign;
    worksheet.getCell('H3').value = 'Verde';
    worksheet.getCell('H3').alignment = verticalAlign;

    worksheet.getCell('M3').value = 'HE';
    worksheet.getCell('M3').alignment = verticalAlign;
    worksheet.getCell('N3').value = 'MI';
    worksheet.getCell('N3').alignment = verticalAlign;

    worksheet.getCell('P3').value = 'Cant.';
    worksheet.getCell('Q3').value = 'Análisis';

    currentColumn = startAreaCol;
    AREAS.forEach(() => {
      worksheet.getCell(`${worksheet.getColumn(currentColumn).letter}3`).value = 'Usuario';
      worksheet.getCell(`${worksheet.getColumn(currentColumn).letter}3`).alignment = verticalAlign;
      worksheet.getCell(`${worksheet.getColumn(currentColumn + 1).letter}3`).value = 'Horario';
      worksheet.getCell(`${worksheet.getColumn(currentColumn + 1).letter}3`).alignment = verticalAlign;
      currentColumn += 2;
    });

    // Estilos de cabecera
    for (let r = 1; r <= 3; r++) {
      const row = worksheet.getRow(r);
      row.eachCell((cell) => {
        cell.font = { ...boldFont, size: 8 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = thinBorder;
        if (!cell.alignment) cell.alignment = centerAlign;
      });
      row.height = r === 3 ? 65 : 30;
    }

    worksheet.columns.forEach((col, i) => {
      if (i < 3) col.width = 12;
      else if (i < 21) col.width = 4;
      else col.width = 8;
    });

    // Datos
    data.forEach((item, index) => {
      const rowData = [
        new Date(item.created_at).toLocaleDateString(),
        SUC_MAP[item.sucursal] || item.sucursal,
        item.hora_recoleccion ? new Date(item.hora_recoleccion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '---',
        item.s_rojo || 0,
        item.s_dorado || 0,
        item.s_lila || 0,
        item.s_celeste || 0,
        item.s_verde || 0,
        item.s_papel || 0,
        item.s_orina_24h || 0,
        item.s_medio_transporte || 0,
        item.s_hisopo || 0,
        item.s_laminilla_he || 0,
        item.s_laminilla_mi || 0,
        item.s_heces || 0,
        item.s_otros_cant || 0,
        item.s_otros_analisis || '',
        item.f_do_001 || 0,
        item.f_da_001 || 0,
        item.f_qc_020 || 0,
        item.f_rm_004 || 0
      ];

      AREAS.forEach(a => {
        rowData.push(item[`a_${a.key}_user`] || '');
        rowData.push(item[`a_${a.key}_time`] || '');
      });

      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.border = thinBorder;
        cell.alignment = centerAlign;
        cell.font = smallFont;
      });
    });

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `Bitacora_Logistica_${selectedDate}.xlsx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error("Error al exportar excel:", error);
      alert("Hubo un error al generar el archivo Excel.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.actionHeader}>
        <div className={styles.leftActions}>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            <span className="material-symbols-rounded">arrow_back</span>
            Volver
          </button>
          
          <div className={styles.dateSelector}>
            <label>FECHA:</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.dateSelector}>
            <label>FILTRAR SUCURSAL:</label>
            <select 
              value={selectedSucursal} 
              onChange={(e) => setSelectedSucursal(e.target.value)}
              className={styles.dateInput}
            >
              {availableSucursales.map(s => (
                <option key={s} value={s}>{(SUC_MAP[s] || s).toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className={styles.dateSelector}>
            <label>FILTRAR CHOFER:</label>
            <select 
              value={selectedDriver} 
              onChange={(e) => setSelectedDriver(e.target.value)}
              className={styles.dateInput}
            >
              {availableDrivers.map(d => (
                <option key={d} value={d}>
                  {d === "Todos" ? "TODOS LOS CHOFERES" : (MESSENGERS_MAP[d] || d).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.rightActions}>
          <button onClick={handleExportExcelHighFidelity} className={styles.excelBtn}>
            <span className="material-symbols-rounded">description</span>
            Exportar Excel
          </button>
        </div>
      </div>
      
      <div ref={printAreaRef} className={styles.printContainer}>
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
          <div className={styles.transportValue}>
            {selectedDriver === "Todos" 
              ? "CONTROL GENERAL DE LABORATORIO" 
              : (MESSENGERS_MAP[selectedDriver] || selectedDriver).toUpperCase()}
          </div>
        </div>

      <div className={styles.tableWrapper}>
        <table className={styles.bitacoraTable} ref={tableRef}>
          <thead>
            {/* FILA 1: Macro Grupos */}
            <tr className={styles.groupHeader}>
               <th rowSpan="3" style={{width: '90px', fontSize: '0.65rem'}}>Fecha</th>
               <th rowSpan="3" style={{width: '90px', fontSize: '0.65rem'}}>*Sucursal</th>
               <th rowSpan="3" className={styles.verticalTh}>Horario de salida de muestras</th>
               <th colSpan="5" className={styles.darkHeader}>MUESTRAS SANGUINEAS EN TUBO</th>
               <th colSpan="9" className={styles.darkHeader}>MUESTRAS VARIAS</th>
               <th colSpan="4" className={styles.darkHeader}>FORMATOS</th>
               <th colSpan={AREAS.length * 2} className={styles.darkHeader}>AREA</th>
            </tr>

            {/* FILA 2: Subgrupos y Nombres de Area */}
            <tr className={styles.groupHeader}>
               <th colSpan="2" style={{fontSize: '0.55rem'}}>Suero</th>
               <th colSpan="3" style={{fontSize: '0.55rem'}}>Sangre total / Plasma</th>
               
               <th rowSpan="2" className={styles.verticalTh}>Orina</th>
               <th rowSpan="2" className={styles.verticalTh}>Orina de 24 hrs</th>
               <th rowSpan="2" className={styles.verticalTh}>Medio de transporte</th>
               <th rowSpan="2" className={styles.verticalTh}>Tubo de vidrio con hisopo</th>
               
               <th colSpan="2" style={{fontSize: '0.55rem'}}>Laminilla</th>
               
               <th rowSpan="2" className={styles.verticalTh}>Heces</th>
               
               <th colSpan="2" style={{fontSize: '0.55rem'}}>Otros</th>

               <th rowSpan="2" className={styles.verticalTh}>FO-DO-001</th>
               <th rowSpan="2" className={styles.verticalTh}>FO-DA-001</th>
               <th rowSpan="2" className={styles.verticalTh}>FO-GC-020</th>
               <th rowSpan="2" className={styles.verticalTh}>FO-RM-004</th>

               {/* Áreas Técnicas */}
               {AREAS.map(a => (
                 <th key={`area-name-${a.key}`} colSpan="2" className={styles.areaLabelHeader}>{a.label}</th>
               ))}
            </tr>

            {/* FILA 3: Final Etiquetas (Rojo, Dorado, etc / Usuario, Horario) */}
            <tr className={styles.groupHeader}>
               <th className={styles.verticalTh}>Rojo</th>
               <th className={styles.verticalTh}>Dorado</th>
               <th className={styles.verticalTh}>Lila</th>
               <th className={styles.verticalTh}>Celeste</th>
               <th className={styles.verticalTh}>Verde</th>

               <th className={styles.verticalTh}>HE</th>
               <th className={styles.verticalTh}>MI</th>

               <th className={styles.verticalTh}>Cant.</th>
               <th style={{fontSize: '0.55rem', width: '30px'}}>Análisis</th>

               {/* Sub-títulos áreas */}
               {AREAS.map(a => (
                 <React.Fragment key={`area-subs-${a.key}`}>
                   <th className={styles.verticalTh}>Usuario</th>
                   <th className={styles.verticalTh}>Horario</th>
                 </React.Fragment>
               ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={22 + AREAS.length * 2} style={{padding: '2rem', textAlign: 'center'}}>Cargando registros...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={22 + AREAS.length * 2} style={{padding: '2rem', textAlign: 'center'}}>No hay registros para este período.</td></tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{textAlign: 'center'}}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td style={{textAlign: 'center', fontWeight: 'bold'}}>{SUC_MAP[item.sucursal] || item.sucursal}</td>
                  <td style={{textAlign: 'center'}}>{item.hora_recoleccion ? new Date(item.hora_recoleccion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '---'}</td>
                  
                  <td className={styles.cellQty}>{renderQty(item.s_rojo)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_dorado)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_lila)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_celeste)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_verde)}</td>
                  
                  <td className={styles.cellQty}>{renderQty(item.s_papel)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_orina_24h)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_medio_transporte)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_hisopo)}</td>
                  
                  <td className={styles.cellQty}>{renderQty(item.s_laminilla_he)}</td>
                  <td className={styles.cellQty}>{renderQty(item.s_laminilla_mi)}</td>
                  
                  <td className={styles.cellQty}>{renderQty(item.s_heces)}</td>
                  
                  <td className={styles.cellQty}>{renderQty(item.s_otros_cant)}</td>
                  <td style={{fontSize: '0.55rem', padding: '2px'}}>{item.s_otros_analisis}</td>

                  <td className={styles.cellQty}>{renderQty(item.f_do_001)}</td>
                  <td className={styles.cellQty}>{renderQty(item.f_da_001)}</td>
                  <td className={styles.cellQty}>{renderQty(item.f_qc_020)}</td>
                  <td className={styles.cellQty}>{renderQty(item.f_rm_004)}</td>

                  {AREAS.map(a => (
                    <React.Fragment key={`${item.id}-${a.key}`}>
                       <td className={styles.cellQty} style={{fontSize: '0.6rem'}}>{renderQty(item[`a_${a.key}_user`])}</td>
                       <td className={styles.cellQty} style={{fontSize: '0.6rem'}}>{renderQty(item[`a_${a.key}_time`])}</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      <button className={styles.refreshBtn} onClick={fetchLogs}>
        <span className="material-symbols-rounded">sync</span>
      </button>
    </div>
  );
}

