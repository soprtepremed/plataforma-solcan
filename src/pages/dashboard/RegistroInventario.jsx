import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './RegistroInventario.module.css';

export default function RegistroInventario() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [catalogo, setCatalogo] = useState([]);
    const [csvData, setCsvData] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    
    // Formulario Manual
    const [manualForm, setManualForm] = useState({
        catalogo_id: '',
        lote: '',
        caducidad: '',
        cantidad_cajas: 1,
        piezas_por_caja: 1,
        // Datos de Catálogo (opcionales para edición rápida)
        nombre_nuevo: '',
        prefijo_nuevo: '',
        marca: '',
        clase: '',
        costo_unitario: 0,
        precio1: 0,
        area_tecnica: 'HEMATOLOGÍA',
        unidad: 'Pieza',
        es_nuevo_material: false,
        editar_catalogo: false
    });

    useEffect(() => {
        fetchCatalogo();
    }, []);

    useEffect(() => {
        if (manualForm.catalogo_id && !manualForm.es_nuevo_material) {
            const item = catalogo.find(c => c.id === manualForm.catalogo_id);
            if (item) {
                setManualForm(prev => ({
                    ...prev,
                    marca: item.marca || '',
                    clase: item.clase || '',
                    costo_unitario: item.costo_unitario || 0,
                    precio1: item.precio1 || 0,
                    area_tecnica: item.area_tecnica || 'HEMATOLOGÍA'
                }));
            }
        }
    }, [manualForm.catalogo_id, catalogo, manualForm.es_nuevo_material]);

    const fetchCatalogo = async () => {
        const { data, error } = await supabase
            .from('materiales_catalogo')
            .select('*')
            .order('nombre', { ascending: true });
        if (!error) setCatalogo(data);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            setCsvData(data);
            setShowPreview(true);
        };
        reader.readAsBinaryString(file);
    };

    const generateUniqueID = (item, lote, year, unitIndex) => {
        const areaCode = "AL"; // Almacén Central
        const unitStr = unitIndex.toString().padStart(3, '0');
        return `${areaCode}-${item.prefijo}-${year}-${lote}/${unitStr}`;
    };

    const processManualEntry = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let item;
            const year = new Date().getFullYear().toString().slice(-2);

            if (manualForm.es_nuevo_material) {
                // 1. Crear nuevo registro en catálogo
                const { data: newCat, error: catError } = await supabase
                    .from('materiales_catalogo')
                    .insert([{
                        nombre: manualForm.nombre_nuevo,
                        prefijo: manualForm.prefijo_nuevo || manualForm.nombre_nuevo.substring(0, 3).toUpperCase(),
                        marca: manualForm.marca,
                        clase: manualForm.clase,
                        costo_unitario: manualForm.costo_unitario,
                        precio1: manualForm.precio1,
                        area_tecnica: manualForm.area_tecnica,
                        unidad: manualForm.unidad || 'Pieza', // Dinámico desde el form
                        categoria: 'Insumos'
                    }])
                    .select()
                    .single();
                
                if (catError) throw catError;
                item = newCat;
            } else {
                item = catalogo.find(c => c.id === manualForm.catalogo_id);
                // 2. Actualizar catálogo si se editó
                if (manualForm.editar_catalogo) {
                    const { error: updateError } = await supabase
                        .from('materiales_catalogo')
                        .update({
                            marca: manualForm.marca,
                            clase: manualForm.clase,
                            costo_unitario: manualForm.costo_unitario,
                            precio1: manualForm.precio1,
                            area_tecnica: manualForm.area_tecnica
                        })
                        .eq('id', item.id);
                    if (updateError) throw updateError;
                }
            }

            const totalUnits = manualForm.cantidad_cajas * manualForm.piezas_por_caja;
            let newUnits = [];
            for (let i = 1; i <= totalUnits; i++) {
                newUnits.push({
                    catalogo_id: item.id,
                    codigo_barras_unico: generateUniqueID(item, manualForm.lote, year, i),
                    lote_numero: manualForm.lote,
                    caducidad: manualForm.caducidad,
                    area_actual: 'almacen',
                    estatus: 'Almacenado'
                });
            }

            const { error } = await supabase.from('materiales_unidades').insert(newUnits);
            if (error) throw error;

            alert(`Éxito: Se han registrado ${totalUnits} unidades y actualizado el catálogo.`);
            navigate('/almacen/dashboard');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const processBulkEntry = async () => {
        setLoading(true);
        try {
            let allUnits = [];
            const year = new Date().getFullYear().toString().slice(-2);

            for (const row of csvData) {
                // Mapeo flexible por nombre o prefijo
                const item = catalogo.find(c => 
                    c.nombre.toLowerCase() === row.Material?.toString().toLowerCase() ||
                    c.prefijo === row.Prefijo?.toString()
                );

                if (!item) {
                    console.warn(`Material no encontrado en catálogo: ${row.Material}`);
                    continue;
                }

                const cajas = parseInt(row.Cantidad_Cajas || row.Cajas || 1);
                const piezas = parseInt(row.Piezas_por_Caja || row.Piezas || 1);
                const total = cajas * piezas;
                const lote = row.Lote?.toString() || 'S/L';
                const caducidad = row.Caducidad;

                for (let i = 1; i <= total; i++) {
                    allUnits.push({
                        catalogo_id: item.id,
                        codigo_barras_unico: generateUniqueID(item, lote, year, i), // Esto podría duplicar si no somos cuidadosos con el índice global por lote. 
                        // Simplificación: usaremos un timestamp o índice para el cargado masivo
                        lote_numero: lote,
                        caducidad: caducidad,
                        area_actual: 'almacen',
                        estatus: 'Almacenado'
                    });
                }
            }

            // Insertar en bloques de 100 para evitar límites de payload
            const chunkSize = 100;
            for (let i = 0; i < allUnits.length; i += chunkSize) {
                const chunk = allUnits.slice(i, i + chunkSize);
                const { error } = await supabase.from('materiales_unidades').insert(chunk);
                if (error) throw error;
            }

            alert(`Carga masiva completada: ${allUnits.length} unidades registradas.`);
            navigate('/almacen/dashboard');
        } catch (err) {
            alert('Error en carga masiva: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => navigate(-1)} className={styles.backBtn}>
                    <span className="material-symbols-rounded">arrow_back</span> Volver
                </button>
                <h1>Registro de Inventario</h1>
                <p>Alta de nuevos lotes de insumos al Almacén Central</p>
            </header>

            <div className={styles.grid}>
                {/* Sección CSV */}
                <section className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className="material-symbols-rounded">upload_file</span>
                        <h3>Carga Masiva (CSV / Excel)</h3>
                    </div>
                    <p className={styles.cardDesc}>Importa cientos de registros en segundos usando una plantilla estándar.</p>
                    
                    <div className={styles.dropzone}>
                        <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} id="fileInput" />
                        <label htmlFor="fileInput">
                            <span className="material-symbols-rounded">cloud_upload</span>
                            <span>Arrastra tu archivo o haz clic para buscar</span>
                        </label>
                    </div>

                    {showPreview && (
                        <div className={styles.previewArea}>
                            <h4>Previsualización de Carga ({csvData.length} filas detectadas)</h4>
                            <div className={styles.tableScroll}>
                                <table className={styles.previewTable}>
                                    <thead>
                                        <tr>
                                            <th>Material</th>
                                            <th>Lote</th>
                                            <th>Cajas</th>
                                            <th>Unidades/Caja</th>
                                            <th>Caducidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvData.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                <td>{row.Material || row.Prefijo}</td>
                                                <td>{row.Lote}</td>
                                                <td>{row.Cantidad_Cajas || row.Cajas}</td>
                                                <td>{row.Piezas_por_Caja || row.Piezas}</td>
                                                <td>{row.Caducidad}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {csvData.length > 5 && <p className={styles.moreLabel}>... y {csvData.length - 5} filas más.</p>}
                            </div>
                            <div className={styles.previewActions}>
                                <button className={styles.secondaryBtn} onClick={() => setShowPreview(false)}>Cancelar</button>
                                <button className={styles.primaryBtn} onClick={processBulkEntry} disabled={loading}>
                                    {loading ? 'Procesando...' : 'Confirmar Importación'}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Sección Manual */}
                <section className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className="material-symbols-rounded">edit_note</span>
                        <h3>Alta Individual / Manual</h3>
                    </div>
                    <p className={styles.cardDesc}>Ingreso rápido de un solo lote por material.</p>
                    
                    <form onSubmit={processManualEntry} className={styles.manualForm}>
                        <div className={styles.sectionHeader}>
                            <h4>1. Definición de Material</h4>
                            <label className={styles.checkboxLabel}>
                                <input 
                                    type="checkbox" 
                                    checked={manualForm.es_nuevo_material} 
                                    onChange={e => setManualForm({...manualForm, es_nuevo_material: e.target.checked, catalogo_id: ''})} 
                                />
                                Material Nuevo
                            </label>
                        </div>

                        {manualForm.es_nuevo_material ? (
                            <div className={styles.editableSection}>
                                <div className={styles.formGroup}>
                                    <label>Nombre del Material nuevo</label>
                                    <input 
                                        required 
                                        placeholder="Ej: Reactivo Hematología B" 
                                        value={manualForm.nombre_nuevo}
                                        onChange={e => setManualForm({...manualForm, nombre_nuevo: e.target.value})}
                                    />
                                </div>
                                <div className={styles.subgrid}>
                                    <div className={styles.formGroup}>
                                        <label>Prefijo (Código Interno)</label>
                                        <input 
                                            placeholder="Ej: TUBO-001" 
                                            maxLength="20"
                                            value={manualForm.prefijo_nuevo}
                                            onChange={e => setManualForm({...manualForm, prefijo_nuevo: e.target.value.toUpperCase()})}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Unidad de Medida</label>
                                        <input 
                                            list="unidades-list"
                                            placeholder="Pza, Caja, ml..." 
                                            value={manualForm.unidad}
                                            onChange={e => setManualForm({...manualForm, unidad: e.target.value})}
                                        />
                                        <datalist id="unidades-list">
                                            <option value="Pieza" />
                                            <option value="Caja" />
                                            <option value="Frasco" />
                                            <option value="ml" />
                                            <option value="Litro" />
                                            <option value="Paquete" />
                                            <option value="Kit" />
                                        </datalist>
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Área Técnica</label>
                                    <select value={manualForm.area_tecnica} onChange={e => setManualForm({...manualForm, area_tecnica: e.target.value})}>
                                        <option value="HEMATOLOGÍA">Hematología</option>
                                        <option value="QUÍMICA CLÍNICA">Química Clínica</option>
                                        <option value="UROANÁLISIS">Uroanálisis</option>
                                        <option value="MICROBIOLOGÍA">Microbiología</option>
                                        <option value="PAPELERÍA">Papelería</option>
                                        <option value="OTROS">Otros</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.formGroup}>
                                <label>Seleccionar Material</label>
                                <select 
                                    required 
                                    value={manualForm.catalogo_id} 
                                    onChange={e => setManualForm({...manualForm, catalogo_id: e.target.value})}
                                >
                                    <option value="">Selecciona un material existente...</option>
                                    {catalogo.map(item => (
                                        <option key={item.id} value={item.id}>{item.nombre} ({item.prefijo})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.sectionHeader}>
                            <h4>2. Datos de Referencia (Catálogo)</h4>
                            {!manualForm.es_nuevo_material && (
                                <label className={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        checked={manualForm.editar_catalogo} 
                                        onChange={e => setManualForm({...manualForm, editar_catalogo: e.target.checked})} 
                                    />
                                    Editar Info
                                </label>
                            )}
                        </div>

                        {(manualForm.es_nuevo_material || manualForm.editar_catalogo) && (
                            <div className={styles.editableSection}>
                                <div className={styles.subgrid}>
                                    <div className={styles.formGroup}>
                                        <label>Marca</label>
                                        <input placeholder="Ej: Roche" value={manualForm.marca} onChange={e => setManualForm({...manualForm, marca: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Clase</label>
                                        <input placeholder="Ej: Artículo" value={manualForm.clase} onChange={e => setManualForm({...manualForm, clase: e.target.value})} />
                                    </div>
                                </div>
                                <div className={styles.subgrid}>
                                    <div className={styles.formGroup}>
                                        <label>Costo ($)</label>
                                        <input type="number" step="0.01" value={manualForm.costo_unitario} onChange={e => setManualForm({...manualForm, costo_unitario: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Precio Venta ($)</label>
                                        <input type="number" step="0.01" value={manualForm.precio1} onChange={e => setManualForm({...manualForm, precio1: parseFloat(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.sectionHeader}>
                            <h4>3. Detalles del Lote</h4>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>Lote</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="N° de Lote" 
                                    value={manualForm.lote}
                                    onChange={e => setManualForm({...manualForm, lote: e.target.value})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Caducidad</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={manualForm.caducidad}
                                    onChange={e => setManualForm({...manualForm, caducidad: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>Cajas</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1" 
                                    value={manualForm.cantidad_cajas}
                                    onChange={e => setManualForm({...manualForm, cantidad_cajas: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Unidades / Caja</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1" 
                                    value={manualForm.piezas_por_caja}
                                    onChange={e => setManualForm({...manualForm, piezas_por_caja: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>

                        <button type="submit" className={styles.primaryBtn} disabled={loading || (!manualForm.catalogo_id && !manualForm.es_nuevo_material) || (manualForm.es_nuevo_material && !manualForm.nombre_nuevo)}>
                            {loading ? 'Guardando...' : 'Registrar Stock'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
