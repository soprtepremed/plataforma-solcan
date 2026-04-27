import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import styles from './QuimicaClinicaDashboard.module.css';

const MicrobiologiaDashboard = () => {
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
      const { data } = await supabase
        .from('inventario_areas')
        .select('*')
        .eq('area_id', 'microbiologia');

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
      title: 'Inventario de Medios',
      desc: 'Control de medios de cultivo, reactivos y cepas de referencia.',
      icon: 'fact_check',
      path: '/area/microbiologia/inventario',
      color: '#059669'
    },
    {
      title: 'Temperaturas del Área',
      desc: 'Registro de incubadoras, refrigeradores y ambiente.',
      icon: 'device_thermostat',
      path: '/area/microbiologia/temperaturas',
      color: '#F43F5E'
    },
    {
      title: 'Bitácora Logística',
      desc: 'Seguimiento de muestras microbiológicas recibidas.',
      icon: 'assignment_turned_in',
      path: '/logistica/bitacora',
      color: '#3B82F6'
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>
          <span className={`material-symbols-rounded ${styles.headerIcon}`} style={{color: '#059669'}}>biotech</span>
          Dashboard de Microbiología
        </h2>
        <p>Control de Calidad, Medios de Cultivo y Trazabilidad Analítica.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #059669' }}>
          <p className={styles.statLabel}>Inventario Total</p>
          <h3 className={styles.statValue}>{loading ? '...' : stats.total}</h3>
          <p className={styles.statSubtext} style={{ color: '#059669' }}>Materiales en Stock</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #EF4444' }}>
          <p className={styles.statLabel}>Stock Crítico</p>
          <h3 className={styles.statValue} style={{ color: '#EF4444' }}>{loading ? '...' : stats.critico}</h3>
          <p className={styles.statSubtext} style={{ color: '#EF4444' }}>Requiere Pedido</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #F59E0B' }}>
          <p className={styles.statLabel}>Próximos a Caducar</p>
          <h3 className={styles.statValue} style={{ color: '#F59E0B' }}>{loading ? '...' : stats.caducidad}</h3>
          <p className={styles.statSubtext} style={{ color: '#F59E0B' }}>Revisar Lotes</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #10B981' }}>
          <p className={styles.statLabel}>En Uso</p>
          <h3 className={styles.statValue} style={{ color: '#10B981' }}>{loading ? '...' : stats.enUso}</h3>
          <p className={styles.statSubtext} style={{ color: '#10B981' }}>Medios Preparados/Abiertos</p>
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

export default MicrobiologiaDashboard;
