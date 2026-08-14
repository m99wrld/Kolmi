import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Send, Check, Banknote } from 'lucide-react';

export default function LiveStakeWidget({ pedido, usuarioId, contraparteId }) {
  const [valor, setValor] = useState(pedido?.preco_proposto || 500);
  const [historico, setHistorico] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    try {
      const msgs = await base44.entities.Mensagem.filter({ conversa: pedido.id, tipo: 'proposta' }, '-created_date', 30);
      setHistorico(msgs.reverse());
    } catch {}
  };

  useEffect(() => {
    carregar();
    const unsub = base44.entities.Mensagem.subscribe((event) => {
      const m = event.data;
      if (m && m.conversa === pedido.id && m.tipo === 'proposta') carregar();
    });
    return unsub;
  }, [pedido?.id]);

  const aceito = pedido?.proposta_aceita;
  const valorContraparte = pedido?.preco_proposto;
  const propostaDeOutro = pedido?.proposta_de && pedido.proposta_de !== usuarioId && valorContraparte != null;

  const enviar = async () => {
    setEnviando(true);
    try {
      await base44.entities.Mensagem.create({
        conversa: pedido.id, remetente: usuarioId, destinatario: contraparteId,
        tipo: 'proposta', valor, texto: `${valor} MT`
      });
      await base44.entities.Pedido.update(pedido.id, { preco_proposto: valor, proposta_de: usuarioId, proposta_aceita: false });
    } finally { setEnviando(false); }
  };

  const aceitar = async () => {
    setEnviando(true);
    try {
      await base44.entities.Pedido.update(pedido.id, {
        preco_negociado: valorContraparte, proposta_aceita: true, status: 'em_execucao'
      });
    } finally { setEnviando(false); }
  };

  if (aceito) {
    return (
      <div className="bg-emerald-50 rounded-2xl p-4 text-center">
        <Banknote className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Valor acordado</p>
        <p className="text-2xl font-bold text-emerald-700">{pedido.preco_negociado} MT</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-2xl p-4 text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Valor atual proposto</p>
        <p className="text-3xl font-bold text-slate-900 my-1">{valorContraparte || valor} MT</p>
        <p className="text-xs text-slate-500">
          {propostaDeOutro ? 'proposto pela contraparte' : valorContraparte ? 'proposto por ti' : 'sem proposta ainda'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setValor((v) => Math.max(0, v - 50))} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50">
          <Minus className="w-5 h-5" />
        </button>
        <span className="text-2xl font-bold text-slate-900 w-24 text-center">{valor}</span>
        <button onClick={() => setValor((v) => v + 50)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <Button onClick={enviar} disabled={enviando} className="w-full h-11 rounded-xl">
        <Send className="w-4 h-4 mr-2" /> Enviar proposta
      </Button>

      {propostaDeOutro && (
        <Button onClick={aceitar} disabled={enviando} variant="outline" className="w-full h-11 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50">
          <Check className="w-4 h-4 mr-2" /> Aceitar valor da contraparte ({valorContraparte} MT)
        </Button>
      )}

      {historico.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Histórico</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {historico.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                <span className="text-slate-500">{h.remetente === usuarioId ? 'Tu' : 'Contraparte'}</span>
                <span className="font-medium text-slate-800">{h.valor} MT</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}