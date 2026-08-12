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
    console.error("React ErrorBoundary caught an exception:", error, errorInfo);
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
            padding: '24px', borderRadius: '12px', border: '1px solid #f43f5e'
          }}>
            <h2 style={{ color: '#f43f5e', marginBottom: '12px' }}>
              ⚠️ Terjadi Kesalahan Pada Aplikasi
            </h2>
            <pre style={{
              background: '#020617', padding: '14px', borderRadius: '6px',
              color: '#fb7185', fontSize: '0.82rem', overflowX: 'auto', marginBottom: '20px'
            }}>
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => {
                try { localStorage.clear(); } catch(e){}
                window.location.reload();
              }}
              style={{
                background: '#3b82f6', color: '#fff', border: 'none',
                padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
              }}
            >
              🔄 Reset LocalStorage & Muat Ulang
            </button>
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
  </React.StrictMode>
);
