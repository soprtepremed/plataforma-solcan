import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './InventarioGeneral.module.css';
import Barcode from '../../components/common/Barcode';

export default function InventarioGeneral() {
    const [loading, setLoading] = useState(true);
    const [catalogo, setCatalogo] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [viewMode, setViewMode] = useState('panorama');
    
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [selectedLotUnits, setSelectedLotUnits] = useState([]);
    const [selectedLotName, setSelectedLotName] = useState('');

    const categories = ['Todos', 'Reactivos', 'Consumibles', 'Equipos', 'Papelería/Otros'];

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const { data: catData } = await supabase
                .from('materiales_catalogo')
                .select('*')
                .order('nombre', { ascending: true });
            
            const { data: unitData } = await supabase
                .from('materiales_unidades')
                .select(`
                    *,
                    materiales_catalogo (
                        nombre,
                        prefijo,
                        area_tecnica,
                        categoria,
                        unidad,
                        ubicacion
                    )
                `)
                .eq('estatus', 'Almacenado')
                .order('created_at', { ascending: false });

            setCatalogo(catData || []);
            setUnidades(unitData || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    const expandAll = () => setExpandedRows(new Set(filteredMaterials.map(m => m.id)));
    const collapseAll = () => setExpandedRows(new Set());

    const openBarsModal = (catId, lotNum) => {
        const lotUnits = unidades.filter(u => u.catalogo_id === catId && (u.lote_numero === lotNum || (!u.lote_numero && lotNum === 'SIN LOTE')));
        const mat = catalogo.find(c => c.id === catId);
        setSelectedLotUnits(lotUnits);
        setSelectedLotName(`${mat?.nombre} - Lote: ${lotNum}`);
        setShowBarcodeModal(true);
    };

    const filteredMaterials = catalogo.filter(item => {
        const matchesCategory = activeCategory === 'Todos' || item.categoria === activeCategory;
        const matchesText = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.prefijo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.area_tecnica?.toLowerCase().includes(searchTerm.toLowerCase());
        const hasMatchingBarcode = unidades.some(u => 
            u.catalogo_id === item.id && 
            u.codigo_barras_unico.toLowerCase() === searchTerm.toLowerCase()
        );
        return matchesCategory && (matchesText || hasMatchingBarcode);
    });

    const filteredUnits = unidades.filter(u => {
        const item = u.materiales_catalogo;
        const matchesCategory = activeCategory === 'Todos' || item?.categoria === activeCategory;
        const matchesSearch = u.codigo_barras_unico.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              u.lote_numero?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1><span className="material-symbols-rounded">inventory</span> {viewMode === 'panorama' ? 'Panorama General' : 'Vista por Código'}</h1>
                    <p>{viewMode === 'panorama' ? 'Resumen global de existencias y áreas' : 'Control visual con códigos de barras literales'}</p>
                </div>
                
                <div className={styles.controlsRow}>
                  <div className={styles.topActions}>
                    <div className={styles.viewToggle}>
                        <button className={viewMode === 'panorama' ? styles.activeToggle : ''} onClick={() => setViewMode('panorama')}>Vista Panorama</button>
                        <button className={viewMode === 'individual' ? styles.activeToggle : ''} onClick={() => setViewMode('individual')}>Vista por Código</button>
                    </div>

                    <div className={styles.filters}>
                        <div className={styles.categoryPills}>
                            {categories.map(cat => (
                                <button key={cat} className={`${styles.pill} ${activeCategory === cat ? styles.pillActive : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
                            ))}
                        </div>
                        <div className={styles.searchBar}>
                            <span className="material-symbols-rounded">barcode_scanner</span>
                            <input type="text" placeholder={viewMode === 'panorama' ? "Gral / Escáner..." : "Escanee Cód. de Barras..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
                        </div>
                    </div>
                  </div>

                  {viewMode === 'panorama' && (
                    <div className={styles.globalActions}>
                        <button className={styles.actionBtn} onClick={expandAll}><span className="material-symbols-rounded">expand_all</span></button>
                        <button className={styles.actionBtn} onClick={collapseAll}><span className="material-symbols-rounded">collapse_all</span></button>
                    </div>
                  )}
                </div>
            </header>

            <main className={styles.mainContent}>
                {loading ? (
                    <div className={styles.loader}>Sincronizando inventario visual...</div>
                ) : (
                    <div className={styles.tableWrapper}>
                        {viewMode === 'panorama' ? (
                            <table className={styles.denseTable}>
                                <thead>
                                    <tr>
                                        <th style={{width: '40px'}}></th>
                                        <th>Cód.</th>
                                        <th>Material / Área</th>
                                        <th>Ubicación</th>
                                        <th className={styles.textCenter}>Stock</th>
                                        <th className={styles.textCenter}>Min.</th>
                                        <th>Última Entrada</th>
                                        <th>Estatus</th>
                                        <th className={styles.textRight}>Unidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMaterials.map(item => {
                                        const myUnits = unidades.filter(u => u.catalogo_id === item.id);
                                        const stock = myUnits.length;
                                        const isLow = stock <= item.stock_minimo && stock > 0;
                                        const isCritical = stock === 0;
                                        const isExpanded = expandedRows.has(item.id);
                                        const lastEntry = myUnits.length > 0 ? new Date(Math.max(...myUnits.map(u => new Date(u.created_at)))) : null;
                                        const lotsGrouped = myUnits.reduce((acc, curr) => {
                                            const key = curr.lote_numero || 'SIN LOTE';
                                            if (!acc[key]) acc[key] = { count: 0, caducidad: curr.caducidad };
                                            acc[key].count++;
                                            return acc;
                                        }, {});

                                        return (
                                            <React.Fragment key={item.id}>
                                                <tr className={`${isCritical ? styles.rowCritical : isLow ? styles.rowLow : ''} ${styles.parentRow}`} onClick={() => toggleRow(item.id)}>
                                                    <td className={styles.textCenter}><span className={`material-symbols-rounded ${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>chevron_right</span></td>
                                                    <td className={styles.codeCell}>{item.prefijo}</td>
                                                    <td className={styles.nameCell}>
                                                        <strong>{item.nombre}</strong>
                                                        <div className={styles.subInfo}>{item.area_tecnica || 'Admin/General'} • {item.categoria}</div>
                                                    </td>
                                                    <td><div className={styles.locationBadge}><span className="material-symbols-rounded">location_on</span> {item.ubicacion}</div></td>
                                                    <td className={styles.stockCell}>{stock}</td>
                                                    <td className={styles.textCenter}>{item.stock_minimo}</td>
                                                    <td className={styles.dateCell}>{lastEntry ? lastEntry.toLocaleDateString() : '---'}</td>
                                                    <td>{isCritical ? <span className={`${styles.statusLabel} ${styles.statusCritical}`}>AGOTADO</span> : isLow ? <span className={`${styles.statusLabel} ${styles.statusLow}`}>BAJO STOCK</span> : <span className={`${styles.statusLabel} ${styles.statusOk}`}>ÓPTIMO</span>}</td>
                                                    <td className={styles.textRight}>{item.unidad}</td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className={styles.detailRow}>
                                                        <td colSpan="9">
                                                            <div className={styles.lotDetailContainer}>
                                                                <table className={styles.lotTable}>
                                                                    <thead>
                                                                        <tr><th>Lote</th><th>Caducidad</th><th>Existencia</th><th>Estatus</th><th className={styles.textCenter}>Barras</th></tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {Object.entries(lotsGrouped).map(([lote, info]) => (
                                                                            <tr key={lote}>
                                                                                <td><strong>{lote}</strong></td>
                                                                                <td>{info.caducidad ? new Date(info.caducidad).toLocaleDateString() : 'N/A'}</td>
                                                                                <td>{info.count} {item.unidad}(s)</td>
                                                                                <td>{Math.floor((new Date(info.caducidad) - new Date()) / (1000 * 60 * 60 * 24)) < 0 ? <span className={styles.expired}>CADUCADO</span> : <span className={styles.fresh}>VIGENTE</span>}</td>
                                                                                <td className={styles.textCenter}><button className={styles.barcodeBtn} onClick={(e) => { e.stopPropagation(); openBarsModal(item.id, lote); }}><span className="material-symbols-rounded">view_week</span></button></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <table className={styles.denseTable}>
                                <thead>
                                    <tr>
                                        <th style={{width: '180px'}}>CÓDIGO DE BARRAS</th>
                                        <th>Material</th>
                                        <th>Lote</th>
                                        <th>Caducidad</th>
                                        <th>Área</th>
                                        <th>Ubicación</th>
                                        <th>Fecha Ingreso</th>
                                        <th className={styles.textRight}>Unidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUnits.length === 0 ? (
                                        <tr><td colSpan="8" className={styles.emptyCell}>No se encontraron unidades físicas.</td></tr>
                                    ) : (
                                        filteredUnits.map(unit => (
                                            <tr key={unit.id} className={styles.unitRow}>
                                                <td className={styles.barcodeLiteralCell}>
                                                  <Barcode value={unit.codigo_barras_unico} />
                                                </td>
                                                <td className={styles.nameCell}>
                                                  <strong>{unit.materiales_catalogo?.nombre}</strong>
                                                  <div className={styles.subInfo}>{unit.materiales_catalogo?.prefijo}</div>
                                                </td>
                                                <td><strong>{unit.lote_numero || 'SIN LOTE'}</strong></td>
                                                <td>{unit.caducidad ? new Date(unit.caducidad).toLocaleDateString() : 'N/A'}</td>
                                                <td><span className={styles.categoryTag}>{unit.materiales_catalogo?.area_tecnica || 'Gral'}</span></td>
                                                <td><div className={styles.locationBadge}><span className="material-symbols-rounded">location_on</span> {unit.materiales_catalogo?.ubicacion}</div></td>
                                                <td className={styles.dateCell}>{new Date(unit.created_at).toLocaleDateString()}</td>
                                                <td className={styles.textRight}>{unit.materiales_catalogo?.unidad}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>

            {showBarcodeModal && (
                <div className={styles.modalOverlay} onClick={() => setShowBarcodeModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <header className={styles.modalHeader}><h3>Lista de Códigos</h3><button className={styles.closeBtn} onClick={() => setShowBarcodeModal(false)}>&times;</button></header>
                        <p className={styles.modalTitleSub}>{selectedLotName}</p>
                        <div className={styles.barcodeList}>
                            {selectedLotUnits.map((u, i) => (
                                <div key={i} className={styles.barcodeItem}>
                                    <Barcode value={u.codigo_barras_unico} height={20} />
                                </div>
                            ))}
                        </div>
                        <footer className={styles.modalFooter}><button className={styles.primaryBtn} onClick={() => setShowBarcodeModal(false)}>Cerrar</button></footer>
                    </div>
                </div>
            )}
        </div>
    );
}
