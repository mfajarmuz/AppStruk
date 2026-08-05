import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary Caught Exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px', background: '#090d16', color: '#f8fafc',
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'
        }}>
          <div style={{
            maxWidth: '620px', width: '100%', background: '#0f172a',
            padding: '24px', borderRadius: '12px', border: '1px solid #f43f5e',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
          }}>
            <h2 style={{ color: '#f43f5e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Terjadi Kesalahan Pada Aplikasi
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
              Aplikasi mendeteksi masalah saat memuat komponen UI:
            </p>
            <pre style={{
              background: '#020617', padding: '14px', borderRadius: '6px',
              color: '#fb7185', fontSize: '0.82rem', overflowX: 'auto', marginBottom: '20px',
              border: '1px solid rgba(244,63,94,0.2)'
            }}>
              {this.state.error?.toString()}
              {this.state.error?.stack ? `\n\nStack Trace:\n${this.state.error.stack}` : ''}
            </pre>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  try { localStorage.clear(); } catch(e){}
                  if (window.electronAPI) {
                    try { window.electronAPI.saveData('templates', null); } catch(e){}
                    try { window.electronAPI.saveData('fontSettings', null); } catch(e){}
                  }
                  window.location.reload();
                }}
                style={{
                  background: '#f43f5e', color: '#fff', border: 'none',
                  padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                }}
              >
                🔄 Reset Data Lokal & Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#3b82f6', color: '#fff', border: 'none',
                  padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                }}
              >
                ⚡ Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
