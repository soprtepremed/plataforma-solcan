import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './AdminPromociones.module.css';

export default function AdminPromociones() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [portalConfig, setPortalConfig] = useState({ whatsapp: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    precio_badge: '',
    color_acento: '#0BCECD',
    imagen_url: ''
  });

  const [usage, setUsage] = useState({ db: '0 B', storage: 0, loading: false });

  useEffect(() => {
    fetchPromos();
    fetchConfig();
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    setUsage(prev => ({ ...prev, loading: true }));
    try {
      // Intentar obtener tamaño de BD vía RPC
      const { data: dbSize } = await supabase.rpc('get_database_size');
      
      // Obtener tamaño de Storage sumando metadatos de objetos
      // (Asumiendo que tenemos acceso a storage.objects o vía RPC)
      const { data: storageSize } = await supabase.rpc('get_storage_usage');
      
      setUsage({ 
        db: dbSize || 'No disponible', 
        storage: storageSize || 0, 
        loading: false 
      });
    } catch (err) {
      console.error('Error al consultar espacio:', err);
      setUsage(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchConfig = async () => {
    const { data } = await supabase.from('portal_config').select('*');
    if (data) {
      const whatsapp = data.find(c => c.key === 'whatsapp_number')?.value || '';
      setPortalConfig({ whatsapp });
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    const { error } = await supabase
      .from('portal_config')
      .upsert({ key: 'whatsapp_number', value: portalConfig.whatsapp }, { onConflict: 'key' });
    
    if (!error) alert('Configuración guardada exitosamente');
    else alert('Error al guardar: ' + error.message);
    setSavingConfig(false);
  };

  const fetchPromos = async () => {
    const { data } = await supabase.from('promociones').select('*').order('created_at', { ascending: false });
    if (data) setPromos(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('promociones').insert([formData]);
    if (!error) {
      setFormData({ titulo: '', descripcion: '', precio_badge: '', color_acento: '#0BCECD', imagen_url: '' });
      fetchPromos();
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    await supabase.from('promociones').delete().eq('id', id);
    fetchPromos();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gestión del Portal de Pacientes</h1>
        <p className={styles.subtitle}>Administra los anuncios y la configuración de atención en el portal público.</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          {/* Monitor de Espacio */}
          <section className={styles.configSection} style={{marginBottom: '2rem'}}>
            <div className={styles.card} style={{background: '#f8fafc'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem'}}>
                  <span className="material-symbols-rounded" style={{color: 'var(--co-primary)'}}>database</span> 
                  Monitor de Recursos
                </h3>
                <button 
                  onClick={fetchUsage} 
                  className={styles.refreshBtn}
                  disabled={usage.loading}
                  title="Actualizar estado de memoria"
                  style={{background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--co-primary)'}}
                >
                  <span className={`material-symbols-rounded ${usage.loading ? 'loading-spin' : ''}`} style={{fontSize: '20px'}}>refresh</span>
                </button>
              </div>

              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px'}}>
                  <span style={{fontWeight: 600}}>Base de Datos (Tablas)</span>
                  <span style={{color: 'var(--co-primary)', fontWeight: 700}}>{usage.db} / 500 MB</span>
                </div>
                <div style={{height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden'}}>
                  <div 
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (parseFloat(usage.db) || 0) / 5)}%`,
                      background: 'var(--co-gradient)',
                      transition: 'width 0.5s ease'
                    }}
                  ></div>
                </div>
              </div>

              <div style={{marginTop: '1.2rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px'}}>
                  <span style={{fontWeight: 600}}>Archivos (Storage)</span>
                  <span style={{color: '#0ea5e9', fontWeight: 700}}>
                    {(usage.storage / (1024 * 1024)).toFixed(2)} MB / 1024 MB
                  </span>
                </div>
                <div style={{height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden'}}>
                  <div 
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (usage.storage / (1024 * 1024 * 1024)) * 100)}%`,
                      background: '#0ea5e9',
                      transition: 'width 0.5s ease'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          {/* Configuración de WhatsApp */}
          <section className={styles.configSection} style={{marginBottom: '2rem'}}>
            <div className={styles.card}>
              <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span className="material-symbols-rounded">settings</span> 
                Atención al Paciente
              </h3>
              <form onSubmit={handleUpdateConfig} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Número de WhatsApp (Soporte)</label>
                  <input 
                    type="text" 
                    value={portalConfig.whatsapp} 
                    onChange={e => setPortalConfig({...portalConfig, whatsapp: e.target.value})}
                    placeholder="Ej: 5212221234567"
                  />
                  <p style={{fontSize: '0.75rem', color: '#64748b', marginTop: '4px'}}>
                    Incluye código de país sin símbolos (+). Ej: 521 para México.
                  </p>
                </div>
                <button type="submit" className={styles.submitBtn} disabled={savingConfig} style={{background: 'var(--co-primary)'}}>
                  {savingConfig ? 'Guardando...' : 'Actualizar Soporte'}
                </button>
              </form>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.card}>
              <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span className="material-symbols-rounded">add_circle</span> 
                Nueva Promoción
              </h3>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Título del Estudio</label>
                  <input 
                    type="text" 
                    value={formData.titulo} 
                    onChange={e => setFormData({...formData, titulo: e.target.value})}
                    placeholder="Ej: Perfil Hormonal"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Descripción / Detalles</label>
                  <textarea 
                    value={formData.descripcion} 
                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Ej: Especial para la salud de la mujer..."
                    rows="3"
                  />
                </div>
                <div className={styles.row}>
                  <div className={styles.inputGroup}>
                    <label>Precio o %</label>
                    <input 
                      type="text" 
                      value={formData.precio_badge} 
                      onChange={e => setFormData({...formData, precio_badge: e.target.value})}
                      placeholder="Ej: $450 o 20% OFF"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Color</label>
                    <input 
                      type="color" 
                      value={formData.color_acento} 
                      onChange={e => setFormData({...formData, color_acento: e.target.value})}
                    />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>URL de Imagen</label>
                  <input 
                    type="text" 
                    value={formData.imagen_url} 
                    onChange={e => setFormData({...formData, imagen_url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? 'Publicando...' : 'Publicar Oferta'}
                </button>
              </form>
            </div>
          </section>
        </div>

        <section className={styles.listSection}>
          <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span className="material-symbols-rounded">campaign</span> 
            Ofertas Activas
          </h3>
          <div className={styles.list}>
            {promos.length === 0 && <p className={styles.empty}>No hay promociones activas.</p>}
            {promos.map(promo => (
              <div key={promo.id} className={styles.promoItem} style={{borderLeftColor: promo.color_acento}}>
                <div className={styles.promoThumb} style={{backgroundImage: `url(${promo.imagen_url})`}}></div>
                <div className={styles.promoInfo}>
                  <h4>{promo.titulo}</h4>
                  <p>{promo.descripcion}</p>
                  <span className={styles.badge} style={{background: promo.color_acento}}>{promo.precio_badge}</span>
                </div>
                <button className={styles.deleteBtn} onClick={() => handleDelete(promo.id)}>
                  <span className="material-symbols-rounded">delete</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
