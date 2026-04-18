import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import SupplierPicker from '../../components/shared/SupplierPicker';
import styles from './MaterialesCatalogo.module.css';

export default function MaterialesCatalogo() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [catalogo, setCatalogo] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });
    const [viewMode, setViewMode] = useState('Activos'); // 'Activos' | 'Inactivos'
    const [importData, setImportData] = useState([]);
    const [showImportPreview, setShowImportPreview] = useState(false);

    const initialForm = {
        nombre: '',
        prefijo: '',
        stock_minimo: 10,
        categoria: 'Consumibles',
        marca: '',
        proveedor: '',
        proveedor_id: '',
        costo_unitario: 0,
        presentacion: 'Pieza',
        requiere_frio: false,
        ean_maestro: '',
        area_tecnica: 'HEMATOLOGÍA',
        alerta_caducidad_dias: 30,
        clase: 'Artículo',
        precio1: 0,
        existencia_excel: 0,
        lote_numero: '',
        caducidad: '',
        cantidad_unidades: 0,
        unidad: 'Pieza'
    };

    const [form, setForm] = useState(initialForm);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const nombreInputRef = useRef(null);

    // Obtener categorías únicas del catálogo + las básicas
    const availableCategories = useMemo(() => {
        const base = ['Reactivos', 'Consumibles', 'Equipos', 'Papelería/Otros'];
        const fromCatalog = catalogo.map(m => m.categoria).filter(Boolean);
        return Array.from(new Set([...base, ...fromCatalog])).sort();
    }, [catalogo]);

    // Función para generar prefijo automático
    const generatePrefix = (name) => {
        if (!name) return '';
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleNombreChange = (val) => {
        const newPrefix = generatePrefix(val);
        setForm(prev => ({
            ...prev, 
            nombre: val,
            prefijo: (!prev.prefijo || prev.prefijo === generatePrefix(prev.nombre)) ? newPrefix : prev.prefijo
        }));
    };

    // Función para generar EAN interno
    const generateInternalEan = () => {
        const randomStr = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 dígitos
        const prefixNum = (form.prefijo || 'XX').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString().substring(0, 3);
        const finalEan = `20${prefixNum}${randomStr}`.substring(0, 13);
        setForm(prev => ({ ...prev, ean_maestro: finalEan }));
    };

    useEffect(() => {
        fetchCatalogo();
    }, [viewMode]);

    const fetchCatalogo = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('materiales_catalogo')
            .select('*')
            .eq('estatus', viewMode === 'Activos' ? 'Activo' : 'Inactivo')
            .order('nombre', { ascending: true });
        if (data) setCatalogo(data);
        setLoading(false);
    };

    const handleEdit = (item) => {
        setForm({
            nombre: item.nombre || '',
            prefijo: item.prefijo || '',
            stock_minimo: item.stock_minimo || 10,
            categoria: item.categoria || 'Consumibles',
            marca: item.marca || '',
            proveedor: item.proveedor || '',
            proveedor_id: item.proveedor_id || '',
            costo_unitario: item.costo_unitario || 0,
            presentacion: item.presentacion || 'Pieza',
            requiere_frio: item.requiere_frio || false,
            ean_maestro: item.ean_maestro || '',
            area_tecnica: item.area_tecnica || 'HEMATOLOGÍA',
            alerta_caducidad_dias: item.alerta_caducidad_dias || 30,
            clase: item.clase || 'Artículo',
            precio1: item.precio1 || 0,
            existencia_excel: item.existencia_excel || 0,
            unidad: item.unidad || 'Pieza'
        });
        setIsEditing(true);
        setEditingId(item.id);
        setShowModal(true);
    };

    const handleDelete = async (id, name) => {
        if (user?.role !== 'almacen') {
            setDialogConfig({ isOpen: true, type: 'alert', message: 'No tienes permisos de Almacén para eliminar materiales.' });
            return;
        }

        setDialogConfig({
            isOpen: true,
            type: 'confirm',
            message: `¿Estás seguro de inactivar "${name}"? El material dejará de aparecer en la lista pero se conservará su historial técnico.`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const { error } = await supabase
                        .from('materiales_catalogo')
                        .update({ estatus: 'Inactivo' })
                        .eq('id', id);
                    
                    if (error) throw error;
                    setDialogConfig({ isOpen: true, type: 'alert', message: 'Material inactivado correctamente.' });
                    fetchCatalogo();
                } catch (err) {
                    setDialogConfig({ isOpen: true, type: 'alert', message: 'Error: ' + err.message });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleReactivate = async (id, name) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('materiales_catalogo')
                .update({ estatus: 'Activo' })
                .eq('id', id);
            
            if (error) throw error;
            setDialogConfig({ isOpen: true, type: 'alert', message: `"${name}" ha sido reactivado exitosamente.` });
            fetchCatalogo();
        } catch (err) {
            setDialogConfig({ isOpen: true, type: 'alert', message: 'Error: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Campos que NO van a la tabla materiales_catalogo
            const virtualFields = ['existencia_excel', 'lote_numero', 'caducidad', 'cantidad_unidades'];
            
            const dataToInsert = { ...form };
            
            // Si el usuario escribió una categoría nueva, la usamos
            if (isAddingNewCategory && newCategoryName.trim()) {
                dataToInsert.categoria = newCategoryName.trim();
            }

            // Limpiamos el objeto para Supabase
            const dbPayload = { ...dataToInsert };
            virtualFields.forEach(field => delete dbPayload[field]);

            if (!dbPayload.ean_maestro) {
                const randomStr = Math.floor(10000000 + Math.random() * 90000000).toString();
                const prefixNum = (dbPayload.prefijo || 'XX').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString().substring(0, 3);
                dbPayload.ean_maestro = `20${prefixNum}${randomStr}`.substring(0, 13);
            }

            if (isEditing) {
                const { error } = await supabase.from('materiales_catalogo').update(dbPayload).eq('id', editingId);
                if (error) throw error;
                setDialogConfig({ isOpen: true, type: 'alert', message: 'Material actualizado correctamente.' });
                setShowModal(false);
                setIsEditing(false);
            } else {
                const { data: newMaterial, error } = await supabase.from('materiales_catalogo').insert([dbPayload]).select().single();
                if (error) throw error;
                
                // Generación de Unidades Individuales si se especificó cantidad
                if (form.cantidad_unidades > 0 && form.lote_numero) {
                    const unitsToInsert = [];
                    const yearIdx = new Date().getFullYear().toString().substring(2); // "26"
                    
                    for (let i = 1; i <= form.cantidad_unidades; i++) {
                        const consecutive = i.toString().padStart(2, '0');
                        // Formato solicitado: [PREFIX]-26-[LOTE]/[CONSECUTIVO]
                        const uniqueCode = `${form.prefijo}-${yearIdx}-${form.lote_numero}/${consecutive}`;
                        
                        unitsToInsert.push({
                            catalogo_id: newMaterial.id,
                            lote_numero: form.lote_numero,
                            caducidad: form.caducidad,
                            consecutivo_lote: i,
                            codigo_barras_unico: uniqueCode,
                            estatus: 'Almacenado',
                            area_actual: form.area_tecnica || 'Admin'
                        });
                    }
                    
                    const { error: batchError } = await supabase.from('materiales_unidades').insert(unitsToInsert);
                    if (batchError) throw batchError;
                }

                setDialogConfig({ isOpen: true, type: 'alert', message: 'Material y unidades registradas correctamente.' });
                // Sticky fields
                setForm(prev => ({
                    ...initialForm,
                    area_tecnica: prev.area_tecnica,
                    categoria: prev.categoria,
                    marca: prev.marca,
                    proveedor: prev.proveedor,
                    clase: prev.clase,
                    unidad: prev.unidad,
                    presentacion: prev.presentacion
                }));
            }
            
            fetchCatalogo();
            if (!isEditing) {
                setNewCategoryName('');
                setIsAddingNewCategory(false);
                setTimeout(() => nombreInputRef.current?.focus(), 100);
            }
        } catch (err) {
            setDialogConfig({ isOpen: true, type: 'alert', message: 'Error: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            setImportData(data);
            setShowImportPreview(true);
        };
        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { Material: 'Ejemplo Material 1', Prefijo: 'M1', Area: 'HEMATOLOGÍA', Categoria: 'Consumibles', Unidad: 'Pieza', Minimo: 10 },
            { Material: 'Ejemplo Material 2', Prefijo: 'M2', Area: 'QUÍMICA CLÍNICA', Categoria: 'Reactivos', Unidad: 'Caja', Minimo: 5 }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Catalogo_Solcan.xlsx");
    };

    const processBulkImport = async () => {
        setLoading(true);
        try {
            const itemsToInsert = importData.map(row => ({
                nombre: row.Material || row.Nombre,
                prefijo: row.Prefijo,
                unidad: row.Unidad || 'Pieza',
                stock_minimo: parseInt(row.Minimo || 10),
                categoria: row.Categoria || 'Consumibles',
                ubicacion: row.Ubicacion || row.Localizacion || 'Almacén General',
                marca: row.Marca || '',
                proveedor: row.Proveedor || '',
                costo_unitario: parseFloat(row.Costo || 0),
                presentacion: row.Presentacion || 'Unidad',
                requiere_frio: row.Frio === 'Si' || row.Frio === true,
                area_tecnica: row.Area || 'HEMATOLOGÍA',
                ean_maestro: row.EAN || row.Codigo_Maestro || '',
                clase: row.Clase || 'Artículo',
                precio1: parseFloat(row.Saldo || row.Precio || 0)
            }));

            const { error } = await supabase
                .from('materiales_catalogo')
                .upsert(itemsToInsert, { onConflict: 'prefijo' });
            if (error) throw error;
            setDialogConfig({ isOpen: true, type: 'alert', message: `Éxito: ${itemsToInsert.length} materiales importados al catálogo.` });
            setShowImportPreview(false);
            fetchCatalogo();
        } catch (err) {
            setDialogConfig({ isOpen: true, type: 'alert', message: 'Error en importación: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredCatalogo = catalogo.filter(c => 
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.prefijo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.area_tecnica?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">category</span> Catálogo de Materiales</h1>
                    <p>Catálogo de Insumos y Reactivos</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.viewToggle}>
                        <button className={viewMode === 'Activos' ? styles.toggleActive : ''} onClick={() => setViewMode('Activos')}>Activos</button>
                        <button className={viewMode === 'Inactivos' ? styles.toggleActive : ''} onClick={() => setViewMode('Inactivos')}>Inactivos</button>
                    </div>
                    <div className={styles.searchBox}>
                      <span className="material-symbols-rounded">search</span>
                      <input type="text" placeholder="Buscar por Nombre, Área o Prefijo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className={styles.secondaryBtn} onClick={() => setShowModal(true)}>
                        <span className="material-symbols-rounded">add_business</span> Registrar Material
                    </button>
                    <div className={styles.importGroup}>
                        <button className={styles.templateBtn} onClick={handleDownloadTemplate} title="Descargar Excel de Ejemplo">
                            <span className="material-symbols-rounded">download</span>
                        </button>
                        <div className={styles.importBtn}>
                            <input type="file" id="bulk" accept=".csv, .xlsx" onChange={handleFileUpload} hidden />
                            <label htmlFor="bulk"><span className="material-symbols-rounded">upload_file</span> Carga Masiva</label>
                        </div>
                    </div>
                </div>
            </header>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalLarge}>
                        <div className={styles.modalHeader}>
                            <h3>{isEditing ? 'Editar Material' : 'Registrar Material'}</h3>
                            <button className={styles.closeBtn} onClick={() => { setShowModal(false); setIsEditing(false); }}>&times;</button>
                        </div>
                        <form onSubmit={handleManualSubmit} className={styles.fullForm}>
                            <div className={styles.formGrid}>
                                {/* Sección 1: Info. Básica */}
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">description</span> Información</h4>
                                    <div className={styles.fieldGroup}>
                                        <label>Nombre del Material</label>
                                        <input 
                                            ref={nombreInputRef}
                                            required 
                                            placeholder="Ej: Gasas Estériles" 
                                            value={form.nombre} 
                                            onChange={e => handleNombreChange(e.target.value)} 
                                            autoFocus
                                        />
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Prefijo (Código Interno)</label>
                                            <input required placeholder="TR" maxLength="20" value={form.prefijo} onChange={e=>setForm({...form, prefijo: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Área Técnica</label>
                                            <select value={form.area_tecnica} onChange={e=>setForm({...form, area_tecnica: e.target.value})}>
                                                <option value="HEMATOLOGÍA">Hematología</option>
                                                <option value="QUÍMICA CLÍNICA">Química Clínica</option>
                                                <option value="UROANÁLISIS">Uroanálisis</option>
                                                <option value="MICROBIOLOGÍA">Microbiología</option>
                                                <option value="PAPELERÍA">Papelería</option>
                                                <option value="OTROS">Otros</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Marca / Fabricante</label>
                                            <input placeholder="Ej: Roche / BD" value={form.marca} onChange={e=>setForm({...form, marca: e.target.value})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Clase</label>
                                            <input placeholder="Ej: Artículo" value={form.clase} onChange={e=>setForm({...form, clase: e.target.value})} />
                                        </div>
                                    </div>
                                </section>

                                {/* Sección 2: Comercial */}
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">payments</span> Comercial</h4>
                                    <div className={styles.fieldGroup}>
                                        <label>Proveedor Preferido</label>
                                        <SupplierPicker 
                                              value={form.proveedor_id} 
                                              onChange={(val) => setForm({...form, proveedor_id: val})} 
                                        />
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Costo Unitario ($)</label>
                                            <input type="number" step="0.01" placeholder="0.00" value={form.costo_unitario} onChange={e=>setForm({...form, costo_unitario: parseFloat(e.target.value) || 0})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Precio de Venta ($)</label>
                                            <input type="number" step="0.01" placeholder="0.00" value={form.precio1} onChange={e=>setForm({...form, precio1: parseFloat(e.target.value) || 0})} />
                                        </div>
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Categoría</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <select 
                                                    value={isAddingNewCategory ? 'NEW' : form.categoria} 
                                                    onChange={e => {
                                                        if (e.target.value === 'NEW') {
                                                            setIsAddingNewCategory(true);
                                                        } else {
                                                            setIsAddingNewCategory(false);
                                                            setForm({ ...form, categoria: e.target.value });
                                                        }
                                                    }}
                                                >
                                                    {availableCategories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                    <option value="NEW" style={{ fontWeight: 'bold', color: 'var(--co-accent)' }}>+ Nueva Categoría...</option>
                                                </select>
                                                
                                                {isAddingNewCategory && (
                                                    <div style={{ display: 'flex', gap: '8px', animation: 'fadeIn 0.3s ease' }}>
                                                        <input 
                                                            placeholder="Nombre de la nueva categoría" 
                                                            value={newCategoryName} 
                                                            onChange={e => setNewCategoryName(e.target.value)}
                                                            autoFocus
                                                            style={{ border: '2px solid var(--co-accent)' }}
                                                        />
                                                        <button 
                                                            type="button" 
                                                            className={styles.editBtn} 
                                                            onClick={() => { setIsAddingNewCategory(false); setNewCategoryName(''); }}
                                                            title="Cancelar"
                                                        >
                                                            <span className="material-symbols-rounded">close</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Presentación</label>
                                            <input placeholder="Caja c/100, Frasco..." value={form.presentacion} onChange={e=>setForm({...form, presentacion: e.target.value})} />
                                        </div>
                                    </div>
                                </section>

                                {/* Sección 3: Almacén */}
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">warehouse</span> Logística de Inventario</h4>
                                    
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Lote Inicial</label>
                                            <input placeholder="Ej: LOTE-TEST-001" value={form.lote_numero} onChange={e=>setForm({...form, lote_numero: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Fecha de Caducidad</label>
                                            <input type="date" value={form.caducidad} onChange={e=>setForm({...form, caducidad: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Saldo Inicial</label>
                                            <input type="number" placeholder="0" value={form.existencia_excel} onChange={e=>setForm({...form, existencia_excel: parseInt(e.target.value) || 0})} />
                                        </div>
                                        <div className={styles.fieldGroup} style={{ border: '1px solid var(--co-accent)', borderRadius: '10px', padding: '8px', background: 'rgba(11, 206, 205, 0.05)' }}>
                                            <label style={{ color: 'var(--co-accent)', fontWeight: '800' }}>Generar Unidades (1, 2, 3...)</label>
                                            <input type="number" min="0" placeholder="¿Cuántos frascos?" value={form.cantidad_unidades} onChange={e=>setForm({...form, cantidad_unidades: parseInt(e.target.value) || 0})} />
                                        </div>
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Stock Mínimo</label>
                                            <input type="number" value={form.stock_minimo} onChange={e=>setForm({...form, stock_minimo: parseInt(e.target.value) || 0})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Unidad de Medida</label>
                                            <input placeholder="Frasco, Caja, ml..." value={form.unidad} onChange={e=>setForm({...form, unidad: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup} style={{ flex: 2 }}>
                                            <label>Código EAN Maestro</label>
                                            <div style={{display: 'flex', gap: '8px'}}>
                                                <input placeholder="Código de barras de la caja" value={form.ean_maestro} onChange={e=>setForm({...form, ean_maestro: e.target.value})} />
                                                <button type="button" className={styles.editBtn} onClick={generateInternalEan} title="Generar código interno">
                                                    <span className="material-symbols-rounded">magic_button</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className={styles.fieldGroup} style={{ justifyContent: 'center', alignItems: 'center' }}>
                                            <label className={styles.checkboxLabel} style={{ background: 'none', border: 'none', padding: 0 }}>
                                                <input type="checkbox" checked={form.requiere_frio} onChange={e=>setForm({...form, requiere_frio: e.target.checked})} />
                                                <span style={{ fontSize: '11px', fontWeight: '700' }}>¿Cadena de Frío?</span>
                                            </label>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={()=>{ setShowModal(false); setIsEditing(false); }}>Cerrar</button>
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>{isEditing ? 'Actualizar' : 'Guardar Material'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImportPreview && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalLarge}>
                        <h3>Vista Previa: Materiales</h3>
                        <p>{importData.length} registros listos para procesar.</p>
                        <div className={styles.previewTable}>
                            <table>
                                <thead>
                                    <tr><th>Nombre</th><th>Marca</th><th>Proveedor</th><th>Costo</th><th>Ubicación</th></tr>
                                </thead>
                                <tbody>
                                    {importData.slice(0, 5).map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.Material || row.Nombre}</td>
                                            <td>{row.Marca || '---'}</td>
                                            <td>{row.Proveedor || '---'}</td>
                                            <td>${row.Costo || 0}</td>
                                            <td>{row.Ubicacion || 'Almacén'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={()=>setShowImportPreview(false)}>Cancelar</button>
                            <button className={styles.primaryBtn} onClick={processBulkImport} disabled={loading}>Confirmar Carga</button>
                        </div>
                    </div>
                </div>
            )}

            <main className={styles.mainContent}>
                {loading ? <div className={styles.loader}>Actualizando catálogo clínico...</div> : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.denseTable}>
                            <thead>
                                <tr>
                                    <th>Cód.</th>
                                    <th>Nombre / Marca</th>
                                    <th className={styles.hideOnMobile}>Clase</th>
                                    <th className={styles.hideOnMobile}>Área Técnica</th>
                                    <th className={styles.textCenter}>Costo</th>
                                    <th className={styles.textCenter}>Precio</th>
                                    <th className={styles.hideOnMobile} style={{textAlign: 'center'}}>Frío</th>
                                    <th className={styles.hideOnMobile} style={{textAlign: 'right'}}>Unidad</th>
                                    <th className={styles.textCenter}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCatalogo.map(item => (
                                    <tr key={item.id} className={item.requiere_frio ? styles.frioRow : ''}>
                                        <td className={styles.codeCell}>{item.prefijo}</td>
                                        <td className={styles.nameCell}>
                                            <strong>{item.nombre}</strong>
                                            <div className={styles.subInfo}>
                                                {item.marca || 'Genérico'} • {item.presentacion}
                                                <div className={styles.mobileOnlyInfo} style={{ marginTop: '4px', display: 'none' }}>
                                                    <span className={styles.categoryTag} style={{ fontSize: '10px' }}>{item.area_tecnica || 'Admin'}</span>
                                                    <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>{item.clase}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={styles.hideOnMobile}>{item.clase || '---'}</td>
                                        <td className={styles.hideOnMobile}><span className={styles.categoryTag}>{item.area_tecnica || 'Admin'}</span></td>
                                        <td className={styles.textCenter}>${parseFloat(item.costo_unitario || 0).toFixed(2)}</td>
                                        <td className={styles.textCenter}>${parseFloat(item.precio1 || 0).toFixed(2)}</td>
                                        <td className={`${styles.textCenter} ${styles.hideOnMobile}`}>
                                            {item.requiere_frio && <span className="material-symbols-rounded" style={{color: '#3b82f6', fontSize: '18px'}}>ac_unit</span>}
                                        </td>
                                        <td className={`${styles.textRight} ${styles.hideOnMobile}`}>{item.unidad}</td>
                                        <td className={styles.textCenter}>
                                            <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                                {viewMode === 'Activos' ? (
                                                    <>
                                                        <button className={styles.editBtn} onClick={() => handleEdit(item)}><span className="material-symbols-rounded">edit</span></button>
                                                        {user?.role === 'almacen' && (
                                                            <button className={styles.editBtn} style={{color: '#ed8936'}} onClick={() => handleDelete(item.id, item.nombre)} title="Inactivar"><span className="material-symbols-rounded">block</span></button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button className={styles.editBtn} style={{color: '#10b981'}} onClick={() => handleReactivate(item.id, item.nombre)} title="Reactivar"><span className="material-symbols-rounded">settings_backup_restore</span></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Sistema de Diálogos Inteligentes */}
            {dialogConfig.isOpen && (
                <div className={styles.modalOverlay} style={{zIndex: 5000}}>
                    <div className={styles.dialogCard}>
                        <div className={styles.dialogIcon}>
                            <span className="material-symbols-rounded" style={{
                                color: dialogConfig.type === 'confirm' ? '#ef4444' : '#10b981',
                                fontSize: '48px'
                            }}>
                                {dialogConfig.type === 'confirm' ? 'warning' : 'check_circle'}
                            </span>
                        </div>
                        <h3>{dialogConfig.type === 'confirm' ? 'Confirmar Desactivación' : 'Acción Exitosa'}</h3>
                        <p>{dialogConfig.message}</p>
                        <div className={styles.dialogActions}>
                            {dialogConfig.type === 'confirm' ? (
                                <>
                                    <button className={styles.secondaryBtn} onClick={() => setDialogConfig({...dialogConfig, isOpen: false})}>Cancelar</button>
                                    <button className={styles.primaryBtn} style={{backgroundColor: '#ed8936'}} onClick={() => { 
                                        dialogConfig.onConfirm(); 
                                        setDialogConfig({...dialogConfig, isOpen: false});
                                    }}>Inactivar Material</button>
                                </>
                            ) : (
                                <button className={styles.primaryBtn} onClick={() => setDialogConfig({...dialogConfig, isOpen: false})}>Entendido</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
