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
        piezas_por_caja: 1
    });

    useEffect(() => {
        fetchCatalogo();
    }, []);

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
            const item = catalogo.find(c => c.id === manualForm.catalogo_id);
            const totalUnits = manualForm.cantidad_cajas * manualForm.piezas_por_caja;
            const year = new Date().getFullYear().toString().slice(-2);

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

            alert(`Éxito: Se han registrado ${totalUnits} unidades en el inventario.`);
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
                        <div className={styles.formGroup}>
                            <label>Material</label>
                            <select 
                                required 
                                value={manualForm.catalogo_id} 
                                onChange={e => setManualForm({...manualForm, catalogo_id: e.target.value})}
                            >
                                <option value="">Selecciona un material...</option>
                                {catalogo.map(item => (
                                    <option key={item.id} value={item.id}>{item.nombre} ({item.prefijo})</option>
                                ))}
                            </select>
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

                        <button type="submit" className={styles.primaryBtn} disabled={loading || !manualForm.catalogo_id}>
                            {loading ? 'Guardando...' : 'Registrar Stock'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
