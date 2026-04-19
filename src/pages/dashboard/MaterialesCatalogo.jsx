import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import SupplierPicker from '../../components/shared/SupplierPicker';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import styles from './MaterialesCatalogo.module.css';

// Optimized Material Card Component for Mobile
const MaterialCard = memo(({ item, onEdit, onDelete, onReactivate, viewMode, user }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div 
            className={`${styles.materialCard} ${isExpanded ? styles.isExpanded : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                    <span className={styles.cardPrefix}>{item.prefijo}</span>
                    <h3>{item.nombre}</h3>
                </div>
                <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                    {viewMode === 'Activos' ? (
                        <>
                            <button className={styles.actionBtnSmall} onClick={() => onEdit(item)}>
                                <span className="material-symbols-rounded">edit</span>
                            </button>
                            {user?.role === 'almacen' && (
                                <button 
                                    className={styles.actionBtnSmall} 
                                    style={{color: '#ed8936'}}
                                    onClick={() => onDelete(item.id, item.nombre)}
                                >
                                    <span className="material-symbols-rounded">block</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <button 
                            className={styles.actionBtnSmall} 
                            style={{color: '#10b981'}}
                            onClick={() => onReactivate(item.id, item.nombre)}
                        >
                            <span className="material-symbols-rounded">settings_backup_restore</span>
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.cardInfoGrid}>
                    <div className={styles.infoItem}>
                        <label>Área Técnica</label>
                        <span>{item.area_tecnica || 'Admin'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <label>Unidad</label>
                        <span>{item.unidad}</span>
                    </div>
                </div>

                {item.requiere_frio && (
                    <div className={styles.frioBadge}>
                        <span className="material-symbols-rounded">ac_unit</span> Red de Frío
                    </div>
                )}

                <div className={styles.tapTip}>
                    <span className="material-symbols-rounded">touch_app</span>
                    {isExpanded ? 'Toca para contraer' : 'Toca para ver más detalles'}
                </div>

                {isExpanded && (
                    <div className={styles.cardDetails}>
                        <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <label>Marca</label>
                                <span>{item.marca || '---'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Presentación</label>
                                <span>{item.presentacion || '---'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Clase</label>
                                <span>{item.clase || '---'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Stock Mínimo</label>
                                <span>{item.stock_minimo}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Costo</label>
                                <span>${parseFloat(item.costo_unitario || 0).toFixed(2)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Precio</label>
                                <span>${parseFloat(item.precio1 || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default function MaterialesCatalogo() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [catalogo, setCatalogo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('Activos');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [targetItem, setTargetItem] = useState(null);
    const nombreInputRef = useRef(null);

    // Bulk Import States
    const [showImportPreview, setShowImportPreview] = useState(false);
    const [importData, setImportData] = useState({ all: [], duplicates: [], news: [] });
    const [skipDuplicates, setSkipDuplicates] = useState(true);

    const initialForm = {
        nombre: '', prefijo: '', unidad: 'Pieza', stock_minimo: 10, categoria: 'Consumibles',
        marca: '', proveedor_id: '', costo_unitario: 0, precio1: 0,
        presentacion: 'Caja', requiere_frio: false, area_tecnica: 'HEMATOLOGÍA',
        ean_maestro: '', clase: 'Artículo'
    };
    const [form, setForm] = useState(initialForm);
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });

    const fetchCatalogo = useCallback(async () => {
        setLoading(true);
        try {
            // First try with the 'activo' filter
            let query = supabase
                .from('materiales_catalogo')
                .select('*')
                .order('nombre', { ascending: true });

            // If we are looking for actives, we also include those where 'activo' is NULL 
            // because many existing records might not have this column set yet.
            if (viewMode === 'Activos') {
                query = query.or('activo.eq.true,activo.is.null');
            } else {
                query = query.eq('activo', false);
            }

            const { data, error } = await query;
            if (error) throw error;
            setCatalogo(data || []);
        } catch (err) {
            console.error('Error fetching catalog:', err);
            // Fallback: fetch all without filters if the above fails
            const { data } = await supabase.from('materiales_catalogo').select('*').order('nombre');
            setCatalogo(data || []);
        } finally {
            setLoading(false);
        }
    }, [viewMode]);

    useEffect(() => {
        fetchCatalogo();
    }, [fetchCatalogo]);

    const handleNombreChange = (val) => {
        const words = val.split(' ');
        let prefix = '';
        if (words.length >= 2) prefix = words[0].substring(0, 1) + words[1].substring(0, 1);
        else prefix = val.substring(0, 2);
        setForm({ ...form, nombre: val, prefijo: prefix.toUpperCase() });
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setTargetItem(item);
        setForm({
            ...item,
            proveedor_id: item.proveedor_id || ''
        });
        setShowModal(true);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                const { error } = await supabase.from('materiales_catalogo').update(form).eq('id', targetItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('materiales_catalogo').insert([form]);
                if (error) throw error;
            }
            setShowModal(false);
            fetchCatalogo();
            setDialogConfig({ isOpen: true, type: 'alert', message: isEditing ? 'Material actualizado.' : 'Material registrado.' });
        } catch (err) {
            setDialogConfig({ isOpen: true, type: 'alert', message: 'Error: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id, nombre) => {
        setDialogConfig({
            isOpen: true,
            type: 'confirm',
            message: `¿Estás seguro de inactivar "${nombre}"?`,
            onConfirm: async () => {
                await supabase.from('materiales_catalogo').update({ activo: false }).eq('id', id);
                fetchCatalogo();
            }
        });
    };

    const handleReactivate = (id, nombre) => {
        setDialogConfig({
            isOpen: true,
            type: 'confirm',
            message: `¿Reactivar "${nombre}"?`,
            onConfirm: async () => {
                await supabase.from('materiales_catalogo').update({ activo: true }).eq('id', id);
                fetchCatalogo();
            }
        });
    };

    // --- BULK IMPORT LOGIC ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            const existingPrefixes = new Set(catalogo.map(c => c.prefijo));
            const duplicates = []; const news = [];
            data.forEach(row => {
                const prefixId = row.Prefijo?.toString().toUpperCase();
                if (existingPrefixes.has(prefixId)) duplicates.push(row);
                else news.push(row);
            });
            setImportData({ all: data, duplicates, news });
            setShowImportPreview(true);
        };
        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [{ Material: 'Ejemplo Material 1', Prefijo: 'M1', Area: 'HEMATOLOGÍA', Categoria: 'Consumibles', Unidad: 'Pieza', Minimo: 10 }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Catalogo_Solcan.xlsx");
    };

    const processBulkImport = async () => {
        setLoading(true);
        try {
            const dataToProcess = skipDuplicates ? importData.news : importData.all;
            if (dataToProcess.length === 0) return;
            const itemsMap = new Map();
            dataToProcess.forEach(row => {
                const prefixId = row.Prefijo?.toString().toUpperCase();
                if (!prefixId) return;
                itemsMap.set(prefixId, {
                    nombre: row.Material || row.Nombre, prefijo: prefixId, unidad: row.Unidad || 'Pieza', stock_minimo: parseInt(row.Minimo || 10), categoria: row.Categoria || 'Consumibles', marca: row.Marca || '', proveedor: row.Proveedor || '', costo_unitario: parseFloat(row.Costo || 0), presentacion: row.Presentacion || 'Unidad', requiere_frio: row.Frio === 'Si' || row.Frio === true, area_tecnica: row.Area || 'HEMATOLOGÍA', ean_maestro: row.EAN || row.Codigo_Maestro || '', clase: row.Clase || 'Artículo', precio1: parseFloat(row.Saldo || row.Precio || 0)
                });
            });
            await supabase.from('materiales_catalogo').upsert(Array.from(itemsMap.values()), { onConflict: 'prefijo' });
            setDialogConfig({ isOpen: true, type: 'alert', message: 'Carga exitosa.' });
            setShowImportPreview(false);
            fetchCatalogo();
        } catch (err) {
            setDialogConfig({ isOpen: true, type: 'alert', message: 'Error: ' + err.message });
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
            <button className={styles.mobileBackBtn} onClick={() => navigate('/almacen')}>
                <span className="material-symbols-rounded">arrow_back</span>
                Menú Almacén
            </button>

            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">category</span> Catálogo de Materiales</h1>
                    <p>Gestión de Insumos y Reactivos</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.viewToggle}>
                        <button className={viewMode === 'Activos' ? styles.toggleActive : ''} onClick={() => setViewMode('Activos')}>Activos</button>
                        <button className={viewMode === 'Inactivos' ? styles.toggleActive : ''} onClick={() => setViewMode('Inactivos')}>Inactivos</button>
                    </div>
                    <div className={styles.searchBox}>
                      <span className="material-symbols-rounded">search</span>
                      <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className={styles.secondaryBtn} onClick={() => { setIsEditing(false); setForm(initialForm); setShowModal(true); }}>
                        <span className="material-symbols-rounded">add_business</span> <span className={styles.btnText}>Nuevo</span>
                    </button>
                    <div className={styles.importGroup}>
                        <button className={styles.templateBtn} onClick={handleDownloadTemplate} title="Plantilla"><span className="material-symbols-rounded">download</span></button>
                        <div className={styles.importBtn}>
                            <input type="file" id="bulk" accept=".csv, .xlsx" onChange={handleFileUpload} hidden />
                            <label htmlFor="bulk"><span className="material-symbols-rounded">upload_file</span> <span className={styles.btnText}>Carga</span></label>
                        </div>
                    </div>
                </div>
            </header>

            <main className={styles.mainContent}>
                {loading ? <div className={styles.loader}>Cargando catálogo...</div> : (
                    <>
                        <div className={`${styles.tableWrapper} ${styles.desktopView}`}>
                            <table className={styles.denseTable}>
                                <thead>
                                    <tr>
                                        <th>Cód.</th>
                                        <th>Nombre / Marca</th>
                                        <th>Clase</th>
                                        <th>Área Técnica</th>
                                        <th className={styles.textCenter}>Costo</th>
                                        <th className={styles.textCenter}>Precio</th>
                                        <th className={styles.textCenter}>Frío</th>
                                        <th className={styles.textRight}>Unidad</th>
                                        <th className={styles.textCenter}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCatalogo.map(item => (
                                        <tr key={item.id} className={item.requiere_frio ? styles.frioRow : ''}>
                                            <td className={styles.codeCell}>{item.prefijo}</td>
                                            <td className={styles.nameCell}>
                                                <strong>{item.nombre}</strong>
                                                <div className={styles.subInfo}>{item.marca || 'Genérico'} • {item.presentacion}</div>
                                            </td>
                                            <td>{item.clase || '---'}</td>
                                            <td><span className={styles.categoryTag}>{item.area_tecnica || 'Admin'}</span></td>
                                            <td className={styles.textCenter}>${parseFloat(item.costo_unitario || 0).toFixed(2)}</td>
                                            <td className={styles.textCenter}>${parseFloat(item.precio1 || 0).toFixed(2)}</td>
                                            <td className={styles.textCenter}>{item.requiere_frio && <span className="material-symbols-rounded" style={{color: '#3b82f6', fontSize: '18px'}}>ac_unit</span>}</td>
                                            <td className={styles.textRight}>{item.unidad}</td>
                                            <td className={styles.textCenter}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                                    {viewMode === 'Activos' ? (
                                                        <>
                                                            <button className={styles.editBtn} onClick={() => handleEdit(item)}><span className="material-symbols-rounded">edit</span></button>
                                                            {user?.role === 'almacen' && (
                                                                <button className={styles.editBtn} style={{color: '#ed8936'}} onClick={() => handleDelete(item.id, item.nombre)}><span className="material-symbols-rounded">block</span></button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <button className={styles.editBtn} style={{color: '#10b981'}} onClick={() => handleReactivate(item.id, item.nombre)}><span className="material-symbols-rounded">settings_backup_restore</span></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.mobileView}>
                            {filteredCatalogo.map(item => (
                                <MaterialCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} onReactivate={handleReactivate} viewMode={viewMode} user={user} />
                            ))}
                        </div>
                    </>
                )}
            </main>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalLarge}>
                        <div className={styles.modalHeader}>
                            <h3>{isEditing ? 'Editar Material' : 'Registrar Material'}</h3>
                            <button className={styles.closeBtn} onClick={() => { setShowModal(false); setIsEditing(false); }}>&times;</button>
                        </div>
                        <form onSubmit={handleManualSubmit} className={styles.fullForm}>
                            <div className={styles.formGrid}>
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">description</span> Información</h4>
                                    <div className={styles.fieldGroup}><label>Nombre</label><input ref={nombreInputRef} required value={form.nombre} onChange={e => handleNombreChange(e.target.value)} /></div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}><label>Prefijo</label><input required value={form.prefijo} onChange={e=>setForm({...form, prefijo: e.target.value.toUpperCase()})} /></div>
                                        <div className={styles.fieldGroup}>
                                            <label>Área Técnica</label>
                                            <select value={form.area_tecnica} onChange={e=>setForm({...form, area_tecnica: e.target.value})}>
                                                <option value="HEMATOLOGÍA">Hematología</option>
                                                <option value="QUÍMICA CLÍNICA">Química Clínica</option>
                                                <option value="UROANÁLISIS">Uroanálisis</option>
                                                <option value="MICROBIOLOGÍA">Microbiología</option>
                                                <option value="TOMA DE MUESTRA">Toma de Muestra</option>
                                                <option value="PAPELERÍA">Papelería</option>
                                                <option value="OTROS">Otros</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">payments</span> Comercial</h4>
                                    <div className={styles.fieldGroup}><label>Proveedor</label><SupplierPicker value={form.proveedor_id} onChange={(val) => setForm({...form, proveedor_id: val})} /></div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}><label>Costo ($)</label><input type="number" step="0.01" value={form.costo_unitario} onChange={e=>setForm({...form, costo_unitario: parseFloat(e.target.value) || 0})} /></div>
                                        <div className={styles.fieldGroup}><label>Precio ($)</label><input type="number" step="0.01" value={form.precio1} onChange={e=>setForm({...form, precio1: parseFloat(e.target.value) || 0})} /></div>
                                    </div>
                                </section>
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">warehouse</span> Logística</h4>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}><label>Stock Mínimo</label><input type="number" value={form.stock_minimo} onChange={e=>setForm({...form, stock_minimo: parseInt(e.target.value) || 0})} /></div>
                                        <div className={styles.fieldGroup}><label>Frío</label><input type="checkbox" checked={form.requiere_frio} onChange={e=>setForm({...form, requiere_frio: e.target.checked})} /></div>
                                    </div>
                                </section>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={()=>{ setShowModal(false); setIsEditing(false); }}>Cerrar</button>
                                <button type="submit" className={styles.primaryBtn}>{isEditing ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImportPreview && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalLarge} style={{maxWidth: '800px'}}>
                        <div className={styles.modalHeader}>
                            <h3>Revisión de Carga Masiva</h3>
                            <button className={styles.closeBtn} onClick={() => setShowImportPreview(false)}>&times;</button>
                        </div>
                        <div className={styles.fullForm}>
                            <div className={styles.optionsHeader}>
                                <div className={styles.importStats}>
                                    <div className={styles.statBox}><strong>{importData.all.length}</strong><span>Total</span></div>
                                    <div className={`${styles.statBox} ${styles.statNew}`}><strong>{importData.news.length}</strong><span>Nuevos</span></div>
                                    <div className={`${styles.statBox} ${styles.statDup}`}><strong>{importData.duplicates.length}</strong><span>Existentes</span></div>
                                </div>
                                <div className={styles.actionToggle}>
                                    <label className={styles.switchLabel}>
                                        <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                                        <span className={styles.slider}></span>
                                    </label>
                                    <div className={styles.toggleText}>
                                        <strong>Omitir Duplicados</strong>
                                        <p>{skipDuplicates ? 'Solo se cargarán los registros nuevos.' : 'Se actualizarán los registros existentes.'}</p>
                                    </div>
                                </div>
                            </div>
                            {importData.duplicates.length > 0 && (
                                <section className={`${styles.conflictSection} ${skipDuplicates ? styles.mutedConflict : ''}`}>
                                    <h4><span className="material-symbols-rounded">{skipDuplicates ? 'visibility_off' : 'warning'}</span> {skipDuplicates ? 'Materiales que serán OMITIDOS' : 'Materiales que serán ACTUALIZADOS'}</h4>
                                    <div className={styles.conflictList}>
                                        {importData.duplicates.map((row, i) => (
                                            <div key={i} className={styles.conflictRow}>
                                                <span className={styles.conflictCode}>{row.Prefijo}</span>
                                                <span className={styles.conflictName}>{row.Material || row.Nombre}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                            <section className={styles.previewTable}>
                                <h4>Vista Previa de Datos</h4>
                                <div className={styles.tableWrapper}>
                                    <table>
                                        <thead><tr><th>Código</th><th>Material</th><th>Área</th><th>Categoría</th></tr></thead>
                                        <tbody>
                                            {importData.all.slice(0, 10).map((row, i) => (
                                                <tr key={i}>
                                                    <td>{row.Prefijo}</td>
                                                    <td>{row.Material || row.Nombre}</td>
                                                    <td>{row.Area}</td>
                                                    <td>{row.Categoria}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={()=>setShowImportPreview(false)}>Cancelar</button>
                            <button className={styles.primaryBtn} onClick={processBulkImport} disabled={loading}>{loading ? 'Procesando...' : 'Confirmar e Iniciar Carga'}</button>
                        </div>
                    </div>
                </div>
            )}

            {dialogConfig.isOpen && (
                <div className={styles.modalOverlay} style={{zIndex: 5000}}>
                    <div className={styles.dialogCard}>
                        <div className={styles.dialogIcon}>
                            <span className="material-symbols-rounded" style={{ color: dialogConfig.type === 'confirm' ? '#ef4444' : '#10b981', fontSize: '48px' }}>
                                {dialogConfig.type === 'confirm' ? 'warning' : 'check_circle'}
                            </span>
                        </div>
                        <h3>{dialogConfig.type === 'confirm' ? 'Confirmar Acción' : 'Éxito'}</h3>
                        <p>{dialogConfig.message}</p>
                        <div className={styles.dialogActions}>
                            {dialogConfig.type === 'confirm' ? (
                                <>
                                    <button className={styles.secondaryBtn} onClick={() => setDialogConfig({...dialogConfig, isOpen: false})}>Cancelar</button>
                                    <button className={styles.primaryBtn} onClick={() => { dialogConfig.onConfirm(); setDialogConfig({...dialogConfig, isOpen: false}); }}>Confirmar</button>
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
