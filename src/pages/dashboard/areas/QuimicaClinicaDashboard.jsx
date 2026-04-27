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
  const [alerts, setAlerts] = useState([]);
  const [expiryAlarms, setExpiryAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .or('role.eq.quimica_clinica,role.eq.admin')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) setAlerts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario_areas')
        .select('*')
        .or('area_id.eq.quimica-clinica,area_id.eq.quimica_clinica');

      if (data) {
        const now = new Date();
        const in7  = new Date(); in7.setDate(now.getDate() + 7);
        const nextMonth = new Date(); nextMonth.setDate(now.getDate() + 30);

        setStats({
          total: data.length,
          critico: data.filter(i => i.stock_actual < 5 && i.stock_actual > 0).length,
          caducidad: data.filter(i => i.caducidad && new Date(i.caducidad) <= nextMonth).length,
          enUso: data.filter(i => i.fecha_inicio_uso && !i.fecha_termino_uso).length
        });

        // Alarmas de lotes próximos a caducar
        const alarms = data
          .filter(i => i.caducidad && !i.fecha_termino_uso)
          .map(i => ({ ...i, expDate: new Date(i.caducidad) }))
          .filter(i => i.expDate <= nextMonth)
          .sort((a, b) => a.expDate - b.expDate);
        setExpiryAlarms(alarms);
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
      title: 'Calculadoras Especializadas',
      desc: 'Cálculo de parámetros derivados: Bilirrubinas, Lípidos, Orinas 24h, Renal e Inmunología.',
      icon: 'calculate',
      path: '/area/quimica-clinica/derivados',
      color: '#8B5CF6'
    },
    {
      title: 'Bitácora Logística',
      desc: 'Seguimiento de muestras y folios recibidos (FO-DO-017).',
      icon: 'assignment_turned_in',
      path: '/logistica/bitacora',
      color: '#10B981'
    },
    {
      title: 'Temperaturas del Área',
      desc: 'Monitoreo y registro de temperaturas ambientales y de equipos de refrigeración.',
      icon: 'device_thermostat',
      path: '/area/quimica-clinica/temperaturas',
      color: '#F43F5E'
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

      <div className={styles.alertSection}>
        <div className={styles.sectionHeader}>
          <span className="material-symbols-rounded">notifications_active</span>
          <h3>Alertas y Avisos del Área</h3>
        </div>
        <div className={styles.alertList}>

          {/* Alarmas automáticas de lotes por caducar */}
          {expiryAlarms.map(item => {
            const now2 = new Date();
            const in7b = new Date(); in7b.setDate(now2.getDate() + 7);
            const isExpired  = item.expDate < now2;
            const isCritical = !isExpired && item.expDate <= in7b;
            const color   = isExpired ? '#EF4444' : isCritical ? '#F97316' : '#F59E0B';
            const icon    = isExpired ? 'dangerous' : 'event_busy';
            const label   = isExpired ? '⛔ VENCIDO' : isCritical ? '🔴 CRÍTICO' : '⚠️ PRÓXIMO';
            const daysLeft= Math.ceil((item.expDate - now2) / (1000 * 60 * 60 * 24));
            return (
              <div key={`exp-${item.id}`} className={styles.alertItem} style={{borderLeft: `4px solid ${color}`}}>
                <span className="material-symbols-rounded" style={{color}}>{icon}</span>
                <div>
                  <strong>{item.descripcion} — Lote {item.lote || 'N/A'}</strong>
                  <p>
                    Caduca el {item.expDate.toLocaleDateString('es-MX', {day:'2-digit', month:'long', year:'numeric'})}.
                    {' '}<span style={{fontWeight:700, color}}>{isExpired ? label : `${label} (${daysLeft}d)`}</span>
                  </p>
                </div>
              </div>
            );
          })}

          {/* Stock crítico */}
          {stats.critico > 0 && (
            <div className={styles.alertItem} style={{borderLeft: '4px solid #EF4444'}}>
              <span className="material-symbols-rounded" style={{color: '#EF4444'}}>inventory_2</span>
              <div>
                <strong>Stock Crítico Detectado</strong>
                <p>Hay {stats.critico} reactivos con existencias por debajo del mínimo de seguridad.</p>
              </div>
            </div>
          )}

          {/* Notificaciones del sistema */}
          {alerts.map(a => (
            <div key={a.id} className={styles.alertItem} style={{borderLeft: `4px solid ${a.type === 'error' ? '#EF4444' : '#F59E0B'}`}}>
              <span className="material-symbols-rounded" style={{color: a.type === 'error' ? '#EF4444' : '#F59E0B'}}>
                {a.type === 'error' ? 'warning' : 'info'}
              </span>
              <div>
                <strong>{a.title}</strong>
                <p>{a.message}</p>
              </div>
            </div>
          ))}

          {expiryAlarms.length === 0 && !stats.critico && alerts.length === 0 && (
            <p style={{padding: '10px', color: '#94A3B8', textAlign: 'center'}}>No hay alertas activas para esta área.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuimicaClinicaDashboard;
