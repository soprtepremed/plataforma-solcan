import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Standalone Supabase client — completely isolated from the platform
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const INITIAL_LIMIT = 100;

const solcanTheme = {
  primary: '#05004E',
  secondary: '#A114D6',
  accent: '#0BCECD',
  bg: '#F4F7FB',
  white: '#FFFFFF',
  glass: {
    bg: 'rgba(255, 255, 255, 0.45)',
    blur: '25px',
    border: '1px solid rgba(255, 255, 255, 0.55)',
    radius: '35px',
    shadow: '0 15px 35px rgba(5, 0, 78, 0.08)'
  }
};

export default function CatalogoPublico() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estudios, setEstudios] = useState([]);
  const [initialEstudios, setInitialEstudios] = useState([]); // Cache for initial results
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedEstudio, setSelectedEstudio] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    fetchInitialData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handlePopState);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Parallel requests for count and initial data
      const [countRes, dataRes] = await Promise.all([
        supabase.from('especiales_catalogo').select('*', { count: 'exact', head: true }),
        supabase.from('especiales_catalogo').select('*').order('nombre', { ascending: true }).limit(INITIAL_LIMIT)
      ]);

      if (countRes.count !== null) setTotalCount(countRes.count);
      if (dataRes.data) {
        setEstudios(dataRes.data);
        setInitialEstudios(dataRes.data); // Cache them
      }
    } catch (err) {
      console.error('Speed Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (search) => {
    if (!search.trim()) {
      setEstudios(initialEstudios); // Instant recovery from cache
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('especiales_catalogo')
        .select('*')
        .or(`nombre.ilike.%${search}%,clave_orthin.ilike.%${search}%,metodologia.ilike.%${search}%,tipo_muestra.ilike.%${search}%`)
        .order('nombre', { ascending: true })
        .limit(200); // Limit search results for speed

      if (!error && data) setEstudios(data);
    } catch (err) {
      console.error('Search Speed Error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    
    if (!value.trim()) {
      setEstudios(initialEstudios);
      setIsSearching(false);
      return;
    }

    searchTimer.current = setTimeout(() => {
      performSearch(value);
    }, 300); // Faster debounce (300ms)
  }, [initialEstudios]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      color: solcanTheme.primary,
      fontFamily: "'Outfit', sans-serif",
      backgroundImage: `radial-gradient(circle at 10% 20%, ${solcanTheme.accent}22 0%, transparent 40%), 
                        radial-gradient(circle at 90% 80%, ${solcanTheme.secondary}22 0%, transparent 40%),
                        radial-gradient(circle at 50% 50%, ${solcanTheme.primary}11 0%, transparent 60%)`,
      backgroundAttachment: 'fixed',
      position: 'relative'
    }}>
      {/* Background Blobs (Passive Animation for Performance) */}
      <div style={{ position: 'fixed', width: '300px', height: '300px', borderRadius: '50%', background: solcanTheme.accent, filter: 'blur(100px)', opacity: 0.12, top: '10%', left: '-5%', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'fixed', width: '400px', height: '400px', borderRadius: '50%', background: solcanTheme.secondary, filter: 'blur(120px)', opacity: 0.12, bottom: '5%', right: '-10%', zIndex: 0, pointerEvents: 'none' }}></div>

      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />

      {/* Navbar */}
      <nav style={{
        padding: isMobile ? '12px 20px' : '15px 60px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderBottom: solcanTheme.glass.border,
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/solcan-logo-mark.jpg" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '12px' }} loading="lazy" />
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: solcanTheme.primary, letterSpacing: '-1px' }}>
            SOLCAN <span style={{ color: solcanTheme.secondary }}>LAB</span>
          </h1>
        </div>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: '6px 14px', borderRadius: '25px',
          fontSize: '12px', fontWeight: 800, color: solcanTheme.primary, display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: solcanTheme.accent }}>flash_on</span>
          Catálogo Fast-Query
        </div>
      </nav>

      <main style={{ padding: isMobile ? '30px 20px' : '60px 20px', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: isMobile ? '32px' : '52px', fontWeight: 900, color: solcanTheme.primary, letterSpacing: '-2px', marginBottom: '15px' }}>
            Catálogo de <span style={{ background: `linear-gradient(135deg, ${solcanTheme.accent}, ${solcanTheme.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pruebas Especiales</span>
          </h2>
          
          <div style={{ position: 'relative', maxWidth: '750px', margin: '0 auto' }}>
            <span className="material-symbols-rounded" style={{
              position: 'absolute', left: '25px', top: '50%', transform: 'translateY(-50%)',
              color: solcanTheme.primary, opacity: 0.4, fontSize: '26px'
            }}>search</span>
            <input
              type="text"
              placeholder="Búsqueda instantánea..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%', padding: '22px 30px 22px 70px', fontSize: '18px', fontWeight: 600,
                color: solcanTheme.primary, backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255, 255, 255, 0.7)', borderRadius: '35px',
                outline: 'none', transition: 'all 0.3s ease'
              }}
            />
            {isSearching && (
              <div style={{ position: 'absolute', right: '25px', top: '50%', transform: 'translateY(-50%)' }}>
                <div style={{ width: '20px', height: '20px', border: '3px solid rgba(11, 206, 205, 0.1)', borderTop: `3px solid ${solcanTheme.accent}`, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
              </div>
            )}
          </div>
        </div>

        {/* Results Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {loading ? (
             // Skeletons for faster perceived speed
             Array(6).fill(0).map((_, i) => (
               <div key={i} style={{ height: '200px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '35px', animation: 'pulse 1.5s infinite' }}></div>
             ))
          ) : (
            estudios.map((estudio) => (
              <StudyCard key={estudio.id} estudio={estudio} onClick={() => setSelectedEstudio(estudio)} />
            ))
          )}
        </div>

        {!loading && estudios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
            <span className="material-symbols-rounded" style={{ fontSize: '60px' }}>search_off</span>
            <h3>Sin resultados inmediatos</h3>
          </div>
        )}
      </main>

      {/* Modal Details */}
      {selectedEstudio && (
        <DetailModal estudio={selectedEstudio} onClose={() => setSelectedEstudio(null)} />
      )}

      <footer style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.3 }}>
        <p style={{ fontWeight: 800, fontSize: '11px', letterSpacing: '1px' }}>SOLCAN LAB · SISTEMA DE ALTO RENDIMIENTO</p>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 0.6; } 100% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        body { margin: 0; background: #f0f2f5; overscroll-behavior: none; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}

// Sub-components for better performance (memoization)
const StudyCard = React.memo(({ estudio, onClick }) => (
  <div
    onClick={onClick}
    style={{
      backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(15px)',
      border: '1.5px solid rgba(255, 255, 255, 0.6)', borderRadius: '35px',
      padding: '25px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex', flexDirection: 'column', gap: '12px'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ backgroundColor: 'white', color: '#05004E', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 900 }}>
        #{estudio.clave_orthin}
      </span>
      <div style={{ display: 'flex', gap: '6px' }}>
        {estudio.acreditado_ema && <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#0BCECD' }}>verified</span>}
        {estudio.subrogado && <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#A114D6' }}>sync</span>}
      </div>
    </div>
    <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#05004E', margin: 0, lineHeight: 1.2 }}>{estudio.nombre}</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div>
        <p style={{ color: 'rgba(5, 0, 78, 0.3)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>Muestra</p>
        <p style={{ color: '#05004E', fontSize: '13px', fontWeight: 700, margin: 0 }}>{estudio.tipo_muestra || '—'}</p>
      </div>
      <div>
        <p style={{ color: 'rgba(5, 0, 78, 0.3)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>Entrega</p>
        <p style={{ color: estudio.tiempo_entrega === 'EMD' ? '#0BCECD' : '#05004E', fontSize: '13px', fontWeight: 800, margin: 0 }}>{estudio.tiempo_entrega || '—'}</p>
      </div>
    </div>
  </div>
));

const DetailModal = ({ estudio, onClose }) => (
  <div 
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', backgroundColor: 'rgba(5, 0, 78, 0.2)', backdropFilter: 'blur(20px)', animation: 'fadeIn 0.2s'
    }}
  >
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%', maxWidth: '480px', backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(40px)',
        border: '1.5px solid rgba(255, 255, 255, 0.8)', borderRadius: '45px',
        padding: '35px', boxShadow: '0 40px 80px rgba(5, 0, 78, 0.15)', animation: 'slideUp 0.3s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span style={{ backgroundColor: 'white', color: '#05004E', padding: '6px 14px', borderRadius: '15px', fontSize: '13px', fontWeight: 900 }}>
          #{estudio.clave_orthin}
        </span>
        <button onClick={onClose} style={{ border: 'none', background: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span className="material-symbols-rounded">close</span>
        </button>
      </div>
      <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#05004E', marginBottom: '25px', lineHeight: 1.1 }}>{estudio.nombre}</h2>
      <div style={{ display: 'grid', gap: '20px' }}>
         <ModalItem icon="biotech" label="Metodología" value={estudio.metodologia} />
         <ModalItem icon="bloodtype" label="Muestra" value={estudio.tipo_muestra} />
         <ModalItem icon="timer" label="Entrega" value={estudio.tiempo_entrega} highlight={estudio.tiempo_entrega === 'EMD'} />
         <ModalItem icon="description" label="Contenido" value={estudio.contenido} />
      </div>
    </div>
  </div>
);

const ModalItem = ({ icon, label, value, highlight }) => (
  <div style={{ display: 'flex', gap: '15px' }}>
    <div style={{ width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="material-symbols-rounded" style={{ color: '#A114D6', fontSize: '20px' }}>{icon}</span>
    </div>
    <div>
      <p style={{ color: 'rgba(5, 0, 78, 0.3)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1px' }}>{label}</p>
      <p style={{ color: highlight ? '#0BCECD' : '#05004E', fontSize: '15px', fontWeight: 700, margin: 0 }}>{value || 'N/A'}</p>
    </div>
  </div>
);
