import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import styles from './QuimicaClinicaDashboard.module.css';

const RecepcionDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pendientes: 0, entregados: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Por ahora estadísticas genéricas o placeholders si no hay tabla específica
      setStats({ total: 0, pendientes: 0, entregados: 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sections = [
    {
      title: 'Registro de Pacientes',
      desc: 'Acceso al módulo de alta y gestión de pacientes en sucursal.',
      icon: 'person_add',
      path: '/pacientes',
      color: '#3B82F6'
    },
    {
      title: 'Logística de Envío',
      desc: 'Relación de folios y muestras para envío a laboratorio matriz.',
      icon: 'local_shipping',
      path: '/logistica/envio',
      color: '#10B981'
    },
    {
      title: 'Solicitud de Vale',
      desc: 'Pedido interno de insumos y reactivos al almacén (FO-RM-004).',
      icon: 'add_shopping_cart',
      path: '/almacen/nueva-solicitud',
      color: '#6366F1'
    },
    {
      title: 'Historial de Vales',
      desc: 'Consulta de pedidos internos realizados al almacén.',
      icon: 'history_edu',
      path: '/area/vales/historial',
      color: '#475569'
    },
    {
      title: 'Requisición de Compra',
      desc: 'Solicitud de recursos externos y mobiliario (FO-RM-001).',
      icon: 'shopping_bag',
      path: '/area/requisicion',
      color: '#10B981'
    },
    {
      title: 'Bitácora de Requisiciones',
      desc: 'Seguimiento de compras externas solicitadas por el área.',
      icon: 'history',
      path: '/area/requisiciones/historial',
      color: '#F59E0B'
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>
          <span className={`material-symbols-rounded ${styles.headerIcon}`} style={{ color: '#3B82F6', background: '#EFF6FF' }}>
            reception_4
          </span>
          Dashboard de Recepción
        </h2>
        <p>Control Administrativo y Gestión de Suministros de Sucursal.</p>
      </header>

      <div className={styles.sectionsGrid}>
        {sections.map(s => (
          <div key={s.path} onClick={() => navigate(s.path)} className={styles.sectionCard}>
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

export default RecepcionDashboard;
