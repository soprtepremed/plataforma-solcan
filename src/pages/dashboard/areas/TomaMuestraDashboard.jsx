import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import styles from './TomaMuestraDashboard.module.css';

export default function TomaMuestraDashboard() {
  const { user } = useAuth();
  const [folios, setFolios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sucursal] = useState(user?.branch || 'Oficina Central');
  const [view, setView] = useState('registro'); // 'registro' o 'historial'
  
  // Estado para el formulario de nueva fila
  const [newRow, setNewRow] = useState({
    folio_paciente: '',
    estudios: '',
    fecha_entrega: '',
    entrega_tipo: 'Total',
    estudios_detalle: '',
    observaciones: '',
    hora_toma: ''
  });

  const [paqueteFolio, setPaqueteFolio] = useState('');
  const [historial, setHistorial] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (view === 'historial') {
      fetchHistorial();
    }
  }, [view]);

  const fetchHistorial = async () => {
    setLoading(true);
    console.log('-> Consultando historial de folios...');
    const { data, error } = await supabase
      .from('logistica_folios_relacion')
      .select('*')
      .ilike('sucursal', `%${sucursal}%`)
      .order('created_at', { ascending: false })
      .limit(100);
    
    console.log('-> Registros encontrados:', data?.length || 0);
    console.log('-> Contenido:', data);
    
    if (error) {
      console.error('-> Error de consulta:', error.message);
    } else {
      setHistorial(data || []);
    }
    setLoading(false);
  };

  const addRow = () => {
    if (!newRow.folio_paciente) return;
    setFolios([...folios, { ...newRow, id: Date.now() }]);
    
    // Inteligente: Si es parcial, mantenemos el folio para que agregue la otra parte con otra fecha
    setNewRow({
      folio_paciente: newRow.entrega_tipo === 'Parcial' ? newRow.folio_paciente : '',
      estudios: '',
      fecha_entrega: '',
      entrega_tipo: 'Total',
      estudios_detalle: '',
      observaciones: '',
      hora_toma: ''
    });
  };

  const removeRow = (id) => {
    setFolios(folios.filter(f => f.id !== id));
  };

  const handleSubmitRelacion = async () => {
    console.log('-> Iniciando envío de relación...');
    console.log('-> Cantidad de folios:', folios.length);
    console.log('-> Folio del paquete:', paqueteFolio);

    if (folios.length === 0) {
      console.warn('Intento de envío sin folios.');
      return;
    }
    if (!paqueteFolio) {
      console.warn('Falta folio del paquete.');
      alert('Por favor, indica el Folio del Paquete (ID de Envío) antes de continuar.');
      return;
    }
    setLoading(true);
    try {
      const dataToInsert = folios.map(f => ({
        sucursal,
        folio_paciente: f.folio_paciente,
        estudios: f.estudios,
        fecha_entrega: f.fecha_entrega || null,
        entrega_tipo: f.entrega_tipo,
        // Si es parcial, concatenamos el detalle en observaciones para no romper la BD por ahora
        observaciones: f.entrega_tipo === 'Parcial' 
          ? `[ENTREGA PARCIAL: ${f.estudios_detalle}] ${f.observaciones}`.trim() 
          : f.observaciones,
        paquete_folio: paqueteFolio,
        creado_por: user.id
      }));

      console.log('Enviando folios:', dataToInsert);
      const { error } = await supabase
        .from('logistica_folios_relacion')
        .insert(dataToInsert);

      if (error) {
        console.error('Error detallado de inserción:', error);
        throw error;
      }

      setShowSuccess(true);
      setFolios([]);
      setPaqueteFolio('');
    } catch (err) {
      console.error('Error al guardar relación:', err.message);
      // Podríamos añadir un modal de error aquí también
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1><span className="material-symbols-rounded">biotech</span> Área de Toma de Muestra</h1>
          <p>Gestión de folios y relación diaria para laboratorio matriz</p>
        </div>
        <div className={styles.navTabs}>
          <button 
            className={`${styles.tabBtn} ${view === 'registro' ? styles.tabActive : ''}`}
            onClick={() => setView('registro')}
          >
            <span className="material-symbols-rounded">note_add</span> Nueva Relación
          </button>
          <button 
            className={`${styles.tabBtn} ${view === 'historial' ? styles.tabActive : ''}`}
            onClick={() => setView('historial')}
          >
            <span className="material-symbols-rounded">history</span> Historial Enviado
          </button>
        </div>
      </header>

      <main className={styles.content}>
        {view === 'registro' ? (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Registro de Folios Enviados - {sucursal}</h3>
              <span className={styles.dateBadge}>{new Date().toLocaleDateString()}</span>
            </div>

            <div className={styles.paqueteSection}>
               <div className={styles.inputGroup} style={{flex: 1}}>
                 <label>ID DEL PAQUETE / FOLIO DE ENVÍO</label>
                 <div className={styles.inputWithIcon}>
                    <span className="material-symbols-rounded">inventory_2</span>
                    <input 
                      type="text" 
                      placeholder="Ej: SL-2904-001" 
                      value={paqueteFolio}
                      onChange={e => setPaqueteFolio(e.target.value.toUpperCase())}
                      className={styles.paqueteInput}
                    />
                 </div>
                 <small>Este folio se generó al finalizar el conteo de muestras.</small>
               </div>
            </div>

            <div className={styles.quickFormContainer}>
              <div className={styles.quickForm}>
                  <div className={styles.inputGroup}>
                    <label>Folio Paciente</label>
                    <input 
                      type="text" 
                      placeholder="S-000" 
                      value={newRow.folio_paciente} 
                      onChange={e => setNewRow({...newRow, folio_paciente: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className={styles.inputGroup} style={{minWidth: '100px'}}>
                    <label>Hora Toma</label>
                    <input 
                      type="time" 
                      value={newRow.hora_toma} 
                      onChange={e => setNewRow({...newRow, hora_toma: e.target.value})}
                    />
                  </div>
                  <div className={styles.inputGroup} style={{flex: 2}}>
                    <label>Todos los estudios del folio</label>
                    <input 
                      type="text" 
                      placeholder="BH, QS, EGO, CULTIVO..." 
                      value={newRow.estudios} 
                      onChange={e => setNewRow({...newRow, estudios: e.target.value})}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Fecha Entrega</label>
                    <input 
                      type="date" 
                      value={newRow.fecha_entrega} 
                      onChange={e => setNewRow({...newRow, fecha_entrega: e.target.value})}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Tipo Entrega</label>
                    <select 
                      value={newRow.entrega_tipo} 
                      onChange={e => setNewRow({...newRow, entrega_tipo: e.target.value})}
                      className={newRow.entrega_tipo === 'Parcial' ? styles.selectParcial : ''}
                    >
                      <option value="Total">Total (Todo)</option>
                      <option value="Parcial">Parcial (Una parte)</option>
                    </select>
                  </div>
                  
                  <button className={styles.addBtn} onClick={addRow}>
                    <span className="material-symbols-rounded">add</span>
                  </button>
              </div>

              {newRow.entrega_tipo === 'Parcial' && (
                <div className={styles.partialDetailRow}>
                   <div className={styles.partialAlert}>
                      <span className="material-symbols-rounded">warning</span>
                      <div>
                        <strong>ENTREGA PARCIAL DETECTADA</strong>
                        <p>Especifica qué estudios se entregan en la fecha seleccionada arriba:</p>
                      </div>
                   </div>
                   <input 
                     type="text"
                     placeholder="Ej: Solo se entrega BH y QS; el Cultivo queda pendiente para el lunes."
                     className={styles.partialInput}
                     value={newRow.estudios_detalle}
                     onChange={e => setNewRow({...newRow, estudios_detalle: e.target.value})}
                   />
                </div>
              )}
            </div>

            {folios.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Relación de Estudios</th>
                      <th>Entrega</th>
                      <th>Tipo</th>
                      <th>Detalle / Observaciones</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folios.map(f => (
                      <tr key={f.id} className={f.entrega_tipo === 'Parcial' ? styles.rowParcial : ''}>
                        <td><strong>{f.folio_paciente}</strong></td>
                        <td>
                          <div className={styles.studiesList}>
                            {f.estudios}
                          </div>
                        </td>
                        <td>
                          <div className={styles.dateCell}>
                            <span className="material-symbols-rounded">event</span>
                            {f.fecha_entrega}
                          </div>
                        </td>
                        <td>
                          <span className={f.entrega_tipo === 'Parcial' ? styles.badgeParcial : styles.badgeTotal}>
                            {f.entrega_tipo}
                          </span>
                        </td>
                        <td>
                          <div className={styles.obsContainer}>
                            {f.entrega_tipo === 'Parcial' && (
                              <div className={styles.miniDetail}>
                                <strong>ENTREGAR:</strong> {f.estudios_detalle}
                              </div>
                            )}
                            <input 
                              className={styles.miniObs} 
                              placeholder="Nota adicional..." 
                              value={f.observaciones}
                              onChange={(e) => {
                                const updated = folios.map(row => row.id === f.id ? {...row, observaciones: e.target.value} : row);
                                setFolios(updated);
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <button onClick={() => removeRow(f.id)} className={styles.deleteBtn}>
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <footer className={styles.tableFooter}>
                    <p>{folios.length} Folios listados para este bloque.</p>
                    <button className={styles.submitRelacionBtn} onClick={handleSubmitRelacion} disabled={loading}>
                      {loading ? 'Sincronizando...' : 'Enviar Relación a Matriz'}
                    </button>
                </footer>
              </div>
            )}

            {folios.length === 0 && (
              <div className={styles.emptyPrompt}>
                <span className="material-symbols-rounded">playlist_add</span>
                <p>Comienza a agregar los folios del día arriba.</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.historyTableWrapper}>
            {loading ? (
              <p className={styles.loadingText}>Cargando historial...</p>
            ) : historial.length > 0 ? (
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Toma</th>
                    <th>Paquete</th>
                    <th>Estudios</th>
                    <th>Entrega Prometida</th>
                    <th>Tipo</th>
                    <th>Observaciones / Detalle</th>
                    <th>Fecha y Hora de Envío</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(h => (
                    <tr key={h.id} className={h.entrega_tipo === 'Parcial' ? styles.rowParcial : ''}>
                      <td><strong>{h.folio_paciente}</strong></td>
                      <td>
                        <div className={styles.tomaCell}>
                          <span className="material-symbols-rounded">medical_services</span>
                          {h.hora_toma || '---'}
                        </div>
                      </td>
                      <td>
                        <div className={styles.packageCell}>
                          <span className="material-symbols-rounded">inventory_2</span>
                          {h.paquete_folio || '---'}
                        </div>
                      </td>
                      <td>{h.estudios || '---'}</td>
                      <td>
                        <div className={styles.dateCell}>
                          <span className="material-symbols-rounded">event</span>
                          {h.fecha_entrega 
                            ? h.fecha_entrega.split('-').reverse().join('/')
                            : '---'}
                        </div>
                      </td>
                      <td>
                        <span className={h.entrega_tipo === 'Parcial' ? styles.badgeParcial : styles.badgeTotal}>
                          {h.entrega_tipo}
                        </span>
                      </td>
                      <td className={styles.historyObsCell}>
                        {h.observaciones}
                      </td>
                      <td className={styles.historyTimeCell}>
                        <span className="material-symbols-rounded">history</span>
                        <div className={styles.timeHorizontal}>
                          <span className={styles.fullDateText}>
                            {new Date(h.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          <span className={styles.fullHourText}>
                            {new Date(h.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyHistory}>
                 <span className="material-symbols-rounded">history_toggle_off</span>
                 <p>No se encontraron registros previos para esta sucursal.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {showSuccess && (
        <div className={styles.overlay}>
          <div className={styles.successCard}>
             <div className={styles.successIcon}>
                <span className="material-symbols-rounded">verified</span>
             </div>
             <h2>¡Relación Sincronizada!</h2>
             <p>Los folios han sido vinculados correctamente y ya están disponibles para el laboratorio matriz.</p>
             
             <div className={styles.successActions}>
               <button 
                 onClick={() => { setShowSuccess(false); setView('registro'); }} 
                 className={styles.successBtn}
               >
                 Continuar Registrando
               </button>
               <button 
                 onClick={() => { setShowSuccess(false); setView('historial'); }} 
                 className={styles.secondaryBtn}
               >
                 Ver Historial
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
