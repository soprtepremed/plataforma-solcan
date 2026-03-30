import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import styles from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !pin) {
      setErrorMsg("Ingresa tu usuario y PIN");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const result = await login(username, pin);
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
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--co-text-muted)', marginLeft: '4px' }}>
               USUARIO
            </label>
            <input 
              type="text" 
              className={styles.branchSelect} 
              style={{ width: '100%', boxSizing: 'border-box', marginTop: '5px' }}
              placeholder="Ej. chofer1, admin..." 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--co-text-muted)', marginLeft: '4px' }}>
               PIN (4 DÍGITOS)
            </label>
            <input 
              type="password" 
              className={styles.branchSelect} 
              style={{ width: '100%', boxSizing: 'border-box', marginTop: '5px' }}
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
