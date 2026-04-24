import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import styles from './QuimicaClinicaDashboard.module.css';

const QuimicaClinicaDashboard = () => {
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
        .or('area_id.eq.quimica-clinica,area_id.eq.quimica_clinica');

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
      title: 'Control de Inventario',
      desc: 'Gestión de reactivos, lotes y bitácora de aceptación técnica para Química Clínica.',
      icon: 'fact_check',
      path: '/area/quimica-clinica/inventario',
      color: '#0EA5E9'
    },
    {
      title: 'Bitácora Maquilas',
      desc: 'Control de estudios externos para conciliación de reactivos y reposición de costos.',
      icon: 'list_alt',
      path: '/area/quimica-clinica/bitacora',
      color: '#F59E0B'
    },
    {
      title: 'Bitácora Logística',
      desc: 'Seguimiento de muestras y folios recibidos (FO-DO-017).',
      icon: 'assignment_turned_in',
      path: '/logistica/bitacora',
      color: '#10B981'
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>
          <span className={`material-symbols-rounded ${styles.headerIcon}`}>science</span>
          Dashboard de Química Clínica
        </h2>
        <p>Centro de Control Operativo y Suministros Técnicos.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #0EA5E9' }}>
          <p className={styles.statLabel}>Inventario Total</p>
          <h3 className={styles.statValue}>{loading ? '...' : stats.total}</h3>
          <p className={styles.statSubtext} style={{ color: '#0EA5E9' }}>Reactivos en Stock</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #EF4444' }}>
          <p className={styles.statLabel}>Stock Crítico</p>
          <h3 className={styles.statValue} style={{ color: '#EF4444' }}>{loading ? '...' : stats.critico}</h3>
          <p className={styles.statSubtext} style={{ color: '#EF4444' }}>Requiere Resurtido</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #F59E0B' }}>
          <p className={styles.statLabel}>Próximos a Caducar</p>
          <h3 className={styles.statValue} style={{ color: '#F59E0B' }}>{loading ? '...' : stats.caducidad}</h3>
          <p className={styles.statSubtext} style={{ color: '#F59E0B' }}>En los próximos 30 días</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #10B981' }}>
          <p className={styles.statLabel}>Reactivos en Uso</p>
          <h3 className={styles.statValue} style={{ color: '#10B981' }}>{loading ? '...' : stats.enUso}</h3>
          <p className={styles.statSubtext} style={{ color: '#10B981' }}>Actualmente Abiertos</p>
        </div>
      </div>

      <div className={styles.sectionsGrid}>
        {sections.map(s => (
          <div 
            key={s.title}
            onClick={() => navigate(s.path)}
            className={styles.sectionCard}
          >
            <span className="material-symbols-rounded arrowIcon">arrow_forward</span>
            <span className={`material-symbols-rounded ${styles.sectionIcon}`} style={{ color: s.color }}>
              {s.icon}
            </span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className={styles.equipmentSection}>
        <div className={styles.sectionHeader}>
          <span className="material-symbols-rounded">precision_manufacturing</span>
          <h3>Estatus de Plataformas Analíticas (VITROS)</h3>
        </div>
        <div className={styles.equipmentGrid}>
          <div className={styles.eqCard}>
            <div className={styles.eqStatus} style={{background: '#10B981'}}></div>
            <h4>VITROS 5600 / XT</h4>
            <p>Operativo - 45 Reactivos On-Board</p>
          </div>
          <div className={styles.eqCard}>
            <div className={styles.eqStatus} style={{background: '#F59E0B'}}></div>
            <h4>VITROS 3600</h4>
            <p>Mantenimiento Preventivo Pendiente</p>
          </div>
        </div>
      </div>

      <div className={styles.alertSection}>
        <div className={styles.sectionHeader}>
          <span className="material-symbols-rounded">notifications_active</span>
          <h3>Alertas de Calibración y Control</h3>
        </div>
        <div className={styles.alertList}>
          <div className={styles.alertItem}>
            <span className="material-symbols-rounded" style={{color: '#EF4444'}}>warning</span>
            <div>
              <strong>Calibrador de Glucosa</strong>
              <p>Vence en 48 horas. Lote: 4567A</p>
            </div>
          </div>
          <div className={styles.alertItem}>
            <span className="material-symbols-rounded" style={{color: '#F59E0B'}}>info</span>
            <div>
              <strong>Control de Calidad Nivel 1</strong>
              <p>Cambio de frasco requerido para turno vespertino.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuimicaClinicaDashboard;
