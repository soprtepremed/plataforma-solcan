import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./ResultadosLista.module.css";

export default function ResultadosLista() {
  const { user } = useAuth();
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchResultados = async () => {
    setLoading(true);
    
    // Construimos la query base
    let query = supabase
      .from("resultados")
      .select("*")
      .order("created_at", { ascending: false });

    // "No deben mezclarse": Si no es admin, filtramos por su sucursal
    if (user?.role !== 'admin' && user?.branch) {
      query = query.eq('sucursal', user.branch);
    }

    const { data, error } = await query;

    if (!error) {
      setResultados(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResultados();
  }, [user]);

  const handleEliminar = async (id) => {
    if (!confirm("¿Estás seguro?")) return;
    const { error } = await supabase.from("resultados").delete().eq("id", id);
    if (!error) setResultados(resultados.filter(r => r.id !== id));
  };

  const filtered = resultados.filter(r => 
    r.pdf_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.access_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Historial: {user?.role === 'admin' ? 'Global' : user?.branch}</h1>
          <p style={{ color: 'var(--co-text-muted)', fontSize: '0.9rem' }}>
            {user?.role === 'admin' ? 'Visualizando todos los registros del sistema' : `Resultados generados en ${user?.branch}`}
          </p>
        </div>
        
        <div className={styles.searchArea}>
          <span className={`material-symbols-rounded ${styles.searchIcon}`}>search</span>
          <input 
            type="text" 
            placeholder="Buscar por paciente o código..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.empty}>Cargando historial...</div>
          ) : filtered.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre / Paciente</th>
                  <th>Código</th>
                  {user?.role === 'admin' && <th>Sucursal</th>}
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.pdf_nombre}</td>
                    <td>
                      <span className={styles.codeBadge}>{item.access_code}</span>
                    </td>
                    {user?.role === 'admin' && (
                      <td style={{ fontSize: '0.85rem' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>location_on</span>
                        {item.sucursal || 'Central'}
                      </td>
                    )}
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <a href={item.pdf_url} target="_blank" rel="noreferrer" className={`${styles.actionBtn} ${styles.viewBtn}`}>
                          <span className="material-symbols-rounded">visibility</span>
                        </a>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleEliminar(item.id)}>
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.empty}>No se encontraron resultados.</div>
          )}
        </div>
      </div>
    </div>
  );
}
