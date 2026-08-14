import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { MessageCircle, ChevronRight } from 'lucide-react';
import AvatarComBadgeProfissao from '@/components/AvatarComBadgeProfissao';

function tempoCurto(data) {
  if (!data) return '';
  const d = new Date(data);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString())
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

export default function Chat() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [conversas, setConversas] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        const pedidos = await base44.entities.Pedido.filter({ cliente: usuario.id }, '-updated_date', 30);
        const comPrest = pedidos.filter((p) => p.prestador);
        const ids = [...new Set(comPrest.map((p) => p.prestador))];
        const prestMap = {};
        for (const pid of ids) {
          try {
            prestMap[pid] = await base44.entities.Usuario.get(pid);
          } catch {}
        }
        const lista = [];
        for (const p of comPrest) {
          const prestador = prestMap[p.prestador];
          if (!prestador) continue;
          let ultima = null;
          try {
            const msgs = await base44.entities.Mensagem.filter({ conversa: p.id }, '-created_date', 20);
            ultima = msgs.find((m) => !m.tipo || m.tipo === 'texto') || null;
          } catch {}
          lista.push({ pedido: p, prestador, ultima });
        }
        lista.sort((a, b) => {
          const da = a.ultima?.created_date || a.pedido.updated_date || a.pedido.created_date;
          const db = b.ultima?.created_date || b.pedido.updated_date || b.pedido.created_date;
          return new Date(db) - new Date(da);
        });
        setConversas(lista);
      } catch {
        setConversas([]);
      }
    })();
  }, [usuario?.id]);

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-4 pb-2">
        <h1 className="font-semibold text-slate-900 text-lg">Chat</h1>
        <p className="text-xs text-slate-500">Negocia com os teus prestadores</p>
      </div>

      <main className="max-w-lg mx-auto px-3 py-3">
        {conversas === null ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : conversas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Ainda não tens conversas.</p>
            <p className="text-slate-400 text-xs mt-1">Cria um pedido para começar a negociar.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversas.map(({ pedido, prestador, ultima }) => {
              const previa = ultima
                ? `${ultima.remetente === usuario.id ? 'Tu: ' : ''}${ultima.texto}`
                : 'Sem mensagens ainda';
              return (
                <button
                  key={pedido.id}
                  onClick={() => navigate(`/chat/${pedido.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white transition text-left"
                >
                  <AvatarComBadgeProfissao foto={prestador.foto} categoria={pedido.categoria} className="w-12 h-12" rounded="rounded-full" badgeSize="w-5 h-5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 truncate">{prestador.nome}</p>
                      {ultima && <span className="text-[10px] text-slate-400 flex-shrink-0">{tempoCurto(ultima.created_date)}</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{previa}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}