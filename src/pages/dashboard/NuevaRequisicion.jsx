import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import RequisicionDocument from '../../components/documents/RequisicionDocument';
import SignaturePad from '../../components/SignaturePad';
import styles from './NuevaRequisicion.module.css';
import html2pdf from 'html2pdf.js';

export default function NuevaRequisicion() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [catalogo, setCatalogo] = useState([]);
  const [items, setItems] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [selectedChemist, setSelectedChemist] = useState('');
  const [signature, setSignature] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [generatedFolio, setGeneratedFolio] = useState(null);
  const printAreaRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [filteredCatalog, setFilteredCatalog] = useState([]);

  const [currentCatalog, setCurrentCatalog] = useState({
    id: '',
    nombre: '',
    prefijo: '',
    cantidad: 1,
    prioridad: 'Media',
    existencia: 0,
    fechaRequerida: ''
  });

  const [currentManual, setCurrentManual] = useState({ 
    nombre: '', 
    cantidad: 1, 
    prioridad: 'Media',
    fechaRequerida: ''
  });

  useEffect(() => {
    fetchCatalogo();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCatalog([]);
      setShowResults(false);
      return;
    }
    const filtered = catalogo.filter(c => 
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.prefijo.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8);
    setFilteredCatalog(filtered);
    setShowResults(true);
  }, [searchTerm, catalogo]);

  const fetchCatalogo = async () => {
    // Cargar Catálogo
    const { data: catData } = await supabase
      .from('materiales_catalogo')
      .select('id, nombre, prefijo, unidad')
      .order('nombre');
    if (catData) setCatalogo(catData);

    // Cargar Personal (Filtramos por Químicos para cumplir requerimiento)
    const { data: empData } = await supabase
      .from('empleados')
      .select('id, nombre')
      .ilike('role', '%quimico%')
      .order('nombre');

    if (empData) {
      // Usamos un Set para filtrar nombres duplicados (problema en DB)
      const uniqueNames = new Set();
      const formatted = [];
      
      empData.forEach(e => {
        if (!uniqueNames.has(e.nombre)) {
          uniqueNames.add(e.nombre);
          formatted.push({ id: e.id, name: e.nombre });
        }
      });
      
      setPersonal(formatted);
    }
  };

  const fetchExistencia = async (materialId) => {
    const { data } = await supabase
      .from('inventario_areas')
      .select('stock_actual')
      .eq('material_id', materialId)
      .eq('area_id', user?.role === 'hematologia' ? 'hematologia' : 'general')
      .single();
    return data?.stock_actual || 0;
  };

  const selectFromCatalog = async (item) => {
    const stock = await fetchExistencia(item.id);
    setCurrentCatalog({
      ...currentCatalog,
      id: item.id,
      nombre: item.nombre,
      prefijo: item.prefijo,
      existencia: stock,
      cantidad: 1,
      fechaRequerida: ''
    });
    setSearchTerm(item.nombre);
    setShowResults(false);
  };

  const addItemFromCatalog = () => {
    if (!currentCatalog.id) return;
    const item = {
      type: 'catalog',
      material_id: currentCatalog.id,
      nombre: currentCatalog.nombre,
      prefijo: currentCatalog.prefijo,
      cantidad: currentCatalog.cantidad,
      prioridad: currentCatalog.prioridad,
      existencia: currentCatalog.existencia,
      fechaRequerida: currentCatalog.fechaRequerida
    };
    setItems([...items, item]);
    setCurrentCatalog({ id: '', nombre: '', prefijo: '', cantidad: 1, prioridad: 'Media', existencia: 0, fechaRequerida: '' });
    setSearchTerm('');
  };

  const addItemManual = () => {
    if (!currentManual.nombre) return;
    const item = {
      type: 'manual',
      nombre: currentManual.nombre,
      cantidad: currentManual.cantidad,
      prioridad: currentManual.prioridad,
      existencia: 0,
      fechaRequerida: currentManual.fechaRequerida
    };
    setItems([...items, item]);
    setCurrentManual({ nombre: '', cantidad: 1, prioridad: 'Media', fechaRequerida: '' });
    setShowManual(false);
  };

  const removeItem = (index) => {
    const next = [...items];
    next.splice(index, 1);
    setItems(next);
  };

  const downloadPDF = (folio) => {
    if (!printAreaRef.current) return;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `FO-RM-001_${folio}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(printAreaRef.current).set(opt).save();
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    if (!selectedChemist) {
      setNotification({ type: 'error', text: 'Por favor, selecciona el químico responsable.' });
      return;
    }
    if (!signature) {
      setNotification({ type: 'error', text: 'Por favor, firma antes de confirmar la requisición.' });
      return;
    }
    
    setLoading(true);
    try {
      const folio = `REQ-${Date.now().toString().slice(-6)}`;
      const { data: req, error: reqErr } = await supabase
        .from('requisiciones_compra')
        .insert([{
          area_id: user?.role === 'hematologia' ? 'hematologia' : 'general',
          solicitante_id: user?.id,
          elaborado_por_name: selectedChemist,
          folio: folio,
          estatus: 'Pendiente',
          firma_solicitante: signature
        }])
        .select()
        .single();
      
      if (reqErr) throw reqErr;

      const itemsToInsert = items.map(i => ({
        requisicion_id: req.id,
        material_catalogo_id: i.type === 'catalog' ? i.material_id : null,
        nombre_manual: i.type === 'manual' ? i.nombre : null,
        cantidad_solicitada: i.cantidad,
        prioridad_item: i.prioridad,
        fecha_requerida: i.fechaRequerida
      }));

      const { error: itemsErr } = await supabase
        .from('requisiciones_items')
        .insert(itemsToInsert);
      
      if (itemsErr) throw itemsErr;

      setGeneratedFolio(folio);
      setNotification({ type: 'success', text: `Requisición ${folio} enviada correctamente.` });
      
      // DESCARGA DIRECTA PROFESIONAL (Esperamos a que React pinte el folio)
      setTimeout(() => {
        downloadPDF(folio);
        // Limpiamos todo tras descargar para que el químico vea el cambio
        setTimeout(() => {
          setItems([]);
          setGeneratedFolio(null);
        }, 1000);
      }, 600);

    } catch (err) {
      setNotification({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1><span className="material-symbols-rounded">shopping_cart_checkout</span> Requisición de Compra</h1>
          <p>Solicitud de Recursos Materiales e Infraestructura (FO-RM-001)</p>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <div className={styles.selectionPanel}>

          {/* SELECTOR DE QUÍMICO RESPONSABLE */}
          <div className={styles.card} style={{marginBottom: '1rem'}}>
            <h3><span className="material-symbols-rounded">badge</span> Responsable de la Elaboración</h3>
            <select
              className={styles.chemistSelect}
              value={selectedChemist}
              onChange={(e) => setSelectedChemist(e.target.value)}
            >
              <option value="">-- Seleccionar Químico --</option>
              {personal.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.card}>
            <h3><span className="material-symbols-rounded">manage_search</span> Buscar en Catálogo</h3>
            
            <div className={styles.autocompleteWrapper}>
              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label>Escribe el nombre del reactivo...</label>
                  <button className={styles.explorerBtn} onClick={() => setShowCatalogModal(true)}>
                    <span className="material-symbols-rounded">list_alt</span> Ver catálogo completo
                  </button>
                </div>
                <div className={styles.searchInputWrapper}>
                  <span className="material-symbols-rounded">search</span>
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    placeholder="Ej: Gasas, Tubos..."
                  />
                </div>
              </div>

              {showResults && filteredCatalog.length > 0 && (
                <div className={styles.resultsDrop}>
                  {filteredCatalog.map(item => (
                    <div key={item.id} className={styles.resultItem} onClick={() => selectFromCatalog(item)}>
                      <span className={styles.resPrefix}>{item.prefijo}</span>
                      <span className={styles.resName}>{item.nombre}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {currentCatalog.id && (
              <div className={styles.matchCard}>
                <div className={styles.stockAlert}>
                  <span className="material-symbols-rounded">inventory</span>
                  En Inventario de Área: <strong>{currentCatalog.existencia}</strong>
                </div>
                <div className={styles.row}>
                  <div className={styles.fieldGroup}>
                    <label>Cantidad a Pedir</label>
                    <input type="number" min="1" value={currentCatalog.cantidad} onChange={(e) => setCurrentCatalog({...currentCatalog, cantidad: parseInt(e.target.value)})}/>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Fecha Requerida</label>
                    <input type="date" value={currentCatalog.fechaRequerida} onChange={(e) => setCurrentCatalog({...currentCatalog, fechaRequerida: e.target.value})}/>
                  </div>
                </div>
                <button className={styles.addBtn} onClick={addItemFromCatalog}>Añadir al Formato</button>
              </div>
            )}

            <div className={styles.manualDivider}>
              <span>¿No está en el catálogo?</span>
              <button className={styles.linkBtn} onClick={() => setShowManual(!showManual)}>Ingresar manualmente</button>
            </div>

            {showManual && (
              <div className={styles.manualForm}>
                <div className={styles.fieldGroup}><label>Nombre</label><input value={currentManual.nombre} onChange={(e)=>setCurrentManual({...currentManual, nombre: e.target.value})}/></div>
                <div className={styles.row}>
                  <div className={styles.fieldGroup}><label>Cantidad</label><input type="number" value={currentManual.cantidad} onChange={(e)=>setCurrentManual({...currentManual, cantidad: parseInt(e.target.value)})}/></div>
                  <div className={styles.fieldGroup}><label>Fecha</label><input type="date" value={currentManual.fechaRequerida} onChange={(e)=>setCurrentManual({...currentManual, fechaRequerida: e.target.value})}/></div>
                </div>
                <button className={styles.addManualBtn} onClick={addItemManual}>Añadir Manual</button>
              </div>
            )}

            <div className={styles.signatureSection}>
              <SignaturePad 
                onSave={(data) => setSignature(data)}
                onClear={() => setSignature(null)}
              />
            </div>
          </div>

          <button className={styles.primaryBtn} disabled={items.length===0 || loading} onClick={handleSubmit}>
            {loading ? 'Procesando...' : 'Confirmar y Enviar Requisición'}
          </button>
        </div>

        <div className={styles.previewPanel}>
           <div className={styles.previewContainer}>
              <header className={styles.previewHeader}>
                <span>VISTA PREVIA DEL DOCUMENTO OFICIAL (FO-RM-001)</span>
                {items.length > 0 && <button className={styles.clearBtn} onClick={() => {setItems([]); setSignature(null);}}>Limpiar</button>}
              </header>
              <div ref={printAreaRef}>
                <RequisicionDocument 
                   items={items} 
                   area={user?.role} 
                   solicitante={user} 
                   requisicion={{ folio: generatedFolio, firma_solicitante: signature }}
                />
              </div>
           </div>
        </div>
      </div>

      {notification && (
        <div className={`${styles.toast} ${styles[notification.type]}`}>
          {notification.text} <button onClick={() => setNotification(null)}>&times;</button>
        </div>
      )}

      {showCatalogModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <header className={styles.modalHeader}>
              <h2>Explorador de Catálogo</h2>
              <button className={styles.closeModalBtn} onClick={() => setShowCatalogModal(false)}>&times;</button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.modalList}>
                {catalogo.map(item => (
                  <div key={item.id} className={styles.catalogCard} onClick={() => { selectFromCatalog(item); setShowCatalogModal(false); }}>
                    <strong>{item.nombre}</strong><span>{item.prefijo}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
