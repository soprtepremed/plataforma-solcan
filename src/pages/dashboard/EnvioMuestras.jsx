import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './EnvioMuestras.module.css';

const SECTIONS = [
  {
    id: "primarios",
    title: "Muestras en Tubo Primario",
    icon: "bloodtype",
    items: [
      { key: "rojo", label: "Rojo", icon: "water_drop", color: "#EF4444" },
      { key: "dorado", label: "Dorado", icon: "water_drop", color: "#FBBF24" },
      { key: "lila", label: "Lila", icon: "water_drop", color: "#A855F7" },
      { key: "celeste", label: "Celeste", icon: "water_drop", color: "#06B6D4" },
      { key: "verde", label: "Verde", icon: "water_drop", color: "#22C55E" },
    ]
  },
  {
    id: "secundarios",
    title: "Muestras en Tubo Secundario",
    icon: "colorize",
    items: [
      { key: "suero", label: "Suero", icon: "opacity", color: "#FDA4AF" },
      { key: "plasma_edta", label: "Plasma c/EDTA", icon: "opacity", color: "#D8B4FE" },
      { key: "plasma_citrato", label: "Plasma c/Citrato", icon: "opacity", color: "#7DD3FC" },
      { key: "orina_alic", label: "Orina (Alícuota)", icon: "opacity", color: "#FDE047" },
      { key: "dialisis_alic", label: "Líq. Diálisis (Alíc.)", icon: "opacity", color: "#CBD5E1" },
    ]
  },
  {
    id: "micro_especiales",
    title: "Muestras Varias y Microbiología",
    icon: "biotech",
    items: [
      { key: "orina_azar", label: "Orina al azar", icon: "opacity", color: "#FACC15" },
      { key: "orina_24h", label: "Orina de 24 hrs", icon: "hourglass_empty", color: "#EAB308" },
      { key: "petri", label: "Cajas Petri", icon: "label", color: "#94A3B8" },
      { key: "mycoplasma", label: "Mycoplasma / UU", icon: "bug_report", color: "#F43F5E" },
      { key: "papel", label: "Papel Tamiz", icon: "description", color: "#CBD5E1" },
      { key: "cultivos", label: "Cultivos", icon: "pet_supplies", color: "#10B981", hasDetail: true },
      { key: "hisopo", label: "Hisopos", icon: "straighten", color: "#6366F1", hasDetail: true },
      { key: "esputo", label: "Esputo", icon: "masks", color: "#94A3B8" },
      { key: "pcr", label: "PCR-COVID", icon: "coronavirus", color: "#EC4899" },
      { key: "heces", label: "Muestra de Heces", icon: "medication", color: "#8B4513" },
      { key: "laminillas", label: "Laminillas", icon: "layers", color: "#D1D5DB" },
      { key: "hemo_mico", label: "Hemo/Micológico", icon: "experiment", color: "#991B1B" },
    ]
  },
  {
    id: "admin",
    title: "Control y Administración",
    icon: "business_center",
    items: [
      { key: "f_do_001", label: "FO-DO-001", isFormat: true },
      { key: "encuestas", label: "Encuestas de SC", icon: "poll", color: "#6366F1" },
      { key: "quejas", label: "Quejas", icon: "rate_review", color: "#F43F5E" },
      { key: "cortes", label: "Cortes de Caja", icon: "payments", color: "#22C55E" },
      { key: "recibos", label: "Recibos / Contab.", icon: "receipt_long", color: "#F59E0B" },
    ]
  }
];

