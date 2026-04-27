import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import styles from '../InventarioHemato.module.css';

const CatalogoEspeciales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [estudios, setEstudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef(null);
  const INITIAL_LIMIT = 100;

  const initialForm = {
    clave_orthin: '',
    nombre: '',
    metodologia: '',
    contenido: 'NA',
    tipo_muestra: '',
    tiempo_entrega: '',
    acreditado_ema: false,
    subrogado: false,
    notas: ''
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchCatalogo();
    fetchTotalCount();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const fetchTotalCount = async () => {
    const { count } = await supabase
      .from('especiales_catalogo')
      .select('*', { count: 'exact', head: true });
    if (count !== null) setTotalCount(count);
  };

  const fetchCatalogo = async (search = '') => {
    setLoading(true);
    try {
      let query = supabase
        .from('especiales_catalogo')
        .select('*')
        .order('nombre', { ascending: true });

      if (search.trim()) {
        query = query.or(
          `nombre.ilike.%${search}%,clave_orthin.ilike.%${search}%,metodologia.ilike.%${search}%,tipo_muestra.ilike.%${search}%`
        );
      } else {
        query = query.limit(INITIAL_LIMIT);
      }

      const { data, error } = await query;
      if (!error && data) {
        setEstudios(data);
      }
    } catch (err) {
      console.error('Error al cargar el catálogo:', err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setIsSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchCatalogo(value);
    }, 400);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await supabase.from('especiales_catalogo').update(form).eq('id', editingId);
      } else {
        await supabase.from('especiales_catalogo').insert([form]);
      }
      setShowModal(false);
      setEditingId(null);
      setForm(initialForm);
      fetchCatalogo(searchTerm);
      fetchTotalCount();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const handleEdit = (estudio) => {
    setForm(estudio);
    setEditingId(estudio.id);
    setShowModal(true);
  };

  // Data comes pre-filtered from the server now
  const filteredEstudios = estudios;

  /* ─── Inline Styles ─── */
  const sx = {
    /* Search bar - sticky on mobile */
    searchWrap: {
      position: 'sticky', top: 0, zIndex: 10,
      background: 'white', padding: '16px', borderRadius: '16px',
      boxShadow: '0 2px 12px rgba(0,0,0,.06)',
      marginBottom: '16px',
    },
    searchInput: {
      width: '100%', padding: '14px 14px 14px 44px',
      border: '2px solid #E2E8F0', borderRadius: '14px',
      fontSize: '1rem', fontWeight: 600,
      background: '#F8FAFC', outline: 'none',
      transition: 'border-color .2s',
    },
    searchIcon: {
      position: 'absolute', left: '30px', top: '50%',
      transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '1.3rem',
    },
    resultCount: {
      fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700,
      marginTop: '8px', paddingLeft: '4px',
    },

    /* Card grid */
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: '16px', padding: '0 4px',
    },
    card: {
      background: 'white', borderRadius: '18px',
      border: '1px solid #E2E8F0',
      boxShadow: '0 2px 10px rgba(0,0,0,.04)',
      overflow: 'hidden',
      transition: 'transform .15s, box-shadow .15s',
    },
    cardTop: {
      padding: '18px 18px 14px',
      borderBottom: '1px solid #F1F5F9',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    cardBody: {
      padding: '14px 18px 18px',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
    },
    cardField: {
      display: 'flex', flexDirection: 'column', gap: '2px',
    },
    fieldLabel: {
      fontSize: '0.68rem', fontWeight: 800,
      color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px',
    },
    fieldValue: {
      fontSize: '0.85rem', fontWeight: 600, color: '#334155',
      lineHeight: 1.3,
    },
    claveBadge: {
      background: '#EDE9FE', color: '#7C3AED',
      padding: '4px 12px', borderRadius: '20px',
      fontWeight: 800, fontSize: '0.78rem',
      fontFamily: 'monospace', whiteSpace: 'nowrap',
    },
    tiempoBadge: (t) => ({
      display: 'inline-block',
      background: t === 'EMD' ? '#DCFCE7' : '#F0F9FF',
      color: t === 'EMD' ? '#15803D' : '#0369A1',
      padding: '3px 10px', borderRadius: '20px',
      fontWeight: 700, fontSize: '0.78rem',
    }),
    emaBadge: {
      background: '#DBEAFE', color: '#1D4ED8',
      padding: '2px 8px', borderRadius: '10px',
      fontSize: '0.65rem', fontWeight: 800,
    },
    subBadge: {
      background: '#FFE4E6', color: '#BE123C',
      padding: '2px 8px', borderRadius: '10px',
      fontSize: '0.65rem', fontWeight: 800,
    },
    editBtn: {
      background: '#F1F5F9', border: 'none', borderRadius: '10px',
      padding: '6px 8px', cursor: 'pointer', color: '#64748B',
      transition: 'background .15s',
    },

    /* Desktop table */
    thStyle: { padding: '14px 16px', textAlign: 'left', fontWeight: 800, fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' },
    tdStyle: { padding: '14px 16px', fontSize: '0.85rem' },
  };

  /* ─── Mobile Card Component ─── */
  const StudyCard = ({ e }) => (
    <div style={sx.card}>
      <div style={sx.cardTop}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={sx.claveBadge}>#{e.clave_orthin}</span>
            {e.acreditado_ema && <span style={sx.emaBadge}>✦ EMA</span>}
            {e.subrogado && <span style={sx.subBadge}>Subrogado</span>}
          </div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1E293B', lineHeight: 1.3 }}>
            {e.nombre}
          </h4>
        </div>
        <button onClick={() => handleEdit(e)} style={sx.editBtn}>
          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>edit</span>
        </button>
      </div>
      <div style={sx.cardBody}>
        <div style={sx.cardField}>
          <span style={sx.fieldLabel}>Metodología</span>
          <span style={sx.fieldValue}>{e.metodologia || '—'}</span>
        </div>
        <div style={sx.cardField}>
          <span style={sx.fieldLabel}>Tipo de Muestra</span>
          <span style={sx.fieldValue}>{e.tipo_muestra || '—'}</span>
        </div>
        <div style={sx.cardField}>
          <span style={sx.fieldLabel}>Entrega</span>
          <span style={sx.tiempoBadge(e.tiempo_entrega)}>{e.tiempo_entrega || '—'}</span>
        </div>
        <div style={sx.cardField}>
          <span style={sx.fieldLabel}>Contenido</span>
          <span style={{ ...sx.fieldValue, fontSize: '0.78rem', color: '#64748B' }}>{e.contenido || 'NA'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header} style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: isMobile ? '1.2rem' : undefined }}>
          <span className="material-symbols-rounded" style={{ color: '#7C3AED', fontSize: isMobile ? '1.8rem' : '2.5rem' }}>menu_book</span>
          Catálogo Orthin
        </h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ background: '#F0FDF4', color: '#15803D', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem' }}>
            {totalCount} estudios{!searchTerm.trim() && ` · mostrando ${filteredEstudios.length}`}
          </span>
          <button className={styles.btnPrimary} onClick={() => { setForm(initialForm); setEditingId(null); setShowModal(true); }}
            style={isMobile ? { padding: '8px 14px', fontSize: '0.82rem' } : undefined}>
            <span className="material-symbols-rounded">add_circle</span>
            {!isMobile && ' Nuevo Estudio'}
          </button>
        </div>
      </header>

      {/* Search */}
      <div style={sx.searchWrap}>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-rounded" style={sx.searchIcon}>search</span>
          <input
            placeholder="Buscar por nombre, clave, metodología o muestra..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={sx.searchInput}
            onFocus={(e) => e.target.style.borderColor = '#7C3AED'}
            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
          />
          {isSearching && (
            <span className="material-symbols-rounded" style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', color: '#7C3AED', fontSize: '1.2rem', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          )}
        </div>
        {searchTerm ? (
          <p style={sx.resultCount}>
            {isSearching ? 'Buscando...' : `${filteredEstudios.length} resultado${filteredEstudios.length !== 1 ? 's' : ''} de ${totalCount}`}
          </p>
        ) : (
          <p style={sx.resultCount}>
            Primeros {INITIAL_LIMIT} estudios · escribe para buscar entre los {totalCount}
          </p>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className={styles.loader}></div>
          <p>Cargando catálogo especializado...</p>
        </div>
      ) : filteredEstudios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#64748B' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '4rem', display: 'block', marginBottom: '12px' }}>search_off</span>
          <p style={{ fontWeight: 700 }}>No se encontraron estudios para "{searchTerm}"</p>
          <p style={{ fontSize: '0.85rem' }}>Intenta buscar con otro nombre o clave.</p>
        </div>
      ) : isMobile ? (
        /* ─── MOBILE: Card Layout ─── */
        <div style={sx.cardGrid}>
          {filteredEstudios.map(e => <StudyCard key={e.id} e={e} />)}
        </div>
      ) : (
        /* ─── DESKTOP: Table Layout ─── */
        <div className={styles.inventoryTable}>
          <div className={styles.tableContainer}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={sx.thStyle}>CLAVE</th>
                  <th style={sx.thStyle}>ESTUDIO</th>
                  <th style={sx.thStyle}>METODOLOGÍA</th>
                  <th style={sx.thStyle}>MUESTRA</th>
                  <th style={sx.thStyle}>ENTREGA</th>
                  <th style={{ ...sx.thStyle, textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstudios.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background .15s' }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = '#FAFBFF'}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = 'white'}>
                    <td style={{ ...sx.tdStyle, fontWeight: 800, color: '#7C3AED', fontFamily: 'monospace' }}>{e.clave_orthin}</td>
                    <td style={sx.tdStyle}>
                      <div style={{ fontWeight: 800, color: '#1E293B' }}>
                        {e.nombre}
                        {e.acreditado_ema && <span style={{ ...sx.emaBadge, marginLeft: '6px' }}>EMA</span>}
                        {e.subrogado && <span style={{ ...sx.subBadge, marginLeft: '4px' }}>SUB</span>}
                      </div>
                      {e.contenido && e.contenido !== 'NA' && e.contenido !== 'N/A' && (
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>Contenido: {e.contenido}</div>
                      )}
                    </td>
                    <td style={{ ...sx.tdStyle, color: '#475569' }}>{e.metodologia}</td>
                    <td style={{ ...sx.tdStyle, color: '#475569' }}>{e.tipo_muestra}</td>
                    <td style={sx.tdStyle}>
                      <span style={sx.tiempoBadge(e.tiempo_entrega)}>{e.tiempo_entrega}</span>
                    </td>
                    <td style={{ ...sx.tdStyle, textAlign: 'center' }}>
                      <button onClick={() => handleEdit(e)} style={sx.editBtn}>
                        <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
                <span className="material-symbols-rounded" style={{ color: '#7C3AED' }}>menu_book</span>
                {editingId ? 'Editar Estudio' : 'Nuevo Estudio'}
              </h2>
              <button onClick={() => setShowModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
                <span className="material-symbols-rounded" style={{ color: '#64748B' }}>close</span>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Clave Orthin</label>
                  <input required value={form.clave_orthin} onChange={(e) => setForm({...form, clave_orthin: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Nombre del Estudio</label>
                  <input required value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Metodología</label>
                  <input value={form.metodologia} onChange={(e) => setForm({...form, metodologia: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Tipo de Muestra(s)</label>
                  <input required value={form.tipo_muestra} onChange={(e) => setForm({...form, tipo_muestra: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Tiempo de Entrega</label>
                  <input value={form.tiempo_entrega} onChange={(e) => setForm({...form, tiempo_entrega: e.target.value})} placeholder="ej. 1 día hábil / EMD" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Contenido / Parámetros</label>
                  <input value={form.contenido} onChange={(e) => setForm({...form, contenido: e.target.value})} />
                </div>
                <div className={styles.inputGroup} style={{ display: 'flex', gap: '24px', alignItems: 'center', gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" checked={form.acreditado_ema} onChange={(e) => setForm({...form, acreditado_ema: e.target.checked})}
                      style={{ width: '18px', height: '18px', accentColor: '#7C3AED' }} />
                    Acreditado EMA (*)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" checked={form.subrogado} onChange={(e) => setForm({...form, subrogado: e.target.checked})}
                      style={{ width: '18px', height: '18px', accentColor: '#F43F5E' }} />
                    Subrogado (**)
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>
                  <span className="material-symbols-rounded">save</span> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogoEspeciales;
