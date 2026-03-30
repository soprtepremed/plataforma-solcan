import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import styles from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("El Paso Limon");
  const [selectedRole, setSelectedRole] = useState("recepcion");
  const [isMatrixAccess, setIsMatrixAccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const branches = [
    "El Paso Limon",
    "Chiapa de Corzo",
    "Arenal Club Campestre",
    "San Cristobal",
    "Tapachula"
  ];

  const roles = [
    { id: 'recepcion', label: 'Recepción' },
    { id: 'mensajero', label: 'Mensajero / Chofer' },
    { id: 'captura', label: 'Captura / Resultados' },
    { id: 'admin', label: 'Administrador' }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !pin) {
      setErrorMsg("Ingresa tu usuario y PIN");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const result = await login(username, pin, isMatrixAccess, selectedBranch, selectedRole);
    if (!result.success) {
      setErrorMsg("Credenciales incorrectas. Verifica tu usuario y PIN.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" />
        </div>
        <h1 className={styles.title}>Plataforma Solcan</h1>
        <p className={styles.subtitle}>
          Ingresa con tu usuario asignado y PIN.
        </p>

        {errorMsg && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Toggle de Matriz */}
          <div className={styles.matrixToggleContainer}>
            <span className={styles.matrixLabel}>Acceso a Funciones de Matriz</span>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={isMatrixAccess}
                onChange={(e) => setIsMatrixAccess(e.target.checked)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {isMatrixAccess ? (
            <div className={styles.matrixBadge}>
              <span className="material-symbols-rounded">corporate_fare</span>
              Ubicación: Tuxtla Gutierrez (Matriz)
            </div>
          ) : (
            <div style={{ textAlign: 'left' }}>
              <label className={styles.inputLabel}>SUCURSAL DE ACCESO</label>
              <select 
                className={styles.branchSelect}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ textAlign: 'left' }}>
            <label className={styles.inputLabel}>ROL / FUNCIÓN</label>
            <select 
              className={styles.branchSelect}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={{ textAlign: 'left' }}>
            <label className={styles.inputLabel}>USUARIO</label>
            <input 
              type="text" 
              className={styles.branchSelect} 
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Ej. maria, admin..." 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label className={styles.inputLabel}>PIN (4 DÍGITOS)</label>
            <input 
              type="password" 
              className={styles.branchSelect} 
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="••••" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            className={styles.roleBtn} 
            style={{ width: '100%', marginTop: '10px', justifyContent: 'center', backgroundColor: 'var(--co-primary)', color: 'white', border: 'none' }}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <span className={styles.versionText} style={{ marginTop: '20px', display: 'block' }}>Solcan Lab v1.5 • Multi-Sucursal</span>
      </div>
    </div>
  );
}
