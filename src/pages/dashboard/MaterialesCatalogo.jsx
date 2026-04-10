import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import styles from './MaterialesCatalogo.module.css';

export default function MaterialesCatalogo() {
    const [loading, setLoading] = useState(false);
    const [catalogo, setCatalogo] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [importData, setImportData] = useState([]);
    const [showImportPreview, setShowImportPreview] = useState(false);

    const initialForm = {
        nombre: '',
        prefijo: '',
        unidad: 'Pieza',
        stock_minimo: 10,
        categoria: 'Consumibles',
        ubicacion: 'Almacén General',
        marca: '',
        proveedor: '',
        costo_unitario: 0,
        presentacion: 'Pieza',
        requiere_frio: false,
        ean_maestro: '',
        area_tecnica: 'Admin/General',
        alerta_caducidad_dias: 30
    };

    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        fetchCatalogo();
    }, []);

    const fetchCatalogo = async () => {
        setLoading(true);
        const { data } = await supabase.from('materiales_catalogo').select('*').order('nombre', { ascending: true });
        if (data) setCatalogo(data);
        setLoading(false);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('materiales_catalogo').insert([form]);
            if (error) throw error;
            alert('Material registrado en el Expediente Maestro.');
            setShowModal(false);
            setForm(initialForm);
            fetchCatalogo();
        } catch (err) {
            alert('Error: ' + err.message);
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
                area_tecnica: row.Area || 'Admin/General',
                ean_maestro: row.EAN || row.Codigo_Maestro || ''
            }));

            const { error } = await supabase.from('materiales_catalogo').insert(itemsToInsert);
            if (error) throw error;
            alert(`Éxito: ${itemsToInsert.length} materiales importados al catálogo.`);
            setShowImportPreview(false);
            fetchCatalogo();
        } catch (err) {
            alert('Error en importación: ' + err.message);
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
                    <p>Expediente Maestro de Insumos y Reactivos</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.searchBox}>
                      <span className="material-symbols-rounded">search</span>
                      <input type="text" placeholder="Buscar por Nombre, Área o Prefijo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className={styles.secondaryBtn} onClick={() => setShowModal(true)}>
                        <span className="material-symbols-rounded">add_business</span> Registrar Material
                    </button>
                    <div className={styles.importBtn}>
                        <input type="file" id="bulk" accept=".csv, .xlsx" onChange={handleFileUpload} hidden />
                        <label htmlFor="bulk"><span className="material-symbols-rounded">upload_file</span> Carga Masiva</label>
                    </div>
                </div>
            </header>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalLarge}>
                        <div className={styles.modalHeader}>
                            <h3>Registrar Material</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleManualSubmit} className={styles.fullForm}>
                            <div className={styles.formGrid}>
                                {/* Sección 1: Info. Básica */}
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">description</span> Información</h4>
                                    <div className={styles.fieldGroup}>
                                        <label>Nombre del Material</label>
                                        <input required placeholder="Ej: Gasas Estériles" value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} />
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Prefijo</label>
                                            <input required placeholder="TR" maxLength="4" value={form.prefijo} onChange={e=>setForm({...form, prefijo: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Área Técnica</label>
                                            <select value={form.area_tecnica} onChange={e=>setForm({...form, area_tecnica: e.target.value})}>
                                                <option value="Admin/General">Admin/General</option>
                                                <option value="Hematología">Hematología</option>
                                                <option value="Uroanálisis">Uroanálisis</option>
                                                <option value="Química Clínica">Química Clínica</option>
                                                <option value="Microbiología">Microbiología</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>Marca / Fabricante</label>
                                        <input placeholder="Ej: Roche / BD" value={form.marca} onChange={e=>setForm({...form, marca: e.target.value})} />
                                    </div>
                                </section>

                                {/* Sección 2: Comercial */}
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">payments</span> Comercial</h4>
                                    <div className={styles.fieldGroup}>
                                        <label>Proveedor</label>
                                        <input placeholder="Nombre del Distribuidor" value={form.proveedor} onChange={e=>setForm({...form, proveedor: e.target.value})} />
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Costo Unitario ($)</label>
                                            <input type="number" step="0.01" placeholder="0.00" value={form.costo_unitario} onChange={e=>setForm({...form, costo_unitario: parseFloat(e.target.value)})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Categoría</label>
                                            <select value={form.categoria} onChange={e=>setForm({...form, categoria: e.target.value})}>
                                                <option value="Reactivos">Reactivos</option>
                                                <option value="Consumibles">Consumibles</option>
                                                <option value="Equipos">Equipos</option>
                                                <option value="Papelería/Otros">Papelería/Otros</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>Presentación</label>
                                        <input placeholder="Caja c/100, Frasco 500ml..." value={form.presentacion} onChange={e=>setForm({...form, presentacion: e.target.value})} />
                                    </div>
                                </section>

                                {/* Sección 3: Almacén */}
                                <section className={styles.formSection}>
                                    <h4><span className="material-symbols-rounded">warehouse</span> Logística</h4>
                                    <div className={styles.fieldGroup}>
                                        <label>Ubicación Física</label>
                                        <input placeholder="Estante / Repisa" value={form.ubicacion} onChange={e=>setForm({...form, ubicacion: e.target.value})} />
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.fieldGroup}>
                                            <label>Stock Mín.</label>
                                            <input type="number" value={form.stock_minimo} onChange={e=>setForm({...form, stock_minimo: parseInt(e.target.value)})} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label>Unidad Med.</label>
                                            <input placeholder="Pza, Caja, ml" value={form.unidad} onChange={e=>setForm({...form, unidad: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label>EAN / Cód. Maestro</label>
                                        <input placeholder="Código de barras de caja" value={form.ean_maestro} onChange={e=>setForm({...form, ean_maestro: e.target.value})} />
                                    </div>
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" checked={form.requiere_frio} onChange={e=>setForm({...form, requiere_frio: e.target.checked})} />
                                        <span>Requiere Cadena de Frío (2-8°C)</span>
                                    </label>
                                </section>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={()=>setShowModal(false)}>Cerrar</button>
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>Guardar Material</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImportPreview && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalLarge}>
                        <h3>Vista Previa: Expediente Maestro</h3>
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
                                    <th>Área Técnica</th>
                                    <th>Proveedor</th>
                                    <th className={styles.textCenter}>Costo Unit.</th>
                                    <th>Ubicación</th>
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
                                        <td><span className={styles.categoryTag}>{item.area_tecnica || 'Admin'}</span></td>
                                        <td>{item.proveedor || 'No defin.'}</td>
                                        <td className={styles.textCenter}>${parseFloat(item.costo_unitario).toFixed(2)}</td>
                                        <td><div className={styles.locationBadge}><span className="material-symbols-rounded">location_on</span> {item.ubicacion}</div></td>
                                        <td className={styles.textCenter}>
                                            {item.requiere_frio && <span className="material-symbols-rounded" style={{color: '#3b82f6', fontSize: '18px'}}>ac_unit</span>}
                                        </td>
                                        <td className={styles.textRight}>{item.unidad}</td>
                                        <td className={styles.textCenter}><button className={styles.editBtn}><span className="material-symbols-rounded">edit</span></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
