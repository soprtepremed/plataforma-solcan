import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./EnvioMuestras.module.css";

const MATERIAL_TYPES = [
  { key: "rojo", label: "Tubo Rojo (Suero)", icon: "water_drop", color: "#FF0000" },
  { key: "dorado", label: "Tubo Dorado (Suero)", icon: "water_drop", color: "#FFD700" },
  { key: "lila", label: "Tubo Lila (Plasma)", icon: "water_drop", color: "#DA70D6" },
  { key: "celeste", label: "Tubo Celeste (Plasma)", icon: "water_drop", color: "#00CED1" },
  { key: "verde", label: "Tubo Verde (Plasma)", icon: "water_drop", color: "#22C55E" },
  { key: "orina", label: "Tubo Orina", icon: "opacity", color: "#facc15" },
  { key: "orina_24h", label: "Orina 24 Horas", icon: "hourglass_empty", color: "#EAB308" },
  { key: "medio_transporte", label: "Medio de Transporte", icon: "move_to_inbox", color: "#6366F1" },
  { key: "hisopo", label: "Tubo Vidrio/Hisopo", icon: "biotech", color: "#94A3B8" },
  { key: "laminilla_he", label: "Laminilla HE", icon: "layers", color: "#D3D3D3" },
  { key: "laminilla_mi", label: "Laminilla MI", icon: "layers_clear", color: "#CBD5E1" },
  { key: "heces", label: "Muestra de Heces", icon: "medication", color: "#8B4513" }
];

const FORMATOS_TYPES = [
  { key: "f_do_001", label: "FO-DO-001" },
  { key: "f_da_001", label: "FO-DA-001" },
  { key: "f_qc_020", label: "FO-QC-020" },
  { key: "f_rm_004", label: "FO-RM-004" }
];

