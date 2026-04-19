import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import styles from './HematologiaDashboard.module.css';

const HematologiaDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    critico: 0,
    caducidad: 0,
    enUso: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario_areas')
        .select('*')
        .eq('area_id', 'hematologia');

      if (data) {
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(now.getDate() + 30);

        setStats({
          total: data.length,
          critico: data.filter(i => i.stock_actual < 5 && i.stock_actual > 0).length,
          caducidad: data.filter(i => i.caducidad && new Date(i.caducidad) <= nextMonth).length,
          enUso: data.filter(i => i.fecha_inicio_uso && !i.fecha_termino_uso).length
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Inventario y Calidad',
      desc: 'Control de reactivos, lotes y bitácora de aceptación técnica.',
      icon: 'fact_check',
      path: '/area/hematologia/inventario',
      color: '#DC2626'
    },
    {
      title: 'Bitácora FO-DO-017',
      desc: 'Seguimiento de muestras recibidas por bio-logística.',
      icon: 'assignment_turned_in',
      path: '/logistica/bitacora',
      color: '#3B82F6'
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>
          <span className={`material-symbols-rounded ${styles.headerIcon}`}>bloodtype</span>
          Dashboard de Hematología
        </h2>
        <p>Suministros y Control Operativo del Área Técnica.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #3B82F6' }}>
          <p className={styles.statLabel}>Inventario Total</p>
          <h3 className={styles.statValue}>{loading ? '...' : stats.total}</h3>
          <p className={styles.statSubtext} style={{ color: '#3B82F6' }}>Reactivos Registrados</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #EF4444' }}>
          <p className={styles.statLabel}>Stock Crítico</p>
          <h3 className={styles.statValue} style={{ color: '#EF4444' }}>{loading ? '...' : stats.critico}</h3>
          <p className={styles.statSubtext} style={{ color: '#EF4444' }}>Menos de 5 unidades</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #F59E0B' }}>
          <p className={styles.statLabel}>Próximos a Caducar</p>
          <h3 className={styles.statValue} style={{ color: '#F59E0B' }}>{loading ? '...' : stats.caducidad}</h3>
          <p className={styles.statSubtext} style={{ color: '#F59E0B' }}>Siguiente 30 días</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #10B981' }}>
          <p className={styles.statLabel}>En Uso (Abierto)</p>
          <h3 className={styles.statValue} style={{ color: '#10B981' }}>{loading ? '...' : stats.enUso}</h3>
          <p className={styles.statSubtext} style={{ color: '#10B981' }}>Reactivos en Proceso</p>
        </div>
      </div>

      <div className={styles.sectionsGrid}>
        {sections.map(s => (
          <div 
            key={s.path}
            onClick={() => navigate(s.path)}
            className={styles.sectionCard}
          >
            <span className={`material-symbols-rounded ${styles.sectionIcon}`} style={{ color: s.color }}>
              {s.icon}
            </span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HematologiaDashboard;
