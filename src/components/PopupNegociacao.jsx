import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/firebase';
import { Phone, HelpCircle, X, Check } from 'lucide-react';
import LiveStakeWidget from '@/components/LiveStakeWidget';
import PerguntasRapidas from '@/components/PerguntasRapidas';
import ChamadaAoVivo from '@/components/ChamadaAoVivo';

export default function PopupNegociacao({ pedido, usuario, contraparte, isPrestador, onAvancou }) {
  const [chamada, setChamada] = useState(false);
  const [atual, setAtual] = useState(pedido);
  const [painelPerguntas, setPainelPerguntas] = useState(false);
  const [pendentes, setPendentes] = useState([]);

  useEffect(() => { setAtual(pedido); }, [pedido]);

  useEffect(() => {
    const unsub = base44.entities.Pedido.subscribe((event) => {
      if (event.data && event.data.id === pedido.id) setAtual(event.data);
    });
    return unsub;
  }, [pedido?.id]);

  useEffect(() => {
    if (atual?.status === 'em_execucao') onAvancou?.(atual);
  }, [atual?.status]);

  const carregarPendentes = async () => {
    try {
      const msgs = await base44.entities.Mensagem.filter({ conversa: pedido.id, tipo: 'pergunta' }, '-created_date', 50);
      setPendentes(msgs.filter((m) => m.destinatario === usuario.id && !m.resposta));
    } catch {}
  };

  useEffect(() => {
    carregarPendentes();
    const unsub = base44.entities.Mensagem.subscribe((event) => {
      const m = event.data;
      if (m && m.conversa === pedido.id && m.tipo === 'pergunta') carregarPendentes();
    });
    return unsub;
  }, [pedido?.id]);

  const avancarExecucao = async () => {
    await base44.entities.Pedido.update(pedido.id, { status: 'em_execucao', proposta_aceita: true });
    onAvancou?.(atual);
  };

  const responder = async (pergunta, resp) => {
    try { await base44.entities.Mensagem.update(pergunta.id, { resposta: resp }); carregarPendentes(); } catch {}
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm overflow-hidden flex-shrink-0">
            {contraparte?.foto ? <img src={contraparte.foto} alt="" className="w-full h-full object-cover" /> : (contraparte?.nome || '?').slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">{contraparte?.nome || 'Contraparte'}</p>
            <p className="text-xs text-slate-500">Pedido #{pedido.id.slice(-5)} · Negociação</p>
          </div>
        </div>
        <button onClick={() => setChamada(true)} className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition flex-shrink-0">
          <Phone className="w-4 h-4" />
        </button>
      </div>

      <LiveStakeWidget pedido={atual} usuarioId={usuario.id} contraparteId={contraparte?.id} />

      {pendentes.length > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Pergunta rápida</p>
          <p className="text-sm text-slate-800 mb-3">{pendentes[0].pergunta_texto}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => responder(pendentes[0], 'sim')} className="h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center gap-1.5 hover:bg-emerald-600">
              <Check className="w-4 h-4" /> Sim
            </button>
            <button onClick={() => responder(pendentes[0], 'nao')} className="h-10 rounded-xl bg-red-500 text-white flex items-center justify-center gap-1.5 hover:bg-red-600">
              <X className="w-4 h-4" /> Não
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setPainelPerguntas(true)} className="fixed bottom-28 right-5 z-40 w-14 h-14 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center hover:scale-105 transition">
        <HelpCircle className="w-6 h-6" />
        {pendentes.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">{pendentes.length}</span>
        )}
      </button>

      {painelPerguntas && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPainelPerguntas(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Perguntas rápidas</h3>
              <button onClick={() => setPainelPerguntas(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <PerguntasRapidas pedido={atual} usuarioId={usuario.id} contraparteId={contraparte?.id} />
          </div>
        </div>
      )}

      {chamada && <ChamadaAoVivo contraparte={contraparte} onTerminar={(acordo) => { setChamada(false); if (acordo) avancarExecucao(); }} />}
    </div>
  );
}