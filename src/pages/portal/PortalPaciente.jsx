import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../lib/supabaseClient";
import Logo from "../../components/common/Logo";
import styles from "./PortalPaciente.module.css";

export default function PortalPaciente() {
  const { code: codeParam } = useParams();
  const [code, setCode] = useState(codeParam || "");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  // Efecto para buscar automáticamente si llega el código por URL (QR)
  useEffect(() => {
    if (codeParam && codeParam.length === 6) {
      buscarResultado(codeParam);
    }
  }, [codeParam]);

  // Configurar y limpiar el escáner
  useEffect(() => {
    if (showScanner) {
      // Pequeño timeout para asegurar que el div "reader" ya esté en el DOM
      const timer = setTimeout(() => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) return;

        const scanner = new Html5QrcodeScanner("reader", { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        });

        scanner.render((decodedText) => {
          const extractedCode = decodedText.split('/').pop()?.toUpperCase();
          if (extractedCode && extractedCode.length === 6) {
            if (navigator.vibrate) navigator.vibrate(200);
            setCode(extractedCode);
            setShowScanner(false);
            scanner.clear();
            buscarResultado(extractedCode);
          }
        }, (err) => {
          // Errores de escaneo silenciosos
        });

        scannerRef.current = scanner;
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.error("Error al cerrar scanner:", e));
        }
      };
    }
  }, [showScanner]);

  const buscarResultado = async (overrideCode) => {
    const targetCode = (overrideCode || code).trim().toUpperCase();
    if (targetCode.length !== 6) {
      setError("El código debe tener exactamente 6 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    setResultado(null);

    const { data, error: dbError } = await supabase
      .from("resultados")
      .select("*")
      .eq("access_code", targetCode)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError("No encontramos resultados con ese código. Verifica e intenta de nuevo.");
      return;
    }

    setResultado(data);
  };

    const handleDownload = async (e) => {
      e.preventDefault();
      try {
        const response = await fetch(resultado.pdf_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resultado.pdf_nombre || "Resultado_Solcan.pdf";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error("Error al descargar:", err);
        // Fallback si el fetch falla (CORS)
        window.open(resultado.pdf_url, '_blank');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter") buscarResultado();
    };

    return (
      <div className={styles.page}>
        <div className={styles.meshBackground}></div>
        
        {/* Tarjeta central de búsqueda - GLOSS DESIGN */}
        <div className={`${styles.card} ${resultado ? styles.cardResults : ""}`}>
          <div className={styles.logoWrapper}>
            <Logo variant="white" size="lg" />
          </div>
          
          <h1 className={styles.title}>Resultados de Laboratorio</h1>
          
          {!showScanner ? (
            <>
              <p className={styles.subtitle}>
                Ingresa tu código de 6 dígitos o escanea el QR de tu comprobante.
              </p>
  
              <div className={styles.inputGroup}>
                <input
                  className={styles.codeInput}
                  type="text"
                  maxLength={6}
                  placeholder="CÓDIGO"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
  
              {error && (
                <div className={styles.errorBox}>
                  <span className="material-symbols-rounded">error</span>
                  {error}
                </div>
              )}
  
              <div className={styles.actionButtons}>
                <button
                  className={styles.searchBtn}
                  onClick={() => buscarResultado()}
                  disabled={loading || code.length < 6}
                >
                  <span className="material-symbols-rounded">
                    {loading ? "sync" : "manage_search"}
                  </span>
                  {loading ? "Buscando..." : "Consultar"}
                </button>
  
                <button
                  className={styles.scannerBtn}
                  onClick={() => setShowScanner(true)}
                >
                  <span className="material-symbols-rounded">qr_code_scanner</span>
                  Escanear QR
                </button>
              </div>
            </>
          ) : (
            <div className={styles.scannerContainer}>
              <div id="reader" className={styles.reader}></div>
              <button className={styles.cancelBtn} onClick={() => setShowScanner(false)}>
                <span className="material-symbols-rounded">close</span>
                Cerrar Cámara
              </button>
            </div>
          )}
        </div>
  
        {/* Visor de PDF (aparece cuando se encuentra el resultado) */}
        {resultado && (
          <div className={styles.pdfSection}>
            <div className={styles.pdfHeader}>
              <div className={styles.pdfInfo}>
                <span className="material-symbols-rounded" style={{color:'var(--co-accent)'}}>description</span>
                <div>
                  <p className={styles.pdfName}>{resultado.pdf_nombre}</p>
                  <p className={styles.pdfDate}>
                    Emitido el {new Date(resultado.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className={styles.downloadBtn}
              >
                <span className="material-symbols-rounded">download</span>
                Descargar
              </button>
            </div>
  
            <div className={styles.frameContainer}>
              <iframe
                src={resultado.pdf_url}
                className={styles.pdfFrame}
                title="Resultado de laboratorio"
              />
            </div>
          </div>
        )}
      
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Solcan Lab. Todos los derechos reservados.
      </footer>
    </div>
  );
}

