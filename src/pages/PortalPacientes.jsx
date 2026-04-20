import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Logo from '../components/common/Logo';
import styles from './PortalPacientes.module.css';

export default function PortalPacientes() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState(code || '');
  const [result, setResult] = useState(null);
  const [promos, setPromos] = useState([]);
  const [portalConfig, setPortalConfig] = useState({ whatsapp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPromos();
    fetchConfig();
    if (code) {
      handleSearch(null, code);
    }
  }, [code]);

  const fetchConfig = async () => {
    const { data } = await supabase.from('portal_config').select('*');
    if (data) {
      const whatsapp = data.find(c => c.key === 'whatsapp_number')?.value || '';
      setPortalConfig({ whatsapp });
    }
  };

  const fetchPromos = async () => {
    const { data } = await supabase
      .from('promociones')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPromos(data);
  };

  const handleSearch = async (e, directCode) => {
    if (e) e.preventDefault();
    const searchCode = directCode || accessCode;
    
    if (!searchCode || searchCode.length < 4) {
      setError('Por favor ingresa un código válido.');
      return;
    }

    setLoading(true);
    setError('');
    
    const { data, error: dbError } = await supabase
      .from('resultados')
      .select('*')
      .ilike('access_code', searchCode)
      .single();

    if (dbError || !data) {
      setError('Código no encontrado. Verifica tu ticket o contacta a soporte.');
      setResult(null);
    } else {
      setResult(data);
      setShowModal(true);
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(result.pdf_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', result.pdf_nombre || 'resultado_solcan.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar:', err);
      // Fallback a apertura en nueva pestaña si el fetch falla
      window.open(result.pdf_url, '_blank');
    }
  };

  return (
    <div className={styles.portalContainer}>
      <header className={styles.portalHeader}>
        <Logo size="lg" variant="white" />
        <p style={{marginTop: '1rem', color: '#ffffff', fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>
          Sistema de Entrega de Resultados Oficiales
        </p>
      </header>

      <div className={styles.portalCard}>
        <div style={{textAlign: 'center'}}>
          <h1 className={styles.portalTitle}>
            Reporte de Resultados
          </h1>
          <p className={styles.portalSubtitle}>
            Introduzca su código de seguridad proporcionado.
          </p>
        </div>

        <form onSubmit={handleSearch} className={styles.inputGroup}>
          <input 
            type="text"
            className={styles.inputField}
            placeholder="CÓDIGO DE ACCESO"
            maxLength={8}
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
          />
          {error && <p style={{color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: 0, fontWeight: 'bold'}}>{error}</p>}
          
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            <span className="material-symbols-rounded">verified_user</span>
            {loading ? 'Validando...' : 'Consultar Reporte Oficial'}
          </button>
        </form>

        <p style={{fontSize: '0.8rem', color: '#1e293b', textAlign: 'center', fontWeight: '600', opacity: 0.8}}>
          Infraestructura de Grado Clínico Encriptada
        </p>
      </div>

      <section className={styles.promosSection}>
        <h2 className={styles.promosTitle}>
          <span className="material-symbols-rounded" style={{color: '#f59e0b'}}>local_fire_department</span>
          Ofertas Exclusivas para Ti
        </h2>
        <div className={styles.promosGrid}>
          {promos.map(promo => (
            <div key={promo.id} className={styles.promoCard}>
              <div 
                className={styles.promoImage} 
                style={{backgroundImage: `url(${promo.imagen_url || '/solcan-banner.jpg'})`}}
              ></div>
              <div className={styles.promoContent}>
                <div className={styles.promoPrice} style={{backgroundColor: promo.color_acento || '#0ea5e9'}}>
                  {promo.precio_badge}
                </div>
                <div className={styles.promoHeader}>
                  <h4>{promo.titulo}</h4>
                  <p>{promo.descripcion}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showModal && result && (
        <div className={styles.resultOverlay}>
          <div className={styles.resultModal}>
            <header className={styles.modalHeader}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <span className="material-symbols-rounded" style={{color:'#0ea5e9', fontSize:'32px'}}>verified_user</span>
                <div>
                  <h3 style={{margin:0, fontSize:'1.1rem'}}>Resultado Disponible</h3>
                  <p style={{margin:0, fontSize:'0.8rem', color:'#64748b'}}>{result.pdf_nombre}</p>
                </div>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                <button onClick={handleDownload} className={styles.downloadBtn} style={{border:'none', cursor:'pointer'}}>
                  <span className="material-symbols-rounded">download</span>
                  Descargar PDF
                </button>
                <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
            </header>
            <iframe src={result.pdf_url} className={styles.pdfFrame} title="Resultado PDF"></iframe>
          </div>
        </div>
      )}

      <footer className={styles.portalFooter}>
        <p>&copy; {new Date().getFullYear()} Solcan Lab. Todos los derechos reservados.</p>
        <p>Resultados Seguros</p>
      </footer>

      {/* WhatsApp Floating Button */}
      <a 
        href={`https://wa.me/${portalConfig.whatsapp}?text=Hola,%20necesito%20ayuda%20con%20el%20portal%20de%20resultados.`} 
        target="_blank" 
        rel="noreferrer" 
        className={styles.whatsappFab}
        title="Soporte WhatsApp"
      >
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
          alt="WhatsApp" 
        />
        <span>¿Necesitas ayuda?</span>
      </a>
    </div>
  );
}
