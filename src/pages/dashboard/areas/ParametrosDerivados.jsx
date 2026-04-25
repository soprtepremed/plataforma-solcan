import React, { useState } from 'react';
import styles from './QuimicaClinicaDashboard.module.css';

const ParametrosDerivados = () => {
  const [activeTab, setActiveTab] = useState('bil');

  // Estados adicionales para visualización en pantalla
  const [protRes, setProtRes] = useState({ glob: '--', ag: '--' });
  const [orinaRes, setOrinaRes] = useState({ dep: '--', sc: '--', exc: '--', unit: '' });
  const [vol24, setVol24] = useState('');
  const [orinaValues, setOrinaValues] = useState({});
  const [inmunoRes, setInmunoRes] = useState({ itl: '--', yp: '--', psa: '--' });

  // Estados para Bilirrubinas
  const [bil, setBil] = useState({ dbil: '', ibil: '', total: '--' });
  
  // Estados para Perfil Lipídico
  const [lip, setLip] = useState({ total: '', ldl: '', hdl: '', castelli1: '--', castelli2: '--', vldl: '--' });

  // Estados para BUN/Urea
  const [renal, setRenal] = useState({ urea: '', bun: '', autofill: null });

  // Lógica de cálculo (Bilirrubinas)
  const calcBil = (db, ib) => {
    const d = parseFloat(db); const i = parseFloat(ib);
    if (!isNaN(d) && !isNaN(i)) setBil(prev => ({ ...prev, dbil: db, ibil: ib, total: (d + i).toFixed(2) }));
    else setBil(prev => ({ ...prev, dbil: db, ibil: ib, total: '--' }));
  };

  // Lógica de cálculo (Lípidos)
  const calcLip = (t, l, h) => {
    const ct = parseFloat(t); const cldl = parseFloat(l); const chdl = parseFloat(h);
    let c1 = '--', c2 = '--', v = '--';
    if (chdl > 0) {
      if (!isNaN(ct)) c1 = (ct / chdl).toFixed(2);
      if (!isNaN(cldl)) c2 = (cldl / chdl).toFixed(2);
      if (!isNaN(ct) && !isNaN(cldl)) v = (ct - chdl - cldl).toFixed(1);
    }
    setLip({ total: t, ldl: l, hdl: h, castelli1: c1, castelli2: c2, vldl: v });
  };

  // Lógica de cálculo (BUN/Urea)
  const handleRenalChange = (val, type) => {
    const num = parseFloat(val);
    if (type === 'urea') {
      if (!isNaN(num)) setRenal({ urea: val, bun: (num / 2.14).toFixed(2), autofill: 'bun' });
      else setRenal({ urea: val, bun: '', autofill: null });
    } else {
      if (!isNaN(num)) setRenal({ bun: val, urea: (num * 2.14).toFixed(2), autofill: 'urea' });
      else setRenal({ bun: val, urea: '', autofill: null });
    }
  };

  // Lógica Proteínas
  const calcProt = (ptVal, alVal) => {
    const pt = parseFloat(ptVal); const al = parseFloat(alVal);
    if (!isNaN(pt) && !isNaN(al)) {
      const g = (pt - al).toFixed(2);
      setProtRes({ glob: g, ag: (al / parseFloat(g)).toFixed(2) });
    } else setProtRes({ glob: '--', ag: '--' });
  };

  // Lógica Orinas 24h (Depuración)
  const calcDep = (p, t, v, co, cs) => {
    const peso = parseFloat(p); const talla = parseFloat(t); const vol = parseFloat(v);
    const coVal = parseFloat(co); const csVal = parseFloat(cs);
    if (peso && talla && vol && coVal && csVal) {
      const scVal = Math.sqrt((peso * talla) / 3600);
      const res = ((vol / 1440) * (coVal / csVal) * (1.73 / scVal)).toFixed(1);
      setOrinaRes(prev => ({ ...prev, dep: res, sc: scVal.toFixed(2) }));
    } else setOrinaRes(prev => ({ ...prev, dep: '--', sc: '--' }));
  };

  // Lógica Inmuno
  const calcInmuno = (t4, t3, pl, pt) => {
    const t4v = parseFloat(t4); const t3v = parseFloat(t3);
    const plv = parseFloat(pl); const ptv = parseFloat(pt);
    let res = { itl: '--', yp: '--', psa: '--' };
    if (t4v && t3v) {
      res.itl = (t4v / 3.33 * t3v).toFixed(2);
      res.yp = (t4v * 0.654).toFixed(2);
    }
    if (plv && ptv) res.psa = ((plv / ptv) * 100).toFixed(1);
    setInmunoRes(res);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    const toast = document.createElement('div');
    toast.className = styles.toast;
    toast.innerText = `¡${label} copiado!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <span className={`material-symbols-rounded ${styles.headerIcon}`} style={{background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color:'white'}}>calculate</span>
          <div>
            <h2>Parámetros Derivados</h2>
            <p>Suite de Cálculos Clínicos Especializados</p>
          </div>
        </div>
      </header>

      {/* Selector de Pestañas Estilo Solcan */}
      <div className={styles.tabBar}>
        <button className={activeTab === 'bil' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('bil')}>
          <span className="material-symbols-rounded">opacity</span> Bilirrubinas
        </button>
        <button className={activeTab === 'lip' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('lip')}>
          <span className="material-symbols-rounded">water_drop</span> Perfil Lipídico
        </button>
        <button className={activeTab === 'proteinas' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('proteinas')}>
          <span className="material-symbols-rounded">egg</span> Proteínas
        </button>
        <button className={activeTab === 'renal' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('renal')}>
          <span className="material-symbols-rounded">biotech</span> Renal (BUN/Urea)
        </button>
        <button className={activeTab === 'orinas' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('orinas')}>
          <span className="material-symbols-rounded">history_toggle_off</span> Orinas 24h
        </button>
        <button className={activeTab === 'inmuno' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('inmuno')}>
          <span className="material-symbols-rounded">vaccines</span> Inmunología
        </button>
      </div>

      <div className={styles.calculatorContent}>
        
        {activeTab === 'proteinas' && (
          <div className={styles.calcView} style={{animation: 'slideIn 0.3s ease-out'}}>
            <div className={styles.calcHeader}>
              <span className="material-symbols-rounded" style={{color: '#8B5CF6'}}>Egg</span>
              <h3>Fraccionamiento de Proteínas</h3>
            </div>
            <div className={styles.calcBody}>
              <div className={styles.inputGrid}>
                <div className={styles.field}>
                  <label>Proteínas Totales</label>
                  <div className={styles.inputWithUnit}>
                    <input type="number" onChange={(e) => calcProt(e.target.value, document.getElementById('albSer').value)} id="protTot" placeholder="0.0" className={styles.inputMinimal} />
                    <span>g/dL</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Albúmina</label>
                  <div className={styles.inputWithUnit}>
                    <input type="number" onChange={(e) => calcProt(document.getElementById('protTot').value, e.target.value)} id="albSer" placeholder="0.0" className={styles.inputMinimal} />
                    <span>g/dL</span>
                  </div>
                </div>
              </div>

              <div className={styles.resultsRow} style={{background: '#F5F3FF', marginBottom: '20px'}}>
                <div className={styles.subResult}>
                  <label>Globulinas</label>
                  <div className={styles.val}>{protRes.glob} <span>g/dL</span></div>
                </div>
                <div className={styles.subResult}>
                  <label>Relación A/G</label>
                  <div className={styles.val}>{protRes.ag}</div>
                </div>
              </div>

              <div style={{display:'flex', gap:'15px', marginBottom: '20px'}}>
                <button className={styles.btnPrimarySmall} style={{flex: 1, marginBottom: 0}} onClick={() => {
                  calcProt(document.getElementById('protTot').value, document.getElementById('albSer').value);
                }}>
                  <span className="material-symbols-rounded">calculate</span> Calcular Parámetros
                </button>
                <button className={styles.btnCopyAction} style={{flex: 1}} onClick={() => {
                  copyToClipboard(`Globulinas: ${protRes.glob} g/dL, Relación A/G: ${protRes.ag}`, 'Perfil Proteico');
                }}>
                  <span className="material-symbols-rounded">content_copy</span> Copiar Resultados
                </button>
              </div>
              
              <div className={styles.infoBox} style={{background: '#F5F3FF', borderColor: '#DDD6FE', color: '#5B21B6'}}>
                <span className="material-symbols-rounded">info</span>
                <p>La Globulina se obtiene por diferencia técnica (PT - ALB). La relación A/G normal suele oscilar entre 1.0 y 2.0.</p>
              </div>

              {/* Fórmulas de Referencia Detalladas */}
              <div className={styles.formulaSection}>
                <h4><span className="material-symbols-rounded">menu_book</span> Glosario y Fórmulas de Referencia</h4>
                <div className={styles.formulaList}>
                  <div className={styles.formulaItem}>
                    <label>Globulinas (g/dL)</label>
                    <code>Proteínas Totales - Albúmina</code>
                    <p style={{fontSize:'0.7rem', color:'#64748B', marginTop:'4px'}}>Representa la fracción de proteínas no constituidas por albúmina.</p>
                  </div>
                  <div className={styles.formulaItem}>
                    <label>Relación Albúmina/Globulina (A/G)</label>
                    <code>Albúmina / Globulinas</code>
                    <p style={{fontSize:'0.7rem', color:'#64748B', marginTop:'4px'}}>Evaluación del balance proteico en suero.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orinas' && (
          <div className={styles.calcView} style={{animation: 'slideIn 0.3s ease-out'}}>
            <div className={styles.calcHeader}>
              <span className="material-symbols-rounded" style={{color: '#8B5CF6'}}>history_toggle_off</span>
              <h3>Suite de Orinas (24h y Osmolaridad)</h3>
            </div>
             <div className={styles.calcBody}>
              {/* Volumen Global 24h */}
              <div className={styles.field} style={{maxWidth: '300px', marginBottom: '2rem'}}>
                <label style={{color: '#8B5CF6'}}>Volumen Total (24h)</label>
                <div className={styles.inputWithUnit}>
                  <input type="number" value={vol24} onChange={(e) => setVol24(e.target.value)} placeholder="Ej: 1500" className={styles.inputMinimal} style={{borderColor: '#8B5CF6', background: '#F5F3FF'}} />
                  <span style={{color: '#8B5CF6'}}>mL</span>
                </div>
              </div>

              {/* Sección de Depuración */}
              <div style={{marginBottom: '2rem', borderBottom: '2px dashed #E2E8F0', paddingBottom: '2rem'}}>
                <h4 style={{marginBottom: '1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="material-symbols-rounded" style={{color: '#8B5CF6'}}>analytics</span> 1. Depuración de Creatinina (Clearence)
                </h4>
                <div className={styles.inputGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'}}>
                  <div className={styles.field}><label>Peso (kg)</label><input type="number" id="peso" placeholder="0" className={styles.inputMinimal} /></div>
                  <div className={styles.field}><label>Estatura (cm)</label><input type="number" id="talla" placeholder="0" className={styles.inputMinimal} /></div>
                  <div className={styles.field}><label>Crea Orina</label><input type="number" id="creaOrina" placeholder="0" className={styles.inputMinimal} /></div>
                  <div className={styles.field}><label>Crea Suero</label><input type="number" id="creaSuero" placeholder="0" className={styles.inputMinimal} /></div>
                </div>
                
                <div className={styles.resultsRow} style={{background: '#F5F3FF', marginTop: '15px', marginBottom: '15px'}}>
                  <div className={styles.subResult}>
                    <label>Depuración Final</label>
                    <div className={styles.val}>{orinaRes.dep} <span>mL/min</span></div>
                  </div>
                  <div className={styles.subResult}>
                    <label>Superficie Corp.</label>
                    <div className={styles.val}>{orinaRes.sc} <span>m²</span></div>
                  </div>
                </div>

                 <div style={{display:'flex', gap:'15px', marginBottom: '15px'}}>
                  <button className={styles.btnPrimarySmall} style={{flex: 1, marginBottom: 0}} onClick={() => {
                    calcDep(document.getElementById('peso').value, document.getElementById('talla').value, vol24, document.getElementById('creaOrina').value, document.getElementById('creaSuero').value);
                  }}>
                    <span className="material-symbols-rounded">calculate</span> Calcular Depuración
                  </button>
                  <button className={styles.btnAction} style={{flex: 1, height: 'auto', padding: '10px'}} onClick={() => {
                    copyToClipboard(`Depuración de Creatinina: ${orinaRes.dep} mL/min (S.C: ${orinaRes.sc} m²)`, 'Depuración');
                  }}>
                    <span className="material-symbols-rounded">content_copy</span> Copiar
                  </button>
                </div>
              </div>

              {/* Sección de Excreción Individualizada */}
              <div>
                <h4 style={{marginBottom: '1.5rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="material-symbols-rounded" style={{color: '#8B5CF6'}}>grid_view</span> 2. Cálculos por Analito Individual
                </h4>
                
                <div className={styles.inputGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem'}}>
                  {/* Calcio */}
                  <div className={styles.eqCard} style={{background: '#FDF2F8', borderColor: '#FBCFE8'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <label style={{color:'#BE185D', fontWeight:'800', fontSize:'0.75rem'}}>CALCIO (mg/24h)</label>
                      <span className="material-symbols-rounded" style={{color:'#BE185D', fontSize:'1.2rem'}}>science</span>
                    </div>
                    <input type="number" placeholder="Valor Vitros" className={styles.inputMinimal} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const vol = parseFloat(vol24);
                      if(val && vol) setOrinaValues(prev => ({...prev, ca: ((val * vol) / 100).toFixed(2)}));
                      else setOrinaValues(prev => ({...prev, ca: '--'}));
                    }} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                      <div style={{fontSize:'1.4rem', fontWeight:'900', color:'#1E293B'}}>{orinaValues.ca || '--'} <span style={{fontSize:'0.7rem', color:'#64748B'}}>mg/24h</span></div>
                      <button className={styles.btnAction} style={{width:'32px', height:'32px', padding:0}} onClick={() => copyToClipboard(`Calcio 24h: ${orinaValues.ca} mg/24h`, 'Calcio')}>
                        <span className="material-symbols-rounded" style={{fontSize:'1.1rem'}}>content_copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Proteínas */}
                  <div className={styles.eqCard} style={{background: '#F5F3FF', borderColor: '#DDD6FE'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <label style={{color:'#6D28D9', fontWeight:'800', fontSize:'0.75rem'}}>PROTEÍNAS (mg/24h)</label>
                      <span className="material-symbols-rounded" style={{color:'#6D28D9', fontSize:'1.2rem'}}>water_drop</span>
                    </div>
                    <input type="number" placeholder="Valor Vitros" className={styles.inputMinimal} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const vol = parseFloat(vol24);
                      if(val && vol) setOrinaValues(prev => ({...prev, pro: ((val * vol) / 100).toFixed(1)}));
                      else setOrinaValues(prev => ({...prev, pro: '--'}));
                    }} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                      <div style={{fontSize:'1.4rem', fontWeight:'900', color:'#1E293B'}}>{orinaValues.pro || '--'} <span style={{fontSize:'0.7rem', color:'#64748B'}}>mg/24h</span></div>
                      <button className={styles.btnAction} style={{width:'32px', height:'32px', padding:0}} onClick={() => copyToClipboard(`Proteínas 24h: ${orinaValues.pro} mg/24h`, 'Proteínas')}>
                        <span className="material-symbols-rounded" style={{fontSize:'1.1rem'}}>content_copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Creatinina */}
                  <div className={styles.eqCard} style={{background: '#F0F9FF', borderColor: '#BAE6FD'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <label style={{color:'#0369A1', fontWeight:'800', fontSize:'0.75rem'}}>CREATININA (mg/24h)</label>
                      <span className="material-symbols-rounded" style={{color:'#0369A1', fontSize:'1.2rem'}}>biotech</span>
                    </div>
                    <input type="number" placeholder="Valor Vitros" className={styles.inputMinimal} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const vol = parseFloat(vol24);
                      if(val && vol) setOrinaValues(prev => ({...prev, crea: ((val * vol) / 100).toFixed(0)}));
                      else setOrinaValues(prev => ({...prev, crea: '--'}));
                    }} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                      <div style={{fontSize:'1.4rem', fontWeight:'900', color:'#1E293B'}}>{orinaValues.crea || '--'} <span style={{fontSize:'0.7rem', color:'#64748B'}}>mg/24h</span></div>
                      <button className={styles.btnAction} style={{width:'32px', height:'32px', padding:0}} onClick={() => copyToClipboard(`Creatinina 24h: ${orinaValues.crea} mg/24h`, 'Creatinina')}>
                        <span className="material-symbols-rounded" style={{fontSize:'1.1rem'}}>content_copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Urea */}
                  <div className={styles.eqCard} style={{background: '#FFF7ED', borderColor: '#FFEDD5'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <label style={{color:'#C2410C', fontWeight:'800', fontSize:'0.75rem'}}>UREA (g/24h)</label>
                      <span className="material-symbols-rounded" style={{color:'#C2410C', fontSize:'1.2rem'}}>scale</span>
                    </div>
                    <input type="number" placeholder="Valor Vitros" className={styles.inputMinimal} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const vol = parseFloat(vol24);
                      if(val && vol) setOrinaValues(prev => ({...prev, urea: ((val * 2.14 * vol) / 100000).toFixed(2)}));
                      else setOrinaValues(prev => ({...prev, urea: '--'}));
                    }} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                      <div style={{fontSize:'1.4rem', fontWeight:'900', color:'#1E293B'}}>{orinaValues.urea || '--'} <span style={{fontSize:'0.7rem', color:'#64748B'}}>g/24h</span></div>
                      <button className={styles.btnAction} style={{width:'32px', height:'32px', padding:0}} onClick={() => copyToClipboard(`Urea 24h: ${orinaValues.urea} g/24h`, 'Urea')}>
                        <span className="material-symbols-rounded" style={{fontSize:'1.1rem'}}>content_copy</span>
                      </button>
                    </div>
                  </div>
                  {/* Ácido Úrico */}
                  <div className={styles.eqCard} style={{background: '#F0FDF4', borderColor: '#BBF7D0'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <label style={{color:'#15803D', fontWeight:'800', fontSize:'0.75rem'}}>ÁCIDO ÚRICO (mg/24h)</label>
                      <span className="material-symbols-rounded" style={{color:'#15803D', fontSize:'1.2rem'}}>water</span>
                    </div>
                    <input type="number" placeholder="Valor Vitros" className={styles.inputMinimal} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const vol = parseFloat(vol24);
                      if(val && vol) setOrinaValues(prev => ({...prev, urico: ((val * vol) / 100).toFixed(1)}));
                      else setOrinaValues(prev => ({...prev, urico: '--'}));
                    }} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                      <div style={{fontSize:'1.4rem', fontWeight:'900', color:'#1E293B'}}>{orinaValues.urico || '--'} <span style={{fontSize:'0.7rem', color:'#64748B'}}>mg/24h</span></div>
                      <button className={styles.btnAction} style={{width:'32px', height:'32px', padding:0}} onClick={() => copyToClipboard(`Ácido Úrico 24h: ${orinaValues.urico} mg/24h`, 'Ácido Úrico')}>
                        <span className="material-symbols-rounded" style={{fontSize:'1.1rem'}}>content_copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Sodio */}
                  <div className={styles.eqCard} style={{background: '#FEF2F2', borderColor: '#FECACA'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <label style={{color:'#B91C1C', fontWeight:'800', fontSize:'0.75rem'}}>SODIO (mmol/24h)</label>
                      <span className="material-symbols-rounded" style={{color:'#B91C1C', fontSize:'1.2rem'}}>bolt</span>
                    </div>
                    <input type="number" placeholder="Valor Vitros" className={styles.inputMinimal} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const vol = parseFloat(vol24);
                      if(val && vol) setOrinaValues(prev => ({...prev, na: ((val * vol) / 1000).toFixed(1)}));
                      else setOrinaValues(prev => ({...prev, na: '--'}));
                    }} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                      <div style={{fontSize:'1.4rem', fontWeight:'900', color:'#1E293B'}}>{orinaValues.na || '--'} <span style={{fontSize:'0.7rem', color:'#64748B'}}>mmol/24h</span></div>
                      <button className={styles.btnAction} style={{width:'32px', height:'32px', padding:0}} onClick={() => copyToClipboard(`Sodio 24h: ${orinaValues.na} mmol/24h`, 'Sodio')}>
                        <span className="material-symbols-rounded" style={{fontSize:'1.1rem'}}>content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.infoBox} style={{marginTop: '2rem'}}>
                  <span className="material-symbols-rounded">info</span>
                  <p>Ingresa el Volumen Total una sola vez al inicio para que todos los cálculos se actualicen automáticamente. Los factores de conversión se aplican según el analito seleccionado.</p>
                </div>

                {/* Fórmulas de Referencia Detalladas para Orina */}
                <div className={styles.formulaSection}>
                  <h4><span className="material-symbols-rounded">menu_book</span> Glosario y Fórmulas de Referencia (Orina 24h)</h4>
                  <div className={styles.formulaList} style={{gridTemplateColumns: '1fr'}}>
                    <div className={styles.formulaItem}>
                      <label>1. Depuración de Creatinina (Clearance)</label>
                      <code style={{display:'block', marginBottom:'8px'}}>((Volumen Total / 1440) × (Creatinina Orina / Creatinina Suero)) × (1.73 / Superficie Corporal)</code>
                      <p style={{fontSize:'0.7rem', color:'#64748B'}}>Superficie Corporal = √((Peso × Estatura) / 3600). Ajustado a 1.73 m² estándar.</p>
                    </div>
                    <div className={styles.formulaItem}>
                      <label>2. Excreción de Analitos (mg/24h)</label>
                      <code style={{display:'block', marginBottom:'8px'}}>(Resultado del Equipo × Volumen Total) / 100</code>
                      <p style={{fontSize:'0.7rem', color:'#64748B'}}>Aplica para: Calcio, Proteínas, Creatinina, Ácido Úrico, Magnesio.</p>
                    </div>
                    <div className={styles.formulaItem}>
                      <label>3. Urea en Orina (g/24h)</label>
                      <code>(Valor Vitros × 2.14 × Volumen Total) / 100000</code>
                      <p style={{fontSize:'0.7rem', color:'#64748B'}}>Convierte el nitrógeno ureico (BUN) a Urea total eliminada en gramos.</p>
                    </div>
                    <div className={styles.formulaItem}>
                      <label>4. Electrolitos (mmol/24h)</label>
                      <code>(Valor Vitros × Volumen Total) / 1000</code>
                      <p style={{fontSize:'0.7rem', color:'#64748B'}}>Aplica para: Sodio, Potasio y Cloro.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inmuno' && (
          <div className={styles.calcView} style={{animation: 'slideIn 0.3s ease-out'}}>
            <div className={styles.calcHeader}>
              <span className="material-symbols-rounded" style={{color: '#10B981'}}>vaccines</span>
              <h3>Cálculos para Inmunología</h3>
            </div>
            <div className={styles.calcBody}>
              <div className={styles.inputGrid}>
                <div className={styles.field}><label>T4 Total</label><input type="number" id="t4t" onChange={() => calcInmuno(document.getElementById('t4t').value, document.getElementById('t3u').value, document.getElementById('psaL').value, document.getElementById('psaT').value)} className={styles.inputMinimal} /></div>
                <div className={styles.field}><label>T3 Uptake</label><input type="number" id="t3u" onChange={() => calcInmuno(document.getElementById('t4t').value, document.getElementById('t3u').value, document.getElementById('psaL').value, document.getElementById('psaT').value)} className={styles.inputMinimal} /></div>
                <div className={styles.field}><label>PSA Libre</label><input type="number" id="psaL" onChange={() => calcInmuno(document.getElementById('t4t').value, document.getElementById('t3u').value, document.getElementById('psaL').value, document.getElementById('psaT').value)} className={styles.inputMinimal} /></div>
                <div className={styles.field}><label>PSA Total</label><input type="number" id="psaT" onChange={() => calcInmuno(document.getElementById('t4t').value, document.getElementById('t3u').value, document.getElementById('psaL').value, document.getElementById('psaT').value)} className={styles.inputMinimal} /></div>
              </div>

              <div className={styles.resultsRow} style={{background: '#ECFDF5', marginBottom: '20px', gap: '10px'}}>
                <div className={styles.subResult}>
                  <label>ITL</label>
                  <div className={styles.val}>{inmunoRes.itl}</div>
                </div>
                <div className={styles.subResult}>
                  <label>Yodo Proteico</label>
                  <div className={styles.val}>{inmunoRes.yp} <span>ug/dL</span></div>
                </div>
                <div className={styles.subResult}>
                  <label>% PSA Libre</label>
                  <div className={styles.val}>{inmunoRes.psa} <span>%</span></div>
                </div>
              </div>

               <div style={{display:'flex', gap:'15px', flexWrap: 'wrap'}}>
                <button className={styles.btnPrimarySmall} style={{flex: '1 1 100%', marginBottom: '10px', background: 'linear-gradient(135deg, #10B981, #059669)'}} onClick={() => {
                  calcInmuno(document.getElementById('t4t').value, document.getElementById('t3u').value, document.getElementById('psaL').value, document.getElementById('psaT').value);
                }}>
                  <span className="material-symbols-rounded">calculate</span> Calcular Inmunología
                </button>
                <button className={styles.btnAction} style={{flex: 1, height: 'auto', padding: '10px'}} onClick={() => {
                  copyToClipboard(`ITL: ${inmunoRes.itl}, Yodo Proteico (YP): ${inmunoRes.yp} ug/dL`, 'Perfil Tiroideo');
                }}>
                  <span className="material-symbols-rounded">content_copy</span> Perfil Tiroideo
                </button>
                <button className={styles.btnAction} style={{flex: 1, height: 'auto', padding: '10px'}} onClick={() => {
                  copyToClipboard(`% PSA Libre: ${inmunoRes.psa}%`, 'PSA');
                }}>
                  <span className="material-symbols-rounded">content_copy</span> % PSA Libre
                </button>
              </div>

              {/* Fórmulas de Referencia Detalladas Inmunología */}
              <div className={styles.formulaSection}>
                <h4><span className="material-symbols-rounded">menu_book</span> Glosario y Fórmulas de Referencia (Inmunología)</h4>
                <div className={styles.formulaList}>
                  <div className={styles.formulaItem}>
                    <label>Índice de Tiroxina Libre (ITL)</label>
                    <code>(T4 Total / 3.33) × T3 Uptake</code>
                  </div>
                  <div className={styles.formulaItem}>
                    <label>Yodo Proteico (YP)</label>
                    <code>T4 Total × 0.654</code>
                  </div>
                  <div className={styles.formulaItem}>
                    <label>Porcentaje de PSA Libre</label>
                    <code>(PSA Libre / PSA Total) × 100</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'bil' && (
          <div className={styles.calcView} style={{animation: 'slideIn 0.3s ease-out'}}>
            <div className={styles.calcHeader}>
              <span className="material-symbols-rounded" style={{color: '#0EA5E9'}}>opacity</span>
              <h3>Cálculo de Bilirrubina Total</h3>
            </div>
            <div className={styles.calcBody}>
              <div className={styles.inputGrid}>
                <div className={styles.field}>
                  <label>Bilirrubina Directa</label>
                  <div className={styles.inputWithUnit}>
                    <input type="number" value={bil.dbil} onChange={e => calcBil(e.target.value, bil.ibil)} placeholder="0.00" />
                    <span>mg/dL</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Bilirrubina Indirecta</label>
                  <div className={styles.inputWithUnit}>
                    <input type="number" value={bil.ibil} onChange={e => calcBil(bil.dbil, e.target.value)} placeholder="0.00" />
                    <span>mg/dL</span>
                  </div>
                </div>
              </div>
              <div className={styles.mainResult} style={{background: '#F0F9FF', border: '1px solid #BAE6FD'}}>
                <label>Bilirrubina Total Calculada</label>
                <div className={styles.resultValue}>{bil.total} <span>mg/dL</span></div>
                 <div style={{display:'flex', gap:'15px', marginTop: '20px'}}>
                  <button className={styles.btnPrimarySmall} style={{flex: 1, marginBottom: 0, background: 'linear-gradient(135deg, #0EA5E9, #0284C7)'}} onClick={() => calcBil(bil.dbil, bil.ibil)}>
                    <span className="material-symbols-rounded">calculate</span> Calcular Total
                  </button>
                  <button className={styles.btnCopyAction} style={{flex: 1}} onClick={() => copyToClipboard(`BT: ${bil.total} mg/dL`, 'Bilirrubina Total')}>
                    <span className="material-symbols-rounded">content_copy</span> Copiar
                  </button>
                </div>

                {/* Fórmulas de Referencia Detalladas Bilirrubinas */}
                <div className={styles.formulaSection}>
                  <h4><span className="material-symbols-rounded">menu_book</span> Glosario y Fórmulas de Referencia</h4>
                  <div className={styles.formulaList}>
                    <div className={styles.formulaItem}>
                      <label>Bilirrubina Total (mg/dL)</label>
                      <code>Bilirrubina Directa + Bilirrubina Indirecta</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lip' && (
          <div className={styles.calcView} style={{animation: 'slideIn 0.3s ease-out'}}>
            <div className={styles.calcHeader}>
              <span className="material-symbols-rounded" style={{color: '#E11D48'}}>water_drop</span>
              <h3>Perfil Lipídico e Índices Aterogénicos</h3>
            </div>
            <div className={styles.calcBody}>
              <div className={styles.inputGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'}}>
                <div className={styles.field}>
                  <label>Colesterol Total</label>
                  <div className={styles.inputWithUnit}><input type="number" value={lip.total} onChange={e => calcLip(e.target.value, lip.ldl, lip.hdl)} placeholder="0" /><span>mg/dL</span></div>
                </div>
                <div className={styles.field}>
                  <label>LDL</label>
                  <div className={styles.inputWithUnit}><input type="number" value={lip.ldl} onChange={e => calcLip(lip.total, e.target.value, lip.hdl)} placeholder="0" /><span>mg/dL</span></div>
                </div>
                <div className={styles.field}>
                  <label>HDL</label>
                  <div className={styles.inputWithUnit}><input type="number" value={lip.hdl} onChange={e => calcLip(lip.total, lip.ldl, e.target.value)} placeholder="0" /><span>mg/dL</span></div>
                </div>
              </div>
              <div className={styles.resultsRow}>
                <div className={styles.subResult}>
                  <label>Castelli I</label>
                  <div className={styles.val}>{lip.castelli1}</div>
                </div>
                <div className={styles.subResult}>
                  <label>Castelli II</label>
                  <div className={styles.val}>{lip.castelli2}</div>
                </div>
                <div className={styles.subResult}>
                  <label>VLDL</label>
                  <div className={styles.val}>{lip.vldl} <span>mg/dL</span></div>
                </div>
              </div>
               <div style={{display:'flex', gap:'15px', marginTop: '20px'}}>
                <button className={styles.btnPrimarySmall} style={{flex: 1, marginBottom: 0, background: 'linear-gradient(135deg, #E11D48, #BE123C)'}} onClick={() => calcLip(lip.total, lip.ldl, lip.hdl)}>
                  <span className="material-symbols-rounded">calculate</span> Calcular Índices
                </button>
                <button className={styles.btnCopyAction} style={{flex: 1}} onClick={() => copyToClipboard(`Indices Lipídicos:\nCastelli I: ${lip.castelli1}\nCastelli II: ${lip.castelli2}\nVLDL: ${lip.vldl} mg/dL`, 'Perfil Lipídico')}>
                  <span className="material-symbols-rounded">content_copy</span> Copiar Todo
                </button>
              </div>

              {/* Fórmulas de Referencia Detalladas Lípidos */}
              <div className={styles.formulaSection}>
                <h4><span className="material-symbols-rounded">menu_book</span> Glosario y Fórmulas de Referencia</h4>
                <div className={styles.formulaList}>
                  <div className={styles.formulaItem}>
                    <label>Castelli I (Riesgo Coronario)</label>
                    <code>Colesterol Total / Colesterol HDL</code>
                  </div>
                  <div className={styles.formulaItem}>
                    <label>Castelli II (Riesgo Aterogénico)</label>
                    <code>Colesterol LDL / Colesterol HDL</code>
                  </div>
                  <div className={styles.formulaItem}>
                    <label>VLDL (Lipoproteína de Muy Baja Densidad)</label>
                    <code>Colesterol Total - Colesterol HDL - Colesterol LDL</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'renal' && (
          <div className={styles.calcView} style={{animation: 'slideIn 0.3s ease-out'}}>
            <div className={styles.calcHeader}>
              <span className="material-symbols-rounded" style={{color: '#D97706'}}>biotech</span>
              <h3>Conversión BUN / Urea (2.14)</h3>
            </div>
            <div className={styles.calcBody}>
              <div className={styles.inputGrid}>
                <div className={styles.field}>
                  <label>Urea</label>
                  <div className={`${styles.inputWithUnit} ${renal.autofill === 'urea' ? styles.autofilled : ''}`}>
                    <input type="number" value={renal.urea} onChange={e => handleRenalChange(e.target.value, 'urea')} placeholder="0.00" />
                    <span>mg/dL</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>BUN</label>
                  <div className={`${styles.inputWithUnit} ${renal.autofill === 'bun' ? styles.autofilled : ''}`}>
                    <input type="number" value={renal.bun} onChange={e => handleRenalChange(e.target.value, 'bun')} placeholder="0.00" />
                    <span>mg/dL</span>
                  </div>
                </div>
              </div>
              <div className={styles.infoBox}>
                <span className="material-symbols-rounded">info</span>
                <p>Al ingresar un valor, el otro se calcula automáticamente aplicando el factor de conversión 2.14.</p>
              </div>
               <div style={{display:'flex', gap:'15px', marginTop: '20px'}}>
                <button className={styles.btnPrimarySmall} style={{flex: 1, marginBottom: 0, background: 'linear-gradient(135deg, #D97706, #B45309)'}} onClick={() => {
                  if (renal.autofill === 'bun') handleRenalChange(renal.urea, 'urea');
                  else if (renal.autofill === 'urea') handleRenalChange(renal.bun, 'bun');
                  else {
                    // Si ambos están vacíos o no hay autofill claro, forzar urea -> bun
                    handleRenalChange(renal.urea, 'urea');
                  }
                }}>
                  <span className="material-symbols-rounded">calculate</span> Calcular
                </button>
                <button className={styles.btnCopyAction} style={{flex: 1}} onClick={() => copyToClipboard(`Urea: ${renal.urea} mg/dL, BUN: ${renal.bun} mg/dL`, 'Perfil Renal')}>
                  <span className="material-symbols-rounded">content_copy</span> Copiar
                </button>
              </div>

              {/* Fórmulas de Referencia Detalladas Renal */}
              <div className={styles.formulaSection}>
                <h4><span className="material-symbols-rounded">menu_book</span> Glosario y Fórmulas de Referencia</h4>
                <div className={styles.formulaList}>
                  <div className={styles.formulaItem}>
                    <label>Conversión Nitrógeno Ureico (BUN)</label>
                    <code>BUN = Urea / 2.14</code>
                    <p style={{fontSize:'0.7rem', color:'#64748B', marginTop:'4px'}}>Factor técnico estandarizado basado en el peso molecular.</p>
                  </div>
                  <div className={styles.formulaItem}>
                    <label>Cálculo de Urea</label>
                    <code>Urea = BUN × 2.14</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParametrosDerivados;
