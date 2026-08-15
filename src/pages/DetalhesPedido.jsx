import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, MapPin, Clock, User, Wrench, Wallet, MessageCircle } from 'lucide-react';

const STATUS_LABEL = {
  buscando: 'À procura de prestador',
  pendente: 'Pendente',
  aceito: 'Aceito',
  a_caminho: 'Prestador a caminho',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  recusado: 'Recusado'
};

const STATUS_COLOR = {
  buscando: 'bg-amber-50 text-amber-600',
  pendente: 'bg-slate-100 text-slate-500',
  aceito: 'bg-blue-50 text-blue-600',
  a_caminho: 'bg-indigo-50 text-indigo-600',
  concluido: 'bg-emerald-50 text-emerald-600',
  cancelado: 'bg-slate-100 text-slate-400',
  recusado: 'bg-red-50 text-red-500'
};

export default function DetalhesPedido() {
  const { id } = useParams();
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [prestadorUser, setPrestadorUser] = useState(null);
  const [jaAvaliou, setJaAvaliou] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const p = await base44.entities.Pedido.get(id);
      setPedido(p);
      if (p?.cliente) {
        try { setCliente(await base44.entities.Usuario.get(p.cliente)); } catch {}
      }
      if (p?.prestador) {
        try { setPrestadorUser(await base44.entities.Usuario.get(p.prestador)); } catch {}
      }
      if (p) {
        const avs = await base44.entities.Avaliacao.filter({ pedido: p.id, avaliador: usuario.id });
        setJaAvaliou(avs.length > 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Pedido.subscribe((event) => {
      if (event.data && event.data.id === id) setPedido(event.data);
    });
    return unsub;
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <p className="text-slate-500 text-sm">Pedido não encontrado.</p>
        <Link to="/meus-pedidos" className="text-sm text-slate-900 underline mt-2 inline-block">Voltar aos pedidos</Link>
      </div>
    );
  }

  const souCliente = pedido.cliente === usuario.id;
  const contraparte = souCliente ? prestadorUser : cliente;
  const contraparteLabel = souCliente ? 'Prestador' : 'Cliente';

  const fmtData = (d) => d ? new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-semibold text-slate-900 text-lg">Detalhes do pedido</h1>
            <p className="text-xs text-slate-400">#{pedido.id.slice(-6)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-5 space-y-4">
        {/* status */}
        <div className={`rounded-2xl p-4 ${STATUS_COLOR[pedido.status] || 'bg-slate-100 text-slate-500'}`}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Estado</p>
          <p className="text-lg font-semibold mt-0.5">{STATUS_LABEL[pedido.status] || pedido.status}</p>
        </div>

        {/* serviço */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-slate-600" />
            </div>
            <span className="font-semibold text-slate-900 capitalize flex-1">{pedido.categoria}</span>
            {pedido.prestador && (
              <button
                onClick={() => navigate(`/chat/${pedido.id}`)}
                className="w-9 h-9 rounded-full bg-[#F2F1FA] flex items-center justify-center text-[#6C63D1] hover:opacity-80 transition"
                title="Abrir conversa"
              >
                <MessageCircle className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5">{pedido.descricao}</p>
        </div>

        {/* contraparte */}
        {contraparte && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">{contraparteLabel}</p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{contraparte.nome}</p>
                {contraparte.telefone && <p className="text-xs text-slate-500">{contraparte.telefone}</p>}
              </div>
            </div>
          </div>
        )}

        {/* valor */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Valor acordado</span>
            </div>
            <span className="font-semibold text-slate-900">{pedido.preco_negociado != null ? `${pedido.preco_negociado} MT` : 'Por acordar'}</span>
          </div>
        </div>

        {/* timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Linha do tempo</p>
          <Linha icon={Clock} label="Pedido criado" data={fmtData(pedido.created_date)} />
          {pedido.aceito_em && <Linha icon={Wrench} label="Aceito pelo prestador" data={fmtData(pedido.aceito_em)} />}
          {pedido.concluido_em && <Linha icon={Star} label="Serviço concluído" data={fmtData(pedido.concluido_em)} />}
        </div>

        {/* avaliação */}
        {pedido.status === 'concluido' && !jaAvaliou && (
          <Link to={`/nova-avaliacao/${pedido.id}`}>
            <Button className="w-full h-11 rounded-xl">
              <Star className="w-4 h-4 mr-2" /> Avaliar {souCliente ? 'prestador' : 'cliente'}
            </Button>
          </Link>
        )}
        {pedido.status === 'concluido' && jaAvaliou && (
          <p className="text-center text-sm text-slate-400">Já deixaste a tua avaliação.</p>
        )}
      </main>
    </div>
  );
}

function Linha({ icon: Icon, label, data }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{data}</span>
      </div>
    </div>
  );
}