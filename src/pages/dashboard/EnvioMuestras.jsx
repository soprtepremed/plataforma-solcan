import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./EnvioMuestras.module.css";

const MATERIAL_TYPES = [
  { key: "dorado", label: "Tubo Dorado", icon: "water_drop", color: "#FFD700" },
  { key: "rojo", label: "Tubo Rojo", icon: "water_drop", color: "#FF0000" },
  { key: "lila", label: "Tubo Lila", icon: "water_drop", color: "#DA70D6" },
  { key: "petri", label: "Cajas Petri", icon: "biotech", color: "#00CED1" },
  { key: "laminilla", label: "Laminillas", icon: "layers", color: "#D3D3D3" },
  { key: "suero", label: "Suero Separado", icon: "colorize", color: "#F4A460" },
  { key: "orina", label: "Tubo con Orina", icon: "opacity", color: "#facc15" }
];

export default function EnvioMuestras() {
  const [sucursal] = useState("El Paso Limon");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false); // Estado para el Modal de Exito
  const [tempAmb, setTempAmb] = useState(24.5);
  const [tempRef, setTempRef] = useState(4.2);
  const [photos, setPhotos] = useState([]);
  const [isAmbAlert, setIsAmbAlert] = useState(false);
  const [isRefAlert, setIsRefAlert] = useState(false);

  // Inventario de hielera
  const [tubos, setTubos] = useState({
    dorado: 0,
    rojo: 0,
    lila: 0,
    petri: 0,
    laminilla: 0,
    suero: 0,
    orina: 0
  });

  const adjustQty = (key, delta) => {
    setTubos(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
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
        s_dorado: tubos.dorado,
        s_rojo: tubos.rojo,
        s_celeste: tubos.lila,
        s_petri: tubos.petri,
        s_laminilla: tubos.laminilla,
        s_suero: tubos.suero,
        s_papel: tubos.orina,
        temp_sale_amb: parseFloat(tempAmb),
        temp_sale_ref: parseFloat(tempRef),
        img_url: photoPath,
        observaciones_sucursal: observaciones,
        hora_sale: new Date().toISOString()
      }]);
      if (error) throw error;
      
      // Mostrar Modal de Exito
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
    setTubos({ dorado: 0, rojo: 0, lila: 0, petri: 0, laminilla: 0, suero: 0, orina: 0 });
    setObservaciones("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Preparación de Envío</h1>
        <p className={styles.subtitle}>Sucursal: <strong>{sucursal}</strong> • Registro de cadena de custodia</p>

        {/* Temperaturas */}
        <h2 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">thermostat</span>
          Monitoreo de Bioseguridad
        </h2>
        <div className={styles.tempGrid}>
          <div className={`${styles.tempBox} ${isAmbAlert ? styles.alert : ''}`}>
            <label>T. Ambiente (°C)</label>
            <input type="number" step="0.1" value={tempAmb} onChange={(e) => setTempAmb(parseFloat(e.target.value))} />
            {isAmbAlert && <small>⚠️ Fuera de rango</small>}
          </div>
          <div className={`${styles.tempBox} ${isRefAlert ? styles.alert : ''}`}>
            <label>T. Refrigerada (°C)</label>
            <input type="number" step="0.1" value={tempRef} onChange={(e) => setTempRef(parseFloat(e.target.value))} />
            {isRefAlert && <small>⚠️ Crítico: Verificar Gel</small>}
          </div>
        </div>

        {/* Inventario */}
        <h2 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">inventory_2</span>
          Contenido de la Hielera
        </h2>
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
        </div>

        {/* Fotos */}
        <h2 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">add_a_photo</span>
          Evidencia de Salida
        </h2>
        <div className={styles.captureArea}>
          <input type="file" accept="image/*" multiple onChange={handlePhotoChange} id="file-up" style={{ display: 'none' }} />
          <label htmlFor="file-up" className={styles.cameraTrigger}>
            <span className="material-symbols-rounded" style={{ fontSize: '48px' }}>photo_camera</span>
            <span>Añadir Fotos de la Hielera</span>
            <small>(Múltiples vistas permitidas)</small>
          </label>

          <div className={styles.photoGallery}>
            {photos.map((file, idx) => (
              <div key={idx} className={styles.photoThumb}>
                <img src={URL.createObjectURL(file)} alt="Preview" />
                <button onClick={() => removePhoto(idx)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <h2 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">notes</span>
          Notas Adicionales
        </h2>
        <textarea 
          className={styles.inputField}
          placeholder="¿Alguna observación sobre el embalaje o las muestras?"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        <button 
          className={styles.submitBtn} 
          onClick={handleSend}
          disabled={loading || isAmbAlert || isRefAlert}
        >
          {loading ? 'Procesando Envío...' : '🚀 Finalizar y Generar Solicitud'}
        </button>
      </div>

      {/* Modal de Exito Premium */}
      {sentSuccess && (
        <div className={styles.successOverlay}>
          <div className={styles.successCard}>
             <div className={styles.successIcon}>
               <span className="material-symbols-rounded">task_alt</span>
             </div>
             <h2>¡Envío Registrado!</h2>
             <p>Los datos y fotos han sido guardados con éxito. El mensajero ya puede ver esta hielera en su ruta.</p>
             <button onClick={resetForm} className={styles.successBtn}>
               Generar Nuevo Envío
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
