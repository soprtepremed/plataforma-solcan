import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import styles from "./Captura.module.css";

// Genera código alfanumérico de 6 dígitos...
const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function Captura() {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resultado, setResultado] = useState(null); // { accessCode, pdfUrl, fileName }
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (selectedFile) => {
    if (!selectedFile || selectedFile.type !== "application/pdf") {
      setError("Solo se permiten archivos en formato PDF.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("El archivo supera el límite de 10MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const code = generateCode();
      // Limpiar el nombre del archivo de espacios y caracteres especiales para evitar error 400
      const safeFileName = selectedFile.name.replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const filePath = `${code}/${safeFileName}`;
 
      // 1. Subir PDF al bucket de Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("resultados-pdf")
        .upload(filePath, selectedFile, { contentType: "application/pdf" });
 
      if (storageError) throw new Error(storageError.message);
 
      // 2. Obtener la URL pública del PDF
      const { data: urlData } = supabase.storage
        .from("resultados-pdf")
        .getPublicUrl(filePath);
 
      const pdfUrl = urlData.publicUrl;
 
      // 3. Guardar el registro en la tabla "resultados"
      const { error: dbError } = await supabase.from("resultados").insert({
        access_code: code,
        pdf_url: pdfUrl,
        pdf_nombre: safeFileName
      });

      if (dbError) throw new Error(dbError.message);

      setResultado({ accessCode: code, pdfUrl, fileName: selectedFile.name });
    } catch (err) {
      setError(`Error al subir: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  const onFileChange = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const portalURL = resultado ? `${window.location.origin}/portal/${resultado.accessCode}` : "";

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Subir Resultados (Captura)</h1>
        <p className={styles.subtitle}>
          Carga los reportes clínicos en PDF. El sistema genera automáticamente
          el código de acceso seguro y lo sube a la nube de Solcan.
        </p>
      </header>

      {error && (
        <div style={{ background: "#FFF5F5", border: "1px solid #FC8181", color: "#C53030", borderRadius: "8px", padding: "12px 16px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="material-symbols-rounded">error</span>
          {error}
        </div>
      )}

      <div className={styles.mainGrid}>
        {/* Zona Drag & Drop */}
        <div
          className={`${styles.dropzone} ${isDragging ? styles.active : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <span className={`material-symbols-rounded ${styles.dropIcon}`} style={{ color: "var(--co-accent)", animation: "spin 1s linear infinite" }}>sync</span>
              <h3>Subiendo a la nube...</h3>
              <p style={{ color: "var(--co-text-muted)", marginTop: "8px", fontSize: "0.9rem" }}>Por favor espera</p>
            </>
          ) : (
            <>
              <span className={`material-symbols-rounded ${styles.dropIcon}`}>cloud_upload</span>
              <h3>Arrastra el PDF aquí o haz clic</h3>
              <p style={{ color: "var(--co-text-muted)", marginTop: "8px", fontSize: "0.9rem" }}>
                Formato requerido: .PDF (Máximo 10MB)
              </p>
            </>
          )}
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </div>

        {/* Tarjeta de Éxito con QR Real */}
        {resultado && (
          <div className={styles.successCard}>
            <span className="material-symbols-rounded" style={{ color: "var(--co-accent)", fontSize: "48px" }}>
              check_circle
            </span>
            <h2 style={{ color: "var(--co-primary)", marginTop: "10px" }}>¡PDF Subido a Supabase!</h2>
            <p style={{ color: "var(--co-text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              <strong>{resultado.fileName}</strong> fue guardado y encriptado en la nube.
            </p>

            <div className={styles.codeBox}>{resultado.accessCode}</div>
            <p style={{ fontSize: "0.85rem", color: "var(--co-text-main)", marginTop: "0.5rem", fontWeight: "600" }}>
              Código de Acceso del Paciente
            </p>

            <div className={styles.qrContainer}>
              <QRCodeSVG
                value={portalURL}
                size={150}
                bgColor={"#ffffff"}
                fgColor={"#05004E"}
                level={"M"}
                includeMargin={false}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--co-text-muted)", marginTop: "4px" }}>
              El QR lleva al paciente directamente a sus resultados
            </p>

            {/* Nuevo: Enlace para copiar */}
            <div className={styles.urlCopyArea}>
               <span className={styles.portalUrlText}>{portalURL}</span>
               <button 
                className={styles.copyBtn} 
                onClick={() => {
                  navigator.clipboard.writeText(portalURL);
                  alert("¡Enlace copiado al portapapeles!");
                }}
               >
                 <span className="material-symbols-rounded">content_copy</span>
                 Copiar Enlace
               </button>
            </div>

            <button
              className={styles.resetBtn}
              onClick={() => setResultado(null)}
            >
              Subir Otro Resultado
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
