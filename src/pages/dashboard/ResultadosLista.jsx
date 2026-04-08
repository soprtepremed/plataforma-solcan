import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./ResultadosLista.module.css";

export default function ResultadosLista() {
  const { user } = useAuth();
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchResultados = async () => {
    setLoading(true);
    
    // Construimos la query base
    // Optimizamos: Pedimos solo columnas específicas y limitamos a los últimos 50 para velocidad punta
    const { data, error } = await supabase
      .from("resultados")
      .select("id, pdf_nombre, access_code, created_at, pdf_url")
      .order("created_at", { ascending: false })
      .limit(50);
 
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
      {/* Modal de Previsualización */}
      {previewUrl && (
        <div className={styles.modalOverlay} onClick={() => setPreviewUrl(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Vista Previa del Resultado</h3>
              <button className={styles.closeModal} onClick={() => setPreviewUrl(null)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              <iframe src={previewUrl} className={styles.pdfIframe} title="Vista previa" />
            </div>
          </div>
        </div>
      )}

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
                  <th>Archivo PDF</th>
                  <th>Código de Acceso</th>
                  <th>Fecha de Carga</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '8px', color: 'var(--co-accent)' }}>description</span>
                      {item.pdf_nombre}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.codeBadge}>{item.access_code}</span>
                        <button 
                          className={styles.copyBtn} 
                          onClick={() => {
                            navigator.clipboard.writeText(item.access_code);
                            alert("Código copiado: " + item.access_code);
                          }}
                          title="Copiar código"
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>content_copy</span>
                        </button>
                      </div>
                    </td>
                    <td style={{ color: 'var(--co-text-muted)' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => setPreviewUrl(item.pdf_url)}
                          title="Vista rápida"
                        >
                          <span className="material-symbols-rounded">visibility</span>
                        </button>
                        
                        <a 
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `*Solcan Lab - Resultados Disponibles*\n\nEstimado paciente, le informamos que sus resultados ya han sido liberados. Agradecemos su preferencia.\n\n- Portal: https://plataforma-solcan.vercel.app/portal\n- Código de acceso: *${item.access_code}*`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`${styles.actionBtn} ${styles.whatsappBtn}`}
                          title="Enviar a WhatsApp"
                        >
                          <span className="material-symbols-rounded">share</span>
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
