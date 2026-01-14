import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Hiba: Root element nem található!</div>';
  throw new Error("Could not find root element to mount to");
}

// Global error handler for uncaught script errors
window.onerror = (message, source, lineno, colno, error) => {
    console.error("Uncaught error:", error);
    if (rootElement) {
        rootElement.innerHTML = `
            <div style="padding: 2rem; font-family: sans-serif; color: #7f1d1d; background: #fef2f2; border: 1px solid #fee2e2; margin: 20px; border-radius: 8px;">
                <h1 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem;">Aplikáció Hiba (Hiba a betöltéskor)</h1>
                <p style="font-size: 0.875rem;">Valami hiba történt az oldal indításakor. Próbáld meg frissíteni az oldalt.</p>
                <pre style="background: #fff; padding: 1rem; border-radius: 0.5rem; border: 1px solid #fee2e2; overflow: auto; margin-top: 1rem; font-size: 0.75rem;">${message}\n${source}:${lineno}</pre>
            </div>
        `;
    }
};

try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
} catch (error: any) {
    console.error("Fatal startup error:", error);
    rootElement.innerHTML = `
        <div style="padding: 2rem; font-family: sans-serif; color: #7f1d1d; background: #fef2f2; height: 100vh;">
            <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Hiba történt</h1>
            <p>Az alkalmazás nem tudott elindulni.</p>
            <pre style="background: #fff; padding: 1rem; border-radius: 0.5rem; border: 1px solid #fee2e2; overflow: auto; margin-top: 1rem;">${error?.message || error}</pre>
        </div>
    `;
}