export default function EnvioMuestras() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sucursal] = useState(user?.branch || "Oficina Central");
  const [observaciones, setObservaciones] = useState("");
  const [otrosCant, setOtrosCant] = useState("");
  const [otrosAnalisis, setOtrosAnalisis] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [tempAmb, setTempAmb] = useState(24.5);
  const [tempRef, setTempRef] = useState(4.2);
  const [photos, setPhotos] = useState([]);
  const [isAmbAlert, setIsAmbAlert] = useState(false);
  const [isRefAlert, setIsRefAlert] = useState(false);

  // Inventario FO-DO-017
  const [tubos, setTubos] = useState({
    rojo: 0, dorado: 0, lila: 0, celeste: 0, verde: 0,
    orina: 0, orina_24h: 0, medio_transporte: 0, hisopo: 0, laminilla_he: 0, laminilla_mi: 0, heces: 0
  });

  // Inventario FO-DO-017 (Cantidades de formatos físicos)
  const [formatos, setFormatos] = useState({
    f_do_001: 0, f_da_001: 0, f_qc_020: 0, f_rm_004: 0
  });

  const adjustQty = (key, delta) => {
    setTubos(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  };

  const adjustFormat = (key, delta) => {
    setFormatos(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
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

  const triggerBeep = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioContext.currentTime);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
  };

  React.useEffect(() => {
    const alerts = checkAlerts();
    let interval;
    if (alerts.ambAlert || alerts.refAlert) {
      triggerBeep();
      interval = setInterval(triggerBeep, 1500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [tempAmb, tempRef]);

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const [index, file] of photos.entries()) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${sucursal.replace(/ /g, "_")}/${new Date().toISOString().split("T")[0]}/envio_${Date.now()}_${index + 1}.${fileExt}`;
      const { error } = await supabase.storage.from("evidencia-envios").upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const publicUrl = `https://ybhfsvkwpmhzwuboynre.supabase.co/storage/v1/object/public/evidencia-envios/${fileName}`;
      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls.join("|");
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      const photoPath = await uploadPhotos();
      const { error } = await supabase.from("logistica_envios").insert([{
        sucursal,
        status: "Pendiente",
        s_rojo: tubos.rojo,
        s_dorado: tubos.dorado,
        s_lila: tubos.lila,
        s_celeste: tubos.celeste,
        s_verde: tubos.verde,
        s_medio_transporte: tubos.medio_transporte,
        s_hisopo: tubos.hisopo,
        s_laminilla_he: tubos.laminilla_he,
        s_laminilla_mi: tubos.laminilla_mi,
        s_heces: tubos.heces,
        s_orina_24h: tubos.orina_24h,
        s_papel: tubos.orina,
        s_otros_cant: otrosCant,
        s_otros_analisis: otrosAnalisis,
        f_do_001: formatos.f_do_001,
        f_da_001: formatos.f_da_001,
        f_qc_020: formatos.f_qc_020,
        f_rm_004: formatos.f_rm_004,
        temp_sale_amb: parseFloat(tempAmb),
        temp_sale_ref: parseFloat(tempRef),
        img_url: photoPath,
        observaciones_sucursal: observaciones,
        hora_sale: new Date().toISOString()
      }]);
      if (error) throw error;
      
      // Notificar a Mensajeros
      await supabase.from("notificaciones").insert([{
        role: "mensajero",
        title: "📦 Nueva Recolección en " + sucursal,
        message: `Se ha registrado un nuevo envío. Favor de acudir a recolectar.`,
        type: "info",
        metadata: { sucursal }
      }]);

      // Autonotificar a la sucursal
      await supabase.from("notificaciones").insert([{
        title: "📑 Envío Registrado",
        message: `Has generado un nuevo envío para ${sucursal}. El chofer ya ha sido notificado.`,
        type: "success",
        metadata: { sucursal }
      }]);

      setSentSuccess(true);
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSentSuccess(false);
    setPhotos([]);
    setTubos({
      rojo: 0, dorado: 0, lila: 0, celeste: 0, verde: 0,
      orina: 0, orina_24h: 0, medio_transporte: 0, hisopo: 0, laminilla_he: 0, laminilla_mi: 0, heces: 0
    });
    setFormatos({ f_do_001: false, f_da_001: false, f_qc_020: false, f_rm_004: false });
    setObservaciones("");
    setOtrosCant("");
    setOtrosAnalisis("");
  };

  return (
    <div className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.backBtn}>
        <span className="material-symbols-rounded">arrow_back</span>
        Volver
      </button>

      <div className={styles.card}>
        <h1 className={styles.title}>Preparación de Envío (FO-DO-017)</h1>
        <p className={styles.subtitle}>Sucursal: <strong>{sucursal}</strong> • Registro de cadena de custodia</p>

        <div className={styles.tempGrid}>
          <div className={`${styles.tempBox} ${isAmbAlert ? styles.alert : ''}`}>
            <label><span className="material-symbols-rounded">device_thermostat</span> T. Ambiente (°C)</label>
            <div className={styles.stepperContainer}>
              <button className={styles.stepperBtn} onClick={() => setTempAmb(prev => parseFloat((prev - 0.5).toFixed(1)))}>-</button>
              <input type="number" step="0.1" value={tempAmb} onChange={(e) => setTempAmb(parseFloat(e.target.value))} />
              <button className={styles.stepperBtn} onClick={() => setTempAmb(prev => parseFloat((prev + 0.5).toFixed(1)))}>+</button>
            </div>
            {isAmbAlert && <small>⚠️ Fuera de rango</small>}
          </div>
          <div className={`${styles.tempBox} ${isRefAlert ? styles.alert : ''}`}>
            <label><span className="material-symbols-rounded">ac_unit</span> T. Refrigerada (°C)</label>
            <div className={styles.stepperContainer}>
              <button className={styles.stepperBtn} onClick={() => setTempRef(prev => parseFloat((prev - 0.5).toFixed(1)))}>-</button>
              <input type="number" step="0.1" value={tempRef} onChange={(e) => setTempRef(parseFloat(e.target.value))} />
              <button className={styles.stepperBtn} onClick={() => setTempRef(prev => parseFloat((prev + 0.5).toFixed(1)))}>+</button>
            </div>
            {isRefAlert && <small>⚠️ Crítico: Verificar Gel</small>}
          </div>
        </div>

        <h2 className={styles.sectionTitle}><span className="material-symbols-rounded">inventory_2</span> Muestras a Enviar</h2>
        <div className={styles.premiumCounterList}>
          {MATERIAL_TYPES.map(item => (
            <div key={item.key} className={styles.counterRow}>
              <div className={styles.itemIcon} style={{ background: item.color }}>
                <span className="material-symbols-rounded">{item.icon}</span>
              </div>
              <span className={styles.itemLabel}>{item.label}</span>
              <div className={styles.itemControls}>
                <button className={styles.btnMinus} onClick={() => adjustQty(item.key, -1)}>-</button>
                <div className={styles.valDisplay}>{tubos[item.key]}</div>
                <button className={styles.btnPlus} onClick={() => adjustQty(item.key, 1)}>+</button>
              </div>
            </div>
          ))}

          {/* Otros (Cant / Analisis) */}
          <div className={`${styles.counterRow} ${styles.otrosRow}`}>
             <div className={styles.itemIcon} style={{ background: '#475569' }}>
                <span className="material-symbols-rounded">add_circle</span>
             </div>
             <div className={styles.inputGroupCol}>
                <input 
                  type="text" 
                  placeholder="Otros (Cant.)" 
                  className={styles.miniInput} 
                  value={otrosCant} 
                  onChange={(e) => setOtrosCant(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Otros (Análisis)" 
                  className={styles.miniInput} 
                  value={otrosAnalisis} 
                  onChange={(e) => setOtrosAnalisis(e.target.value)} 
                />
             </div>
          </div>
        </div>

        <h2 className={styles.sectionTitle}><span className="material-symbols-rounded">description</span> Formatos Adjuntos</h2>
        <div className={styles.formatsGrid}>
            {FORMATOS_TYPES.map(f => (
              <div key={f.key} className={styles.formatItem}>
                <label>{f.label}</label>
                <div className={styles.counter}>
                  <button type="button" onClick={() => adjustFormat(f.key, -1)}>-</button>
                  <span>{formatos[f.key]}</span>
                  <button type="button" onClick={() => adjustFormat(f.key, 1)}>+</button>
                </div>
              </div>
            ))}
        </div>

        <div className={styles.captureArea} style={{marginTop: '2rem'}}>
          <div className={styles.captureGrid}>
            <label className={styles.captureBtn}>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                multiple 
                onChange={handlePhotoChange} 
                style={{ display: 'none' }} 
              />
              <span className="material-symbols-rounded">photo_camera</span>
              <span>Tomar Foto</span>
            </label>

            <label className={styles.captureBtn}>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handlePhotoChange} 
                style={{ display: 'none' }} 
              />
              <span className="material-symbols-rounded">image</span>
              <span>Subir Galería</span>
            </label>
          </div>

          <div className={styles.photoGallery}>
            {photos.map((file, idx) => (
              <div key={idx} className={styles.photoThumb}>
                <img src={URL.createObjectURL(file)} alt="Preview" />
                <button onClick={() => removePhoto(idx)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <textarea className={styles.inputField} placeholder="¿Alguna incidencia o reporte?" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        <button className={styles.submitBtn} onClick={handleSend} disabled={loading || isAmbAlert || isRefAlert}>
          {loading ? 'Sincronizando...' : '🚀 Finalizar Solicitud FO-DO-017'}
        </button>
      </div>

      {sentSuccess && (
        <div className={styles.successOverlay}>
          <div className={styles.successCard}>
             <div className={styles.successIcon}><span className="material-symbols-rounded">task_alt</span></div>
             <h2>¡Envío Registrado!</h2>
             <p>Se ha generado el folio digital para transporte. El chofer ya puede ver esta hielera.</p>
             <div className={styles.successActions}>
                <button onClick={resetForm} className={styles.successBtn}>Generar Nuevo Envío</button>
                <button onClick={() => navigate('/logistica/sede')} className={styles.secondaryBtn}>Ir al Dashboard</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
