export const theme = {
  colors: {
    primary: '#05004E', // Azul Solcan Profundo
    secondary: '#A114D6', // Púrpura Solcan
    accent: '#0BCECD', // Cyan Solcan
    background: '#F4F7FB', // Gris clínico ligero de la Web
    card: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    danger: '#EF4444',
    warning: '#F59E0B',
    border: '#E2E8F0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: {
    sm: 8,
    md: 12,
    lg: 20,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' },
    h2: { fontSize: 22, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 14, fontWeight: '300' },
  }
};

export const globalStyles = {
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  }
};
