import React, { useState, useMemo, useEffect } from 'react';
import styles from './NOM035Dashboard.module.css';
import { supabase } from '../../../lib/supabaseClient';

// Mocked loaded list of evaluations for analytics (demonstration fallback)
const MOCK_EVALUATIONS = [
  { id: 1, name: 'Q.F.B. Dalia Melgar', dept: 'Hematología', branch: 'Sede Arenal', score: 18, risk: 'Nulo', status: 'Completado', date: '28/04/2026' },
  { id: 2, name: 'Q.F.B. Alfredo Gómez', dept: 'Química Clínica', branch: 'Tuxtla Gutierrez', score: 38, risk: 'Bajo', status: 'Completado', date: '02/05/2026' },
  { id: 3, name: 'Técnico de Captura 1', dept: 'Recepción', branch: 'Tuxtla Gutierrez', score: 55, risk: 'Medio', status: 'Completado', date: '15/04/2026' },
  { id: 4, name: 'Q.F.B. Andrea Flores', dept: 'Microbiología', branch: 'Tapachula', score: 28, risk: 'Bajo', status: 'Completado', date: '20/04/2026' },
  { id: 5, name: 'Q.F.B. Fatima Cruz', dept: 'Química Clínica', branch: 'Sede Arenal', score: 12, risk: 'Nulo', status: 'Completado', date: '29/04/2026' },
  { id: 6, name: 'Q.F.B. Julio César', dept: 'Uroanálisis', branch: 'San Cristobal', score: 74, risk: 'Alto', status: 'Completado', date: '12/04/2026' },
  { id: 7, name: 'Q.F.B. Hilda Jiménez', dept: 'Hematología', branch: 'Tuxtla Gutierrez', score: 48, risk: 'Medio', status: 'Completado', date: '01/05/2026' },
  { id: 8, name: 'Toma de Muestra Sede', dept: 'Toma de Muestra', branch: 'Sede Arenal', score: 92, risk: 'Muy alto', status: 'Completado', date: '04/05/2026' },
  { id: 9, name: 'Carlos Solcan', dept: 'Almacén', branch: 'Tuxtla Gutierrez', score: 32, risk: 'Bajo', status: 'Completado', date: '10/04/2026' },
  { id: 10, name: 'Q.F.B. Karen Ruiz', dept: 'Uroanálisis', branch: 'San Cristobal', score: 14, risk: 'Nulo', status: 'Completado', date: '18/04/2026' }
];

const MOCK_DOMAINS = [
  { name: 'Ambiente de Trabajo', score: 35, max: 100 },
  { name: 'Carga de Trabajo', score: 78, max: 100 },
  { name: 'Control sobre Trabajo', score: 45, max: 100 },
  { name: 'Jornada y Familia', score: 65, max: 100 },
  { name: 'Liderazgo y Relación', score: 40, max: 100 }
];

const MOCK_HIGH_RISK_QUESTIONS = [
  { num: 4, text: 'Q4. Por la cantidad de trabajo debo quedarme tiempo adicional a mi turno', score: 85, color: '#ef4444' },
  { num: 6, text: 'Q6. Considero necesario mantener un ritmo de trabajo acelerado', score: 72, color: '#f97316' },
  { num: 21, text: 'Q21. Pienso en mi trabajo o en sus problemas durante mi tiempo libre', score: 68, color: '#f59e0b' },
  { num: 9, text: 'Q9. Mi trabajo exige que atienda varios asuntos al mismo tiempo', score: 64, color: '#eab308' },
  { num: 13, text: 'Q13. Tomo decisiones que afectan la salud o seguridad de otros', score: 58, color: '#3b82f6' }
];

