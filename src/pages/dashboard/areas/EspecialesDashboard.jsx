import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import styles from './QuimicaClinicaDashboard.module.css';

const EspecialesDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pendientes: 0, entregados: 0, cancelados: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('maquilas_especiales')
        .select('estado');
      if (error) { setLoading(false); return; } // tabla aún no existe
      if (data) {
        setStats({
          total:      data.length,
          pendientes: data.filter(i => i.estado === 'PENDIENTE').length,
          entregados: data.filter(i => i.estado === 'ENTREGADO').length,
          cancelados: data.filter(i => i.estado === 'CANCELADO').length,
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sections = [
    {
      title: 'Catálogo de Estudios',
      desc: 'Consulta de claves, metodologías, tipos de muestra y tiempos de entrega (Orthin Lab).',
      icon: 'menu_book',
      path: '/especiales/catalogo',
      color: '#7C3AED'
    },
    {
      title: 'Bitácora de Seguimiento',
      desc: 'Registro y seguimiento diario de folios enviados a laboratorios externos.',
      icon: 'labs',
      path: '/especiales/bitacora',
      color: '#0EA5E9'
    },
    {
      title: 'Resultados Pendientes',
      desc: 'Monitoreo de estudios en espera de resultado para captura en sistema.',
      icon: 'pending_actions',
      path: '/especiales/pendientes',
      color: '#F59E0B'
    },
    {
      title: 'Conciliación y Costos',
      desc: 'Control de tarifas de maquila y cargos realizados al paciente.',
      icon: 'receipt_long',
      path: '/especiales/costos',
      color: '#10B981'
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>
          <span className={`material-symbols-rounded ${styles.headerIcon}`} style={{ color: '#7C3AED', background: '#F5F3FF' }}>
            labs
          </span>
          Módulo de Estudios Especiales
        </h2>
        <p>Control y trazabilidad de estudios enviados a maquilar con laboratorios externos.</p>
      </header>

      {/* ── STAT CARDS ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #7C3AED' }}>
          <p className={styles.statLabel}>Total Registrados</p>
          <h3 className={styles.statValue}>{loading ? '...' : stats.total}</h3>
          <p className={styles.statSubtext} style={{ color: '#7C3AED' }}>Estudios en Bitácora</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #F59E0B' }}>
          <p className={styles.statLabel}>Pendientes</p>
          <h3 className={styles.statValue} style={{ color: '#F59E0B' }}>{loading ? '...' : stats.pendientes}</h3>
          <p className={styles.statSubtext} style={{ color: '#F59E0B' }}>Esperando Resultado</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #10B981' }}>
          <p className={styles.statLabel}>Entregados</p>
          <h3 className={styles.statValue} style={{ color: '#10B981' }}>{loading ? '...' : stats.entregados}</h3>
          <p className={styles.statSubtext} style={{ color: '#10B981' }}>Resultados Liberados</p>
        </div>
        <div className={styles.statCard} style={{ borderLeft: '6px solid #EF4444' }}>
          <p className={styles.statLabel}>Cancelados</p>
          <h3 className={styles.statValue} style={{ color: '#EF4444' }}>{loading ? '...' : stats.cancelados}</h3>
          <p className={styles.statSubtext} style={{ color: '#EF4444' }}>Anulados / No Procesados</p>
        </div>
      </div>

      {/* ── SECTION CARDS ── */}
      <div className={styles.sectionsGrid}>
        {sections.map(s => (
          <div
            key={s.path}
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
    </div>
  );
};

export default EspecialesDashboard;
