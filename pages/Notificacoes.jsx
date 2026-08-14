import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Bell, ClipboardList, CheckCircle2, Clock, XCircle, Hand, ChevronRight } from 'lucide-react';

function gerarEntradas(pedidos) {
  const ped = [];
  const avis = [];
  pedidos.forEach((p) => {
    ped.push({
      id: `${p.id}-ped`,
      tipo: 'pedido',
      status: p.status,
      titulo: `${p.categoria}`,
      corpo: p.descricao?.slice(0, 60) || '',
      data: p.updated_date || p.created_date,
      pedidoId: p.id
    });
    avis.push({
      id: `${p.id}-novo`,
      tipo: 'aviso',
      titulo: 'Novo pedido',
      corpo: `${p.categoria} criado`,
      data: p.created_date,
      pedidoId: p.id,
      cfg: { icon: Hand, color: 'bg-blue-50 text-blue-600' }
    });
    if (p.status === 'aceito' || p.status === 'a_caminho') {
      avis.push({
        id: `${p.id}-aceito`,
        tipo: 'aviso',
        titulo: 'Prestador aceitou',
        corpo: p.categoria,
        data: p.aceito_em || p.created_date,
        pedidoId: p.id,
        cfg: { icon: Clock, color: 'bg-indigo-50 text-indigo-600' }
      });
    }
    if (p.status === 'concluido') {
      avis.push({
        id: `${p.id}-feito`,
        tipo: 'aviso',
        titulo: 'Serviço concluído',
        corpo: p.categoria,
        data: p.concluido_em || p.created_date,
        pedidoId: p.id,
        cfg: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' }
      });
    }
    if (p.status === 'cancelado' || p.status === 'recusado') {
      avis.push({
        id: `${p.id}-cancel`,
        tipo: 'aviso',
        titulo: p.status === 'recusado' ? 'Pedido recusado' : 'Pedido cancelado',
        corpo: p.categoria,
        data: p.updated_date || p.created_date,
        pedidoId: p.id,
        cfg: { icon: XCircle, color: 'bg-red-50 text-red-500' }
      });
    }
  });
  const tudo = [...ped, ...avis].sort((a, b) => new Date(b.data) - new Date(a.data));
  const pedSorted = ped.sort((a, b) => new Date(b.data) - new Date(a.data));
  const avisSorted = avis.sort((a, b) => new Date(b.data) - new Date(a.data));
  return { tudo, pedidos: pedSorted, avisos: avisSorted };
}

function tempoRelativo(data) {
  if (!data) return '';
  const diff = Date.now() - new Date(data).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

export default function Notificacoes() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('tudo');
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    const campo = usuario.tipo === 'prestador' ? 'prestador' : 'cliente';
    (async () => {
      const pedidos = await base44.entities.Pedido.filter({ [campo]: usuario.id }, '-updated_date', 50);
      setDados(gerarEntradas(pedidos));
    })();
  }, [usuario?.id]);

  const lista = dados ? dados[filtro] : null;

  const FILTROS = [
    { id: 'tudo', label: 'Tudo' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'avisos', label: 'Avisos' }
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-4 pb-2">
        <h1 className="font-semibold text-slate-900 text-lg">Notificações</h1>
        <p className="text-xs text-slate-500">Pedidos e avisos</p>
      </div>
      <div className="max-w-lg mx-auto px-5 pb-2 flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              filtro === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto px-5 py-5">
        {!lista ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Sem notificações por agora.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lista.map((n) => {
              const isPedido = n.tipo === 'pedido';
              const cfg = isPedido
                ? { icon: ClipboardList, color: 'bg-slate-100 text-slate-600' }
                : n.cfg;
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => navigate(`/detalhes-pedido/${n.pedidoId}`)}
                  className="w-full flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-4 text-left hover:border-slate-300 transition"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize">{n.titulo}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{n.corpo}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-slate-400">{tempoRelativo(n.data)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}