export default function EnvioMuestras() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sucursal] = useState(user?.branch || "Oficina Central");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [lastGeneratedFolio, setLastGeneratedFolio] = useState("");
  const [tempAmb, setTempAmb] = useState(24.5);
  const [tempRef, setTempRef] = useState(4.2);
  const [photos, setPhotos] = useState([]);
  const [isAmbAlert, setIsAmbAlert] = useState(false);
  const [isRefAlert, setIsRefAlert] = useState(false);

  // Unified State for Counts and Details
  const [counts, setCounts] = useState({});
  const [details, setDetails] = useState({});

  const adjustQty = (key, delta) => {
    setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  };

  const handleDetailChange = (key, val) => {
    setDetails(prev => ({ ...prev, [key]: val }));
  };

  const handlePhotoChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const checkAlerts = () => {
    const ambAlert = tempAmb > 29 || tempAmb < 20;
    const refAlert = tempRef > 7 || tempRef < 2;
    setIsAmbAlert(ambAlert);
    setIsRefAlert(refAlert);
    return { ambAlert, refAlert };
  };

  // Sound Management Optimizado
  const [audioCtx, setAudioCtx] = useState(null);
  const [masterGain, setMasterGain] = useState(null);

  useEffect(() => {
    // Inicializar Contexto solo una vez al detectar cambio o interacción
    const initAudio = () => {
      if (!audioCtx) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        setAudioCtx(ctx);
        setMasterGain(gain);
      }
    };
    
    // Iniciar al mover temperaturas (interacción del usuario)
    initAudio();
    
    return () => { if (audioCtx && audioCtx.state !== 'closed') audioCtx.close(); };
  }, []);

  const playDing = () => {
    if (!audioCtx || !masterGain) return;
    
    // Aseguramos que el nodo maestro esté activo
    masterGain.gain.setValueAtTime(1, audioCtx.currentTime);

    const playNote = (freq, start, duration) => {
      const osc = audioCtx.createOscillator();
      const noteGain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
      
      noteGain.gain.setValueAtTime(0, audioCtx.currentTime + start);
      noteGain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + start + 0.01); 
      noteGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
      
      osc.connect(noteGain); 
      noteGain.connect(masterGain);
      
      osc.start(audioCtx.currentTime + start); 
      osc.stop(audioCtx.currentTime + start + duration);
    };

    // Un solo par de pings por ciclo (evita solapamiento)
    playNote(1567.98, 0, 0.2);
    playNote(1174.66, 0.1, 0.3);
  };

  useEffect(() => {
    const alerts = checkAlerts();
    let interval;
    
    if (alerts.ambAlert || alerts.refAlert) {
      if (audioCtx?.state === 'suspended') audioCtx.resume();
      playDing();
      interval = setInterval(playDing, 2500);
    } else if (masterGain && audioCtx) {
      // CORTE INMEDIATO
      masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.03);
    }

    return () => { 
      if (interval) clearInterval(interval);
      if (masterGain && audioCtx) masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    };
  }, [tempAmb, tempRef, audioCtx, masterGain]);

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const [index, file] of photos.entries()) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${sucursal.replace(/ /g, "_")}/${new Date().toISOString().split("T")[0]}/envio_${Date.now()}_${index + 1}.${fileExt}`;
      const { error } = await supabase.storage.from("evidencia-envios").upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("evidencia-envios").getPublicUrl(fileName);
      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls.join("|");
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      const photoPath = await uploadPhotos();
      
      // GENERACIÓN DE FOLIO
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const { count } = await supabase
        .from('logistica_envios')
        .select('*', { count: 'exact', head: true })
        .eq('sucursal', sucursal)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);
      
      const sucursalNombre = sucursal || "GEN";
      const sucursalSiglas = sucursalNombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
      const dayMonth = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const sequence = String((count || 0) + 1).padStart(3, '0');
      const generatedFolio = `${sucursalSiglas}-${dayMonth}-${sequence}`;

      const payload = {
        sucursal,
        status: "Pendiente",
        folio_envio: generatedFolio,
        // Primarios
        s_rojo: (counts.rojo || 0) + (counts.suero || 0),
        s_dorado: counts.dorado || 0,
        s_lila: counts.lila || 0,
        s_celeste: counts.celeste || 0,
        s_verde: counts.verde || 0,
        // Secundarios
        s_suero: counts.suero || 0,
        s_sec_edta: counts.plasma_edta || 0,
        s_sec_citrato: counts.plasma_citrato || 0,
        s_sec_orina: (counts.orina_azar || 0) + (counts.orina_alic || 0),
        s_sec_dialisis: counts.dialisis_alic || 0,
        // Varias y Micro
        s_orina_24h: counts.orina_24h || 0,
        s_petri: counts.petri || 0,
        s_mycoplasma: counts.mycoplasma || 0,
        s_papel: counts.papel || 0,
        s_cultivos_detalle: details.cultivos || "",
        s_hisopo: counts.hisopo || 0,
        s_hisopo_detalle: details.hisopo || "",
        s_esputo: counts.esputo || 0,
        s_pcr_covid: counts.pcr || 0,
        s_heces: counts.heces || 0,
        s_laminilla_he: counts.laminillas || 0,
        s_hemo_micologico: counts.hemo_mico || 0,
        // Admin
        f_do_001: counts.f_do_001 || 0,
        adm_encuestas: counts.encuestas || 0,
        adm_quejas: counts.quejas || 0,
        adm_sobres_caja: counts.cortes || 0,
        adm_recibos: counts.recibos || 0,
        // Metadata
        temp_sale_amb: parseFloat(tempAmb),
        temp_sale_ref: parseFloat(tempRef),
        img_url: photoPath,
        observaciones_sucursal: observaciones,
        hora_sale: new Date().toISOString()
      };

      const { error } = await supabase.from("logistica_envios").insert([payload]);
      if (error) throw error;
      
      setLastGeneratedFolio(generatedFolio);

      await supabase.from("notificaciones").insert([{
        role: "mensajero",
        title: "📦 Nueva Recolección: " + sucursal,
        message: `Hielera registrada con material completo (Micro/Admin). Folio: ${generatedFolio}`,
        type: "info",
        metadata: { sucursal }
      }]);

      setSentSuccess(true);
    } catch (err) { alert("Error: " + err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setSentSuccess(false);
    setPhotos([]);
    setCounts({});
    setDetails({});
    setObservaciones("");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <span className="material-symbols-rounded">arrow_back</span> Volver
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Reporte de Envío de Muestras</h1>
          <p className={styles.subtitle}>FO-DO-017 • Sucursal {sucursal}</p>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          {/* Temperatures Card */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}><span className="material-symbols-rounded">thermostat</span> Control de Red de Frío</h2>
            <div className={styles.tempGrid}>
              <div className={`${styles.tempBox} ${isAmbAlert ? styles.alert : ''}`}>
                <label>Ambiente (°C)</label>
                <div className={styles.stepperContainer}>
                  <button className={styles.stepperBtn} onClick={() => setTempAmb(prev => parseFloat((prev - 0.5).toFixed(1)))}>-</button>
                  <input type="number" step="0.1" value={tempAmb} onChange={e => setTempAmb(parseFloat(e.target.value))} />
                  <button className={styles.stepperBtn} onClick={() => setTempAmb(prev => parseFloat((prev + 0.5).toFixed(1)))}>+</button>
                </div>
              </div>
              <div className={`${styles.tempBox} ${isRefAlert ? styles.alert : ''}`}>
                <label>Refrigerado (°C)</label>
                <div className={styles.stepperContainer}>
                  <button className={styles.stepperBtn} onClick={() => setTempRef(prev => parseFloat((prev - 0.5).toFixed(1)))}>-</button>
                  <input type="number" step="0.1" value={tempRef} onChange={e => setTempRef(parseFloat(e.target.value))} />
                  <button className={styles.stepperBtn} onClick={() => setTempRef(prev => parseFloat((prev + 0.5).toFixed(1)))}>+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Sections */}
          {SECTIONS.map(section => (
            <div key={section.id} className={styles.card}>
              <h2 className={styles.sectionTitle}><span className="material-symbols-rounded">{section.icon}</span> {section.title}</h2>
              <div className={styles.premiumCounterList}>
                {section.items.map(item => (
                  <div key={item.key} className={styles.counterRow}>
                    <div className={styles.itemMain}>
                      {item.icon && (
                        <div className={styles.itemIcon} style={{ background: item.color + '22', color: item.color }}>
                          <span className="material-symbols-rounded">{item.icon}</span>
                        </div>
                      )}
                      <div className={styles.itemLabelBox}>
                         <span className={styles.itemLabel}>{item.label}</span>
                         {item.hasDetail && (
                           <input 
                             type="text" 
                             placeholder="Especifique..." 
                             className={styles.miniInput} 
                             value={details[item.key] || ""} 
                             onChange={e => handleDetailChange(item.key, e.target.value)}
                           />
                         )}
                      </div>
                    </div>
                    <div className={styles.itemControls}>
                      <button className={styles.btnMinus} onClick={() => adjustQty(item.key, -1)}>-</button>
                      <span className={styles.valDisplay}>{counts[item.key] || 0}</span>
                      <button className={styles.btnPlus} onClick={() => adjustQty(item.key, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.rightCol}>
           {/* Evidence & Obs Card */}
           <div className={styles.card}>
             <h2 className={styles.sectionTitle}><span className="material-symbols-rounded">photo_camera</span> Evidencia y Reporte</h2>
             <div className={styles.captureGrid}>
                <label className={styles.captureBtn}>
                  <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoChange} hidden />
                  <span className="material-symbols-rounded">camera</span> Cámara
                </label>
                <label className={styles.captureBtn}>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} hidden />
                  <span className="material-symbols-rounded">image</span> Galería
                </label>
             </div>
             
             <div className={styles.photoGallery}>
                {photos.map((f, i) => (
                  <div key={i} className={styles.photoThumb}>
                    <img src={URL.createObjectURL(f)} alt="" />
                    <button className={styles.removeBtn} onClick={() => removePhoto(i)}>×</button>
                  </div>
                ))}
             </div>

             <textarea 
               className={styles.obsField} 
               placeholder="Comentarios adicionales o incidencias..." 
               value={observaciones} 
               onChange={e => setObservaciones(e.target.value)} 
             />

             <button 
               className={styles.submitBtn} 
               onClick={handleSend} 
               disabled={loading || isAmbAlert || isRefAlert}
             >
               {loading ? 'Sincronizando...' : 'Finalizar Envío de Muestras'}
             </button>
           </div>
        </div>
      </div>

      {sentSuccess && (
        <div className={styles.overlay}>
          <div className={styles.successCard}>
             <div className={styles.successIcon}>
                <span className="material-symbols-rounded">check_circle</span>
             </div>
             <h2>¡Envío Exitoso!</h2>
             <p>El material ha sido registrado y el chofer notificado.</p>
             
             <div className={styles.folioDisplay}>
               <span className={styles.folioLabel}>FOLIO DEL PAQUETE:</span>
               <div className={styles.folioBadge}>
                 <strong>{lastGeneratedFolio}</strong>
                 <button 
                   onClick={() => navigator.clipboard.writeText(lastGeneratedFolio)}
                   className={styles.copyBtn}
                   title="Copiar Folio"
                 >
                   <span className="material-symbols-rounded">content_copy</span>
                 </button>
               </div>
               <small className={styles.folioHint}>Usa este código para relacionar tus folios de pacientes.</small>
             </div>

             <div className={styles.successActions}>
               <button onClick={resetForm} className={styles.successBtn}>Nuevo Envío</button>
               <button onClick={() => navigate('/logistica/sede')} className={styles.secondaryBtn}>Ir al Dashboard</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
