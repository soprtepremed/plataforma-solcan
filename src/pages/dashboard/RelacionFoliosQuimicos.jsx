import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './RelacionFoliosQuimicos.module.css';

const RelacionFoliosQuimicos = () => {
  const [sucursales, setSucursales] = useState([]);
  const [selectedSucursal, setSelectedSucursal] = useState(null);
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    fetchSucursales();
  }, []);

  useEffect(() => {
    if (selectedSucursal) {
      fetchEnvios();
    }
  }, [selectedSucursal]);

  const fetchSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('nombre')
        .order('nombre');
      
      if (error) throw error;
      setSucursales(data.map(s => s.nombre));
    } catch (error) {
      console.error('Error fetching sucursales:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logistica_folios_relacion')
        .select('*')
        .eq('sucursal', selectedSucursal)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setEnvios(data || []);
      
      // Expandir el primer día por defecto si hay datos
      if (data && data.length > 0) {
        const firstDay = new Date(data[0].created_at).toISOString().split('T')[0];
        setExpandedDays({ [firstDay]: true });
      }
    } catch (error) {
      console.error('Error fetching envios:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Agrupación por días
  const groupedEnvios = useMemo(() => {
    const groups = {};
    const filtered = envios.filter(e => 
      e.folio_paciente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.paquete_folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.estudios?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.forEach(e => {
      const day = new Date(e.created_at).toISOString().split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return groups;
  }, [envios, searchTerm]);

  const toggleDay = (day) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  if (!selectedSucursal) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleBox}>
            <h1>Relación de Envíos</h1>
            <p>Selecciona una sucursal para consultar sus paquetes y observaciones.</p>
          </div>
        </header>

        {loading ? (
          <div className={styles.loader}>Cargando sucursales...</div>
        ) : (
          <div className={styles.branchGrid}>
            {sucursales.map(s => (
              <div 
                key={s} 
                className={styles.branchCard}
                onClick={() => setSelectedSucursal(s)}
              >
                <div className={styles.branchIcon}>
                  <span className="material-symbols-rounded">location_on</span>
                </div>
                <h3>{s}</h3>
                <span>Ver Envíos</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <button className={styles.backBtn} onClick={() => setSelectedSucursal(null)}>
            <span className="material-symbols-rounded">arrow_back</span>
            Volver a Sucursales
          </button>
          <h1>Envíos de {selectedSucursal}</h1>
        </div>
        <div className={styles.searchBox}>
          <span className="material-symbols-rounded">search</span>
          <input 
            type="text" 
            placeholder="Buscar por folio o paquete..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className={styles.daysList}>
        {loading ? (
          <p className={styles.loadingText}>Consultando bitácora...</p>
        ) : Object.keys(groupedEnvios).length > 0 ? (
          Object.keys(groupedEnvios).sort((a,b) => b.localeCompare(a)).map(day => {
            const dayRecords = groupedEnvios[day];
            const uniquePackages = [...new Set(dayRecords.map(r => r.paquete_folio))];
            const isExpanded = expandedDays[day];

            return (
              <div key={day} className={styles.dayAccordion}>
                <div 
                  className={`${styles.dayHeader} ${isExpanded ? styles.headerActive : ''}`} 
                  onClick={() => toggleDay(day)}
                >
                  <div className={styles.dayMainInfo}>
                    <span className="material-symbols-rounded">calendar_month</span>
                    <span className={styles.dayDate}>
                      {day.split('-').reverse().join('/')}
                    </span>
                    <div className={styles.dayStats}>
                      <span className={styles.statBadge}>
                        <strong>{dayRecords.length}</strong> Folios
                      </span>
                      <span className={styles.statBadge}>
                        <strong>{uniquePackages.length}</strong> Paquetes
                      </span>
                    </div>
                  </div>
                  <span className={`material-symbols-rounded ${styles.expandIcon} ${isExpanded ? styles.rotated : ''}`}>
                    expand_more
                  </span>
                </div>

                {isExpanded && (
                  <div className={styles.dayContent}>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Folio</th>
                            <th>Toma</th>
                            <th>Paquete</th>
                            <th>Estudios</th>
                            <th>Entrega</th>
                            <th>Tipo</th>
                            <th>Observaciones / Detalle</th>
                            <th>Envío</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayRecords.map(h => (
                            <tr key={h.id} className={h.entrega_tipo === 'Parcial' ? styles.rowParcial : ''}>
                              <td><strong>{h.folio_paciente}</strong></td>
                              <td>
                                <div className={styles.tomaCell}>
                                  <span className="material-symbols-rounded">medical_services</span>
                                  {h.hora_toma || '---'}
                                </div>
                              </td>
                              <td>
                                <div className={styles.packageCell}>
                                  <span className="material-symbols-rounded">inventory_2</span>
                                  {h.paquete_folio || '---'}
                                </div>
                              </td>
                              <td>{h.estudios || '---'}</td>
                              <td>
                                <div className={styles.dateCell}>
                                  <span className="material-symbols-rounded">event</span>
                                  {h.fecha_entrega 
                                    ? h.fecha_entrega.split('-').reverse().join('/')
                                    : '---'}
                                </div>
                              </td>
                              <td>
                                <span className={h.entrega_tipo === 'Parcial' ? styles.badgeParcial : styles.badgeTotal}>
                                  {h.entrega_tipo}
                                </span>
                              </td>
                              <td className={styles.obsCell}>
                                {h.observaciones}
                              </td>
                              <td className={styles.timeCell}>
                                <div className={styles.timeHorizontal}>
                                  <span className={styles.fullHourText}>
                                    {new Date(h.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <span className="material-symbols-rounded">inventory</span>
            <p>No se encontraron envíos registrados para esta sucursal.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelacionFoliosQuimicos;
