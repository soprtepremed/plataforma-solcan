import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './Envio.module.css';

export default function Envio() {
  const { user } = useAuth();
  const [despachos, setDespachos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDespachos();
  }, []);

  const fetchDespachos = async () => {
    setLoading(true);
    let query = supabase
      .from('logistica_envios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (user?.role !== 'admin' && user?.branch) {
      query = query.eq('sucursal', user.branch);
    }

    const { data, error } = await query;
    if (!error) setDespachos(data);
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de Envíos</h1>
          <p className={styles.subtitle}>
            {user?.role === 'admin' ? 'Control global de despachos' : `Sede: ${user?.branch}`}
          </p>
        </div>
        <button className={styles.primaryBtn}>
          <span className="material-symbols-rounded">add_circle</span>
          Iniciar Nuevo Despacho
        </button>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className="material-symbols-rounded">local_shipping</span>
          <div>
            <div className={styles.statValue}>{despachos.length}</div>
            <div className={styles.statLabel}>Total Despachos</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className="material-symbols-rounded">inventory_2</span>
          <div>
            <div className={styles.statValue}>
              {despachos.filter(d => d.status === 'Enviado').length}
            </div>
            <div className={styles.statLabel}>Enviados</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className="material-symbols-rounded">fact_check</span>
          <div>
            <div className={styles.statValue}>
              {despachos.filter(d => d.status === 'Recibido').length}
            </div>
            <div className={styles.statLabel}>Recibidos</div>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID / Fecha</th>
              <th>Sucursal</th>
              <th>Chofer</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className={styles.loading}>Cargando...</td>
              </tr>
            ) : despachos.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.empty}>
                  No hay despachos registrados.
                </td>
              </tr>
            ) : (
              despachos.map(d => (
                <tr key={d.id}>
                  <td>
                    <div className={styles.idCell}>#{d.id.slice(0, 6).toUpperCase()}</div>
                    <div className={styles.dateCell}>
                      {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td>{d.sucursal}</td>
                  <td>{d.mensajero_id || '---'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[d.status?.toLowerCase()]}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <button className={styles.actionBtn}>Ver Detalle</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
