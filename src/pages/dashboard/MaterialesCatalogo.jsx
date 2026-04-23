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
                        <label>Subcategoría</label>
                        <span>{item.subcategoria || 'General'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <label>Área Técnica</label>
                        <span>{item.area_tecnica || 'Admin'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <label>Unidad</label>
                        <span>{item.unidad}</span>
                    </div>
                </div>

                {item.temperatura_almacenamiento && (
                    <div className={`${styles.frioBadge} ${styles['temp' + item.temperatura_almacenamiento]}`}>
                        <span className="material-symbols-rounded">
                            {item.temperatura_almacenamiento === 'Ambiente' ? 'home' : 
                             item.temperatura_almacenamiento === 'Refrigerado' ? 'thermostat' : 'ac_unit'}
                        </span> 
                        {item.temperatura_almacenamiento}
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
    const [searchTerm, setSearchTerm] = useState(localStorage.getItem('solcan_cat_search') || '');
    const [viewMode, setViewMode] = useState(localStorage.getItem('solcan_cat_viewMode') || 'Activos');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [targetItem, setTargetItem] = useState(null);
    const nombreInputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Bulk Import States
    const [showImportPreview, setShowImportPreview] = useState(false);
    const [importData, setImportData] = useState({ all: [], duplicates: [], news: [] });
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [visibleCount, setVisibleCount] = useState(50);

    const initialForm = {
        nombre: '', prefijo: '', unidad: 'Pieza', stock_minimo: 10, categoria: 'Reactivos',
        subcategoria: 'General', sub_area: 'General', equipo: '', marca: '', proveedor_id: '', costo_unitario: 0, precio1: 0,
        presentacion: 'Caja', requiere_frio: false, temperatura_almacenamiento: 'Ambiente',
        temperatura_valor: 20, area_tecnica: 'HEMATOLOGÍA', ean_maestro: '', clase: 'Artículo'
    };
    const [form, setForm] = useState(initialForm);
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });

    const [filterClase, setFilterClase] = useState(localStorage.getItem('solcan_cat_filterClase') || 'Todas');
    const [filterArea, setFilterArea] = useState(localStorage.getItem('solcan_cat_filterArea') || 'Todas');
    const [filterSubArea, setFilterSubArea] = useState(localStorage.getItem('solcan_cat_filterSubArea') || 'Todas');
    const [filterEquipo, setFilterEquipo] = useState(localStorage.getItem('solcan_cat_filterEquipo') || 'Todas');
    const [filterSubcat, setFilterSubcat] = useState(localStorage.getItem('solcan_cat_filterSubcat') || 'Todas');

    // Persist filters to localStorage
    useEffect(() => {
        localStorage.setItem('solcan_cat_search', searchTerm);
        localStorage.setItem('solcan_cat_viewMode', viewMode);
        localStorage.setItem('solcan_cat_filterClase', filterClase);
        localStorage.setItem('solcan_cat_filterArea', filterArea);
        localStorage.setItem('solcan_cat_filterSubArea', filterSubArea);
        localStorage.setItem('solcan_cat_filterEquipo', filterEquipo);
        localStorage.setItem('solcan_cat_filterSubcat', filterSubcat);
    }, [searchTerm, viewMode, filterClase, filterArea, filterSubArea, filterEquipo, filterSubcat]);

    const fetchCatalogo = useCallback(async () => {
        setLoading(true);
        try {
            // First try with the 'activo' filter
            // Fetch everything to allow instant switching between Active/Inactive
            const { data, error } = await supabase
                .from('materiales_catalogo')
                .select('*')
                .order('nombre', { ascending: true });

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
        setForm(prev => ({ ...prev, nombre: val }));
        
        // Solo sugerir prefijo si el campo está vacío o es un registro nuevo sin prefijo manual
        if (!form.prefijo || form.prefijo.length <= 2) {
            const words = val.trim().split(/\s+/);
            let prefix = '';
            if (words.length >= 2) {
                prefix = words[0].substring(0, 2) + (words[1] ? words[1].substring(0, 1) : '');
            } else {
                prefix = val.substring(0, 3);
            }
            setForm(prev => ({ ...prev, nombre: val, prefijo: prefix.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
        }
    };

    const sugerirPrefijo = () => {
        if (!form.nombre) return;
        const words = form.nombre.trim().split(/\s+/);
        let prefix = '';
        if (words.length >= 2) {
            prefix = words.map(w => w[0]).join('').substring(0, 4);
        } else {
            prefix = form.nombre.substring(0, 4);
        }
        setForm(prev => ({ ...prev, prefijo: prefix.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
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

    const updateTemp = (v) => {
        let cat = 'Ambiente';
        if (v <= 0) cat = 'Congelado';
        else if (v <= 10) cat = 'Refrigerado';
        
        setForm({
            ...form, 
            temperatura_valor: v,
            temperatura_almacenamiento: cat,
            requiere_frio: cat !== 'Ambiente'
        });
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Sanitización para evitar errores de UUID inválido ("")
        const payload = {
            ...form,
            proveedor_id: form.proveedor_id === '' ? null : form.proveedor_id,
            ean_maestro: form.ean_maestro === '' ? null : form.ean_maestro,
            sub_area: form.sub_area || 'General',
            equipo: form.equipo || null,
            costo_unitario: parseFloat(form.costo_unitario) || 0,
            precio1: parseFloat(form.precio1) || 0,
            stock_minimo: parseInt(form.stock_minimo) || 0
        };

        try {
            if (isEditing) {
                const { error } = await supabase.from('materiales_catalogo').update(payload).eq('id', targetItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('materiales_catalogo').insert([payload]);
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
            const duplicates = []; 
            const news = [];

            // Normalization mappings
            const subcatMap = {
                'Calibrador': 'Calibradores',
                'Control': 'Controles',
                'Reactivo': 'Reactivos',
                'Insumo': 'General'
            };

            const areaMap = {
                'HEMATOLOGIA': 'HEMATOLOGÍA',
                'QUIMICA CLINICA': 'QUÍMICA CLÍNICA',
                'UROANALISIS': 'UROANÁLISIS',
                'MICROBIOLOGIA': 'MICROBIOLOGÍA',
                'TOMA DE MUESTRA': 'TOMA DE MUESTRA'
            };

            const normalizedData = data.map(row => {
                const rawSubcat = (row.Subcategoria || '').trim();
                const rawArea = (row.Area || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                return {
                    ...row,
                    Subcategoria: subcatMap[rawSubcat] || rawSubcat || 'General',
                    Area: areaMap[rawArea] || (row.Area || 'HEMATOLOGÍA').toUpperCase().trim(),
                    Prefijo: row.Prefijo?.toString().trim().toUpperCase(),
                    Material: row.Material?.toString().trim()
                };
            });

            normalizedData.forEach(row => {
                if (!row.Prefijo || !row.Material) return; // Skip invalid rows
                if (existingPrefixes.has(row.Prefijo)) duplicates.push(row);
                else news.push(row);
            });

            setImportData({ all: normalizedData, duplicates, news });
            setShowImportPreview(true);
            // Reset input so same file can be uploaded again if needed
            e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [{
            Prefijo: 'C1', 
            Material: 'Ejemplo de Reactivo',
            Area: 'QUÍMICA CLÍNICA', 
            SubArea: 'Inmunología',
            Equipo: 'Vitros 4600',
            Categoria: 'Reactivos', 
            Subcategoria: 'Calibrador',
            Clase: 'Reactivo',
            Marca: 'Ortho', 
            Presentacion: 'Caja c/100', 
            Unidad: 'Pieza', 
            Minimo: 10, 
            Costo: 100.50, 
            Precio: 150.00,
            EAN: '1234567890123',
            Temp_Valor: 20
        }];
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

                // Función auxiliar para limpiar ceros y nulos
                const clean = (val) => (val === 0 || val === '0' || val === '' || val === undefined || val === null) ? null : val;

                const tempVal = parseFloat(row.Temp_Valor) || 20;
                let tempCat = 'Ambiente';
                if (tempVal <= 0) tempCat = 'Congelado';
                else if (tempVal <= 10) tempCat = 'Refrigerado';

                itemsMap.set(prefixId, {
                    nombre: row.Material || row.Nombre, 
                    prefijo: prefixId, 
                    unidad: row.Unidad || 'Pieza', 
                    stock_minimo: parseInt(row.Minimo || 10), 
                    categoria: row.Categoria || 'Reactivos', 
                    subcategoria: clean(row.Subcategoria) || 'General',
                    sub_area: clean(row.SubArea) || 'General',
                    equipo: clean(row.Equipo),
                    marca: clean(row.Marca), 
                    costo_unitario: parseFloat(row.Costo || 0), 
                    presentacion: row.Presentacion || 'Unidad', 
                    requiere_frio: tempCat !== 'Ambiente', 
                    temperatura_almacenamiento: tempCat,
                    temperatura_valor: tempVal,
                    area_tecnica: row.Area || 'HEMATOLOGÍA', 
                    ean_maestro: clean(row.EAN), 
                    clase: row.Clase || 'Artículo', 
                    precio1: parseFloat(row.Precio || 0)
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



    // Extract unique values for dynamic filters
    const subAreas = Array.from(new Set(catalogo.map(c => c.sub_area).filter(Boolean))).sort();
    const equipos = Array.from(new Set(catalogo.map(c => c.equipo).filter(Boolean))).sort();

    const filteredCatalogo = catalogo.filter(c => {
        const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.prefijo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClase = filterClase === 'Todas' || c.clase === filterClase;
        const matchesArea = filterArea === 'Todas' || c.area_tecnica === filterArea;
        const matchesSubArea = filterSubArea === 'Todas' || c.sub_area === filterSubArea;
        const matchesEquipo = filterEquipo === 'Todas' || 
                             (filterEquipo === 'Sin Equipo (N/A)' ? !c.equipo : c.equipo === filterEquipo);
        const matchesSubcat = filterSubcat === 'Todas' || c.subcategoria === filterSubcat;
        
        const matchesViewMode = viewMode === 'Activos' ? c.activo !== false : c.activo === false;
        
        return matchesViewMode && matchesSearch && matchesClase && matchesArea && matchesSubArea && matchesEquipo && matchesSubcat;
    });

    // Reset pagination when filters change
    useEffect(() => {
        setVisibleCount(50);
    }, [searchTerm, filterClase, filterArea, filterSubArea, filterEquipo, filterSubcat, viewMode]);

    const displayedCatalogo = filteredCatalogo.slice(0, visibleCount);

    return (
        <div className={styles.container}>
            <button className={styles.mobileBackBtn} onClick={() => navigate('/almacen')}>
                <span className="material-symbols-rounded">arrow_back</span> Regresar al Almacén
            </button>

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.titleIcon}>
                        <span className="material-symbols-rounded">inventory_2</span>
                    </div>
                    <div>
                        <h1>Catálogo de Materiales</h1>
                        <p>Gestión técnica de insumos y reactivos de laboratorio</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.secondaryBtn} onClick={handleDownloadTemplate} title="Descargar plantilla Excel">
                        <span className="material-symbols-rounded">download</span>
                        Plantilla
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".xlsx, .xls" 
                        onChange={handleFileUpload} 
                    />
                    <button className={styles.secondaryBtn} onClick={() => fileInputRef.current.click()}>
                        <span className="material-symbols-rounded">upload_file</span>
                        Carga Masiva
                    </button>
                    <button className={styles.primaryBtn} onClick={() => { setForm(initialForm); setIsEditing(false); setShowModal(true); }}>
                        <span className="material-symbols-rounded">add</span>
                        Nuevo Material
                    </button>
                </div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.controlsSection}>
                    <div className={styles.searchRow}>
                        <div className={styles.searchWrapper}>
                            <span className="material-symbols-rounded">search</span>
                            <input 
                                type="text" 
                                placeholder="Buscar por nombre, código o marca..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        <div className={styles.viewToggle}>
                            <button className={viewMode === 'Activos' ? styles.activeTab : ''} onClick={() => setViewMode('Activos')}>
                                Activos <span>{catalogo.filter(c => c.activo !== false).length}</span>
                            </button>
                            <button className={viewMode === 'Inactivos' ? styles.activeTab : ''} onClick={() => setViewMode('Inactivos')}>
                                Inactivos <span>{catalogo.filter(c => c.activo === false).length}</span>
                            </button>
                        </div>
                    </div>

                    <div className={styles.filtersGrid}>
                        <div className={styles.filterGroup}>
                            <label>Clase</label>
                            <select value={filterClase} onChange={e => setFilterClase(e.target.value)}>
                                <option value="Todas">Todas</option>
                                <option value="Reactivo">Reactivos</option>
                                <option value="Artículo">Artículos</option>
                                <option value="Consumible">Consumibles</option>
                                <option value="Equipo">Equipos</option>
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Área Técnica</label>
                            <select value={filterArea} onChange={e => setFilterArea(e.target.value)}>
                                <option value="Todas">Todas</option>
                                <option value="HEMATOLOGÍA">Hematología</option>
                                <option value="QUÍMICA CLÍNICA">Química Clínica</option>
                                <option value="UROANÁLISIS">Uroanálisis</option>
                                <option value="MICROBIOLOGÍA">Microbiología</option>
                                <option value="TOMA DE MUESTRA">Toma de Muestra</option>
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Sub-Área</label>
                            <select value={filterSubArea} onChange={e => setFilterSubArea(e.target.value)}>
                                <option value="Todas">Todas</option>
                                {subAreas.map(sa => <option key={sa} value={sa}>{sa}</option>)}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Equipo</label>
                            <select value={filterEquipo} onChange={e => setFilterEquipo(e.target.value)}>
                                <option value="Todas">Todos</option>
                                <option value="Sin Equipo (N/A)">Sin Equipo (N/A)</option>
                                {equipos.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Subcategoría</label>
                            <select value={filterSubcat} onChange={e => setFilterSubcat(e.target.value)}>
                                <option value="Todas">Todas</option>
                                <option value="General">Insumo General</option>
                                <option value="Reactivos">Reactivo Trabajo</option>
                                <option value="Controles">Controles</option>
                                <option value="Calibradores">Calibradores</option>
                                <option value="Inmunología">Inmunología</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? <div className={styles.loader}>Cargando catálogo...</div> : (
                    <>
                        <div className={`${styles.tableWrapper} ${styles.desktopView}`}>
                            <table className={styles.denseTable}>
                                <thead>
                                    <tr>
                                        <th>Cód.</th>
                                        <th>Nombre / Marca</th>
                                        <th>Clasificación</th>
                                        <th>Área Técnica</th>
                                        <th className={styles.textCenter}>Costo</th>
                                        <th className={styles.textCenter}>Precio</th>
                                        <th className={styles.textCenter}>T°</th>
                                        <th className={styles.textRight}>Unidad</th>
                                        <th className={styles.textCenter}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedCatalogo.map(item => (
                                        <tr key={item.id} className={item.requiere_frio ? styles.frioRow : ''}>
                                            <td className={styles.codeCell}>{item.prefijo}</td>
                                            <td className={styles.nameCell}>
                                                <strong>{item.nombre}</strong>
                                                <div className={styles.subInfo}>{item.marca || 'Genérico'} • {item.presentacion}</div>
                                            </td>
                                            <td className={styles.techCell}>
                                                <div className={styles.techTop}>
                                                    <span className={styles.claseBadge}>{item.clase}</span>
                                                    <strong>{item.sub_area || 'General'}</strong>
                                                </div>
                                                <div className={styles.techBottom}>
                                                    <span className={styles.equipoSmall}>{item.equipo || 'Sin Equipo'}</span>
                                                    <span className={styles.divider}>|</span>
                                                    <span>{item.subcategoria}</span>
                                                </div>
                                            </td>
                                            <td><span className={styles.categoryTag}>{item.area_tecnica || 'Admin'}</span></td>
                                            <td className={styles.textCenter}>${parseFloat(item.costo_unitario || 0).toFixed(2)}</td>
                                            <td className={styles.textCenter}>${parseFloat(item.precio1 || 0).toFixed(2)}</td>
                                            <td className={styles.textCenter}>
                                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: '600'}}>
                                                    {item.temperatura_almacenamiento === 'Ambiente' && <span className="material-symbols-rounded" title="Ambiente" style={{color: '#94a3b8', fontSize: '18px'}}>home</span>}
                                                    {item.temperatura_almacenamiento === 'Refrigerado' && <span className="material-symbols-rounded" title="Refrigerado" style={{color: '#3b82f6', fontSize: '18px'}}>thermostat</span>}
                                                    {item.temperatura_almacenamiento === 'Congelado' && <span className="material-symbols-rounded" title="Congelado" style={{color: '#6366f1', fontSize: '18px'}}>ac_unit</span>}
                                                    <span>{item.temperatura_valor ?? (item.requiere_frio ? '2-8' : '20')}°</span>
                                                </div>
                                            </td>
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
                            {displayedCatalogo.map(item => (
                                <MaterialCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} onReactivate={handleReactivate} viewMode={viewMode} user={user} />
                            ))}
                        </div>

                        {visibleCount < filteredCatalogo.length && (
                            <div className={styles.loadMoreContainer}>
                                <button className={styles.loadMoreBtn} onClick={() => setVisibleCount(prev => prev + 50)}>
                                    <span className="material-symbols-rounded">expand_more</span>
                                    Ver 50 más ({filteredCatalogo.length - visibleCount} restantes)
                                </button>
                            </div>
                        )}
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
                            <div className={styles.formContent}>
                                <div className={styles.formGrid}>
                                    <section className={styles.formSection}>
                                        <h4><span className="material-symbols-rounded">description</span> Información Técnica</h4>
                                        <div className={styles.fieldGroup}>
                                            <label>Nombre del Material / Reactivo</label>
                                            <input ref={nombreInputRef} required value={form.nombre} onChange={e => handleNombreChange(e.target.value)} placeholder="Ej. Tubo EDTA 4ml" />
                                        </div>
                                        <div className={styles.row}>
                                            <div className={styles.fieldGroup}>
                                                <label>Prefijo/Código</label>
                                                <div className={styles.inputWithAction}>
                                                    <input required value={form.prefijo} onChange={e=>setForm({...form, prefijo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})} placeholder="Ej. EDTA" />
                                                    <button 
                                                            type="button" 
                                                            className={styles.suggestBtn} 
                                                            onClick={sugerirPrefijo} 
                                                            title={form.prefijo ? "Código ya asignado" : "Sugerir código"}
                                                            disabled={!!form.prefijo}
                                                        >
                                                            <span className="material-symbols-rounded">magic_button</span>
                                                        </button>
                                                </div>
                                            </div>
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
                                        <div className={styles.row}>
                                            <div className={styles.fieldGroup}>
                                                <label>Sub-Área / Especialidad</label>
                                                <input type="text" placeholder="Ej. Inmunología..." value={form.sub_area} onChange={e => setForm({...form, sub_area: e.target.value})} />
                                            </div>
                                            <div className={styles.fieldGroup}>
                                                <label>Equipo / Analizador</label>
                                                <input type="text" placeholder="Ej. Vitros 4600..." value={form.equipo} onChange={e => setForm({...form, equipo: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className={styles.row}>
                                            <div className={styles.fieldGroup}>
                                                <label>Clase</label>
                                                <select value={form.clase} onChange={e=>setForm({...form, clase: e.target.value})}>
                                                    <option value="Artículo">Artículo</option>
                                                    <option value="Reactivo">Reactivo</option>
                                                    <option value="Consumible">Consumible</option>
                                                    <option value="Equipo">Equipo</option>
                                                </select>
                                            </div>
                                            <div className={styles.fieldGroup}>
                                                <label>Subcategoría / Tipo</label>
                                                <select value={form.subcategoria} onChange={e=>setForm({...form, subcategoria: e.target.value})}>
                                                    <option value="General">Insumo General</option>
                                                    <option value="Reactivos">Reactivo de Trabajo</option>
                                                    <option value="Controles">Control de Calidad</option>
                                                    <option value="Calibradores">Calibrador</option>
                                                    <option value="Estándares">Estándar / Patrón</option>
                                                    <option value="Inmunología">Inmunología</option>
                                                    <option value="Detergentes">Detergente / Limpiador</option>
                                                    <option value="Consumibles">Consumible</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    <section className={styles.formSection}>
                                        <h4><span className="material-symbols-rounded">inventory_2</span> Detalles de Producto</h4>
                                        <div className={styles.row}>
                                            <div className={styles.fieldGroup}><label>Marca</label><input value={form.marca} onChange={e=>setForm({...form, marca: e.target.value})} placeholder="Ej. BD, Roche..." /></div>
                                            <div className={styles.fieldGroup}><label>Presentación</label><input value={form.presentacion} onChange={e=>setForm({...form, presentacion: e.target.value})} placeholder="Ej. Caja c/100" /></div>
                                        </div>
                                        <div className={styles.row}>
                                            <div className={styles.fieldGroup}>
                                                <label>Unidad de Medida</label>
                                                <select value={form.unidad} onChange={e=>setForm({...form, unidad: e.target.value})}>
                                                    <option value="Pieza">Pieza</option>
                                                    <option value="Caja">Caja</option>
                                                    <option value="Kit">Kit</option>
                                                    <option value="Frasco">Frasco</option>
                                                    <option value="Bolsa">Bolsa</option>
                                                    <option value="Prueba">Prueba</option>
                                                    <option value="Paquete">Paquete</option>
                                                    <option value="Rollo">Rollo</option>
                                                    <option value="Litro">Litro</option>
                                                </select>
                                            </div>
                                            <div className={styles.fieldGroup}><label>Código EAN</label><input value={form.ean_maestro} onChange={e=>setForm({...form, ean_maestro: e.target.value})} placeholder="Código de barras" /></div>
                                        </div>
                                    </section>

                                    <section className={styles.formSection}>
                                        <h4><span className="material-symbols-rounded">payments</span> Comercial</h4>
                                        <div className={styles.fieldGroup}><label>Proveedor Sugerido</label><SupplierPicker value={form.proveedor_id} onChange={(val) => setForm({...form, proveedor_id: val})} /></div>
                                        <div className={styles.row}>
                                            <div className={styles.fieldGroup}><label>Costo ($)</label><input type="number" step="0.01" value={form.costo_unitario} onChange={e=>setForm({...form, costo_unitario: parseFloat(e.target.value) || 0})} /></div>
                                            <div className={styles.fieldGroup}><label>Precio ($)</label><input type="number" step="0.01" value={form.precio1} onChange={e=>setForm({...form, precio1: parseFloat(e.target.value) || 0})} /></div>
                                        </div>
                                    </section>

                                    <section className={styles.formSection}>
                                        <h4><span className="material-symbols-rounded">warehouse</span> Almacén</h4>
                                        <div className={styles.fieldGroup}><label>Stock Mínimo</label><input type="number" value={form.stock_minimo} onChange={e=>setForm({...form, stock_minimo: parseInt(e.target.value) || 0})} /></div>
                                        <div className={styles.fieldGroup}>
                                            <label>Almacenamiento</label>
                                            <div className={styles.tempControlWrapper}>
                                                <div className={styles.tempInputRow}>
                                                    <select value={form.temperatura_almacenamiento} onChange={e => { const val = e.target.value; let defVal = 20; if (val === 'Refrigerado') defVal = 4; if (val === 'Congelado') defVal = -20; setForm({...form, temperatura_almacenamiento: val, temperatura_valor: defVal, requiere_frio: val !== 'Ambiente'}); }}>
                                                        <option value="Ambiente">🏠 Ambiente</option>
                                                        <option value="Refrigerado">❄️ Refrigerado</option>
                                                        <option value="Congelado">🧊 Congelado</option>
                                                    </select>
                                                    <div className={styles.tempValueBox}>
                                                        <button type="button" onClick={() => setForm({...form, temperatura_valor: (form.temperatura_valor || 0) - 1})}>-</button>
                                                        <input type="number" value={form.temperatura_valor} onChange={e => setForm({...form, temperatura_valor: parseInt(e.target.value) || 0})} />
                                                        <button type="button" onClick={() => setForm({...form, temperatura_valor: (form.temperatura_valor || 0) + 1})}>+</button>
                                                        <span className={styles.unitText}>°C</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => { setShowModal(false); setIsEditing(false); }}>Cancelar</button>
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                                    <span className="material-symbols-rounded">save</span>
                                    {loading ? 'Guardando...' : (isEditing ? 'Actualizar Material' : 'Registrar Material')}
                                </button>
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
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Material</th>
                                                <th>Área</th>
                                                <th>SubArea</th>
                                                <th>Equipo</th>
                                                <th>Categoría</th>
                                                <th>Subcategoría</th>
                                                <th>Marca</th>
                                                <th>Pres.</th>
                                                <th>Unidad</th>
                                                <th>Mín.</th>
                                                <th>Costo</th>
                                                <th>Precio</th>
                                                <th>EAN</th>
                                                <th>T°</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importData.all.slice(0, 10).map((row, i) => (
                                                <tr key={i}>
                                                    <td>{row.Prefijo}</td>
                                                    <td>{row.Material || row.Nombre}</td>
                                                    <td>{row.Area}</td>
                                                    <td>{row.SubArea || '---'}</td>
                                                    <td>{row.Equipo || '---'}</td>
                                                    <td>{row.Categoria}</td>
                                                    <td>{row.Subcategoria || '---'}</td>
                                                    <td>{row.Marca || '---'}</td>
                                                    <td>{row.Presentacion || '---'}</td>
                                                    <td>{row.Unidad || '---'}</td>
                                                    <td>{row.Minimo || 0}</td>
                                                    <td>${row.Costo || 0}</td>
                                                    <td>${row.Precio || 0}</td>
                                                    <td>{row.EAN || '---'}</td>
                                                    <td>{row.Temp_Valor || 20}°</td>
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