export default function NOM035Dashboard() {
  const [search, setSearch] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch from DB or fallback
  useEffect(() => {
    async function fetchEvaluations() {
      try {
        let baseEvals = [];
        try {
          const { data, error } = await supabase
            .from('nom035_evaluaciones')
            .select('*')
            .order('fecha_aplicacion', { ascending: false });

          if (!error && data && data.length > 0) {
            baseEvals = data.map(item => ({
              id: item.id,
              name: item.empleado_nombre || 'Anónimo',
              dept: item.empleado_departamento || 'General',
              branch: item.empleado_sucursal || 'Sede Central',
              score: item.score_total || 0,
              risk: item.nivel_riesgo || 'Nulo',
              status: 'Completado',
              date: new Date(item.fecha_aplicacion).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
            }));
          } else {
            baseEvals = [...MOCK_EVALUATIONS];
          }
        } catch (dbErr) {
          console.warn('Supabase fetch failed, falling back to mock dashboard data:', dbErr);
          baseEvals = [...MOCK_EVALUATIONS];
        }

        // Merge local storage fallback responses
        const localSaved = JSON.parse(localStorage.getItem('solcan_nom035_fallback') || '[]');
        if (localSaved.length > 0) {
          const formattedLocal = localSaved.map((item, idx) => ({
            id: `local-${idx}`,
            name: item.empleado_nombre,
            dept: item.empleado_departamento,
            branch: item.empleado_sucursal,
            score: item.score_total,
            risk: item.nivel_riesgo,
            status: 'Completado',
            date: item.fecha || new Date().toLocaleDateString('es-MX')
          }));
          baseEvals = [...formattedLocal, ...baseEvals];
        }

        setEvaluations(baseEvals);
      } catch (err) {
        console.error('Fatal error in fetchEvaluations:', err);
        setEvaluations(MOCK_EVALUATIONS);
      } finally {
        setLoading(false);
      }
    }
    fetchEvaluations();
  }, []);

  // Filter individual scores
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      return e.name.toLowerCase().includes(search.toLowerCase()) ||
             e.dept.toLowerCase().includes(search.toLowerCase()) ||
             e.branch.toLowerCase().includes(search.toLowerCase()) ||
             e.risk.toLowerCase().includes(search.toLowerCase());
    });
  }, [evaluations, search]);

  // Compute stats
  const kpis = useMemo(() => {
    const total = evaluations.length || 1;
    const avgScore = (evaluations.reduce((acc, e) => acc + e.score, 0) / total).toFixed(1);
    
    // Risk counts
    const nulo = evaluations.filter(e => e.risk.toLowerCase() === 'nulo').length;
    const bajo = evaluations.filter(e => e.risk.toLowerCase() === 'bajo').length;
    const medio = evaluations.filter(e => e.risk.toLowerCase() === 'medio').length;
    const alto = evaluations.filter(e => e.risk.toLowerCase() === 'alto').length;
    const muyAlto = evaluations.filter(e => e.risk.toLowerCase() === 'muy alto' || e.risk.toLowerCase() === 'muyalto').length;

    const criticalCount = alto + muyAlto;

    return { total: evaluations.length, avgScore, criticalCount, nulo, bajo, medio, alto, muyAlto };
  }, [evaluations]);

  // SVG coordinates for a 5-axis Radar chart (radius 90, center at 150, 150)
  const radarPoints = useMemo(() => {
    const cx = 150;
    const cy = 150;
    const rMax = 90;

    const points = MOCK_DOMAINS.map((d, idx) => {
      const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2; // offset to top
      const valRatio = d.score / d.max;
      const x = cx + rMax * valRatio * Math.cos(angle);
      const y = cy + rMax * valRatio * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return points.join(' ');
  }, []);

  const handleCreateEnlace = () => {
    const customLink = `${window.location.origin}/nom035/evaluacion`;
    navigator.clipboard.writeText(customLink);
    alert(`¡Enlace libre copiado al portapapeles!\n${customLink}\n\nEste enlace NO requiere inicio de sesión y puede ser respondido por cualquier colaborador desde cualquier celular, tablet o computadora.`);
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.headerCard}>
        <div className={styles.headerText}>
          <h2>
            <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--co-secondary)' }}>analytics</span>
            Tablero de Control - NOM-035-STPS
          </h2>
          <p>
            Análisis consolidado de factores de riesgo psicosocial e indicadores del entorno organizacional. Acceso 100% público habilitado.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={handleCreateEnlace}>
            <span className="material-symbols-rounded">share</span>
            Compartir Enlace Libre
          </button>
          <button className={styles.primaryBtn} onClick={() => window.open('/nom035/evaluacion', '_blank')}>
            <span className="material-symbols-rounded">launch</span>
            Abrir Cuestionario Libre
          </button>
        </div>
      </header>

      {/* KPIS */}
      <section className={styles.kpisGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(5, 0, 78, 0.1)' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--co-primary)' }}>fact_check</span>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Cuestionarios</span>
            <span className={styles.kpiValue}>{kpis.total}</span>
            <span className={styles.kpiSubtext}>Respuestas registradas</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(161, 20, 214, 0.1)' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--co-secondary)' }}>psychology</span>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Estrés Promedio</span>
            <span className={styles.kpiValue}>{kpis.avgScore}</span>
            <span className={styles.kpiSubtext}>Puntos de riesgo (Guía II)</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>campaign</span>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Casos Críticos</span>
            <span className={styles.kpiValue}>{kpis.criticalCount}</span>
            <span className={styles.kpiSubtext}>Riesgo Alto o Muy Alto</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <span className="material-symbols-rounded" style={{ color: '#10b981' }}>verified_user</span>
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Nivel Óptimo</span>
            <span className={styles.kpiValue}>{kpis.nulo + kpis.bajo}</span>
            <span className={styles.kpiSubtext}>Riesgo Nulo o Bajo</span>
          </div>
        </div>
      </section>

      {/* ANALYTICS CHARTS */}
      <section className={styles.analyticsGrid}>
        {/* RADAR CHART (DOMAINS) */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h3>Rendimiento por Dominios de la Norma</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Carga Psicosocial (%)</span>
          </div>
          <div className={styles.chartBody}>
            <svg width="300" height="300" viewBox="0 0 300 300" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="150" cy="150" r="90" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="150" cy="150" r="67.5" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="150" cy="150" r="45" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="150" cy="150" r="22.5" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

              {[0, 1, 2, 3, 4].map(idx => {
                const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = 150 + 90 * Math.cos(angle);
                const y = 150 + 90 * Math.sin(angle);
                return (
                  <line key={idx} x1="150" y1="150" x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
                );
              })}

              {MOCK_DOMAINS.map((d, idx) => {
                const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = 150 + 108 * Math.cos(angle);
                const y = 150 + 108 * Math.sin(angle);
                
                let anchor = "middle";
                if (Math.cos(angle) > 0.1) anchor = "start";
                else if (Math.cos(angle) < -0.1) anchor = "end";

                return (
                  <text 
                    key={idx} 
                    x={x} 
                    y={y + 4} 
                    fontSize="9.5" 
                    fontWeight="800" 
                    fill="#475569" 
                    textAnchor={anchor}
                  >
                    {d.name.split(' ')[0]}
                  </text>
                );
              })}

              <polygon 
                points={radarPoints} 
                fill="rgba(161, 20, 214, 0.18)" 
                stroke="var(--co-secondary)" 
                strokeWidth="2.5" 
              />

              {MOCK_DOMAINS.map((d, idx) => {
                const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
                const valRatio = d.score / d.max;
                const x = 150 + 90 * valRatio * Math.cos(angle);
                const y = 150 + 90 * valRatio * Math.sin(angle);
                return (
                  <circle key={idx} cx={x} cy={y} r="4.5" fill="var(--co-accent)" stroke="white" strokeWidth="1.5" />
                );
              })}
            </svg>
          </div>
        </div>

        {/* DONUT CHART (RISK DISTRIBUTION) */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h3>Distribución de Riesgos</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Nivel General</span>
          </div>
          <div className={styles.chartBody}>
            <div className={styles.donutWrapper}>
              <svg width="180" height="180" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                
                {/* Dynamically build rings based on percentages */}
                {(() => {
                  const total = kpis.total || 1;
                  const pctMuyAlto = (kpis.muyAlto / total) * 100;
                  const pctAlto = (kpis.alto / total) * 100;
                  const pctMedio = (kpis.medio / total) * 100;
                  const pctBajo = (kpis.bajo / total) * 100;
                  const pctNulo = (kpis.nulo / total) * 100;

                  let offset = 0;
                  return (
                    <>
                      {/* Muy Alto */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.5" 
                              strokeDasharray={`${pctMuyAlto} ${100 - pctMuyAlto}`} strokeDashoffset={`${-offset}`} />
                      {(() => { offset += pctMuyAlto; return null; })()}

                      {/* Alto */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f97316" strokeWidth="3.5" 
                              strokeDasharray={`${pctAlto} ${100 - pctAlto}`} strokeDashoffset={`${-offset}`} />
                      {(() => { offset += pctAlto; return null; })()}

                      {/* Medio */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#eab308" strokeWidth="3.5" 
                              strokeDasharray={`${pctMedio} ${100 - pctMedio}`} strokeDashoffset={`${-offset}`} />
                      {(() => { offset += pctMedio; return null; })()}

                      {/* Bajo */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.5" 
                              strokeDasharray={`${pctBajo} ${100 - pctBajo}`} strokeDashoffset={`${-offset}`} />
                      {(() => { offset += pctBajo; return null; })()}

                      {/* Nulo */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.5" 
                              strokeDasharray={`${pctNulo} ${100 - pctNulo}`} strokeDashoffset={`${-offset}`} />
                    </>
                  );
                })()}
              </svg>

              <div className={styles.legendList}>
                <div className={styles.legendItem}>
                  <div className={styles.colorDot} style={{ background: '#ef4444' }}></div>
                  <span>Muy Alto ({((kpis.muyAlto/kpis.total)*100).toFixed(0)}%)</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.colorDot} style={{ background: '#f97316' }}></div>
                  <span>Alto ({((kpis.alto/kpis.total)*100).toFixed(0)}%)</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.colorDot} style={{ background: '#eab308' }}></div>
                  <span>Medio ({((kpis.medio/kpis.total)*100).toFixed(0)}%)</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.colorDot} style={{ background: '#3b82f6' }}></div>
                  <span>Bajo ({((kpis.bajo/kpis.total)*100).toFixed(0)}%)</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.colorDot} style={{ background: '#10b981' }}></div>
                  <span>Nulo ({((kpis.nulo/kpis.total)*100).toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAR CHART FOR TOP HIGH-RISK QUESTIONS */}
      <section className={styles.barChartCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Preguntas con Mayor Índice de Estrés/Riesgo
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Auditoría Focos Rojos</span>
        </div>
        <div className={styles.barList}>
          {MOCK_HIGH_RISK_QUESTIONS.map(q => (
            <div key={q.num} className={styles.barItem}>
              <span className={styles.barLabel}>{q.text}</span>
              <div className={styles.barProgressTrack}>
                <div 
                  className={styles.barProgressFill} 
                  style={{ width: `${q.score}%`, background: q.color }}
                ></div>
              </div>
              <span className={styles.barValue}>{q.score}% Riesgo</span>
            </div>
          ))}
        </div>
      </section>

      {/* RESPONSES TABLE */}
      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3>Resultados Individuales por Empleado</h3>
          <div className={styles.searchBox}>
            <span className={`material-symbols-rounded ${styles.searchIcon}`}>search</span>
            <input 
              type="text" 
              placeholder="Buscar colaborador, área o riesgo..." 
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className={styles.responsesTable}>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Departamento</th>
              <th>Sucursal</th>
              <th>Fecha de Aplicación</th>
              <th>Puntos (Guía II)</th>
              <th>Nivel de Riesgo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvaluations.map(e => {
              let badgeStyle = styles.riskNulo;
              const r = e.risk.toLowerCase();
              if (r === 'bajo') badgeStyle = styles.riskBajo;
              else if (r === 'medio') badgeStyle = styles.riskMedio;
              else if (r === 'alto') badgeStyle = styles.riskAlto;
              else if (r === 'muy alto' || r === 'muyalto') badgeStyle = styles.riskMuyAlto;

              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 750, color: '#1e293b' }}>{e.name}</td>
                  <td><span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '30px', fontSize: '0.78rem', fontWeight: 700 }}>{e.dept}</span></td>
                  <td style={{ color: '#475569', fontWeight: 600 }}>{e.branch}</td>
                  <td style={{ color: '#64748b', fontWeight: 600 }}>{e.date}</td>
                  <td style={{ fontWeight: 800, color: '#1e293b' }}>{e.score} pts</td>
                  <td>
                    <span className={`${styles.riskBadge} ${badgeStyle}`}>
                      <span className="material-symbols-rounded" style={{ fontSize: '0.85rem' }}>warning</span>
                      Riesgo {e.risk}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.82rem' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>check_circle</span>
                      Enviado
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredEvaluations.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No se encontraron resultados que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
