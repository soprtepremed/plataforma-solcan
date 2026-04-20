import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './ControlCalidadArea.module.css';
import html2pdf from 'html2pdf.js';

const AREA_NAMES = {
  'hematologia': 'HEMATOLOGÍA',
  'quimica-clinica': 'QUÍMICA CLÍNICA',
  'urianalisis': 'URIANÁLISIS',
  'microbiologia': 'MICROBIOLOGÍA',
  'serologia': 'SEROLOGÍA'
};

export default function ControlCalidadArea() {
  const { areaId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'history'
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: "", onConfirm: null });
  
  const [personal, setPersonal] = useState([]);
  
  const [headerInfo, setHeaderInfo] = useState({
    equipo: '',
    fecha: new Date().toISOString().split('T')[0],
    analista: user?.name || '',
    reviso: 'QFB. Julio César Sántiz Gómez'
  });

  const [rows, setRows] = useState([
    { id: 1, nombre_control: '', lote: '', caducidad: '', desviacion: '0', aceptacion: true, rechazo: false, actividad_seguir: '', accion_control: '' },
    { id: 2, nombre_control: '', lote: '', caducidad: '', desviacion: '0', aceptacion: true, rechazo: false, actividad_seguir: '', accion_control: '' },
    { id: 3, nombre_control: '', lote: '', caducidad: '', desviacion: '0', aceptacion: true, rechazo: false, actividad_seguir: '', accion_control: '' }
  ]);

  useEffect(() => {
    fetchHistory();
    fetchPersonal();
  }, [areaId]);

  const fetchPersonal = async () => {
    const { data } = await supabase
      .from('empleados')
      .select('id, nombre')
      .ilike('role', '%quimico%')
      .order('nombre');
    
    if (data) {
      const unique = [...new Map(data.map(item => [item.nombre, item])).values()];
      setPersonal(unique);
    }
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('control_calidad_acciones')
      .select('*')
      .eq('area_id', areaId)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Group by session_id
      const grouped = data.reduce((acc, current) => {
        const sessionId = current.session_id;
        if (!acc[sessionId]) acc[sessionId] = { 
          id: sessionId, 
          fecha: current.fecha, 
          equipo: current.equipo, 
          rows: [] 
        };
        acc[sessionId].rows.push(current);
        return acc;
      }, {});
      setHistory(Object.values(grouped));
    }
  };

  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows([...rows, { id: newId, nombre_control: '', lote: '', caducidad: '', desviacion: '0', aceptacion: true, rechazo: false, actividad_seguir: '', accion_control: '' }]);
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const handleInputChange = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        if (field === 'aceptacion') return { ...row, aceptacion: value, rechazo: !value };
        if (field === 'rechazo') return { ...row, rechazo: value, aceptacion: !value };
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const saveAndExport = async () => {
    if (loading || rows.filter(r => r.nombre_control || r.lote).length === 0) {
      setConfirmDialog({ show: true, message: "Por favor completa al menos una fila antes de guardar.", onConfirm: () => setConfirmDialog({ show: false }) });
      return;
    }

    setConfirmDialog({ 
      show: true, 
      message: "¿Deseas finalizar el registro de hoy? Se guardará en la base de datos y se generará el PDF oficial.", 
      onConfirm: async () => {
        setConfirmDialog({ show: false });
        setLoading(true);
        
        const sessionId = crypto.randomUUID();
        const payload = rows
          .filter(r => r.nombre_control || r.lote)
          .map(r => ({
            area_id: areaId,
            equipo: headerInfo.equipo,
            fecha: headerInfo.fecha,
            analista_id: user?.id,
            analista_nombre: headerInfo.analista,
            reviso_nombre: headerInfo.reviso,
            nombre_control: r.nombre_control,
            lote: r.lote,
            caducidad: r.caducidad || null,
            desviacion: r.desviacion,
            aceptacion: r.aceptacion,
            rechazo: r.rechazo,
            actividad_seguir: r.actividad_seguir,
            accion_control: r.accion_control,
            session_id: sessionId
          }));

        const { error } = await supabase.from('control_calidad_acciones').insert(payload);
        if (error) {
           setConfirmDialog({ show: true, message: "Error al guardar: " + error.message, onConfirm: () => setConfirmDialog({ show: false }) });
        } else {
            await generatePDF();
            fetchHistory();
        }
        setLoading(false);
      }
    });
  };

  const generatePDF = () => {
    const element = document.getElementById('printable-form');
    const opt = {
      margin: 0.5,
      filename: `QC_${areaId}_${headerInfo.fecha}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    return html2pdf().set(opt).from(element).save();
  };

  const loadFromHistory = (session) => {
    setHeaderInfo({
      equipo: session.equipo,
      fecha: session.fecha,
      analista: session.rows[0].analista_nombre,
      reviso: session.rows[0].reviso_nombre
    });
    setRows(session.rows.map((r, index) => ({ ...r, id: index + 1 })));
    setViewMode('form');
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button className={styles.historyBtn} onClick={() => setViewMode(viewMode === 'form' ? 'history' : 'form')}>
          {viewMode === 'form' ? 'Ver Histórico' : 'Volver al Formulario'}
        </button>
        {viewMode === 'form' && (
          <>
            <button className={styles.addRowBtn} onClick={addRow}>
              <span className="material-symbols-rounded">add</span> Agregar Fila
            </button>
            <button className={styles.saveBtn} onClick={saveAndExport} disabled={loading}>
              <span className="material-symbols-rounded">picture_as_pdf</span> 
              {loading ? 'Guardando...' : 'Guardar y Generar PDF'}
            </button>
          </>
        )}
      </div>

      {viewMode === 'form' ? (
        <div id="printable-form" className={styles.formWrapper}>
          <header className={styles.header}>
            <div className={styles.logoBox}>
              <img src="/favicon.png" alt="Solcan Lab" />
              <p>Cuida tu salud</p>
            </div>
            <div className={styles.titleBox}>
              <h1>ACCIONES DE CONTROL DE CALIDAD</h1>
            </div>
            <div className={styles.docInfo}>
              <p>FO-DO-012</p>
              <p>Versión: 03</p>
              <p>Emisión: 01/03/19</p>
            </div>
          </header>

          <div className={styles.subHeader}>
            <div className={styles.item}>ÁREA: <span>{AREA_NAMES[areaId] || areaId.toUpperCase()}</span></div>
            <div className={styles.item}>EQUIPO: <input value={headerInfo.equipo} onChange={e => setHeaderInfo({...headerInfo, equipo: e.target.value})} placeholder="Ej. BC6200" /></div>
            <div className={styles.item}>FECHA: <input type="date" value={headerInfo.fecha} onChange={e => setHeaderInfo({...headerInfo, fecha: e.target.value})} /></div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.qcTable}>
              <thead>
                <tr>
                  <th style={{width: '180px'}}>Nombre de Control</th>
                  <th>Lote</th>
                  <th style={{width: '110px'}}>Caducidad</th>
                  <th style={{width: '90px'}}>Desviación</th>
                  <th style={{width: '50px'}}>Acept.</th>
                  <th style={{width: '50px'}}>Rech.</th>
                  <th>Actividad a Seguir</th>
                  <th>Acción de Control</th>
                  <th className={styles.noPrint} style={{width: '40px'}}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td><input value={row.nombre_control} onChange={e => handleInputChange(row.id, 'nombre_control', e.target.value)} /></td>
                    <td><input value={row.lote} onChange={e => handleInputChange(row.id, 'lote', e.target.value)} /></td>
                    <td><input type="date" value={row.caducidad} onChange={e => handleInputChange(row.id, 'caducidad', e.target.value)} /></td>
                    <td><input value={row.desviacion} onChange={e => handleInputChange(row.id, 'desviacion', e.target.value)} /></td>
                    <td className={styles.checkCell} onClick={() => handleInputChange(row.id, 'aceptacion', true)}>{row.aceptacion ? 'X' : ''}</td>
                    <td className={styles.checkCell} onClick={() => handleInputChange(row.id, 'rechazo', true)}>{row.rechazo ? 'X' : ''}</td>
                    <td><textarea value={row.actividad_seguir} onChange={e => handleInputChange(row.id, 'actividad_seguir', e.target.value)} /></td>
                    <td><textarea value={row.accion_control} onChange={e => handleInputChange(row.id, 'accion_control', e.target.value)} /></td>
                    <td className={styles.noPrint} style={{textAlign: 'center'}}>
                      <button type="button" className={styles.removeRowBtn} onClick={() => removeRow(row.id)}>
                        <span className="material-symbols-rounded" style={{fontSize: '1.2rem'}}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className={styles.footer}>
            <div className={styles.signatureBox}>
              <p>ANALISTA: 
                <select 
                  className={styles.analistaSelect}
                  value={headerInfo.analista} 
                  onChange={e => setHeaderInfo({...headerInfo, analista: e.target.value})}
                >
                  <option value="">-- Seleccionar --</option>
                  {personal.map(p => (
                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                  ))}
                </select>
              </p>
            </div>
            <div className={styles.signatureBox}>
              <p>REVISÓ: {headerInfo.reviso}</p>
            </div>
          </footer>

          <div className={styles.pageFooter}>
            <span>Página 1/1</span>
            <span>Exclusivo de uso Interno</span>
          </div>
        </div>
      ) : (
        <div className={styles.historyContainer}>
          <h2 style={{marginBottom: '1.5rem', color: '#1e293b'}}>Histórico de Controles ({AREA_NAMES[areaId]})</h2>
          <div className={styles.historyGrid}>
            {history.length === 0 ? <p>No hay registros previos.</p> : history.map(session => (
              <div key={session.id} className={styles.historyCard} onClick={() => loadFromHistory(session)}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                  <span className="material-symbols-rounded" style={{color:'#0ea5e9'}}>description</span>
                  <strong style={{fontSize:'0.9rem'}}>{new Date(session.fecha + 'T12:00:00').toLocaleDateString()}</strong>
                </div>
                <p style={{fontSize:'0.8rem', color:'#64748b', margin:0}}><strong>Equipo:</strong> {session.equipo || '---'}</p>
                <p style={{fontSize:'0.8rem', color:'#64748b', marginTop:'5px'}}><strong>Registros:</strong> {session.rows.length}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmDialog.show && (
        <div className={styles.modalOverlay} style={{zIndex: 5000}}>
          <div className={styles.confirmBox}>
            <h3>Confirmar Acción</h3>
            <p>{confirmDialog.message}</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmDialog({show: false})}>Cancelar</button>
              <button className={styles.btnConfirm} onClick={confirmDialog.onConfirm}>Aceptar y Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
