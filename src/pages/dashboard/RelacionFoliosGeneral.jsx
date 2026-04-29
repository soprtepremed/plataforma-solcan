import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './RelacionFoliosGeneral.module.css';

export default function RelacionFoliosGeneral() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sucursal: 'Todas',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    selectedPaquete: 'Todos',
    searchTerm: ''
  });

  const [sucursales, setSucursales] = useState([]);
  const [paquetesDisponibles, setPaquetesDisponibles] = useState([]);

  useEffect(() => {
    fetchSucursales();
  }, []);

  useEffect(() => {
    fetchRelacion();
  }, [filters.sucursal, filters.startDate, filters.endDate, filters.selectedPaquete]);

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
      query = query.ilike('sucursal', `%${filters.sucursal}%`);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      query = query.lte('created_at', `${filters.endDate}T23:59:59`);
    }

    if (filters.selectedPaquete !== 'Todos') {
      query = query.eq('paquete_folio', filters.selectedPaquete);
    }

    const { data: res, error } = await query.limit(500);
    
    if (!error && res) {
      setData(res);
      // Extraer paquetes únicos para el selector basado en los resultados actuales
      const pkgs = [...new Set(res.map(item => item.paquete_folio).filter(Boolean))];
      setPaquetesDisponibles(['Todos', ...pkgs]);
    }
    setLoading(false);
  };

  const filteredData = data.filter(item => 
    item.folio_paciente.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
    item.estudios?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
    item.paquete_folio?.toLowerCase().includes(filters.searchTerm.toLowerCase())
  );

  const stats = {
    total: filteredData.length,
    parciales: filteredData.filter(d => d.entrega_tipo === 'Parcial').length,
    paquetes: new Set(filteredData.map(d => d.paquete_folio)).size
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1>
            <span className="material-symbols-rounded">analytics</span> 
            Bitácora Maestra
          </h1>
          <p>Supervisión perpetua de muestras y trazabilidad Solcan</p>
        </div>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Folios en Rango</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={`${styles.statCard} ${styles.parcialCard}`}>
            <span className={styles.statLabel}>Parcialidades</span>
            <span className={styles.statValue}>{stats.parciales}</span>
          </div>
          <div className={`${styles.statCard} ${styles.totalCard}`}>
            <span className={styles.statLabel}>Paquetes/Hieleras</span>
            <span className={styles.statValue}>{stats.paquetes}</span>
          </div>
        </div>
      </header>

      <div className={styles.filterSection}>
        <div className={styles.filtersGlass}>
          <div className={styles.filterRow}>
            <div className={styles.inputGroup}>
              <label><span className="material-symbols-rounded">store</span> Sucursal</label>
              <select value={filters.sucursal} onChange={e => setFilters({...filters, sucursal: e.target.value})}>
                {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className={styles.inputGroup}>
              <label><span className="material-symbols-rounded">calendar_month</span> Desde</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
            </div>

            <div className={styles.inputGroup}>
              <label><span className="material-symbols-rounded">event_repeat</span> Hasta</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>

            <div className={styles.inputGroup}>
              <label><span className="material-symbols-rounded">inventory_2</span> Paquete Específico</label>
              <select value={filters.selectedPaquete} onChange={e => setFilters({...filters, selectedPaquete: e.target.value})}>
                {paquetesDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.filterRow}>
            <div className={`${styles.inputGroup} ${styles.searchGroup}`}>
              <label><span className="material-symbols-rounded">search</span> Buscador Inteligente (Folio, Paciente, Estudio o ID Paquete)</label>
              <input 
                type="text" 
                placeholder="Escribe para buscar..." 
                value={filters.searchTerm} 
                onChange={e => setFilters({...filters, searchTerm: e.target.value})} 
              />
            </div>
            <button className={styles.refreshBtn} onClick={fetchRelacion} title="Sincronizar Datos">
               <span className="material-symbols-rounded">sync</span>
            </button>
          </div>
        </div>
      </div>

      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.loadingContainer}>
             <div className={styles.spinner}></div>
             <p>Consultando base de datos perpetua...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className={styles.emptyState}>
             <span className="material-symbols-rounded">folder_open</span>
             <h3>Sin resultados</h3>
             <p>No se encontraron registros para el rango y sucursal seleccionados.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Folio</th>
                  <th>Toma</th>
                  <th>Paquete</th>
                  <th>Estudios</th>
                  <th>Entrega</th>
                  <th>Tipo</th>
                  <th>Observaciones</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id} className={item.entrega_tipo === 'Parcial' ? styles.rowParcial : ''}>
                    <td><span className={styles.sucursalBadge}>{item.sucursal?.split(' ')[0]}</span></td>
                    <td><span className={styles.folioText}>{item.folio_paciente}</span></td>
                    <td>
                      <div className={styles.tomaCell}>
                        <span className="material-symbols-rounded">medical_services</span>
                        {item.hora_toma || '---'}
                      </div>
                    </td>
                    <td>
                      <div className={styles.packageCell}>
                        {item.paquete_folio}
                      </div>
                    </td>
                    <td className={styles.studiesCell}>{item.estudios}</td>
                    <td>
                      <div className={styles.dateCell}>
                        {item.fecha_entrega}
                      </div>
                    </td>
                    <td>
                       <span className={item.entrega_tipo === 'Parcial' ? styles.badgeParcial : styles.badgeTotal}>
                         {item.entrega_tipo}
                       </span>
                    </td>
                    <td className={styles.obsCell}>{item.observaciones}</td>
                    <td className={styles.timeCell}>
                      {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
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
