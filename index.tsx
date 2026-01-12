import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
} catch (error: any) {
    // Fallback display if the app crashes completely
    document.body.innerHTML = `
        <div style="padding: 2rem; font-family: sans-serif; color: #7f1d1d; background: #fef2f2; height: 100vh;">
            <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Application Error</h1>
            <p>Something went wrong while starting the application.</p>
            <pre style="background: #fff; padding: 1rem; border-radius: 0.5rem; border: 1px solid #fee2e2; overflow: auto; margin-top: 1rem;">${error?.message || error}</pre>
        </div>
    `;
    console.error("Fatal startup error:", error);
}