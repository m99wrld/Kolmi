import React, { useRef } from 'react';
import { useOutlet, useLocation } from 'react-router-dom';

// Preserva os componentes dos tabs no DOM (em vez de desmontar), alternando display.
const TAB_PATHS = new Set([
  '/', '/busca-prestadores', '/chat', '/perfil',
  '/painel-prestador', '/gerenciar-disponibilidade', '/notificacoes'
]);

export default function KeepAliveOutlet({ context }) {
  const outlet = useOutlet(context);
  const { pathname } = useLocation();
  const cache = useRef({});

  if (TAB_PATHS.has(pathname) && outlet) {
    cache.current[pathname] = outlet;
  }

  const cached = Object.entries(cache.current);
  const isTab = TAB_PATHS.has(pathname);

  return (
    <>
      {cached.map(([k, el]) => (
        <div key={k} style={{ display: k === pathname ? 'contents' : 'none' }}>
          {el}
        </div>
      ))}
      {!isTab && outlet && <div style={{ display: 'contents' }}>{outlet}</div>}
    </>
  );
}