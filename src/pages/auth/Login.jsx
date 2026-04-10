import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import styles from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar datos recordados al montar el componente
  useEffect(() => {
    const savedPin = localStorage.getItem('solcan_remember_pin');
    const savedUser = localStorage.getItem('solcan_remember_user');
    if (savedPin && savedUser) {
      setPin(savedPin);
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !pin) {
      setErrorMsg("Ingresa tu usuario y PIN");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const result = await login(username, pin);
    
    if (result.success) {
      // Si el login es exitoso y marcaron "Recordar", guardamos en local storage
      if (rememberMe) {
        localStorage.setItem('solcan_remember_pin', pin);
        localStorage.setItem('solcan_remember_user', username);
      } else {
        localStorage.removeItem('solcan_remember_pin');
        localStorage.removeItem('solcan_remember_user');
      }
    } else {
      setErrorMsg("Credenciales incorrectas. Verifica tu usuario y PIN.");
      setPin(""); // Limpiar PIN para evitar concatenaciones
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* Mantenemos el fondo decorativo 3D solicitado */}
      <div className={styles.backgroundGraphics}></div>

      <div className={styles.loginCard}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" />
        </div>
        <h1 className={styles.title}>Plataforma Solcan</h1>
        <p className={styles.subtitle}>
          Ingresa con tu usuario asignado y PIN de seguridad.
        </p>

        {errorMsg && (
          <div className={styles.errorBanner}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.loginForm}>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>USUARIO</label>
            <input 
              type="text" 
              className={styles.branchSelect} 
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Ej. maria, admin..." 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>PIN DE SEGURIDAD</label>
            <div className={styles.pinWrapper}>
              <input 
                type={showPin ? "text" : "password"} 
                inputMode="numeric"
                pattern="[0-9]*"
                className={styles.branchSelect} 
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '45px' }}
                placeholder="••••" 
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className={styles.togglePinBtn}
                onClick={() => setShowPin(!showPin)}
              >
                <span className="material-symbols-rounded">
                  {showPin ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className={styles.rememberRow}>
            <label className={styles.checkboxContainer}>
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              />
              <span className={styles.checkmark}></span>
              Recordar mi PIN en este dispositivo
            </label>
          </div>

          <button 
            type="submit"
            className={styles.roleBtn} 
            style={{ width: '100%', marginTop: '10px', justifyContent: 'center', backgroundColor: 'var(--co-primary)', color: 'white', border: 'none' }}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <span className={styles.versionText} style={{ marginTop: '20px', display: 'block' }}>Solcan Lab v2.1 • Bioseguridad Digital</span>
      </div>
    </div>
  );
}
