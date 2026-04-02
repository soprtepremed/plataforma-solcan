import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { supabase } from '../../lib/supabaseClient';
import styles from './ImpresionEtiquetas.module.css';

export default function ImpresionEtiquetas() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(true);

    const unitIdsStr = searchParams.get('ids');

    useEffect(() => {
        const fetchUnidades = async () => {
            if (!unitIdsStr) {
                setLoading(false);
                return;
            }

            const ids = unitIdsStr.split(',');
            const { data, error } = await supabase
                .from('materiales_unidades')
                .select(`
                    *,
                    materiales_catalogo(nombre, area_tecnica)
                `)
                .in('id', ids);

            if (!error) setUnidades(data || []);
            setLoading(false);
        };

        fetchUnidades();
    }, [unitIdsStr]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Generando etiquetas de alta precisión...</p>
        </div>
    );

    if (unidades.length === 0) return (
        <div className={styles.errorWrapper}>
            <span className="material-symbols-rounded">error</span>
            <h3>No hay etiquetas que mostrar</h3>
            <p>Selecciona materiales desde el inventario para imprimir.</p>
            <button onClick={() => navigate(-1)} className={styles.backBtn}>Regresar</button>
        </div>
    );

    return (
        <div className={styles.printWrapper}>
            <div className={styles.toolBar}>
                <div className={styles.toolInfo}>
                    <button onClick={() => navigate(-1)} className={styles.iconBtn}>
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div>
                        <h1>Impresión de Etiquetas</h1>
                        <p>{unidades.length} {unidades.length === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}</p>
                    </div>
                </div>

                <div className={styles.actionGroup}>
                    <div className={styles.labelNotice}>
                         <span>Configuración recomendada:</span>
                         <strong>Térmica 50mm x 25mm</strong>
                    </div>
                    <button onClick={handlePrint} className={styles.printBtn}>
                        <span className="material-symbols-rounded">print</span>
                        Imprimir Ahora
                    </button>
                </div>
            </div>

            <div className={styles.labelsPage}>
                {unidades.map((unit) => (
                    <div key={unit.id} className={styles.thermalLabel}>
                        <div className={styles.labelGrid}>
                            {/* Header Section */}
                            <div className={styles.headerRow}>
                                <div className={styles.brandContainer}>
                                    <span className={styles.brandName}>SOLCAN</span>
                                    <span className={styles.brandSub}>LABORATORIO</span>
                                </div>
                                <div className={styles.areaBadge}>
                                    {unit.materiales_catalogo?.area_tecnica?.toUpperCase() || 'GRAL'}
                                </div>
                            </div>

                            {/* Barcode Section */}
                            <div className={styles.barcodeSection}>
                                <Barcode 
                                    value={unit.codigo_barras_unico} 
                                    width={1.4} 
                                    height={35} 
                                    fontSize={0} // Hide text below barcode to handle it manually
                                    margin={0}
                                    background="transparent"
                                />
                            </div>

                            {/* Info Section */}
                            <div className={styles.infoSection}>
                                <div className={styles.primaryId}>
                                    ID: {unit.codigo_barras_unico}
                                </div>
                                <div className={styles.materialName}>
                                    {unit.materiales_catalogo?.nombre}
                                </div>
                                
                                <div className={styles.footerRow}>
                                    <div className={styles.footerCol}>
                                        <span className={styles.labelLite}>ENTRADA:</span>
                                        <span className={styles.valLite}>{new Date(unit.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                    </div>
                                    <div className={styles.footerCol}>
                                        <span className={styles.labelLite}>CAD:</span>
                                        <span className={styles.valLite}>{unit.caducidad || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
