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
} catch (error) {
  console.error("Failed to start application:", error);
  // Fallback UI if the app crashes completely
  rootElement.innerHTML = `<div style="color: #ef4444; padding: 20px; font-family: sans-serif;">
    <h1>Application Failed to Start</h1>
    <p>Please check the console for details.</p>
    <pre style="background: #1a202c; padding: 10px; border-radius: 4px; margin-top: 10px;">${error instanceof Error ? error.message : String(error)}</pre>
  </div>`;
}