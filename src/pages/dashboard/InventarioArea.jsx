import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import styles from './InventarioArea.module.css';

export default function InventarioArea() {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const displayArea = areaId?.toUpperCase().replace('-', ' ') || 'ÁREA';

  useEffect(() => {
    fetchInventory();
  }, [areaId]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventario_laboratorio')
        .select('*')
        .eq('area', displayArea);

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventario: {displayArea}</h1>
          <p className={styles.subtitle}>Listado completo de reactivos y consumibles</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.searchBox}>
            <span className="material-symbols-rounded">search</span>
            <input 
              type="text" 
              placeholder="Buscar material..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={styles.refreshBtn} onClick={fetchInventory}>
            <span className="material-symbols-rounded">refresh</span>
          </button>
        </div>
      </header>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loader}>Cargando inventario...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Marca</th>
                <th>Stock</th>
                <th>Min.</th>
                <th>Estatus</th>
                <th>Caducidad</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td className={styles.code}>{item.codigo}</td>
                  <td className={styles.material}>{item.material}</td>
                  <td>{item.marca}</td>
                  <td className={styles.stock}>{item.stock}</td>
                  <td>{item.minimo}</td>
                  <td>
                    <span className={`${styles.statusTag} ${styles[item.estatus?.replace(' ', '').toLowerCase()]}`}>
                      {item.estatus || 'DISPONIBLE'}
                    </span>
                  </td>
                  <td className={styles.date}>
                    {item.caducidad ? new Date(item.caducidad).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                    No se encontraron materiales en esta área.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
