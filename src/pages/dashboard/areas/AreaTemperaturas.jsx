import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import styles from './QuimicaClinicaDashboard.module.css';

const AreaTemperaturas = () => {
  const { areaId } = useParams();
  const areaName = areaId ? areaId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Área';

  // Íconos SVG
  const Thermometer = ({ size = 24 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/><path d="M11.5 6.5 11.5 14"/></svg>;
  const Settings = ({ size = 24 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  const CalculatorIcon = ({ size = 24 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/><path d="M8 18h.01"/><path d="M12 14h.01"/><path d="M12 18h.01"/></svg>;

  // Equipos iniciales por defecto
  const DEFAULT_EQUIPOS = [
    { id: 'r1', nombre: 'Refrigerador 1', unidad: '°C', puntos: [{t: 2, f: 0}, {t: 5, f: 0}, {t: 8, f: 0}] },
    { id: 'r2', nombre: 'Refrigerador 2', unidad: '°C', puntos: [{t: 2, f: 0}, {t: 5, f: 0}, {t: 8, f: 0}] },
    { id: 'c1', nombre: 'Congelador 1', unidad: '°C', puntos: [{t: -25, f: 0}, {t: -15, f: 0}, {t: -5, f: 0}] },
    { id: 'c2', nombre: 'Congelador 2', unidad: '°C', puntos: [{t: -25, f: 0}, {t: -15, f: 0}, {t: -5, f: 0}] },
    { id: 'amb', nombre: 'Temperatura Ambiente', unidad: '°C', puntos: [{t: 15, f: 0}, {t: 25, f: 0}, {t: 35, f: 0}] },
    { id: 'hum', nombre: 'Humedad Relativa', unidad: '% HR', puntos: [{t: 30, f: 0}, {t: 50, f: 0}, {t: 80, f: 0}] },
  ];

  const [equipos, setEquipos] = useState(DEFAULT_EQUIPOS);
  const [activeView, setActiveView] = useState('calculadora');
  const [selectedEqId, setSelectedEqId] = useState('r1');
  const [reading, setReading] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '', details: '' });

  useEffect(() => {
    fetchEquipos();
  }, [areaId]);

  const fetchEquipos = async () => {
    // Intentar cargar de Supabase
    const { data, error } = await supabase
      .from('equipos_calibracion')
      .select('*')
      .eq('area_id', areaId);
    
    if (data && data.length > 0) {
      setEquipos(data);
      setSelectedEqId(data[0].id);
    } else {
      // Fallback: Intentar cargar de LocalStorage si la DB falla o está vacía
      const localData = localStorage.getItem(`equipos_temp_${areaId}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        setEquipos(parsed);
        setSelectedEqId(parsed[0].id);
      } else {
        setEquipos(DEFAULT_EQUIPOS);
        setSelectedEqId(DEFAULT_EQUIPOS[0].id);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Guardar en LocalStorage siempre como respaldo inmediato
    localStorage.setItem(`equipos_temp_${areaId}`, JSON.stringify(equipos));
    
    try {
      const promises = equipos.map(async (eq) => {
        const { id, created_at, updated_at, ...cleanEq } = eq;
        const payload = {
          ...cleanEq,
          area_id: areaId,
          puntos: eq.puntos,
          updated_at: new Date().toISOString()
        };

        // Si el id es temporal (ej: r1, r2), buscamos si ya existe en DB por nombre en esta área
        if (typeof id === 'string' && id.length < 5) {
          const { data: existing } = await supabase
            .from('equipos_calibracion')
            .select('id')
            .eq('area_id', areaId)
            .eq('nombre', eq.nombre)
            .maybeSingle();

          if (existing) {
            return supabase.from('equipos_calibracion').update(payload).eq('id', existing.id);
          } else {
            return supabase.from('equipos_calibracion').insert(payload);
          }
        } else {
          // Si ya tiene un UUID real, actualizamos directamente
          return supabase.from('equipos_calibracion').update(payload).eq('id', id);
        }
      });

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        const firstError = errors[0].error;
        console.error('Errores al guardar en DB:', errors);
        setStatusModal({
          show: true,
          type: 'warning',
          message: 'Guardado Local Exitoso',
          details: `⚠️ Los factores se guardaron en este navegador, pero hubo un error con la nube: ${firstError.message}. Asegúrese de ejecutar el SQL en el dashboard.`
        });
      } else {
        setStatusModal({
          show: true,
          type: 'success',
          message: 'Configuración Guardada',
          details: '✅ Los factores han sido respaldados correctamente en la nube y localmente.'
        });
        await fetchEquipos(); 
      }
    } catch (e) {
      console.error(e);
      setStatusModal({
        show: true,
        type: 'error',
        message: 'Error de Conexión',
        details: 'No se pudo establecer conexión con el servidor. Se guardó localmente.'
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedEq = equipos.find(e => e.id === selectedEqId) || equipos[0];

  const getCorrectionFactor = (val, puntos) => {
    // Parseamos los puntos ya que ahora pueden venir como strings desde el input
    const pts = puntos.map(p => ({ t: parseFloat(p.t) || 0, f: parseFloat(p.f) || 0 })).sort((a, b) => a.t - b.t);
    if (val <= pts[0].t) return pts[0].f;
    if (val >= pts[pts.length - 1].t) return pts[pts.length - 1].f;

    for (let i = 0; i < pts.length - 1; i++) {
      if (val >= pts[i].t && val <= pts[i+1].t) {
        const x0 = pts[i].t, y0 = pts[i].f;
        const x1 = pts[i+1].t, y1 = pts[i+1].f;
        if (x1 === x0) return y0;
        return y0 + ((val - x0) * (y1 - y0)) / (x1 - x0);
      }
    }
    return 0;
  };

  const currentFactor = reading !== '' ? getCorrectionFactor(parseFloat(reading), selectedEq.puntos) : 0;
  const correctedValue = reading !== '' ? (parseFloat(reading) - currentFactor).toFixed(2) : '--';

  const updatePunto = (eqId, idx, field, val) => {
    // Permitimos que el valor sea un string para que el usuario pueda escribir el punto decimal
    setEquipos(prev => prev.map(eq => {
      if (eq.id === eqId) {
        const newPuntos = [...eq.puntos];
        newPuntos[idx] = { ...newPuntos[idx], [field]: val };
        return { ...eq, puntos: newPuntos };
      }
      return eq;
    }));
  };

  const updateNombre = (eqId, val) => {
    setEquipos(prev => prev.map(eq => eq.id === eqId ? { ...eq, nombre: val } : eq));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>
          <span className={`material-symbols-rounded ${styles.headerIcon}`} style={{color: '#F43F5E'}}>device_thermostat</span>
          Corrección Térmica - {areaName}
        </h2>
        <div style={{display:'flex', gap:'10px', marginTop:'15px', flexWrap: 'wrap'}}>
          <button 
            onClick={() => setActiveView('calculadora')}
            className={activeView === 'calculadora' ? styles.tabActive : styles.tab}
            style={{padding: '8px 20px', fontSize: '0.9rem'}}
          >
            <CalculatorIcon size={18} /> Calculadora
          </button>
          <button 
            onClick={() => setActiveView('config')}
            className={activeView === 'config' ? styles.tabActive : styles.tab}
            style={{padding: '8px 20px', fontSize: '0.9rem'}}
          >
            <Settings size={18} /> Factores Certificados
          </button>
        </div>
      </header>

      {activeView === 'calculadora' ? (
        <div className={styles.calcView}>
          <div className={styles.calcHeader} style={{background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)'}}>
            <span className="material-symbols-rounded" style={{color: '#F43F5E'}}>calculate</span>
            <h3>Calculadora de Lectura Real</h3>
          </div>
          <div className={styles.calcBody}>
            <div className={styles.inputGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'}}>
              <div className={styles.field}>
                <label>1. Seleccionar Equipo</label>
                <select 
                  className={styles.inputMinimal} 
                  value={selectedEqId} 
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  style={{width: '100%', height: '58px', fontSize: '1.1rem'}}
                >
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>2. Lectura ({selectedEq.unidad})</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  className={styles.inputMinimal} 
                  placeholder="0.00" 
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  style={{fontSize: '2.5rem', textAlign: 'center', height: '80px', border: '2px solid #E2E8F0', width: '100%'}}
                />
              </div>
            </div>

            <div className={styles.mainResult} style={{background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', border: '2px solid #E2E8F0', marginTop: '1.5rem', borderRadius: '32px', padding: '3rem 2rem'}}>
              <label style={{color: '#64748B', fontWeight: 800, letterSpacing: '1px'}}>VALOR REAL PARA BITÁCORA</label>
              <div className={styles.resultValue} style={{color: '#F43F5E', fontSize: '5rem', margin: '15px 0'}}>
                {correctedValue} <span style={{fontSize: '1.5rem', verticalAlign: 'middle'}}>{selectedEq.unidad}</span>
              </div>
              <div style={{display:'inline-flex', alignItems:'center', gap:'10px', padding:'8px 20px', background:'white', borderRadius:'100px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)', border:'1px solid #E2E8F0'}}>
                <span className="material-symbols-rounded" style={{fontSize:'18px', color:'#94A3B8'}}>analytics</span>
                <span style={{fontSize: '0.85rem', color: '#64748B', fontWeight: 700}}>
                  Factor: <strong style={{color:'#1E293B'}}>{currentFactor.toFixed(1)}</strong>
                </span>
              </div>
            </div>

            <div className={styles.formulaSection} style={{marginTop: '2.5rem', background: '#F1F5F9', padding: '1.5rem', borderRadius: '20px'}}>
              <h4 style={{marginBottom: '10px'}}><span className="material-symbols-rounded">info</span> Criterio de Corrección</h4>
              <p style={{fontSize: '0.85rem', color: '#475569', lineHeight: '1.6'}}>
                Cálculo basado en <strong>interpolación lineal de 3 puntos</strong> según certificado vigente.<br/>
                <strong>Fórmula aplicada:</strong> Lectura Real = Lectura Pantalla - Factor.<br/>
                <em>(Si el factor es positivo se resta, si es negativo se suma).</em>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.calcView}>
          <div className={styles.calcHeader} style={{background: '#F8FAFC', justifyContent: 'space-between'}}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
              <span className="material-symbols-rounded" style={{color: '#475569'}}>settings</span>
              <h3>Configuración de Certificados</h3>
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              style={{background: '#1E293B', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'}}
            >
              <span className="material-symbols-rounded" style={{fontSize: '20px'}}>{saving ? 'sync' : 'save'}</span>
              {saving ? 'Guardando...' : 'Guardar Factores'}
            </button>
          </div>
          <div className={styles.calcBody} style={{padding: '1.5rem'}}>
            <div className={styles.inputGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem'}}>
              {equipos.map(eq => (
                <div key={eq.id} className={styles.eqCard} style={{background: 'white', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                  <input 
                    type="text" 
                    value={eq.nombre} 
                    onChange={(e) => updateNombre(eq.id, e.target.value)}
                    style={{fontSize: '1.15rem', fontWeight: 900, border: 'none', borderBottom: '2px dashed #E2E8F0', marginBottom: '20px', width: '100%', outline: 'none', color: '#1E293B', background: 'transparent'}}
                    placeholder="Nombre del Equipo"
                  />
                  <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center'}}>
                    <span style={{fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', letterSpacing: '0.5px'}}>LECTURA CERTIFICADO</span>
                    <span style={{fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', letterSpacing: '0.5px'}}>FACTOR DE CORRECCIÓN</span>
                    {eq.puntos.map((p, i) => (
                      <React.Fragment key={i}>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={p.t} 
                          onChange={(e) => updatePunto(eq.id, i, 't', e.target.value)}
                          className={styles.inputMinimal} 
                          style={{padding: '10px', fontSize: '0.95rem', textAlign: 'center'}}
                        />
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={p.f} 
                          onChange={(e) => updatePunto(eq.id, i, 'f', e.target.value)}
                          className={styles.inputMinimal} 
                          style={{padding: '10px', fontSize: '0.95rem', textAlign: 'center', background: '#F0F9FF', borderColor: '#BAE6FD'}}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className={styles.infoBox} style={{marginTop: '2rem', background: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534'}}>
              <span className="material-symbols-rounded">verified</span>
              <p>Esta configuración es compartida para toda el área de {areaName}. Los cambios realizados afectarán a todos los usuarios que utilicen la calculadora en esta sede.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estado (Éxito/Error) - Diseño Premium */}
      {statusModal.show && (
        <div className={styles.modalOverlay} style={{zIndex: 5000, backdropFilter: 'blur(10px)'}}>
          <div className={styles.modalContent} style={{maxWidth: '400px', padding: '2.5rem', textAlign: 'center', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: statusModal.type === 'success' ? '#ECFDF5' : (statusModal.type === 'warning' ? '#FFFBEB' : '#FEF2F2'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <span className="material-symbols-rounded" style={{
                fontSize: '3rem', 
                color: statusModal.type === 'success' ? '#10B981' : (statusModal.type === 'warning' ? '#F59E0B' : '#EF4444')
              }}>
                {statusModal.type === 'success' ? 'check_circle' : (statusModal.type === 'warning' ? 'warning' : 'error')}
              </span>
            </div>
            
            <h3 style={{fontSize: '1.6rem', fontWeight: 900, marginBottom: '10px', color: '#1E293B'}}>
              {statusModal.message}
            </h3>
            <p style={{color: '#64748B', marginBottom: '2rem', lineHeight: '1.5', fontSize: '0.95rem'}}>{statusModal.details}</p>
            
            <button 
              className={styles.btnPrimarySmall} 
              style={{
                width: '100%', 
                padding: '18px', 
                background: statusModal.type === 'success' ? '#10B981' : (statusModal.type === 'warning' ? '#F59E0B' : '#EF4444'),
                borderRadius: '16px',
                fontSize: '1rem',
                fontWeight: 800,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
              }}
              onClick={() => setStatusModal({ ...statusModal, show: false })}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaTemperaturas;


