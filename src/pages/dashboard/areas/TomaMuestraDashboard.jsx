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
    observaciones: ''
  });

  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (view === 'historial') {
      fetchHistorial();
    }
  }, [view]);

  const fetchHistorial = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('logistica_folios_relacion')
      .select('*')
      .eq('sucursal', sucursal)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error) setHistorial(data);
    setLoading(false);
  };

  const addRow = () => {
    if (!newRow.folio_paciente) return;
    setFolios([...folios, { ...newRow, id: Date.now() }]);
    setNewRow({
      folio_paciente: '',
      estudios: '',
      fecha_entrega: '',
      entrega_tipo: 'Total',
      observaciones: ''
    });
  };

  const removeRow = (id) => {
    setFolios(folios.filter(f => f.id !== id));
  };

  const handleSubmitRelacion = async () => {
    if (folios.length === 0) return;
    setLoading(true);
    try {
      const dataToInsert = folios.map(f => ({
        sucursal,
        folio_paciente: f.folio_paciente,
        estudios: f.estudios,
        fecha_entrega: f.fecha_entrega || null,
        entrega_tipo: f.entrega_tipo,
        observaciones: f.observaciones,
        creado_por: user.id
      }));

      const { error } = await supabase
        .from('logistica_folios_relacion')
        .insert(dataToInsert);

      if (error) throw error;

      alert('Relación de folios enviada con éxito. Ya está disponible para consulta en Matriz.');
      setFolios([]);
      setView('historial');
    } catch (err) {
      alert('Error: ' + err.message);
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
            <span className="material-symbols-rounded">add_notes</span> Nueva Relación
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

            <div className={styles.quickForm}>
                <div className={styles.inputGroup}>
                  <label>Folio</label>
                  <input 
                    type="text" 
                    placeholder="S-000" 
                    value={newRow.folio_paciente} 
                    onChange={e => setNewRow({...newRow, folio_paciente: e.target.value})}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Estudios</label>
                  <input 
                    type="text" 
                    placeholder="BH, QS, etc." 
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
                  <label>Tipo</label>
                  <select 
                    value={newRow.entrega_tipo} 
                    onChange={e => setNewRow({...newRow, entrega_tipo: e.target.value})}
                  >
                    <option value="Total">Total</option>
                    <option value="Parcial">Parcial</option>
                  </select>
                </div>
                <button className={styles.addBtn} onClick={addRow}>
                   <span className="material-symbols-rounded">add</span>
                </button>
            </div>

            {folios.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Estudios</th>
                      <th>Entrega</th>
                      <th>Tipo</th>
                      <th>Observaciones</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folios.map(f => (
                      <tr key={f.id}>
                        <td><strong>{f.folio_paciente}</strong></td>
                        <td>{f.estudios}</td>
                        <td>{f.fecha_entrega}</td>
                        <td><span className={f.entrega_tipo === 'Parcial' ? styles.badgeParcial : styles.badgeTotal}>{f.entrega_tipo}</span></td>
                        <td>
                          <input 
                            className={styles.miniObs} 
                            placeholder="Nota..." 
                            value={f.observaciones}
                            onChange={(e) => {
                              const updated = folios.map(row => row.id === f.id ? {...row, observaciones: e.target.value} : row);
                              setFolios(updated);
                            }}
                          />
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
          <div className={styles.historyGrid}>
            {loading ? <p>Cargando historial...</p> : historial.map(h => (
              <div key={h.id} className={styles.historyCard}>
                <div className={styles.hHead}>
                  <strong>{h.folio_paciente}</strong>
                  <span className={h.entrega_tipo === 'Parcial' ? styles.badgeParcial : styles.badgeTotal}>{h.entrega_tipo}</span>
                </div>
                <div className={styles.hBody}>
                   <p><span className="material-symbols-rounded">science</span> {h.estudios || 'N/A'}</p>
                   {h.observaciones && <p className={styles.hObs}>"{h.observaciones}"</p>}
                </div>
                <div className={styles.hFooter}>
                   <span>Entrega: {h.fecha_entrega}</span>
                   <small>{new Date(h.created_at).toLocaleTimeString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
