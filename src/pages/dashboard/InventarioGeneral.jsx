import React, { useState, useEffect, useMemo, useDeferredValue, memo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './InventarioGeneral.module.css';
import Barcode from '../../components/common/Barcode';

const categories = ['Todos', 'Hematología', 'Química Clínica', 'Uroanálisis', 'Microbiología', 'Toma de Muestra', 'Papelería', 'Otros'];

// Componentes Memoizados para alto rendimiento
const FilterSection = memo(({ activeCategory, setActiveCategory, searchTerm, setSearchTerm, categories, expandAll, collapseAll }) => (
    <div className={styles.controlsRow}>
        <div className={styles.filtersWide}>
            <div className={styles.categoryPills}>
                {categories.map(cat => (
                    <button key={cat} className={`${styles.pill} ${activeCategory === cat ? styles.pillActive : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
                ))}
            </div>
            <div className={styles.searchBar}>
                <span className="material-symbols-rounded">barcode_scanner</span>
                <input type="text" placeholder="Gral / Escáner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
            </div>
        </div>

        <div className={styles.globalActions}>
            <button className={styles.actionBtn} onClick={expandAll} title="Expandir todo"><span className="material-symbols-rounded">expand_all</span></button>
            <button className={styles.actionBtn} onClick={collapseAll} title="Colapsar todo"><span className="material-symbols-rounded">collapse_all</span></button>
        </div>
    </div>
));

const FilterDropdown = memo(({ columnKey, label, items, activeFilters, applyFilter, clearFilter, requestSort, sortConfig, onClose }) => {
    const [search, setSearch] = useState('');
    const [localSelected, setLocalSelected] = useState(new Set(activeFilters[columnKey] || []));
    
    const uniqueValues = useMemo(() => {
        const vals = new Set();
        items.forEach(item => {
            const v = item[columnKey] || 'N/A';
            vals.add(v);
        });
        return Array.from(vals).sort();
    }, [items, columnKey]);

    const filteredValues = uniqueValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    
    const toggleLocal = (val) => {
        const next = new Set(localSelected);
        if (next.has(val)) next.delete(val);
        else next.add(val);
        setLocalSelected(next);
    };

    const handleSelectAll = () => {
        if (localSelected.size === uniqueValues.length) setLocalSelected(new Set());
        else setLocalSelected(new Set(uniqueValues));
    };

    const handleAccept = () => {
        applyFilter(columnKey, localSelected);
        onClose();
    };

    const handleClear = () => {
        setLocalSelected(new Set());
    };

    return (
        <div className={styles.filterDropdown}>
            <header className={styles.filterHeader}>
                <div className={styles.filterSortRow}>
                    <button onClick={() => { requestSort(columnKey); onClose(); }} className={styles.sortBtn}>
                        <span className="material-symbols-rounded">sort_by_alpha</span> Orden AZ
                    </button>
                    <button onClick={() => { requestSort(columnKey); onClose(); }} className={styles.sortBtn}>
                        <span className="material-symbols-rounded">sort</span> Orden ZA
                    </button>
                </div>
                <div className={styles.filterSearchRow}>
                    <span className="material-symbols-rounded">search</span>
                    <input 
                        type="text" 
                        placeholder={`Buscar ${label}...`} 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </header>

            <div className={styles.filterList}>
                <label className={styles.filterItem}>
                    <input 
                        type="checkbox" 
                        checked={localSelected.size === uniqueValues.length && uniqueValues.length > 0}
                        onChange={handleSelectAll}
                    />
                    <span>(Seleccionar todo)</span>
                </label>
                {filteredValues.map(val => (
                    <label key={val} className={styles.filterItem}>
                        <input 
                            type="checkbox" 
                            checked={localSelected.has(val)}
                            onChange={() => toggleLocal(val)}
                        />
                        <span>{val}</span>
                    </label>
                ))}
            </div>

            <footer className={styles.filterFooter}>
                <button className={styles.filterBtnCancel} onClick={handleClear}>Borrar</button>
                <button className={styles.filterBtnOk} onClick={handleAccept}>Aceptar</button>
            </footer>
        </div>
    );
});

const MaterialRow = memo(({ item, isExpanded, toggleRow, stock, isLow, isCritical, loadedLots, openBarsModal, isLoadingDetail }) => {
    const myUnits = loadedLots[item.id] || [];
    const lotsGrouped = myUnits.reduce((acc, curr) => {
        const key = curr.lote_numero || 'SIN LOTE';
        if (!acc[key]) acc[key] = { count: 0, caducidad: curr.caducidad };
        acc[key].count++;
        return acc;
    }, {});

    return (
        <React.Fragment>
            <tr className={`${isCritical ? styles.rowCritical : isLow ? styles.rowLow : ''} ${styles.parentRow}`} onClick={() => toggleRow(item.id)}>
                <td className={styles.textCenter}><span className={`material-symbols-rounded ${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>chevron_right</span></td>
                <td className={styles.codeCell}>{item.prefijo}</td>
                <td className={styles.barcodeColumn}>
                    {item.ean_maestro && <Barcode value={item.ean_maestro} height={20} displayValue={false} width={1} fontSize={0} />}
                </td>
                <td className={styles.classCell}>{item.clase || '---'}</td>
                <td className={styles.nameCell}>
                    <strong>{item.nombre}</strong>
                    <div className={styles.subInfo}>{item.categoria}</div>
                </td>
                <td><span className={styles.categoryTag}>{item.area_tecnica || '---'}</span></td>
                <td>{item.marca || '---'}</td>
                <td className={styles.costCell}>${parseFloat(item.costo_unitario || 0).toFixed(2)}</td>
                <td className={styles.priceCell}>${parseFloat(item.precio1 || 0).toFixed(2)}</td>
                <td className={styles.stockCell}>{stock}</td>
                <td className={styles.textCenter}>{item.stock_minimo}</td>
                <td>{isCritical ? <span className={`${styles.statusLabel} ${styles.statusCritical}`}>AGOTADO</span> : isLow ? <span className={`${styles.statusLabel} ${styles.statusLow}`}>BAJO STOCK</span> : <span className={`${styles.statusLabel} ${styles.statusOk}`}>ÓPTIMO</span>}</td>
                <td className={styles.textRight}>{item.unidad}</td>
            </tr>
            {isExpanded && (
                <tr className={styles.detailRow}>
                    <td colSpan="16">
                        <div className={styles.lotDetailContainer}>
                            <table className={styles.lotTable}>
                                <thead>
                                    <tr><th>Lote</th><th>Caducidad</th><th>Existencia</th><th>Estatus</th><th className={styles.textCenter}>Barras</th></tr>
                                </thead>
                                <tbody>
                                    {isLoadingDetail ? (
                                        <tr>
                                            <td colSpan="5" className={styles.textCenter} style={{ padding: '2rem' }}>
                                                <div className={styles.loaderInline}>
                                                    <span className="material-symbols-rounded spinning">refresh</span>
                                                    <span>Sincronizando lotes...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : Object.entries(lotsGrouped).length > 0 ? (
                                        Object.entries(lotsGrouped).map(([lote, info]) => (
                                            <tr key={lote}>
                                                <td><strong>{lote}</strong></td>
                                                <td>{info.caducidad ? new Date(info.caducidad).toLocaleDateString() : 'N/A'}</td>
                                                <td>{info.count} {item.unidad}(s)</td>
                                                <td>
                                                    {Math.floor((new Date(info.caducidad) - new Date()) / (1000 * 60 * 60 * 24)) < 0 
                                                        ? <span className={styles.expiredLabel}>CADUCADO</span> 
                                                        : <span className={styles.freshLabel}>VIGENTE</span>
                                                    }
                                                </td>
                                                <td className={styles.textCenter}>
                                                    <button className={styles.barcodeBtn} onClick={(e) => { e.stopPropagation(); openBarsModal(item.id, lote); }}>
                                                        <span className="material-symbols-rounded">barcode_scanner</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className={styles.textCenter}>No hay lotes físicos en sistema (Saldo Excel: {item.existencia_excel || 0})</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
});

export default function InventarioGeneral() {
    const [loading, setLoading] = useState(true);
    const [catalogo, setCatalogo] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    
    // Valores diferidos para que la UI de botones y búsqueda sea instantánea
    const deferredCategory = useDeferredValue(activeCategory);
    const deferredSearch = useDeferredValue(searchTerm);
    
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [selectedLotUnits, setSelectedLotUnits] = useState([]);
    const [selectedLotName, setSelectedLotName] = useState('');
    const [loadedLots, setLoadedLots] = useState({}); // Cache para lotes cargados (Lazy Load)
    const [selectedToPrint, setSelectedToPrint] = useState(new Set());
    const [loadingRows, setLoadingColumns] = useState(new Set()); // Para el spinner de fila
    const [matchingIdsByBarcode, setMatchingIdsByBarcode] = useState(new Set()); // Resultados de búsqueda global
    
    // Configuración de Filtros y Ordenamiento
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
    const [columnFilters, setColumnFilters] = useState({}); // { key: Set }
    const [openDropdown, setOpenDropdown] = useState(null); // string (key) or null

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('v_inventario_panoramico')
                .select('*')
                .order('nombre', { ascending: true });
            
            setCatalogo(data || []);
            setUnidades([]); 
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Función de normalización para comparaciones robustas
    const normalize = (str) => {
        if (!str) return '';
        return str.toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();
    };

    const toggleRow = async (id) => {
        const next = new Set(expandedRows);
        const opening = !next.has(id);
        
        if (opening) {
            next.add(id);
            setExpandedRows(next);

            if (!loadedLots[id]) {
                setLoadingColumns(prev => new Set(prev).add(id));
                try {
                    const { data } = await supabase
                        .from('materiales_unidades')
                        .select('*')
                        .eq('catalogo_id', id)
                        .eq('estatus', 'Almacenado')
                        .order('created_at', { ascending: false });
                    
                    if (data) {
                        setLoadedLots(prev => ({ ...prev, [id]: data }));
                        setUnidades(prev => [...prev.filter(u => u.catalogo_id !== id), ...data]);
                    }
                } finally {
                    setLoadingColumns(prev => {
                        const n = new Set(prev);
                        n.delete(id);
                        return n;
                    });
                }
            }
        } else {
            next.delete(id);
            setExpandedRows(next);
        }
    };

    // Búsqueda inteligente de códigos de barras (Smart Lookup)
    useEffect(() => {
        if (!deferredSearch || deferredSearch.length < 2) {
            setMatchingIdsByBarcode(new Set());
            return;
        }

        const performSmartLookup = async () => {
            const words = deferredSearch.split(' ').filter(w => w.length >= 2);
            if (words.length === 0) return;

            // Buscamos la palabra más "específica" (con números o la más larga)
            const searchWord = words.find(w => /\d/.test(w)) || words.sort((a,b) => b.length - a.length)[0];

            const { data } = await supabase
                .from('materiales_unidades')
                .select('catalogo_id')
                .ilike('codigo_barras_unico', `%${searchWord}%`)
                .limit(50);

            if (data) {
                const ids = new Set(data.map(d => d.catalogo_id));
                setMatchingIdsByBarcode(ids);
                if (ids.size === 1) toggleRow([...ids][0]);
            }
        };

        const timer = setTimeout(performSmartLookup, 600);
        return () => clearTimeout(timer);
    }, [deferredSearch]);

    const expandAll = () => setExpandedRows(new Set(filteredMaterials.map(m => m.id)));
    const collapseAll = () => setExpandedRows(new Set());

    const openBarsModal = (catId, lotNum) => {
        const lotUnits = unidades.filter(u => u.catalogo_id === catId && (u.lote_numero === lotNum || (!u.lote_numero && lotNum === 'SIN LOTE')));
        const mat = catalogo.find(c => c.id === catId);
        setSelectedLotUnits(lotUnits);
        setSelectedLotName(`${mat?.nombre} - Lote: ${lotNum}`);
        setSelectedToPrint(new Set()); // Limpiar selección previa
        setShowBarcodeModal(true);
    };

    const toggleSelection = (id) => {
        const next = new Set(selectedToPrint);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedToPrint(next);
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const selectAllNone = () => {
        if (selectedToPrint.size === selectedLotUnits.length) setSelectedToPrint(new Set());
        else setSelectedToPrint(new Set(selectedLotUnits.map(u => u.id)));
    };

    const handlePrint = () => {
        window.print();
    };

    const applyColumnFilter = (key, selectedSet) => {
        setColumnFilters(prev => ({
            ...prev,
            [key]: selectedSet
        }));
    };

    const clearColumnFilter = (key) => {
        setColumnFilters(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const filteredMaterials = useMemo(() => {
        const normSearch = normalize(deferredSearch);
        const normCat = normalize(deferredCategory);

        let filtered = catalogo.filter(item => {
            const itemArea = normalize(item.area_tecnica);
            
            // Lógica de mapeo de abreviaturas
            const isHematologia = itemArea === 'HEMATOLOGIA' || itemArea === 'HEMATO';
            const isQuimica = itemArea === 'QUIMICA CLINICA' || itemArea === 'QUIMICA';
            const isUro = itemArea === 'UROANALISIS' || itemArea === 'URO';
            const isMicro = itemArea === 'MICROBIOLOGIA' || itemArea === 'MICRO';
            const isToma = itemArea === 'TOMA DE MUESTRA' || itemArea === 'TOMA MUESTRA';
            const isPapeleria = itemArea === 'PAPELERIA';

            let matchesCategory = false;
            if (deferredCategory === 'Todos') {
                matchesCategory = true;
            } else if (normCat === 'HEMATOLOGIA') {
                matchesCategory = isHematologia;
            } else if (normCat === 'QUIMICA CLINICA') {
                matchesCategory = isQuimica;
            } else if (normCat === 'UROANALISIS') {
                matchesCategory = isUro;
            } else if (normCat === 'MICROBIOLOGÍA' || normCat === 'MICROBIOLOGIA') {
                matchesCategory = isMicro;
            } else if (normCat === 'TOMA DE MUESTRA') {
                matchesCategory = isToma;
            } else if (normCat === 'PAPELERIA') {
                matchesCategory = isPapeleria;
            } else if (deferredCategory === 'Otros') {
                matchesCategory = !isHematologia && !isQuimica && !isUro && !isMicro && !isToma && !isPapeleria;
            }

            const searchWords = normSearch.split(' ').filter(w => w.length > 0);
            
            const matchesSearch = searchWords.every(word => {
                const inName = normalize(item.nombre).includes(word);
                const inPrefix = normalize(item.prefijo).includes(word);
                const inArea = itemArea.includes(word);
                const inUnits = unidades.some(u => u.catalogo_id === item.id && normalize(u.codigo_barras_unico).includes(word));
                const inSmartLookup = matchingIdsByBarcode.has(item.id);
                
                return inName || inPrefix || inArea || inUnits || inSmartLookup;
            });

            // Lógica de Filtros por Columna (NUEVO)
            const matchesColumnFilters = Object.entries(columnFilters).every(([key, selectedSet]) => {
                if (!selectedSet || selectedSet.size === 0) return true;
                const itemVal = item[key] || 'N/A';
                return selectedSet.has(itemVal);
            });
            
            return matchesCategory && matchesColumnFilters && (normSearch === '' || matchesSearch);
        });

        // Aplicar Ordenamiento
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [catalogo, deferredCategory, deferredSearch, unidades, matchingIdsByBarcode, sortConfig, columnFilters]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">inventory</span> Panorama General</h1>
                    <p>Resumen global de existencias y áreas con control de precios</p>
                </div>
                
                <FilterSection 
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    categories={categories}
                    expandAll={expandAll}
                    collapseAll={collapseAll}
                />
            </header>

            <main className={styles.mainContent}>
                {loading ? (
                    <div className={styles.loader}>Sincronizando inventario visual...</div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.denseTable}>
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}></th>
                                    <th className={styles.sortableHeader}>
                                        <div className={styles.headerCell}>
                                            <span>Cód.</span>
                                            <button onClick={() => setOpenDropdown(openDropdown === 'prefijo' ? null : 'prefijo')} className={columnFilters['prefijo'] ? styles.filterActive : ''}>
                                                <span className="material-symbols-rounded">filter_list</span>
                                            </button>
                                            {openDropdown === 'prefijo' && (
                                                <FilterDropdown columnKey="prefijo" label="Código" items={catalogo} activeFilters={columnFilters} applyFilter={applyColumnFilter} clearFilter={clearColumnFilter} requestSort={requestSort} sortConfig={sortConfig} onClose={() => setOpenDropdown(null)} />
                                            )}
                                        </div>
                                    </th>
                                    <th>Barras</th>
                                    <th className={styles.sortableHeader}>
                                        <div className={styles.headerCell}>
                                            <span>Clase</span>
                                            <button onClick={() => setOpenDropdown(openDropdown === 'clase' ? null : 'clase')} className={columnFilters['clase'] ? styles.filterActive : ''}>
                                                <span className="material-symbols-rounded">filter_list</span>
                                            </button>
                                            {openDropdown === 'clase' && (
                                                <FilterDropdown columnKey="clase" label="Clase" items={catalogo} activeFilters={columnFilters} applyFilter={applyColumnFilter} clearFilter={clearColumnFilter} requestSort={requestSort} sortConfig={sortConfig} onClose={() => setOpenDropdown(null)} />
                                            )}
                                        </div>
                                    </th>
                                    <th className={styles.sortableHeader}>
                                        <div className={styles.headerCell}>
                                            <span>Material</span>
                                        </div>
                                    </th>
                                    <th className={styles.sortableHeader}>
                                        <div className={styles.headerCell}>
                                            <span>Área</span>
                                            <button onClick={() => setOpenDropdown(openDropdown === 'area_tecnica' ? null : 'area_tecnica')} className={columnFilters['area_tecnica'] ? styles.filterActive : ''}>
                                                <span className="material-symbols-rounded">filter_list</span>
                                            </button>
                                            {openDropdown === 'area_tecnica' && (
                                                <FilterDropdown columnKey="area_tecnica" label="Área" items={catalogo} activeFilters={columnFilters} applyFilter={applyColumnFilter} clearFilter={clearColumnFilter} requestSort={requestSort} sortConfig={sortConfig} onClose={() => setOpenDropdown(null)} />
                                            )}
                                        </div>
                                    </th>
                                    <th className={styles.sortableHeader}>
                                        <div className={styles.headerCell}>
                                            <span>Marca</span>
                                            <button onClick={() => setOpenDropdown(openDropdown === 'marca' ? null : 'marca')} className={columnFilters['marca'] ? styles.filterActive : ''}>
                                                <span className="material-symbols-rounded">filter_list</span>
                                            </button>
                                            {openDropdown === 'marca' && (
                                                <FilterDropdown columnKey="marca" label="Marca" items={catalogo} activeFilters={columnFilters} applyFilter={applyColumnFilter} clearFilter={clearColumnFilter} requestSort={requestSort} sortConfig={sortConfig} onClose={() => setOpenDropdown(null)} />
                                            )}
                                        </div>
                                    </th>
                                    <th className={styles.textCenter}>Costo</th>
                                    <th className={styles.textCenter}>Precio</th>
                                    <th className={styles.textCenter}>Stock</th>
                                    <th className={styles.textCenter}>Min.</th>
                                    <th>Estatus</th>
                                    <th className={styles.textRight}>Unidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMaterials.map(item => (
                                    <MaterialRow 
                                        key={item.id}
                                        item={item}
                                        isExpanded={expandedRows.has(item.id)}
                                        toggleRow={toggleRow}
                                        stock={item.stock_real}
                                        isLow={item.stock_real <= item.stock_minimo && item.stock_real > 0}
                                        isCritical={item.stock_real === 0}
                                        loadedLots={loadedLots}
                                        openBarsModal={openBarsModal}
                                        isLoadingDetail={loadingRows.has(item.id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {showBarcodeModal && (
                <div className={styles.modalOverlay} onClick={() => setShowBarcodeModal(false)}>
                    <div className={styles.modalLarge} onClick={e => e.stopPropagation()} style={{maxWidth: '700px'}}>
                        <header className={styles.modalHeader}>
                            <h3>Lista de Códigos de Barras</h3>
                            <button className={styles.closeBtn} onClick={() => setShowBarcodeModal(false)}>&times;</button>
                        </header>
                        
                        <div className={styles.modalSubHeader}>
                            <div className={styles.modalTitleSub}>
                                <strong>{selectedLotName}</strong>
                                <span>Selecciona las etiquetas que deseas reimprimir ({selectedToPrint.size} seleccionadas)</span>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.secondaryBtn} onClick={selectAllNone}>
                                    {selectedToPrint.size === selectedLotUnits.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.barcodeList}>
                            {selectedLotUnits.map((u, i) => (
                                <div 
                                    key={u.id} 
                                    className={`${styles.barcodeItem} ${selectedToPrint.has(u.id) ? styles.barcodeItemSelected : ''}`}
                                    onClick={() => toggleSelection(u.id)}
                                >
                                    <div className={styles.selectionIndicator}>
                                        <span className="material-symbols-rounded">
                                            {selectedToPrint.has(u.id) ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                    </div>
                                    <Barcode value={u.codigo_barras_unico} height={20} />
                                </div>
                            ))}
                        </div>

                        <footer className={styles.modalFooter}>
                            <button className={styles.secondaryBtn} onClick={() => setShowBarcodeModal(false)}>Cerrar</button>
                            <button 
                                className={styles.primaryBtn} 
                                onClick={handlePrint}
                                disabled={selectedToPrint.size === 0}
                                style={{ opacity: selectedToPrint.size === 0 ? 0.5 : 1 }}
                            >
                                <span className="material-symbols-rounded">print</span> Imprimir Seleccionados ({selectedToPrint.size})
                            </button>
                        </footer>
                    </div>

                    {/* Contenedor Oculto Sugerido para Impresión (Solo se activa con @media print) */}
                    <div className={styles.printContainer}>
                        {selectedLotUnits.filter(u => selectedToPrint.has(u.id)).map(u => (
                            <div key={u.id} className={styles.printLabel}>
                                <Barcode value={u.codigo_barras_unico} height={40} width={2} />
                                <div className={styles.printMeta}>{selectedLotName}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
