import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./EnvioMuestras.module.css";

export default function EnvioMuestras() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Estado de los materiales
  const [counts, setCounts] = useState({
    dorado: 0,
    rojo: 0,
    celeste: 0,
    petri: 0,
    laminilla: 0,
    suero: 0,
    papel: 0
  });

  const [temps, setTemps] = useState({ amb: 25, ref: 4 });
  const [photo, setPhoto] = useState(null);

  const adjust = (key, val) => {
    setCounts(prev => ({ ...prev, [key]: Math.max(0, prev[key] + val) }));
  };

  // Validaciones de Bio-Seguridad
  const isAmbAlert = temps.amb > 29 || temps.amb < 20;
  const isRefAlert = temps.ref > 7 || temps.ref < 2;

  const handleSend = async () => {
    setLoading(true);
    try {
      let photoUrl = "";
      
      // 1. Subir foto si existe
      if (photo) {
        const fileName = `${Date.now()}_${photo.name}`;
        const { data, error: upError } = await supabase.storage
          .from("evidencia-envios")
          .upload(fileName, photo);
        
        if (upError) throw upError;
        const { data: { publicUrl } } = supabase.storage.from("evidencia-envios").getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      // 2. Crear registro en BD
      const { error: dbError } = await supabase.from("logistica_envios").insert({
        sucursal: user?.branch || "Oficina Central",
        status: "Pendiente", // Esperando al mensajero
        s_dorado: counts.dorado,
        s_rojo: counts.rojo,
        s_celeste: counts.celeste,
        s_petri: counts.petri,
        s_laminilla: counts.laminilla,
        s_suero: counts.suero,
        s_papel: counts.papel,
        temp_sale_amb: parseFloat(temps.amb),
        temp_sale_ref: parseFloat(temps.ref),
        hora_sale: new Date().toISOString(),
        img_url: photoUrl
      });

      if (dbError) throw dbError;

      setSuccess(true);
      // Resetear estado después de éxito
      setCounts({ dorado: 0, rojo: 0, celeste: 0, petri: 0, laminilla: 0, suero: 0, papel: 0 });
      setPhoto(null);
    } catch (err) {
      alert("Error al enviar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '64px', color: 'var(--co-accent)' }}>inventory</span>
          <h2 style={{ marginTop: '1rem' }}>Despacho Registrado</h2>
          <p style={{ color: 'var(--co-text-muted)', marginBottom: '2rem' }}>
            La hielera quedó en estado <strong>Pendiente de Recolección</strong>.<br/>
            El mensajero podrá verla ahora en su dashboard.
          </p>
          <button className={styles.submitBtn} onClick={() => setSuccess(false)}>Crear Otro Despacho</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className={styles.title}>Despacho de Muestras</h1>
        <p className={styles.subtitle}>Sede: <strong>{user?.branch}</strong> • Trazabilidad Bio-Segura</p>
      </header>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">analytics</span>
          Conteo de Muestras en Hielera
        </h3>
        
        <div className={styles.materialGrid}>
          {Object.keys(counts).map(key => (
            <div key={key} className={styles.counterItem}>
              <span className={styles.label}>{key.toUpperCase()}</span>
              <div className={styles.counterControls}>
                <button className={styles.countBtn} onClick={() => adjust(key, -1)}>-</button>
                <span className={styles.countValue}>{counts[key]}</span>
                <button className={styles.countBtn} onClick={() => adjust(key, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <h3 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">device_thermostat</span>
          Condiciones Térmicas al Salir
        </h3>

        <div className={styles.tempRow}>
          <div className={`${styles.inputGroup} ${isAmbAlert ? styles.alertInput : ''}`}>
            <label className={styles.label}>Temp. Ambiente (°C)</label>
            <input 
              type="number" 
              className={styles.inputField} 
              value={temps.amb} 
              onChange={e => setTemps(p => ({...p, amb: e.target.value}))}
            />
            {isAmbAlert && <span className={styles.alertText}>Fuera de rango (Ide: 25-29)</span>}
          </div>
          <div className={`${styles.inputGroup} ${isRefAlert ? styles.alertInput : ''}`}>
            <label className={styles.label}>Temp. Refrigeración (°C)</label>
            <input 
              type="number" 
              className={styles.inputField} 
              value={temps.ref}
              onChange={e => setTemps(p => ({...p, ref: e.target.value}))}
            />
            {isRefAlert && <span className={styles.alertText}>Crítico (Ide: 2-7)</span>}
          </div>
        </div>

        <div className={styles.photoArea}>
          <label className={styles.label}>Evidencia Fotográfica (Órdenes/Preparación)</label>
          <input 
            type="file" 
            accept="image/*" 
            className={styles.fileInput}
            onChange={e => setPhoto(e.target.files[0])}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--co-text-muted)', marginTop: '8px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '12px', verticalAlign: 'middle' }}>info</span>
            Puedes usar la cámara o elegir una foto de la galería.
          </p>
        </div>

        <button 
          className={styles.submitBtn} 
          onClick={handleSend}
          disabled={loading || Object.values(counts).every(v => v === 0)}
        >
          {loading ? "Registrando..." : "Marcar como Listo para Recolección"}
        </button>
      </div>
    </div>
  );
}
