import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { ArrowLeft, Send, Paperclip, Check, CheckCheck } from 'lucide-react';
import AvatarComBadgeProfissao from '@/components/AvatarComBadgeProfissao';

function diaChave(data) {
  const d = new Date(data);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TelaConversa() {
  const { pedidoId } = useParams();
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [outro, setOutro] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await base44.entities.Pedido.get(pedidoId);
        setPedido(p);
        const outroId = p.cliente === usuario.id ? p.prestador : p.cliente;
        if (outroId) {
          const u = await base44.entities.Usuario.get(outroId);
          setOutro(u);
        }
        const msgs = await base44.entities.Mensagem.filter({ conversa: pedidoId }, 'created_date');
        setMensagens(msgs.filter((m) => !m.tipo || m.tipo === 'texto'));
      } finally {
        setLoading(false);
      }
    })();
  }, [pedidoId, usuario?.id]);

  useEffect(() => {
    const unsub = base44.entities.Mensagem.subscribe((event) => {
      if (event.data && event.data.conversa === pedidoId) {
        if (event.data.tipo && event.data.tipo !== 'texto') return;
        setMensagens((prev) => {
          if (event.type === 'delete') return prev.filter((m) => m.id !== event.data.id);
          const exists = prev.find((m) => m.id === event.data.id);
          if (exists) return prev.map((m) => (m.id === event.data.id ? event.data : m));
          return [...prev, event.data];
        });
      }
    });
    return unsub;
  }, [pedidoId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !pedido) return;
    setTexto('');
    try {
      const outroId = pedido.cliente === usuario.id ? pedido.prestador : pedido.cliente;
      await base44.entities.Mensagem.create({
        conversa: pedidoId,
        remetente: usuario.id,
        destinatario: outroId,
        texto: t,
        lida: false
      });
    } catch {
      setTexto(t);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const grupos = [];
  let atual = null;
  mensagens.forEach((m) => {
    const ch = diaChave(m.created_date);
    if (ch !== atual) {
      grupos.push({ dia: ch, msgs: [] });
      atual = ch;
    }
    grupos[grupos.length - 1].msgs.push(m);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <header className="flex-shrink-0 bg-white border-b border-slate-100 h-14 flex items-center px-3 gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <AvatarComBadgeProfissao foto={outro?.foto} categoria={pedido?.categoria} className="w-9 h-9" rounded="rounded-full" badgeSize="w-4 h-4" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{outro?.nome || 'Conversa'}</p>
          <p className="text-xs text-emerald-500 capitalize">{pedido?.categoria} · #{pedido?.id?.slice(-5)} · online</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
        {grupos.map((g) => (
          <div key={g.dia}>
            <div className="flex justify-center mb-3">
              <span className="text-[10px] font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">{g.dia}</span>
            </div>
            <div className="space-y-1.5">
              {g.msgs.map((m) => {
                const minha = m.remetente === usuario.id;
                return (
                  <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${minha ? 'bg-slate-900 text-white rounded-br-md' : 'bg-white text-slate-900 border border-slate-100 rounded-bl-md'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.texto}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end text-slate-400">
                        <span className="text-[9px]">{new Date(m.created_date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                        {minha && (m.lida ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {mensagens.length === 0 && (
          <div className="text-center text-sm text-slate-400 py-10">Inicia a conversa. Combinem os detalhes do serviço.</div>
        )}
      </div>

      <div className="flex-shrink-0 bg-white border-t border-slate-100 p-3 flex items-center gap-2">
        <button className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder="Mensagem..."
          className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm focus:outline-none"
        />
        <button
          onClick={enviar}
          disabled={!texto.trim()}
          className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}