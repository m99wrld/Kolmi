import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Check, X, Send } from 'lucide-react';

// Lista hardcoded — idealmente administrável no backend/CMS.
const PERGUNTAS = [
  'É urgente?',
  'Precisas de material adicional?',
  'Tens acesso livre ao local?',
  'Preferes hoje ou amanhã?'
];

export default function PerguntasRapidas({ pedido, usuarioId, contraparteId }) {
  const [perguntas, setPerguntas] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);

  const carregar = async () => {
    try {
      const msgs = await base44.entities.Mensagem.filter({ conversa: pedido.id, tipo: 'pergunta' }, '-created_date', 50);
      setPerguntas(msgs);
    } catch {}
  };

  useEffect(() => {
    carregar();
    const unsub = base44.entities.Mensagem.subscribe((event) => {
      const m = event.data;
      if (m && m.conversa === pedido.id && m.tipo === 'pergunta') carregar();
    });
    return unsub;
  }, [pedido?.id]);

  const toggle = (p) => setSelecionadas((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const enviar = async () => {
    for (const p of selecionadas) {
      await base44.entities.Mensagem.create({
        conversa: pedido.id, remetente: usuarioId, destinatario: contraparteId,
        tipo: 'pergunta', pergunta_texto: p, texto: p
      });
    }
    setSelecionadas([]);
  };

  const responder = async (pergunta, resp) => {
    await base44.entities.Mensagem.update(pergunta.id, { resposta: resp });
  };

  const aResponder = perguntas.filter((p) => p.destinatario === usuarioId && !p.resposta);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Enviar pergunta</p>
        <div className="space-y-2">
          {PERGUNTAS.map((p) => {
            const sel = selecionadas.includes(p);
            return (
              <button key={p} onClick={() => toggle(p)} className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${sel ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </span>
                {p}
              </button>
            );
          })}
        </div>
        <Button onClick={enviar} disabled={selecionadas.length === 0} className="w-full h-11 rounded-xl mt-3">
          <Send className="w-4 h-4 mr-2" /> Enviar ({selecionadas.length})
        </Button>
      </div>

      {aResponder.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Perguntas a responder</p>
          {aResponder.map((p) => (
            <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm text-slate-800 mb-3">{p.pergunta_texto}</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => responder(p, 'sim')} className="h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center gap-1.5 hover:bg-emerald-600">
                  <Check className="w-4 h-4" /> Sim
                </button>
                <button onClick={() => responder(p, 'nao')} className="h-10 rounded-xl bg-red-500 text-white flex items-center justify-center gap-1.5 hover:bg-red-600">
                  <X className="w-4 h-4" /> Não
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {perguntas.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Histórico</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {perguntas.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                <span className="text-slate-600 text-xs truncate flex-1 pr-2">{p.pergunta_texto}</span>
                {p.resposta ? (
                  <span className={`text-xs font-medium ${p.resposta === 'sim' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {p.resposta === 'sim' ? 'Sim' : 'Não'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">a aguardar</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}