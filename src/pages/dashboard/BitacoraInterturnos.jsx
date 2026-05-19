import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './BitacoraInterturnos.module.css';

const PRIORIDADES = ['Baja', 'Media', 'Alta'];
const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADO'];

const AREA_MAP = {
  'hematologia': 'Hematología',
  'microbiologia': 'Microbiología',
  'urianalisis': 'Urianálisis',
  'quimica-clinica': 'Química Clínica',
  'serologia': 'Serología',
  'especiales': 'Especiales'
};

export default function BitacoraInterturnos() {
  const { areaId } = useParams();
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const currentAreaName = AREA_MAP[areaId] || areaId;
  
  const [form, setForm] = useState({
    prioridad: 'Media',
    mensaje: ''
  });

  useEffect(() => {
    const savedNotes = localStorage.getItem('solcan_bitacora_notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      // Data inicial de ejemplo
      const initialData = [
        { id: 1, area: 'Hematología', prioridad: 'Alta', mensaje: 'Calibrar equipo Sysmex antes de procesar muestras de urgencias.', status: 'PENDIENTE', author: 'Dr. García', date: '2026-05-18 08:00' },
        { id: 2, area: 'Química Clínica', prioridad: 'Media', mensaje: 'Falta reactivo de Glucosa para el equipo Cobas. Se solicitó a almacén.', status: 'EN_PROCESO', author: 'Q. Rosa M.', date: '2026-05-18 09:15' },
        { id: 3, area: 'Urgencias', prioridad: 'Baja', mensaje: 'Muestras de paciente Pérez listas en gradilla. Solo falta validar en sistema.', status: 'COMPLETADO', author: 'Q. Luis T.', date: '2026-05-18 10:30' },
        { id: 4, area: 'Hematología', prioridad: 'Media', mensaje: 'Revisar frotis de paciente López por sospecha de blastos.', status: 'PENDIENTE', author: 'Q. Carlos P.', date: '2026-05-18 11:00' }
      ];
      setNotes(initialData);
      localStorage.setItem('solcan_bitacora_notes', JSON.stringify(initialData));
    }
  }, []);

  const saveToLocalStorage = (data) => {
    localStorage.setItem('solcan_bitacora_notes', JSON.stringify(data));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newNote = {
      id: Date.now(),
      area: currentAreaName,
      prioridad: form.prioridad,
      mensaje: form.mensaje,
      status: 'PENDIENTE',
      author: user?.name || user?.username || 'Usuario',
      date: new Date().toLocaleString('es-MX', { hour12: false }).slice(0, 16)
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    saveToLocalStorage(updatedNotes);
    setShowModal(false);
    setForm({ prioridad: 'Media', mensaje: '' });
  };

  const changeStatus = (id, newStatus) => {
    const updatedNotes = notes.map(n => n.id === id ? { ...n, status: newStatus } : n);
    setNotes(updatedNotes);
    saveToLocalStorage(updatedNotes);
  };

  const deleteNote = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este pendiente?')) {
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      saveToLocalStorage(updatedNotes);
    }
  };

  const [draggedOverStatus, setDraggedOverStatus] = useState(null);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('noteId', id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Aplicamos estilos visuales de "tarjeta flotante" de forma síncrona
    // para que la captura fantasma (drag-image) que genera el navegador los contenga.
    const cardEl = e.currentTarget;
    cardEl.style.transform = 'rotate(2.5deg) scale(1.04)';
    cardEl.style.boxShadow = '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.04)';
    cardEl.style.borderColor = 'rgba(13, 148, 136, 0.4)';
    cardEl.style.zIndex = '9999';
    
    setTimeout(() => {
      // Regresamos el elemento original en la lista a su estado plano
      // y le bajamos la opacidad para que actúe como un "placeholder" o hueco transparente.
      cardEl.style.transform = 'none';
      cardEl.style.boxShadow = 'none';
      cardEl.style.borderColor = 'rgba(226, 232, 240, 0.8)';
      cardEl.style.opacity = '0.2';
    }, 0);
  };

  const handleDragEnd = (e) => {
    const cardEl = e.currentTarget;
    // Restauramos el elemento a sus valores de estilo normales
    cardEl.style.opacity = '1';
    cardEl.style.transform = 'none';
    cardEl.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)';
    cardEl.style.borderColor = 'rgba(226, 232, 240, 0.8)';
    cardEl.style.zIndex = 'auto';
    setDraggedOverStatus(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    if (draggedOverStatus !== status) {
      setDraggedOverStatus(status);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDraggedOverStatus(null);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDraggedOverStatus(null);
    const id = e.dataTransfer.getData('noteId');
    if (id) {
      changeStatus(Number(id), newStatus);
    }
  };

  // Filtrar notas por el área actual
  const filteredNotes = notes.filter(n => n.area === currentAreaName);

  const getNotesByStatus = (status) => filteredNotes.filter(n => n.status === status);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span className="material-symbols-rounded" style={{color:'#0D9488', fontSize:'2.5rem'}}>dashboard</span>
          Bitácora de Interturnos — {currentAreaName}
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          <span className="material-symbols-rounded">add_box</span> Nuevo Pendiente
        </button>
      </header>

      {/* Se removió la barra de filtros global para enfocar solo en el área actual */}

      {/* Board */}
      <div className={styles.board}>
        {ESTADOS.map(status => (
          <div 
            key={status} 
            className={`${styles.column} ${draggedOverStatus === status ? styles.dragOver : ''}`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className={styles.columnHeader}>
              <h3 className={styles.columnTitle}>
                {status === 'PENDIENTE' && '🔴 Pendientes'}
                {status === 'EN_PROCESO' && '🟡 En Seguimiento'}
                {status === 'COMPLETADO' && '🟢 Completados'}
              </h3>
              <span className={styles.columnCount}>{getNotesByStatus(status).length}</span>
            </div>
            <div className={styles.columnBody}>
              {getNotesByStatus(status).length === 0 ? (
                <div style={{textAlign:'center', padding:'2rem', color:'#94A3B8', fontSize:'0.85rem'}}>
                  Sin pendientes
                </div>
              ) : (
                getNotesByStatus(status).map(note => (
                  <div 
                    key={note.id} 
                    className={`${styles.card} ${styles[`priority${note.prioridad}`]}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.areaTag}>{note.area}</span>
                      <span className={styles.date}>{note.date}</span>
                    </div>
                    <div className={styles.cardContent}>{note.mensaje}</div>
                    <div className={styles.cardFooter}>
                      <div className={styles.author}>
                        <div className={styles.avatar}>{note.author.charAt(0).toUpperCase()}</div>
                        <span>{note.author}</span>
                      </div>
                      <div className={styles.actions}>
                        {status !== 'COMPLETADO' && (
                          <button className={styles.actionBtn} onClick={() => changeStatus(note.id, status === 'PENDIENTE' ? 'EN_PROCESO' : 'COMPLETADO')} title="Avanzar">
                            <span className="material-symbols-rounded" style={{fontSize:'1.2rem'}}>arrow_forward</span>
                          </button>
                        )}
                        {status !== 'PENDIENTE' && (
                          <button className={styles.actionBtn} onClick={() => changeStatus(note.id, status === 'COMPLETADO' ? 'EN_PROCESO' : 'PENDIENTE')} title="Retroceder">
                            <span className="material-symbols-rounded" style={{fontSize:'1.2rem'}}>arrow_back</span>
                          </button>
                        )}
                        <button className={styles.actionBtn} onClick={() => deleteNote(note.id)} title="Eliminar">
                          <span className="material-symbols-rounded" style={{fontSize:'1.2rem'}}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Nuevo Pendiente — {currentAreaName}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className={styles.formContent}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><span className="material-symbols-rounded">medical_services</span> Área / Sección</label>
                  <div className={styles.inputWrapper}>
                    <input type="text" value={currentAreaName} disabled className={styles.disabledInput} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label><span className="material-symbols-rounded">flag</span> Prioridad</label>
                  <div className={styles.prioritySelector}>
                    {PRIORIDADES.map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.priorityPill} ${form.prioridad === p ? styles[`priorityPillActive${p}`] : ''}`}
                        onClick={() => setForm({...form, prioridad: p})}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label><span className="material-symbols-rounded">edit_note</span> Pendiente / Observación *</label>
                <div className={styles.inputWrapper}>
                  <textarea 
                    value={form.mensaje} 
                    onChange={e => setForm({...form, mensaje: e.target.value})} 
                    rows="4" 
                    placeholder="Describe los detalles del pendiente..." 
                    required 
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>
                  <span className="material-symbols-rounded">save</span> Guardar Pendiente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
