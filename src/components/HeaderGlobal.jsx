import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Wrench, Bell } from 'lucide-react';

export default function HeaderGlobal({ usuario }) {
  const [temNovos, setTemNovos] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    const campo = usuario.tipo === 'prestador' ? 'prestador' : 'cliente';
    base44.entities.Pedido
      .filter({ [campo]: usuario.id, status: 'aceito' })
      .then((r) => setTemNovos(r.length > 0))
      .catch(() => {});
  }, [usuario?.id]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-100" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-lg mx-auto w-full px-5 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-none">Kolmi</p>
            <p className="text-xs text-slate-500 mt-0.5">Olá, {usuario.nome.split(' ')[0]}</p>
          </div>
        </Link>
        <Link to="/notificacoes" className="relative w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
          <Bell className="w-4 h-4" />
          {temNovos && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />}
        </Link>
      </div>
    </header>
  );
}