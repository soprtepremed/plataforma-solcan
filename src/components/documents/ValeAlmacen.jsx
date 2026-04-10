import React from 'react';
import styles from './ValeAlmacen.module.css';

const ValeAlmacen = React.forwardRef(({ vale, items, solicitante, sucursalStock = {} }, ref) => {
  const today = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Rellenar hasta 5 filas para mantener la estética del formato físico si hay pocos items
  const displayItems = [...items];
  while (displayItems.length < 5) {
    displayItems.push({ id: `empty-${displayItems.length}`, empty: true });
  }

  const renderDiagonal = () => (
    <div className={styles.diagonalWrapper}>
      <div className={styles.diagonalLine}></div>
    </div>
  );

  return (
    <div className={styles.printContainer} ref={ref}>
      <header className={styles.documentHeader}>
        <div className={styles.logoArea}>
          <img src="/solcan-logo-mark.jpg" alt="Solcan Lab" className={styles.logoImg} />
          <div style={{fontSize: '0.6rem', textAlign: 'center', fontWeight: 700}}>
            SOLCAN LAB <br/> <span style={{fontWeight: 400}}>Cuida tu salud</span>
          </div>
        </div>
        <div className={styles.titleArea}>
          <h1>VALE DE ALMACÉN</h1>
        </div>
        <div className={styles.docInfo}>
          <div><strong>FO-RM-004</strong></div>
          <div>Versión: 05</div>
          <div>Emisión: 15/11/19</div>
        </div>
      </header>

      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <label>FECHA:</label>
          <span>{vale?.created_at ? new Date(vale.created_at).toLocaleDateString() : today}</span>
        </div>
        <div className={styles.metaItem}>
          <label>HORA:</label>
          <span>{time}</span>
        </div>
        <div className={styles.metaItem}>
          <label>ÁREA:</label>
          <span>{vale?.area_destino || '---'}</span>
        </div>
      </div>

      <table className={styles.voucherTable}>
        <thead>
          <tr>
            <th style={{width: '60px'}}>CANTIDAD</th>
            <th style={{width: '80px'}}>CÓDIGO</th>
            <th style={{width: '100px'}}>LOTE</th>
            <th style={{width: '100px'}}>CADUCIDAD</th>
            <th style={{width: '80px'}}>EXISTENCIA<br/><span style={{fontSize: '0.5rem'}}>(SOLO SUCURSALES)</span></th>
            <th>CONCEPTO</th>
            <th style={{width: '80px'}}>PENDIENTES</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{item.empty ? '' : (item.cantidad_solicitada || item.cantidad)}</td>
              <td className={styles.codeCell}>{item.empty ? '' : (item.material?.prefijo || item.prefijo)}</td>
              <td>{item.empty ? '' : (item.lote_solicitado || item.lote || renderDiagonal())}</td>
              <td>{item.empty ? '' : (item.caducidad ? new Date(item.caducidad).toLocaleDateString() : renderDiagonal())}</td>
              <td>{item.empty ? '' : (sucursalStock[item.material_catalogo_id || item.material_id] ?? renderDiagonal())}</td>
              <td className={styles.conceptCell}>
                {item.empty ? '' : (item.material?.nombre || item.nombre)}
                {!item.empty && (item.material?.marca || item.marca) && <span style={{fontSize: '0.65rem', color: '#666', display: 'block'}}>{item.material?.marca || item.marca}</span>}
              </td>
              <td>{renderDiagonal()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.obsBox}>
        <strong>OBSERVACIONES:</strong> {vale?.observaciones || ''}
      </div>

      <div className={styles.bottomInfo}>
        <div className={styles.tempBox}><label>REFRIGERACIÓN:</label> <span>°C</span></div>
        <div className={styles.tempBox}><label>CONGELACIÓN:</label> <span>°C</span></div>
        <div style={{textAlign: 'right', padding: '10px'}}><span className={styles.internalUse}>Exclusivo de Uso Interno</span></div>
      </div>

      <div className={styles.signatureArea}>
        <div>
          <div className={styles.signLabel}>ENTREGA</div>
          <div className={styles.signLine}></div>
          <div className={styles.signerName}>Nombre y firma de Almacén</div>
        </div>
        <div>
          <div className={styles.signLabel}>RECIBE</div>
          <div className={styles.signLine}>
            {solicitante?.name || vale?.solicitante?.name || ''}
          </div>
          <div className={styles.signerName}>Nombre y firma de la Sucursal</div>
        </div>
      </div>

      <footer className={styles.footerNote}>
        <span>SISTEMA DE GESTIÓN DE CALIDAD</span>
        <span>Página 1/1</span>
      </footer>
    </div>
  );
});

export default ValeAlmacen;
