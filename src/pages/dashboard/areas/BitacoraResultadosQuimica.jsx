import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import styles from './QuimicaClinicaDashboard.module.css';

const BitacoraResultadosQuimica = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [commonData, setCommonData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    estudio_enviado: ''
  });
  const [entries, setEntries] = useState([
    { id: Date.now(), folio: '', paciente: '', archivo: null }
  ]);

  useEffect(() => {
    fetchResultados();
  }, [filterDate]);

  const fetchResultados = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bitacora_resultados_quimica')
        .select('*')
        .order('fecha', { ascending: false });

      if (filterDate) {
        query = query.eq('fecha', filterDate);
      }

      const { data, error } = await query;
      if (error) {
        console.error(error);
        return;
      }
      if (data) setResultados(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    
    if (editingId && !showUpdateConfirm) {
      setShowUpdateConfirm(true);
      return;
    }

    // Validar que haya al menos una entrada válida
    const validEntries = entries.filter(ent => ent.folio && ent.paciente && (editingId || ent.archivo));
    if (validEntries.length === 0) {
      setStatusModal({ show: true, type: 'error', message: 'Por favor completa al menos un paciente con su archivo.' });
      return;
    }

    if (!commonData.estudio_enviado) {
      setStatusModal({ show: true, type: 'error', message: 'El nombre del estudio es obligatorio.' });
      return;
    }

    setUploading(true);
    try {
      const recordsToSave = [];

      for (const entry of validEntries) {
        let publicUrl = null;

        // Subir archivo si existe
        if (entry.archivo) {
          const file = entry.archivo;
          const fileExt = file.name.split('.').pop();
          const fileName = `${entry.folio}_${Date.now()}.${fileExt}`;
          const filePath = `${commonData.fecha}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('resultados_quimica')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl: url } } = supabase.storage
            .from('resultados_quimica')
            .getPublicUrl(filePath);
          
          publicUrl = url;
        }

        recordsToSave.push({
          folio: entry.folio,
          paciente: entry.paciente.toUpperCase(),
          fecha: commonData.fecha,
          estudio_enviado: commonData.estudio_enviado,
          pdf_url: publicUrl || (editingId ? undefined : null)
        });
      }

      if (editingId) {
        // En edición solo tomamos el primer registro válido
        const { error: dbError } = await supabase
          .from('bitacora_resultados_quimica')
          .update(recordsToSave[0])
          .eq('id', editingId);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('bitacora_resultados_quimica')
          .insert(recordsToSave);
        if (dbError) throw dbError;
      }

      setStatusModal({ 
        show: true, 
        type: 'success', 
        message: editingId ? 'Registro actualizado correctamente.' : `Se han registrado ${recordsToSave.length} estudios con éxito.` 
      });
      
      setShowModal(false);
      setShowUpdateConfirm(false);
      setEditingId(null);
      resetForm();
      fetchResultados();
    } catch (e) {
      console.error(e);
      setStatusModal({ show: true, type: 'error', message: 'Error en el proceso: ' + e.message });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setCommonData({ fecha: filterDate || new Date().toISOString().split('T')[0], estudio_enviado: '' });
    setEntries([{ id: Date.now(), folio: '', paciente: '', archivo: null }]);
  };

  const addEntry = () => {
    setEntries([...entries, { id: Date.now(), folio: '', paciente: '', archivo: null }]);
  };

  const removeEntry = (id) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id, field, value) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('bitacora_resultados_quimica')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setStatusModal({ show: true, type: 'success', message: 'Registro eliminado correctamente.' });
      setShowDeleteConfirm(false);
      setDeleteId(null);
      fetchResultados();
    } catch (e) {
      console.error('Error al eliminar:', e);
      setStatusModal({ show: true, type: 'error', message: 'No se pudo eliminar: ' + e.message });
    }
  };

  const handleEdit = (res) => {
    setCommonData({
      fecha: res.fecha,
      estudio_enviado: res.estudio_enviado
    });
    setEntries([{
      id: res.id,
      folio: res.folio,
      paciente: res.paciente,
      archivo: null
    }]);
    setEditingId(res.id);
    setShowModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const exportToExcel = () => {
    const dataToExport = resultados.map(r => ({
      Folio: r.folio,
      Fecha: r.fecha,
      Paciente: r.paciente,
      Estudio_Maquilado: r.estudio_enviado,
      Comprobante_URL: r.pdf_url
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Maquilas");
    XLSX.writeFile(workbook, `Maquilas_Quimica_${filterDate}.xlsx`);
  };

  return (
    <div className={styles.container} style={{animation: 'slideIn 0.3s ease-out'}}>
      <header className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <span className={`material-symbols-rounded ${styles.headerIcon}`} style={{background: 'linear-gradient(135deg, #F59E0B, #D97706)', color:'white'}}>list_alt</span>
          <div>
            <h2>Bitácora de Maquila</h2>
            <p>Control de estudios externos para conciliación y reposición de reactivos.</p>
          </div>
        </div>
      </header>

      <div style={{
        marginBottom: '2rem', 
        background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(10px)',
        padding: '1.5rem', 
        borderRadius: '24px', 
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'center'
      }}>
        <div style={{
          flex: 1, 
          minWidth: '300px', 
          background: 'white', 
          borderRadius: '16px', 
          padding: '8px 15px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <span className="material-symbols-rounded" style={{color: '#94A3B8'}}>search</span>
          <input 
            placeholder="Buscar por paciente o folio..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{
              border: 'none',
              background: 'transparent',
              width: '100%',
              outline: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              color: '#1E293B'
            }}
          />
        </div>

        <div style={{
          display:'flex', 
          alignItems:'center', 
          gap:'8px', 
          background: 'white', 
          padding: '8px 15px', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <span className="material-symbols-rounded" style={{fontSize: '20px', color: '#64748B'}}>calendar_today</span>
          <input 
            type="date" 
            style={{border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: '#1E293B', fontWeight: 600}}
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
          />
          {filterDate && (
            <button 
              onClick={() => setFilterDate('')}
              style={{
                border: 'none', 
                background: '#FEF2F2', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                color: '#EF4444',
                padding: '4px',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              title="Limpiar filtro"
            >
              <span className="material-symbols-rounded" style={{fontSize: '18px'}}>close</span>
            </button>
          )}
        </div>

        <div style={{display: 'flex', gap: '10px'}}>
          <button className={styles.btnPrimarySmall} style={{background: '#10B981', padding: '12px 20px', borderRadius: '16px'}} onClick={() => setShowModal(true)}>
            <span className="material-symbols-rounded">add</span> Nuevo Registro
          </button>
          <button className={styles.btnPrimarySmall} style={{background: '#3B82F6', padding: '12px 20px', borderRadius: '16px'}} onClick={exportToExcel}>
            <span className="material-symbols-rounded">download</span> Excel
          </button>
          <button className={styles.btnPrimarySmall} style={{background: '#F59E0B', padding: '12px 20px', borderRadius: '16px'}} onClick={fetchResultados}>
            <span className="material-symbols-rounded">refresh</span>
          </button>
        </div>
      </div>

      {/* Modal de Carga */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{maxWidth: '650px', borderRadius: '32px'}}>
            <div className={styles.modalHeader} style={{padding: '2rem'}}>
              <div>
                <h3 style={{fontSize: '1.5rem'}}>{editingId ? 'Editar Maquila' : 'Registrar Estudio Maquilado'}</h3>
                <p style={{margin: 0, color: '#64748B', fontSize: '0.9rem'}}>Completa la información para la conciliación con el proveedor.</p>
              </div>
              <button className={styles.closeBtn} onClick={() => { setShowModal(false); setEditingId(null); }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form onSubmit={handleUpload} className={styles.modalBody} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              {/* Datos Comunes */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '1.5rem', background: '#F8FAFC', borderRadius: '20px', border: '1px solid #E2E8F0'}}>
                <div className={styles.field} style={{margin: 0}}>
                  <label>Fecha de Envío</label>
                  <input 
                    type="date" 
                    className={styles.inputMinimal}
                    value={commonData.fecha || ''}
                    onChange={(e) => setCommonData({...commonData, fecha: e.target.value})}
                    required
                  />
                </div>
                <div className={styles.field} style={{margin: 0}}>
                  <label>Estudio Mandado a Maquilar</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Perfil de Lípidos..." 
                    className={styles.inputMinimal}
                    value={commonData.estudio_enviado || ''}
                    onChange={(e) => setCommonData({...commonData, estudio_enviado: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Lista de Pacientes */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <h4 style={{margin: 0, fontSize: '0.9rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Pacientes a Registrar</h4>
                
                {entries.map((entry, index) => (
                  <div key={entry.id} style={{
                    padding: '1.5rem', 
                    background: 'white', 
                    borderRadius: '20px', 
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    position: 'relative',
                    animation: 'slideIn 0.3s ease-out'
                  }}>
                    {entries.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeEntry(entry.id)}
                        style={{position: 'absolute', top: '10px', right: '10px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                      >
                        <span className="material-symbols-rounded" style={{fontSize: '18px'}}>close</span>
                      </button>
                    )}

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px'}}>
                      <div className={styles.field} style={{margin: 0}}>
                        <label>Folio</label>
                        <input 
                          type="text" 
                          placeholder="Folio" 
                          className={styles.inputMinimal}
                          value={entry.folio || ''}
                          onChange={(e) => updateEntry(entry.id, 'folio', e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.field} style={{margin: 0}}>
                        <label>Nombre del Paciente</label>
                        <input 
                          type="text" 
                          placeholder="Nombre Completo" 
                          className={styles.inputMinimal}
                          value={entry.paciente || ''}
                          onChange={(e) => updateEntry(entry.id, 'paciente', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {!editingId && (
                      <div className={styles.fileInputWrapper}>
                        <input 
                          type="file" 
                          accept=".pdf" 
                          onChange={(e) => updateEntry(entry.id, 'archivo', e.target.files[0])}
                          className={styles.fileInput}
                          id={`pdfFile-${entry.id}`}
                        />
                        <label htmlFor={`pdfFile-${entry.id}`} className={styles.fileDragArea} style={{minHeight: '100px', padding: '1rem'}}>
                          <span className="material-symbols-rounded" style={{fontSize: '2rem', color: '#10B981'}}>upload_file</span>
                          <p style={{margin: 0, fontWeight: 700, fontSize: '0.9rem'}}>{entry.archivo ? entry.archivo.name : 'Subir PDF de este estudio'}</p>
                          
                          {entry.archivo && (
                            <button 
                              type="button"
                              className={styles.removeFileBtn}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateEntry(entry.id, 'archivo', null);
                              }}
                            >
                              <span className="material-symbols-rounded" style={{fontSize: '16px'}}>delete</span> Quitar
                            </button>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                ))}

                {!editingId && (
                  <button 
                    type="button" 
                    onClick={addEntry}
                    style={{
                      padding: '15px', 
                      background: '#F1F5F9', 
                      color: '#3B82F6', 
                      border: '2px dashed #CBD5E1', 
                      borderRadius: '16px', 
                      fontWeight: 800, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <span className="material-symbols-rounded">person_add</span>
                    Agregar otro paciente a este estudio
                  </button>
                )}
              </div>

              <div style={{marginTop: '10px'}}>
                <button 
                  type="submit" 
                  className={styles.btnPrimarySmall} 
                  style={{width: '100%', padding: '18px', background: editingId ? '#3B82F6' : '#10B981', borderRadius: '16px', fontSize: '1rem'}}
                  disabled={uploading}
                >
                  {uploading ? 'Procesando...' : (editingId ? 'Actualizar Información' : `Guardar ${entries.length} Registros`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Actualización */}
      {showUpdateConfirm && (
        <div className={styles.modalOverlay} style={{zIndex: 3000}}>
          <div className={styles.modalContent} style={{maxWidth: '400px', padding: '2.5rem', textAlign: 'center'}}>
            <span className="material-symbols-rounded" style={{fontSize: '5rem', color: '#3B82F6', marginBottom: '1rem'}}>info</span>
            <h3 style={{fontSize: '1.5rem', marginBottom: '10px'}}>¿Confirmar Cambios?</h3>
            <p style={{color: '#64748B', marginBottom: '2rem'}}>Estás a punto de modificar los datos clínicos de este registro. Asegúrate de que la fecha y el folio sean correctos.</p>
            <div style={{display: 'flex', gap: '10px'}}>
              <button 
                className={styles.btnAction} 
                style={{flex: 1, padding: '15px', background: '#F1F5F9', color: '#475569', borderRadius: '12px', fontWeight: 700}}
                onClick={() => setShowUpdateConfirm(false)}
              >
                Revisar
              </button>
              <button 
                className={styles.btnAction} 
                style={{flex: 1, padding: '15px', background: '#3B82F6', color: 'white', borderRadius: '12px', fontWeight: 700}}
                onClick={() => handleUpload()}
              >
                Sí, Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Previsualización */}
      {showPreview && (
        <div className={styles.modalOverlay} onClick={() => setShowPreview(false)}>
          <div className={styles.modalContent} style={{maxWidth: '90vw', height: '90vh', display: 'flex', flexDirection: 'column'}} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Previsualización de Resultado</h3>
              <button className={styles.closeBtn} onClick={() => setShowPreview(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div style={{flex: 1, padding: '10px', background: '#525659'}}>
              <iframe 
                src={`${previewUrl}#toolbar=0`} 
                width="100%" 
                height="100%" 
                style={{border: 'none', borderRadius: '8px'}}
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Borrado */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} style={{zIndex: 2000}}>
          <div className={styles.modalContent} style={{maxWidth: '400px', padding: '2.5rem', textAlign: 'center'}}>
            <span className="material-symbols-rounded" style={{fontSize: '5rem', color: '#EF4444', marginBottom: '1rem'}}>warning</span>
            <h3 style={{fontSize: '1.5rem', marginBottom: '10px'}}>¿Estás seguro?</h3>
            <p style={{color: '#64748B', marginBottom: '2rem'}}>Esta acción eliminará permanentemente el registro de maquila y no se puede deshacer.</p>
            <div style={{display: 'flex', gap: '10px'}}>
              <button 
                type="button"
                className={styles.btnAction} 
                style={{flex: 1, padding: '15px', background: '#F1F5F9', color: '#475569', borderRadius: '12px', fontWeight: 700}}
                onClick={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className={styles.btnAction} 
                style={{flex: 1, padding: '15px', background: '#EF4444', color: 'white', borderRadius: '12px', fontWeight: 700}}
                onClick={confirmDelete}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estado (Éxito/Error) */}
      {statusModal.show && (
        <div className={styles.modalOverlay} style={{zIndex: 3000}}>
          <div className={styles.modalContent} style={{maxWidth: '400px', padding: '2.5rem', textAlign: 'center'}}>
            <span className="material-symbols-rounded" style={{
              fontSize: '5rem', 
              color: statusModal.type === 'success' ? '#10B981' : '#EF4444', 
              marginBottom: '1rem'
            }}>
              {statusModal.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <h3 style={{fontSize: '1.5rem', marginBottom: '10px'}}>
              {statusModal.type === 'success' ? '¡Logrado!' : 'Hubo un problema'}
            </h3>
            <p style={{color: '#64748B', marginBottom: '2rem'}}>{statusModal.message}</p>
            <button 
              className={styles.btnPrimarySmall} 
              style={{width: '100%', padding: '15px', background: statusModal.type === 'success' ? '#10B981' : '#EF4444'}}
              onClick={() => setStatusModal({ ...statusModal, show: false })}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableContainer} id="bitacoraTable" style={{background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'}}>
        {loading ? (
          <div style={{padding: '5rem', textAlign: 'center'}}><div className={styles.loader}></div><p>Buscando registros...</p></div>
        ) : (
          <table className={styles.mainTable}>
            <thead style={{background: '#F8FAFC'}}>
              <tr>
                <th style={{padding: '1.2rem'}}>Folio</th>
                <th>Fecha de Envío</th>
                <th>Paciente</th>
                <th>Estudio Maquilado</th>
                <th style={{textAlign: 'center'}}>Comprobante (PDF)</th>
                <th style={{textAlign: 'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = resultados.filter(r => {
                  const term = searchTerm.toLowerCase().trim();
                  return (
                    r.paciente?.toLowerCase().includes(term) || 
                    r.folio?.toString().toLowerCase().includes(term)
                  );
                });

                const folioCounts = filtered.reduce((acc, curr) => {
                  acc[curr.folio] = (acc[curr.folio] || 0) + 1;
                  return acc;
                }, {});

                return filtered.map(res => {
                  const isDuplicate = folioCounts[res.folio] > 1;
                  return (
                    <tr key={res.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                      <td style={{
                        padding: '1.2rem', 
                        fontFamily: 'Consolas, monaco, monospace', 
                        fontWeight: 900, 
                        fontSize: '1.1rem',
                        color: '#0F172A',
                        borderLeft: isDuplicate ? '5px solid #F59E0B' : '5px solid transparent',
                        background: isDuplicate ? '#FFFBEB' : 'transparent',
                        position: 'relative'
                      }} title={isDuplicate ? "Este folio tiene múltiples estudios asociados" : ""}>
                        {res.folio}
                        {isDuplicate && <span style={{
                          position: 'absolute', top: '2px', left: '8px', fontSize: '8px', 
                          color: '#D97706', textTransform: 'uppercase', fontWeight: 800
                        }}>Múltiple</span>}
                      </td>
                      <td style={{fontSize: '0.95rem', color: '#1E293B', fontWeight: 700}}>
                        {formatDate(res.fecha)}
                      </td>
                      <td style={{fontWeight: 700}}>{res.paciente}</td>
                      <td style={{fontSize: '0.9rem', color: '#1E293B', fontWeight: 600}}>{res.estudio_enviado || '-'}</td>
                      <td style={{textAlign: 'center'}}>
                        <div style={{display:'flex', justifyContent:'center', color:'#64748B'}}>
                          <span className="material-symbols-rounded">verified_user</span>
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex', gap:'8px', justifyContent: 'center'}}>
                          <button 
                            className={styles.btnAction} 
                            style={{background: '#EFF6FF', color: '#3B82F6'}} 
                            onClick={() => { setPreviewUrl(res.pdf_url); setShowPreview(true); }}
                          >
                            <span className="material-symbols-rounded">visibility</span>
                          </button>
                          <button 
                            className={styles.btnAction} 
                            style={{background: '#F1F5F9', color: '#475569'}} 
                            onClick={() => handleEdit(res)}
                          >
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          <button 
                            className={styles.btnAction} 
                            style={{background: '#FEF2F2', color: '#EF4444'}} 
                            onClick={(e) => { e.preventDefault(); handleDeleteClick(res.id); }}
                          >
                            <span className="material-symbols-rounded" style={{pointerEvents: 'none'}}>delete</span>
                          </button>
                          <a 
                            href={res.pdf_url} 
                            download 
                            className={styles.btnAction} 
                            style={{background: '#F0FDF4', color: '#10B981', display:'flex', alignItems:'center', justifyContent:'center'}}
                          >
                            <span className="material-symbols-rounded">download</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
              {resultados.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{padding: '4rem', textAlign: 'center', color: '#94A3B8'}}>
                    <span className="material-symbols-rounded" style={{fontSize: '48px', display: 'block', marginBottom: '10px'}}>search_off</span>
                    No hay resultados registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BitacoraResultadosQuimica;
