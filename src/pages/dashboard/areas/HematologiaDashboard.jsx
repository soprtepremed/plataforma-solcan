import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

const HematologiaDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    critico: 0,
    caducidad: 0,
    enUso: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Conectado a la tabla maestra de áreas
      const { data, error } = await supabase
        .from('inventario_areas')
        .select('*')
        .eq('area_id', 'hematologia');

      if (data) {
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(now.getDate() + 30);

        setStats({
          total: data.length,
          critico: data.filter(i => i.stock_actual < 5 && i.stock_actual > 0).length,
          caducidad: data.filter(i => i.caducidad && new Date(i.caducidad) <= nextMonth).length,
          enUso: data.filter(i => i.fecha_inicio_uso && !i.fecha_termino_uso).length
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Inventario y Calidad',
      desc: 'Control de reactivos, lotes y bitácora de aceptación técnica.',
      icon: 'fact_check',
      path: '/area/hematologia/inventario',
      color: '#DC2626'
    },
    {
      title: 'Bitácora FO-DO-017',
      desc: 'Seguimiento de muestras recibidas por bio-logística.',
      icon: 'assignment_turned_in',
      path: '/logistica/bitacora',
      color: '#3B82F6'
    }
  ];

  return (
    <div style={{ padding: '2rem', background: '#F8FAFC', minHeight: 'calc(100vh - 102px)' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '3.5rem', color: '#DC2626' }}>bloodtype</span>
          Dashboard de Hematología
        </h2>
        <p style={{ color: '#64748B', fontSize: '1.1rem' }}>Suministros y Control Operativo del Área Técnica.</p>
      </header>

      {/* MÉTRICAS EN TIEMPO REAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', borderLeft: '6px solid #3B82F6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748B', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Inventario Total</p>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1E293B' }}>{loading ? '...' : stats.total}</h3>
          <p style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Reactivos Registrados</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', borderLeft: '6px solid #EF4444', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748B', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Stock Crítico</p>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#EF4444' }}>{loading ? '...' : stats.critico}</h3>
          <p style={{ fontSize: '0.75rem', color: '#EF4444' }}>Menos de 5 unidades</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', borderLeft: '6px solid #F59E0B', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748B', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Próximos a Caducar</p>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#F59E0B' }}>{loading ? '...' : stats.caducidad}</h3>
          <p style={{ fontSize: '0.75rem', color: '#F59E0B' }}>Siguiente 30 días</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', borderLeft: '6px solid #10B981', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748B', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>En Uso (Abierto)</p>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10B981' }}>{loading ? '...' : stats.enUso}</h3>
          <p style={{ fontSize: '0.75rem', color: '#10B981' }}>Reactivos en Proceso</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {sections.map(s => (
          <div 
            key={s.path}
            onClick={() => navigate(s.path)}
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: '1px solid #E2E8F0'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: s.color, marginBottom: '1rem' }}>
              {s.icon}
            </span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: '#1E293B' }}>{s.title}</h3>
            <p style={{ color: '#64748B', lineHeight: '1.5' }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HematologiaDashboard;
