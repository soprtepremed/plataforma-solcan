import React, { useState, useMemo } from 'react';
import styles from './EvaluacionesCalidad.module.css';

// Mock list of actual and realistic personnel for Solcan Lab
const INITIAL_PERSONNEL = [
  { id: 1, name: 'Q.F.B. Dalia Melgar', role: 'Analista de Laboratorio', dept: 'Hematología', branch: 'Sede Arenal', score: 98, status: 'Completado', date: '28/04/2026' },
  { id: 2, name: 'Q.F.B. Alfredo Gómez', role: 'Responsable de Área', dept: 'Química Clínica', branch: 'Tuxtla Gutierrez', score: 95, status: 'Completado', date: '02/05/2026' },
  { id: 3, name: 'Técnico de Captura 1', role: 'Digitador de Resultados', dept: 'Recepción', branch: 'Tuxtla Gutierrez', score: 88, status: 'Completado', date: '15/04/2026' },
  { id: 4, name: 'Q.F.B. Andrea Flores', role: 'Analista de Laboratorio', dept: 'Microbiología', branch: 'Tapachula', score: 92, status: 'Completado', date: '20/04/2026' },
  { id: 5, name: 'Encargado de Almacén', role: 'Controlador de Inventario', dept: 'Almacén', branch: 'Tuxtla Gutierrez', score: 0, status: 'Pendiente', date: 'Pendiente' },
  { id: 6, name: 'Q.F.B. Karen Ruiz', role: 'Analista de Laboratorio', dept: 'Uroanálisis', branch: 'San Cristobal', score: 94, status: 'Completado', date: '18/04/2026' },
  { id: 7, name: 'Q.F.B. Fatima Cruz', role: 'Analista de Laboratorio', dept: 'Química Clínica', branch: 'Sede Arenal', score: 96, status: 'Completado', date: '29/04/2026' },
  { id: 8, name: 'Toma de Muestra Sede', role: 'Enfermero Flebotomista', dept: 'Toma de Muestra', branch: 'Tuxtla Gutierrez', score: 0, status: 'Pendiente', date: 'Pendiente' },
  { id: 9, name: 'Q.F.B. Adolfo Solis', role: 'Responsable Técnico', dept: 'Hematología', branch: 'Tapachula', score: 97, status: 'Completado', date: '30/04/2026' },
  { id: 10, name: 'Q.F.B. Lizbeth Díaz', role: 'Analista de Laboratorio', dept: 'Microbiología', branch: 'Tuxtla Gutierrez', score: 0, status: 'Pendiente', date: 'Pendiente' }
];

const DEPARTMENTS = ['Todos', 'Hematología', 'Química Clínica', 'Microbiología', 'Uroanálisis', 'Recepcion', 'Almacén', 'Toma de Muestra'];

