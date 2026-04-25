import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './QuimicaClinicaDashboard.module.css';

const UrianalisisDashboard = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Inventario y Calidad',
      desc: 'Control de reactivos, tiras reactivas y bitácora de aceptación.',
      icon: 'fact_check',
      path: '/area/urianalisis/inventario',
      color: '#0891B2'
    },
    {
      title: 'Temperaturas del Área',
      desc: 'Registro térmico ambiental y de equipos de conservación.',
      icon: 'device_thermostat',
      path: '/area/urianalisis/temperaturas',
      color: '#F43F5E'
    },
    {
      title: 'Bitácora FO-DO-017',
      desc: 'Seguimiento de muestras de orina recibidas.',
      icon: 'assignment_turned_in',
      path: '/logistica/bitacora',
      color: '#3B82F6'
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>
          <span className={`material-symbols-rounded ${styles.headerIcon}`} style={{color: '#0891B2'}}>biotech</span>
          Dashboard de Urianálisis
        </h2>
        <p>Control Técnico y Operativo del área de Uroanálisis.</p>
      </header>

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

export default UrianalisisDashboard;
