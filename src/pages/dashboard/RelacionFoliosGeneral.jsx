import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './RelacionFoliosGeneral.module.css';

export default function RelacionFoliosGeneral() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sucursal: 'Todas',
    fecha: new Date().toISOString().split('T')[0],
    searchTerm: ''
  });

  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    fetchSucursales();
    fetchRelacion();
  }, [filters.sucursal, filters.fecha]);

  const fetchSucursales = async () => {
    const { data: list } = await supabase.from('sucursales').select('nombre');
    if (list) setSucursales(['Todas', ...list.map(s => s.nombre)]);
  };

  const fetchRelacion = async () => {
    setLoading(true);
    let query = supabase
      .from('logistica_folios_relacion')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.sucursal !== 'Todas') {
      query = query.eq('sucursal', filters.sucursal);
    }
    
    // Filtrar por el día de creación de la relación
    if (filters.fecha) {
      const start = `${filters.fecha}T00:00:00`;
      const end = `${filters.fecha}T23:59:59`;
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data: res, error } = await query;
    if (!error) setData(res);
    setLoading(false);
  };

  const filteredData = data.filter(item => 
    item.folio_paciente.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
    item.estudios?.toLowerCase().includes(filters.searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1><span className="material-symbols-rounded">list_alt</span> Bitácora Maestra de Folios</h1>
          <p>Consulta centralizada de muestras enviadas por sucursales y promesas de entrega</p>
        </div>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statVal}>{data.length}</span>
            <span className={styles.statLab}>Folios hoy</span>
          </div>
        </div>
      </header>

      <div className={styles.filterBar}>
        <div className={styles.inputGroup}>
          <label>Sucursal</label>
          <select value={filters.sucursal} onChange={e => setFilters({...filters, sucursal: e.target.value})}>
            {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className={styles.inputGroup}>
          <label>Día de Registro</label>
          <input type="date" value={filters.fecha} onChange={e => setFilters({...filters, fecha: e.target.value})} />
        </div>
        <div className={styles.inputGroup} style={{flex: 1}}>
          <label>Búsqueda Rápida (Folio / Estudio)</label>
          <div className={styles.searchWrapper}>
             <span className="material-symbols-rounded">search</span>
             <input 
                type="text" 
                placeholder="Ej: S-202..." 
                value={filters.searchTerm} 
                onChange={e => setFilters({...filters, searchTerm: e.target.value})} 
             />
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={fetchRelacion}>
           <span className="material-symbols-rounded">refresh</span>
        </button>
      </div>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loader}>Cargando bitácora...</div>
        ) : filteredData.length === 0 ? (
          <div className={styles.empty}>
             <span className="material-symbols-rounded">inventory</span>
             <h3>Sin registros para este filtro</h3>
             <p>No se encontraron folios cargados para la sucursal y fecha seleccionadas.</p>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Folio</th>
                  <th>Estudios</th>
                  <th>Fecha Entrega</th>
                  <th>Estatus</th>
                  <th>Observaciones</th>
                  <th>Hora Registro</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id}>
                    <td><span className={styles.sucursalBadge}>{item.sucursal}</span></td>
                    <td><strong>{item.folio_paciente}</strong></td>
                    <td className={styles.studiesText}>{item.estudios}</td>
                    <td>
                      <div className={styles.deliveryBox}>
                        <span className="material-symbols-rounded">calendar_month</span>
                        {item.fecha_entrega || 'No definida'}
                      </div>
                    </td>
                    <td>
                       <span className={item.entrega_tipo === 'Parcial' ? styles.badgeParcial : styles.badgeTotal}>
                         {item.entrega_tipo}
                       </span>
                    </td>
                    <td className={styles.obsCell}>{item.observaciones || '---'}</td>
                    <td className={styles.timeCell}>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
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
