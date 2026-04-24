import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import styles from './QuimicaClinicaDashboard.module.css';

const BitacoraResultadosQuimica = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newResult, setNewResult] = useState({
    folio: '',
    paciente: '',
    fecha: new Date().toISOString().split('T')[0],
    estudio_enviado: '',
    archivo: null
  });

  useEffect(() => {
    fetchResultados();
  }, [filterDate]);

  const fetchResultados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bitacora_resultados_quimica')
        .select('*')
        .eq('fecha', filterDate)
        .order('created_at', { ascending: false });

      if (data) setResultados(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    // Si no es edición, el archivo es obligatorio
    if (!editingId && !newResult.archivo) {
      setStatusModal({ show: true, type: 'error', message: 'Por favor selecciona un archivo PDF.' });
      return;
    }

    if (!newResult.folio || !newResult.paciente) {
      setStatusModal({ show: true, type: 'error', message: 'El folio y el nombre del paciente son obligatorios.' });
      return;
    }

    setUploading(true);
    try {
      let publicUrl = null;

      // Solo subir archivo si se seleccionó uno nuevo
      if (newResult.archivo) {
        const file = newResult.archivo;
        const fileExt = file.name.split('.').pop();
        const fileName = `${newResult.folio}_${Date.now()}.${fileExt}`;
        const filePath = `${newResult.fecha}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resultados_quimica')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: url } } = supabase.storage
          .from('resultados_quimica')
          .getPublicUrl(filePath);
        
        publicUrl = url;
      }

      // 3. Registrar en Tabla (Insert o Update)
      if (editingId) {
        const updateData = {
          folio: newResult.folio,
          paciente: newResult.paciente.toUpperCase(),
          fecha: newResult.fecha,
          estudio_enviado: newResult.estudio_enviado
        };
        if (publicUrl) updateData.pdf_url = publicUrl;

        const { error: dbError } = await supabase
          .from('bitacora_resultados_quimica')
          .update(updateData)
          .eq('id', editingId);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('bitacora_resultados_quimica')
          .insert([{
            folio: newResult.folio,
            paciente: newResult.paciente.toUpperCase(),
            fecha: newResult.fecha,
            estudio_enviado: newResult.estudio_enviado,
            pdf_url: publicUrl
          }]);
        if (dbError) throw dbError;
      }

      setStatusModal({ 
        show: true, 
        type: 'success', 
        message: editingId ? 'Registro de maquila actualizado correctamente.' : 'Estudio mandado a maquila registrado con éxito.' 
      });
      
      setShowModal(false);
      setEditingId(null);
      setNewResult({ folio: '', paciente: '', fecha: filterDate, estudio_enviado: '', archivo: null });
      fetchResultados();
    } catch (e) {
      console.error(e);
      setStatusModal({ show: true, type: 'error', message: 'Error en el proceso: ' + e.message });
    } finally {
      setUploading(false);
    }
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
    setNewResult({
      folio: res.folio,
      paciente: res.paciente,
      fecha: res.fecha,
      estudio_enviado: res.estudio_enviado,
      archivo: null
    });
    setEditingId(res.id);
    setShowModal(true);
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

      <div className={styles.tableHeader} style={{marginBottom: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
        <div style={{display:'flex', gap:'20px', flexWrap:'wrap', alignItems:'center'}}>
          <div className={styles.searchBox} style={{flex: 1, minWidth: '250px'}}>
            <span className="material-symbols-rounded">search</span>
            <input 
              placeholder="Buscar por paciente o folio..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className={styles.field} style={{margin: 0}}>
            <input 
              type="date" 
              className={styles.inputMinimal} 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
            />
          </div>
          <button className={styles.btnPrimarySmall} style={{background: '#10B981', padding: '10px 20px'}} onClick={() => setShowModal(true)}>
            <span className="material-symbols-rounded">add_notes</span> Registrar Maquila
          </button>
          <button className={styles.btnPrimarySmall} style={{background: '#3B82F6', padding: '10px 20px'}} onClick={exportToExcel}>
            <span className="material-symbols-rounded">table_view</span> Exportar Excel
          </button>
          <button className={styles.btnPrimarySmall} style={{background: '#F59E0B', padding: '10px 20px'}} onClick={fetchResultados}>
            <span className="material-symbols-rounded">refresh</span> Actualizar
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
            <form onSubmit={handleUpload} className={styles.modalBody}>
              <div className={styles.field}>
                <label>Fecha de Envío</label>
                <input 
                  type="date" 
                  className={styles.inputMinimal}
                  value={newResult.fecha || ''}
                  onChange={(e) => setNewResult({...newResult, fecha: e.target.value})}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Folio del Examen</label>
                <input 
                  type="text" 
                  placeholder="Ej. 45678" 
                  className={styles.inputMinimal}
                  value={newResult.folio || ''}
                  onChange={(e) => setNewResult({...newResult, folio: e.target.value})}
                  required
                />
              </div>
              <div className={styles.field} style={{gridColumn: 'span 2'}}>
                <label>Nombre del Paciente</label>
                <input 
                  type="text" 
                  placeholder="NOMBRE COMPLETO" 
                  className={styles.inputMinimal}
                  value={newResult.paciente || ''}
                  onChange={(e) => setNewResult({...newResult, paciente: e.target.value})}
                  required
                />
              </div>
              <div className={styles.field} style={{gridColumn: 'span 2'}}>
                <label>Estudio Mandado a Maquilar</label>
                <input 
                  type="text" 
                  placeholder="Ej. Perfil de Lípidos, Inmunoglobulinas..." 
                  className={styles.inputMinimal}
                  value={newResult.estudio_enviado || ''}
                  onChange={(e) => setNewResult({...newResult, estudio_enviado: e.target.value})}
                  required
                />
              </div>
              <div className={styles.field} style={{gridColumn: 'span 2'}}>
                <label>Comprobante / Resultado (PDF)</label>
                <div 
                  className={styles.fileDragArea}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#10B981'; }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    const file = e.dataTransfer.files[0];
                    if (file && file.type === 'application/pdf') {
                      setNewResult({...newResult, archivo: file});
                    } else {
                      alert('Solo se permiten archivos PDF');
                    }
                  }}
                >
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => setNewResult({...newResult, archivo: e.target.files[0]})}
                    className={styles.fileInput}
                    id="pdfFile"
                  />
                  <label htmlFor="pdfFile" style={{cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <span className="material-symbols-rounded" style={{fontSize: '3rem', color: '#10B981', display: 'block', marginBottom: '10px'}}>upload_file</span>
                    <p style={{margin: 0, fontWeight: 700, color: '#1E293B'}}>{newResult.archivo ? newResult.archivo.name : 'Arrastra aquí el PDF o haz clic para buscar'}</p>
                    <p style={{margin: 0, fontSize: '0.8rem', color: '#64748B'}}>Formato permitido: PDF únicamente</p>
                    
                    {newResult.archivo && (
                      <button 
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNewResult({...newResult, archivo: null});
                        }}
                      >
                        <span className="material-symbols-rounded" style={{fontSize: '18px'}}>delete_forever</span>
                        Quitar archivo
                      </button>
                    )}
                  </label>
                </div>
              </div>
              <div style={{gridColumn: 'span 2', marginTop: '10px'}}>
                <button 
                  type="submit" 
                  className={styles.btnPrimarySmall} 
                  style={{width: '100%', padding: '18px', background: '#10B981', borderRadius: '16px', fontSize: '1rem'}}
                  disabled={uploading}
                >
                  {uploading ? 'Procesando...' : (editingId ? 'Actualizar Registro' : 'Guardar en Bitácora')}
                </button>
              </div>
            </form>
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
                <th>Paciente</th>
                <th>Estudio Maquilado</th>
                <th style={{textAlign: 'center'}}>Comprobante (PDF)</th>
                <th style={{textAlign: 'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resultados.filter(r => 
                r.paciente?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.folio?.includes(searchTerm)
              ).map(res => (
                <tr key={res.id} style={{borderBottom: '1px solid #F1F5F9'}}>
                  <td style={{
                    padding: '1.2rem', 
                    fontFamily: 'Consolas, monaco, monospace', 
                    fontWeight: 900, 
                    fontSize: '1.1rem',
                    color: '#0F172A'
                  }}>
                    {res.folio}
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
                        title="Ver Evidencia"
                        onClick={() => {
                          setPreviewUrl(res.pdf_url);
                          setShowPreview(true);
                        }}
                      >
                        <span className="material-symbols-rounded">visibility</span>
                      </button>
                      <button 
                        className={styles.btnAction} 
                        style={{background: '#F1F5F9', color: '#475569'}} 
                        title="Editar"
                        onClick={() => handleEdit(res)}
                      >
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                      <button 
                        className={styles.btnAction} 
                        style={{background: '#FEF2F2', color: '#EF4444'}} 
                        title="Eliminar"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteClick(res.id);
                        }}
                      >
                        <span className="material-symbols-rounded" style={{pointerEvents: 'none'}}>delete</span>
                      </button>
                      <a 
                        href={res.pdf_url} 
                        download 
                        className={styles.btnAction} 
                        style={{background: '#F0FDF4', color: '#10B981', display:'flex', alignItems:'center', justifyContent:'center'}} 
                        title="Descargar"
                      >
                        <span className="material-symbols-rounded">download</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {resultados.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{padding: '4rem', textAlign: 'center', color: '#94A3B8'}}>
                    <span className="material-symbols-rounded" style={{fontSize: '48px', display: 'block', marginBottom: '10px'}}>search_off</span>
                    No hay resultados registrados para esta fecha.
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
