import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { ClipboardList, MapPin, Clock } from 'lucide-react';

const STATUS_STYLE = {
  buscando: 'bg-amber-50 text-amber-600',
  pendente: 'bg-slate-100 text-slate-500',
  aceito: 'bg-blue-50 text-blue-600',
  a_caminho: 'bg-indigo-50 text-indigo-600',
  concluido: 'bg-emerald-50 text-emerald-600',
  cancelado: 'bg-slate-100 text-slate-400',
  recusado: 'bg-red-50 text-red-500'
};

const STATUS_LABEL = {
  buscando: 'À procura',
  pendente: 'Pendente',
  aceito: 'Aceito',
  a_caminho: 'A caminho',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  recusado: 'Recusado'
};

export default function MeusPedidos() {
  const { usuario } = useOutletContext();
  const [pedidos, setPedidos] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!usuario) return;
    const campo = usuario.tipo === 'prestador' ? 'prestador' : 'cliente';
    (async () => {
      const lista = await base44.entities.Pedido.filter({ [campo]: usuario.id }, '-created_date', 50);
      setPedidos(lista);
    })();
  }, [usuario?.id]);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="font-semibold text-slate-900 text-lg">Meus pedidos</h1>
          <p className="text-xs text-slate-500 mt-0.5">{usuario?.tipo === 'prestador' ? 'Serviços atribuídos a ti' : 'Histórico dos teus pedidos'}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-5">
        {pedidos === null ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <ClipboardList className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Ainda não tens pedidos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => (
              <div key={p.id} onClick={() => navigate(`/detalhes-pedido/${p.id}`)} className="bg-white rounded-2xl border border-slate-100 p-4 cursor-pointer hover:border-slate-300 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{p.categoria}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] || 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2 mb-3">{p.descricao}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {p.created_date ? new Date(p.created_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  {p.preco_negociado != null && (
                    <span className="font-medium text-slate-600">{p.preco_negociado} MT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}