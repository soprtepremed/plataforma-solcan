import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import styles from "../../Sucursales.module.css";

export default function HematologiaDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    criticos: 0,
    caducos: 0,
    enUso: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Ajustar filtros según el área
      const { data, error } = await supabase
        .from('inventario_laboratorio')
        .select('*')
        .eq('area', 'HEMATOLOGÍA');

      if (error) throw error;

      if (data) {
        const now = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(now.getMonth() + 3);

        setStats({
          total: data.length,
          criticos: data.filter(i => (i.stock || 0) <= (i.minimo || 5)).length,
          caducos: data.filter(i => i.caducidad && new Date(i.caducidad) <= threeMonthsFromNow).length,
          enUso: data.filter(i => i.estatus === 'EN USO').length
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { title: 'Total Materiales', value: stats.total, icon: 'inventory_2', color: '#0BCECD', path: '/area/hematologia/inventario' },
    { title: 'Stock Crítico', value: stats.criticos, icon: 'warning', color: '#F59E0B', path: '/area/hematologia/inventario?filter=critico' },
    { title: 'Próximos a Caducar', value: stats.caducos, icon: 'event_busy', color: '#EF4444', path: '/area/hematologia/inventario?filter=caducidad' },
    { title: 'En Uso / Abiertos', value: stats.enUso, icon: 'science', color: '#7C3AED', path: '/area/hematologia/inventario?filter=en_uso' }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.dashHeader}>
        <div>
          <h1 className={styles.dashTitle}>Dashboard Hematología</h1>
          <p className={styles.dashSubtitle}>Gestión y control de inventario especializado</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchStats} disabled={loading}>
          <span className="material-symbols-rounded">{loading ? 'sync' : 'refresh'}</span>
        </button>
      </header>

      <div className={styles.statsGrid}>
        {cards.map((card, i) => (
          <div key={i} className={styles.statCard} onClick={() => navigate(card.path)}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox} style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                <span className="material-symbols-rounded">{card.icon}</span>
              </div>
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardValue}>{card.value}</h3>
              <p className={styles.cardLabel}>{card.title}</p>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.trendText}>Ver Detalles</span>
              <span className="material-symbols-rounded">chevron_right</span>
            </div>
          </div>
        ))}
      </div>

      <section className={styles.actionSection} style={{ marginTop: '2rem' }}>
        <h2 className={styles.sectionTitle}>Acciones Rápidas</h2>
        <div className={styles.quickActions}>
          <button className={styles.actionBtn} onClick={() => navigate('/area/hematologia/inventario')}>
            <span className="material-symbols-rounded">list_alt</span>
            Gestionar Inventario
          </button>
          <button className={styles.actionBtn} onClick={() => navigate('/almacen/nueva-solicitud')}>
            <span className="material-symbols-rounded">shopping_cart</span>
            Solicitar Material
          </button>
        </div>
      </section>
    </div>
  );
}