export default function EvaluacionesCalidad() {
  const [activeTab, setActiveTab] = useState('personal');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('Todos');
  const [personnel, setPersonnel] = useState(INITIAL_PERSONNEL);

  // Filter logic
  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.role.toLowerCase().includes(search.toLowerCase()) ||
                            p.branch.toLowerCase().includes(search.toLowerCase());
      
      const matchesDept = selectedDept === 'Todos' || 
                          p.dept.toLowerCase() === selectedDept.toLowerCase() ||
                          (selectedDept === 'Recepcion' && p.dept === 'Recepción');

      return matchesSearch && matchesDept;
    });
  }, [personnel, search, selectedDept]);

  // Statistics
  const stats = useMemo(() => {
    const total = personnel.length;
    const completed = personnel.filter(p => p.status === 'Completado').length;
    const pending = total - completed;
    const completedWithScores = personnel.filter(p => p.status === 'Completado' && p.score > 0);
    const avgScore = completedWithScores.length > 0 
      ? (completedWithScores.reduce((acc, p) => acc + p.score, 0) / completedWithScores.length).toFixed(1)
      : '0.0';

    return { total, completed, pending, avgScore };
  }, [personnel]);

  const handleSimulateReport = (name) => {
    alert(`[SIMULACIÓN] Abriendo expediente de evaluación de: ${name}.\nEste módulo se conectará al generador de reportes PDF FO-DO-012 en la fase v2.2.`);
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerText}>
            <h2>
              <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--co-secondary)' }}>fact_check</span>
              Evaluaciones de Calidad del Personal
            </h2>
            <p>
              Auditoría de competencias técnicas, conformidad normativa (FO-DO-012/ISO 15189) y calidad operativa de los colaboradores del laboratorio.
            </p>
            <div style={{ marginTop: '1.2rem', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => window.location.href = '/area/recursos-humanos/evaluaciones/nom035'}
                style={{
                  background: 'var(--co-gradient)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(161, 20, 214, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.15rem' }}>analytics</span>
                Cuestionarios NOM-035 (Riesgo Psicosocial)
              </button>
              <button 
                onClick={() => window.location.href = '/nom035/evaluacion'}
                style={{
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.15rem' }}>assignment</span>
                Realizar Auto-Evaluación
              </button>
              <button 
                onClick={() => window.location.href = '/area/recursos-humanos/certificados'}
                style={{
                  background: 'rgba(5, 0, 78, 0.05)',
                  border: '1px solid rgba(5, 0, 78, 0.15)',
                  color: '#05004e',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.15rem' }}>video_file</span>
                Vídeo Certificados (Remotion)
              </button>
            </div>
          </div>
          <div className={styles.devBadge}>
            <span className="material-symbols-rounded">construction</span>
            Módulo en Desarrollo
          </div>
        </div>
      </header>

      {/* WARNING BANNER ON DEVELOPMENT STATE */}
      <div className={styles.warningBanner}>
        <span className="material-symbols-rounded">info</span>
        <p>
          <strong>Fase de Integración v2.1:</strong> El motor de evaluación psicométrica, evaluación de pares y la integración con firmas digitales de control técnico se encuentra actualmente en desarrollo. Los datos mostrados en esta sección son simulados con fines de auditoría de interfaz y flujos de usuario exclusivos de Recursos Humanos.
        </p>
      </div>

      {/* STATS GRID */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(5, 0, 78, 0.1)', color: 'var(--co-primary)' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--co-primary)' }}>groups</span>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Colaboradores</span>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statSubtext}>Total en base de datos</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <span className="material-symbols-rounded" style={{ color: '#10b981' }}>verified</span>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Evaluados</span>
            <span className={styles.statValue}>{stats.completed}</span>
            <span className={styles.statSubtext}>Conformidad técnica al 100%</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <span className="material-symbols-rounded" style={{ color: '#f59e0b' }}>pending_actions</span>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Pendientes</span>
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statSubtext}>Revisiones pendientes este mes</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(161, 20, 214, 0.1)', color: 'var(--co-secondary)' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--co-secondary)' }}>query_stats</span>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Calidad Promedio</span>
            <span className={styles.statValue}>{stats.avgScore}%</span>
            <span className={styles.statSubtext}>Cumplimiento global de procesos</span>
          </div>
        </div>
      </section>

      {/* TABS CONTROLLER */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'personal' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <span className="material-symbols-rounded">badge</span>
          Evaluaciones del Personal
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'auditorias' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('auditorias')}
        >
          <span className="material-symbols-rounded">analytics</span>
          Historial de Auditorías
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'parametros' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('parametros')}
        >
          <span className="material-symbols-rounded">tune</span>
          Parámetros de Calidad
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'config' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <span className="material-symbols-rounded">settings</span>
          Configuración RRHH
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <div className={styles.contentCard}>
        {activeTab === 'personal' ? (
          <div>
            {/* FILTER BAR */}
            <div className={styles.filterBar}>
              <div className={styles.searchWrapper}>
                <span className={`material-symbols-rounded ${styles.searchIcon}`}>search</span>
                <input 
                  type="text" 
                  placeholder="Buscar por colaborador, puesto o sede..." 
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className={styles.filterPills}>
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    className={`${styles.filterPill} ${selectedDept === dept ? styles.filterPillActive : ''}`}
                    onClick={() => setSelectedDept(dept)}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLE */}
            <div className={styles.tableContainer}>
              <table className={styles.personnelTable}>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Departamento / Área</th>
                    <th>Sucursal</th>
                    <th>Calificación</th>
                    <th>Última Evaluación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersonnel.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.userProfileCell}>
                          <div className={styles.avatarCircle}>
                            {p.name.split(' ').filter(n => n.length > 0 && !n.includes('.')).slice(0, 2).map(n => n[0]).join('')}
                          </div>
                          <div className={styles.userInfo}>
                            <h4>{p.name}</h4>
                            <span>{p.role}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.deptBadge}>{p.dept}</span>
                      </td>
                      <td>
                        <span className={styles.branchText}>{p.branch}</span>
                      </td>
                      <td>
                        {p.status === 'Completado' ? (
                          <div className={styles.ratingWrapper}>
                            <div className={styles.ratingTrack}>
                              <div 
                                className={styles.ratingFill} 
                                style={{ 
                                  width: `${p.score}%`,
                                  background: p.score >= 95 
                                    ? 'linear-gradient(to right, #0bcecd, #10b981)' 
                                    : p.score >= 90 
                                      ? 'linear-gradient(to right, #0bcecd, #f59e0b)' 
                                      : 'linear-gradient(to right, #ff9800, #ff5722)'
                                }}
                              ></div>
                            </div>
                            <span className={styles.ratingText}>{p.score}%</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>N/A</span>
                        )}
                      </td>
                      <td>
                        <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{p.date}</span>
                      </td>
                      <td>
                        <span className={`${styles.statusTag} ${p.status === 'Completado' ? styles.statusCompleted : styles.statusPending}`}>
                          <span className="material-symbols-rounded" style={{ fontSize: '0.9rem' }}>
                            {p.status === 'Completado' ? 'check_circle' : 'hourglass_empty'}
                          </span>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleSimulateReport(p.name)}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '0.95rem' }}>visibility</span>
                          Ver Reporte
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPersonnel.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'block', color: '#cbd5e1' }}>search_off</span>
                        No se encontraron colaboradores con los criterios seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* UNDER DEVELOPMENT TABS */
          <div className={styles.underDevOverlay}>
            <span className={`material-symbols-rounded ${styles.underDevIcon}`}>construction</span>
            <h3>Sección en Desarrollo</h3>
            <p>
              Estamos integrando las funcionalidades avanzadas de este módulo. En la versión v2.2 se habilitarán:
            </p>
            {activeTab === 'auditorias' && (
              <p style={{ fontWeight: 600, color: 'var(--co-secondary)', background: 'rgba(161, 20, 214, 0.05)', padding: '10px 18px', borderRadius: '12px', margin: '0.5rem 0' }}>
                🔗 Generación automática de reportes de calidad ISO 15189 y bitácoras de acciones correctivas automáticas (FO-DO-012) para auditoría clínica externa.
              </p>
            )}
            {activeTab === 'parametros' && (
              <p style={{ fontWeight: 600, color: 'var(--co-secondary)', background: 'rgba(161, 20, 214, 0.05)', padding: '10px 18px', borderRadius: '12px', margin: '0.5rem 0' }}>
                🔗 Configuración de matrices de competencias técnicas, ponderaciones de errores pre-analíticos, analíticos y de entrega, así como evaluaciones psicométricas del personal de toma de muestras.
              </p>
            )}
            {activeTab === 'config' && (
              <p style={{ fontWeight: 600, color: 'var(--co-secondary)', background: 'rgba(161, 20, 214, 0.05)', padding: '10px 18px', borderRadius: '12px', margin: '0.5rem 0' }}>
                🔗 Ajustes de ponderaciones globales por rol, frecuencia de evaluaciones del personal, alertas automáticas de re-capacitación y vinculación con firmas electrónicas de Recursos Humanos.
              </p>
            )}
            <div style={{ marginTop: '1.2rem' }}>
              <span className={styles.integrationBadge}>Solcan Lab v2.2 • Hoja de Ruta de Calidad</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
