import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign ResizeObserver errors
const _ResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends _ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    super((entries, observer) => {
      window.requestAnimationFrame(() => {
        try {
          callback(entries, observer);
        } catch (e) {
          // Ignore
        }
      });
    });
  }
};

window.addEventListener("error", (e) => {
  if (e.message.includes("ResizeObserver") || e.message === "Script error.") {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
