import { useEffect } from 'react';

// Evita que o back nativo (Android/WebView) saia da app abruptamente estando na raiz.
// Empurra um estado extra e, ao voltar para "/", re-empurra para manter o utilizador dentro.
export default function useWebViewBack() {
  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname === '/') {
        window.history.pushState(null, '', '/');
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}