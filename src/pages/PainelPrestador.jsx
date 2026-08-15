import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Star, Wrench, TrendingUp, Wallet, MessageSquare, Power, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PainelPrestador() {
  const { usuario, prestador } = useOutletContext();
  const [ganhos, setGanhos] = useState(0);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        const concluidos = await base44.entities.Pedido.filter({
          prestador: usuario.id,
          status: 'concluido'
        });
        const total = concluidos.reduce((s, p) => {
          const val = p.preco_negociado != null ? p.preco_negociado : (prestador?.preco_base || 0);
          return s + val;
        }, 0);
        setGanhos(total);

        const avs = await base44.entities.Avaliacao.filter({ avaliado: usuario.id }, '-created_date', 10);
        setAvaliacoes(avs);
      } finally {
        setLoading(false);
      }
    })();
  }, [usuario?.id, prestador?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!prestador) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <p className="text-slate-500 text-sm">Ainda não tens perfil de prestador.</p>
      </div>
    );
  }

  const media = prestador.avaliacao_media || 0;
  const totalServicos = prestador.total_servicos || 0;

  const stats = [
    {
      label: 'Avaliação média',
      value: media.toFixed(1),
      suffix: '/5',
      icon: Star,
      color: 'text-amber-500 bg-amber-50'
    },
    {
      label: 'Serviços realizados',
      value: totalServicos.toString(),
      suffix: '',
      icon: Wrench,
      color: 'text-blue-500 bg-blue-50'
    },
    {
      label: 'Ganhos totais',
      value: ganhos.toLocaleString('pt-PT'),
      suffix: ' MT',
      icon: Wallet,
      color: 'text-emerald-500 bg-emerald-50'
    }
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="font-semibold text-slate-900 text-lg">Painel</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{prestador.categoria} · {usuario.nome}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        {/* destaque avaliação */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-xs mb-1">Avaliação média</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">{media.toFixed(1)}</span>
                <span className="text-slate-400 text-sm mb-1">/5</span>
              </div>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-5 h-5 ${media >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2 ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {s.value}<span className="text-xs font-medium text-slate-400">{s.suffix}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* acessos rápidos */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link to="/historico-ganhos" className="bg-white rounded-2xl border border-slate-100 p-3 text-center hover:border-slate-300 transition">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-1.5">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-medium text-slate-600 leading-tight">Ganhos</p>
          </Link>
          <Link to="/gerenciar-disponibilidade" className="bg-white rounded-2xl border border-slate-100 p-3 text-center hover:border-slate-300 transition">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-1.5">
              <Power className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-medium text-slate-600 leading-tight">Disponibilidade</p>
          </Link>
          <Link to="/notificacoes" className="bg-white rounded-2xl border border-slate-100 p-3 text-center hover:border-slate-300 transition">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-1.5">
              <Bell className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-medium text-slate-600 leading-tight">Notificações</p>
          </Link>
        </div>

        {/* avaliações recentes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Avaliações recentes</h2>
          </div>
          {avaliacoes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
              <p className="text-sm text-slate-400">Ainda sem avaliações.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {avaliacoes.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= a.nota ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">{a.comentario}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}