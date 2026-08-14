import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Wallet, TrendingUp, Calendar, ArrowDownToLine } from 'lucide-react';

export default function HistoricoGanhos() {
  const { usuario, prestador } = useOutletContext();
  const [pedidos, setPedidos] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      const concluidos = await base44.entities.Pedido.filter(
        { prestador: usuario.id, status: 'concluido' },
        '-concluido_em',
        100
      );
      const t = concluidos.reduce((s, p) => {
        const val = p.preco_negociado != null ? p.preco_negociado : prestador?.preco_base || 0;
        return s + val;
      }, 0);
      setTotal(t);
      setPedidos(concluidos);
    })();
  }, [usuario?.id]);

  const precoBase = prestador?.preco_base || 0;

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="font-semibold text-slate-900 text-lg">Histórico de ganhos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Serviços concluídos e valores recebidos</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        {/* resumo */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-slate-300" />
            <p className="text-slate-300 text-xs">Total recebido</p>
          </div>
          <p className="text-3xl font-bold">{total.toLocaleString('pt-PT')} <span className="text-lg text-slate-400">MT</span></p>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700">
            <div>
              <p className="text-slate-400 text-xs">Serviços</p>
              <p className="font-semibold">{pedidos?.length || 0}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Preço base</p>
              <p className="font-semibold">{precoBase} MT</p>
            </div>
          </div>
        </div>

        {/* lista */}
        {pedidos === null ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <ArrowDownToLine className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Ainda não tens ganhos registados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const val = p.preco_negociado != null ? p.preco_negociado : precoBase;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 text-sm capitalize">{p.categoria}</p>
                    <p className="text-xs text-slate-400 line-clamp-1">{p.descricao}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {p.concluido_em ? new Date(p.concluido_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-emerald-600">+{val} MT</p>
                    {p.preco_negociado == null && <p className="text-[10px] text-slate-400">preço base</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}