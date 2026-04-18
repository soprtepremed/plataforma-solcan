import React, { forwardRef } from 'react';
import styles from './RequisicionDocument.module.css';

const RequisicionDocument = forwardRef(({ requisicion, items, area, solicitante }, ref) => {
    const today = new Date().toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    return (
        <div className={styles.page} ref={ref}>
            {/* ENCABEZADO OFICIAL FO-RM-001 */}
            <header className={styles.header}>
                <div className={styles.logoBox}>
                    <img src="/favicon.png" alt="Solcan Logo" />
                    <div>
                        <span className={styles.brand}>Solcan Lab</span>
                        <span className={styles.tagline}>Cuida tu salud</span>
                    </div>
                </div>
                <div className={styles.titleBox}>
                    <h2>REQUISICION DE RECURSOS MATERIALES E INFRAESTRUCTURA</h2>
                </div>
                <div className={styles.codeBox}>
                    <div className={styles.codeItem}><strong>FO-RM-001</strong></div>
                    <div className={styles.codeItem}>Versión: 03</div>
                    <div className={styles.codeItem}>Emisión: 30/04/16</div>
                </div>
            </header>

            {/* INFO GENERAL */}
            <section className={styles.infoSection}>
                <div className={styles.infoRow}>
                    <div className={styles.infoField}><strong>ÁREA:</strong> <span>{area?.toUpperCase() || '---'}</span></div>
                    <div className={styles.infoField}><strong>No. Req:</strong> <span className={styles.folioNo}>{requisicion?.folio || '---'}</span></div>
                </div>
                <div className={styles.infoRow}>
                    <div className={styles.infoField}><strong>Fecha y Hora de la Req:</strong> <span>{today}</span></div>
                    <div className={styles.infoField}><strong>Fecha y Hora de Recibida:</strong> <span className={styles.placeholder}>____________________</span></div>
                </div>
            </section>

            {/* TABLA DE MATERIALES */}
            <table className={styles.mainTable}>
                <thead>
                    <tr>
                        <th style={{width: '12%'}}>CODIGO</th>
                        <th style={{width: '40%'}}>DESCRIPCION</th>
                        <th style={{width: '10%'}}>EXISTENCIA AREA</th>
                        <th style={{width: '10%'}}>CANT. A PEDIR</th>
                        <th style={{width: '13%'}}>FECHA REQUERIDA</th>
                        <th>USO EXCLUSIVO ALMACÉN</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className={styles.textCenter}>{item.prefijo || '---'}</td>
                            <td>{item.nombre}</td>
                            <td className={styles.textCenter}>{item.existencia || 0}</td>
                            <td className={styles.textCenter} style={{fontWeight: '900'}}>{item.cantidad}</td>
                            <td className={styles.textCenter} style={{fontSize: '0.8rem'}}>{item.fechaRequerida || '---'}</td>
                            <td></td>
                        </tr>
                    ))}
                    {/* Rellenar espacios vacíos para mantener la estética del formato físico */}
                    {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} className={styles.emptyRow}>
                            <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* OBSERVACIONES */}
            <section className={styles.obsSection}>
                <strong>OBSERVACIONES:</strong>
                <div className={styles.obsBox}></div>
            </section>

            {/* FIRMERO FOOTER */}
            <footer className={styles.footer}>
                <div className={styles.signGrid}>
                    <div className={styles.signBox}>
                        <div className={styles.signatureWrapper}>
                            {requisicion?.firma_solicitante && (
                                <img src={requisicion.firma_solicitante} alt="Firma" className={styles.signatureImg} />
                            )}
                            <div className={styles.signLine}></div>
                        </div>
                        <span className={styles.signLabel}>SOLICITÓ</span>
                        <span className={styles.userName}>{requisicion?.elaborado_por_name || solicitante?.name || '---'}</span>
                    </div>
                    <div className={styles.signBox}>
                        <div className={styles.signLine}></div>
                        <span className={styles.signLabel}>FIRMA DE AUTORIZACIÓN</span>
                    </div>
                    <div className={styles.signBox}>
                        <div className={styles.signatureWrapper}>
                            {requisicion?.firma_almacen && (
                                <img src={requisicion.firma_almacen} alt="Firma Almacén" className={styles.signatureImg} />
                            )}
                            <div className={styles.signLine}></div>
                        </div>
                        <span className={styles.signLabel}>ENTREGÓ (ALMACÉN)</span>
                    </div>
                    <div className={styles.signBox}>
                        <div className={styles.signLine}></div>
                        <span className={styles.signLabel}>RECIBIDO DE CONFORMIDAD</span>
                    </div>
                </div>
                <div className={styles.exclusive}>Exclusivo de Uso Interno</div>
            </footer>
        </div>
    );
});

export default RequisicionDocument;
