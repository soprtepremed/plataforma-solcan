import React, { useState } from 'react';
import styles from './QuimicaClinicaDashboard.module.css';

const ParametrosDerivados = () => {
  const [activeTab, setActiveTab] = useState('bil');

  // Estados adicionales para visualización en pantalla
  const [protRes, setProtRes] = useState({ glob: '--', ag: '--' });
  const [orinaRes, setOrinaRes] = useState({ dep: '--', sc: '--', exc: '--', unit: '' });
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
          <span className="material-symbols-rounded">Egg</span> Proteínas
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

              <button className={styles.btnCopyAction} style={{width: '100%', marginBottom: '20px'}} onClick={() => {
                copyToClipboard(`Globulinas: ${protRes.glob} g/dL, Relación A/G: ${protRes.ag}`, 'Perfil Proteico');
              }}>Copiar Resultados</button>
              
              <div className={styles.infoBox} style={{background: '#F5F3FF', borderColor: '#DDD6FE', color: '#5B21B6'}}>
                <span className="material-symbols-rounded">info</span>
                <p>La Globulina se obtiene por diferencia técnica (PT - ALB). La relación A/G normal suele oscilar entre 1.0 y 2.0.</p>
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
              {/* Sección de Depuración */}
              <div style={{marginBottom: '2rem', borderBottom: '2px dashed #E2E8F0', paddingBottom: '2rem'}}>
                <h4 style={{marginBottom: '1rem', color: '#1E293B'}}>1. Depuración de Creatinina (Clearence)</h4>
                <div className={styles.inputGrid} style={{gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'}}>
                  <div className={styles.field}><label>Peso (kg)</label><input type="number" id="peso" onChange={() => calcDep(document.getElementById('peso').value, document.getElementById('talla').value, document.getElementById('volTotal').value, document.getElementById('creaOrina').value, document.getElementById('creaSuero').value)} placeholder="0" className={styles.inputMinimal} /></div>
                  <div className={styles.field}><label>Estatura (cm)</label><input type="number" id="talla" onChange={() => calcDep(document.getElementById('peso').value, document.getElementById('talla').value, document.getElementById('volTotal').value, document.getElementById('creaOrina').value, document.getElementById('creaSuero').value)} placeholder="0" className={styles.inputMinimal} /></div>
                  <div className={styles.field}><label>Vol. Total (mL)</label><input type="number" id="volTotal" onChange={() => calcDep(document.getElementById('peso').value, document.getElementById('talla').value, document.getElementById('volTotal').value, document.getElementById('creaOrina').value, document.getElementById('creaSuero').value)} placeholder="0" className={styles.inputMinimal} /></div>
                  <div className={styles.field}><label>Crea Orina</label><input type="number" id="creaOrina" onChange={() => calcDep(document.getElementById('peso').value, document.getElementById('talla').value, document.getElementById('volTotal').value, document.getElementById('creaOrina').value, document.getElementById('creaSuero').value)} placeholder="0" className={styles.inputMinimal} /></div>
                  <div className={styles.field}><label>Crea Suero</label><input type="number" id="creaSuero" onChange={() => calcDep(document.getElementById('peso').value, document.getElementById('talla').value, document.getElementById('volTotal').value, document.getElementById('creaOrina').value, document.getElementById('creaSuero').value)} placeholder="0" className={styles.inputMinimal} /></div>
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

                <button className={styles.btnPrimarySmall} onClick={() => {
                  copyToClipboard(`Depuración de Creatinina: ${orinaRes.dep} mL/min (S.C: ${orinaRes.sc} m²)`, 'Depuración');
                }}>Copiar Depuración</button>
              </div>

              {/* Sección de Excreción y Osmolaridad */}
              <div className={styles.inputGrid}>
                <div className={styles.field}>
                  <label>Prueba de Excreción / Calculada</label>
                  <select id="tipoExcrecion" className={styles.inputMinimal}>
                    <option value="urea">Urea (g/24h)</option>
                    <option value="crea">Creatinina (mg/24h)</option>
                    <option value="urico">Ácido Úrico (mg/24h)</option>
                    <option value="ca">Calcio (mg/24h)</option>
                    <option value="mg">Magnesio (mg/24h)</option>
                    <option value="pro">Proteínas (mg/24h)</option>
                    <option value="alb">Albúmina (mg/24h)</option>
                    <option value="na">Sodio (mmol/24h)</option>
                    <option value="k">Potasio (mmol/24h)</option>
                    <option value="cl">Cloro (mmol/24h)</option>
                    <option value="osmo">Osmolaridad (mOsm/L)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Valor Vitros / Urea</label>
                  <input type="number" id="valVitros" placeholder="Resultado Equipo" className={styles.inputMinimal} />
                </div>
              </div>

              <div id="osmoInputs" style={{display: 'none', gap: '15px', marginBottom: '20px'}}>
                <div className={styles.field}><label>Na+ (mmol/L)</label><input type="number" id="osmoNa" className={styles.inputMinimal} /></div>
                <div className={styles.field}><label>K+ (mmol/L)</label><input type="number" id="osmoK" className={styles.inputMinimal} /></div>
              </div>

              <button className={styles.btnCopyAction} style={{width: '100%'}} onClick={() => {
                const tipo = document.getElementById('tipoExcrecion').value;
                const vol = parseFloat(document.getElementById('volTotal')?.value || 0);
                
                if (tipo === 'osmo') {
                  const na = parseFloat(document.getElementById('osmoNa').value);
                  const k = parseFloat(document.getElementById('osmoK').value);
                  const urea = parseFloat(document.getElementById('valVitros').value);
                  if (na && k && urea) {
                    const res = (((na + k) * 2) + (urea * 5.6)).toFixed(1);
                    copyToClipboard(`Osmolaridad: ${res} mOsm/L`, 'Osmolaridad');
                  }
                  return;
                }

                const val = parseFloat(document.getElementById('valVitros').value);
                if (!val || !vol) return alert('Ingresa valor Vitros y Volumen Total');
                
                let res = 0; let unit = '';
                if (tipo === 'urea') { res = (val * 2.14 * vol) / 100; unit = 'g/24h'; }
                else if (['crea', 'urico', 'ca', 'mg', 'pro', 'alb'].includes(tipo)) { res = (val * vol) / 100; unit = 'mg/24h'; }
                else { res = (val * vol) / 1000; unit = 'mmol/24h'; }
                
                copyToClipboard(`Resultado ${tipo.toUpperCase()}: ${res.toFixed(2)} ${unit}`, 'Excreción');
              }}>Calcular y Copiar Resultado</button>
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

              <div style={{display:'flex', gap:'15px'}}>
                <button className={styles.btnPrimarySmall} onClick={() => {
                  copyToClipboard(`ITL: ${inmunoRes.itl}, Yodo Proteico (YP): ${inmunoRes.yp} ug/dL`, 'Perfil Tiroideo');
                }}>Copiar Perfil Tiroideo</button>
                <button className={styles.btnPrimarySmall} style={{background: '#10B981'}} onClick={() => {
                  copyToClipboard(`% PSA Libre: ${inmunoRes.psa}%`, 'PSA');
                }}>Copiar % PSA Libre</button>
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
                <button className={styles.btnCopyAction} onClick={() => copyToClipboard(`BT: ${bil.total} mg/dL`, 'Bilirrubina Total')}>
                  <span className="material-symbols-rounded">content_copy</span> Copiar Resultado
                </button>
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
              <button className={styles.btnCopyAction} style={{marginTop: '20px', width: '100%'}} onClick={() => copyToClipboard(`Indices Lipídicos:\nCastelli I: ${lip.castelli1}\nCastelli II: ${lip.castelli2}\nVLDL: ${lip.vldl} mg/dL`, 'Perfil Lipídico')}>
                <span className="material-symbols-rounded">content_copy</span> Copiar Perfil Completo
              </button>
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
              <button className={styles.btnCopyAction} style={{marginTop: '20px', width: '100%'}} onClick={() => copyToClipboard(`Urea: ${renal.urea} mg/dL, BUN: ${renal.bun} mg/dL`, 'Perfil Renal')}>
                <span className="material-symbols-rounded">content_copy</span> Copiar Resultados
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParametrosDerivados;
