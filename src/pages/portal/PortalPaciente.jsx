import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Logo from "../../components/common/Logo";
import styles from "./PortalPaciente.module.css";

export default function PortalPaciente() {
  const { code: codeParam } = useParams(); // Si llega desde el QR con /portal/XXXXXX
  const [code, setCode] = useState(codeParam || "");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const buscarResultado = async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) {
      setError("El código debe tener exactamente 6 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    setResultado(null);

    const { data, error: dbError } = await supabase
      .from("resultados")
      .select("*")
      .eq("access_code", clean)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError("No encontramos resultados con ese código. Verifica e intenta de nuevo.");
      return;
    }

    setResultado(data);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") buscarResultado();
  };

  return (
    <div className={styles.page}>
      {/* Tarjeta central de búsqueda */}
      <div className={styles.card}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo variant="white" size="lg" />
        </div>
        <h1 className={styles.title}>Resultados de Laboratorio</h1>
        <p className={styles.subtitle}>
          Ingresa el código de 6 dígitos que te proporcionó el laboratorio Solcan Lab.
        </p>

        <input
          className={styles.codeInput}
          type="text"
          maxLength={6}
          placeholder="XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        {error && (
          <div className={styles.errorBox}>
            <span className="material-symbols-rounded" style={{ fontSize: "20px" }}>error</span>
            {error}
          </div>
        )}

        <button
          className={styles.searchBtn}
          onClick={buscarResultado}
          disabled={loading || code.length < 6}
        >
          <span className="material-symbols-rounded" style={{ fontSize: "20px" }}>
            {loading ? "sync" : "search"}
          </span>
          {loading ? "Buscando..." : "Ver mis Resultados"}
        </button>
      </div>

      {/* Visor de PDF (aparece cuando se encuentra el resultado) */}
      {resultado && (
        <div className={styles.pdfSection}>
          <div className={styles.pdfHeader}>
            <div>
              <p style={{ fontWeight: 700, fontSize: "1rem" }}>{resultado.pdf_nombre}</p>
              <p style={{ opacity: 0.6, fontSize: "0.8rem", marginTop: "2px" }}>
                Fecha: {new Date(resultado.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <a
              href={resultado.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.downloadBtn}
              download
            >
              <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>download</span>
              Descargar PDF
            </a>
          </div>

          <iframe
            src={resultado.pdf_url}
            className={styles.pdfFrame}
            title="Resultado de laboratorio"
          />
        </div>
      )}
    </div>
  );
}
