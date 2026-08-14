import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Wrench, MapPin, Loader2, Check, X, Navigation, Star, User } from 'lucide-react';
import AvaliacaoModal from '@/components/AvaliacaoModal';
import PopupNegociacao from '@/components/PopupNegociacao';
import CardMissaoEmCurso from '@/components/CardMissaoEmCurso';
import AvatarComBadgeProfissao from '@/components/AvatarComBadgeProfissao';

export default function PrestadorHome({ usuario, prestador, reload }) {
  const [ativo, setAtivo] = useState(prestador?.status_ativo || false);
  const [atualizando, setAtualizando] = useState(false);
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [contraparte, setContraparte] = useState(null);

  const carregarTudo = async () => {
    if (!prestador) return;
    try {
      const emExec = await base44.entities.Pedido.filter({ prestador: usuario.id, status: 'em_execucao' }, '-updated_date', 1);
      if (emExec.length) { const p = emExec[0]; setPedidoAtual(p); await carregarContraparte(p); return; }
      const aceitos = await base44.entities.Pedido.filter({ prestador: usuario.id, status: 'aceito' }, '-updated_date', 1);
      if (aceitos.length) { const p = aceitos[0]; setPedidoAtual(p); await carregarContraparte(p); return; }
      const buscando = await base44.entities.Pedido.filter({ prestador: usuario.id, status: 'buscando' }, '-updated_date', 1);
      if (buscando.length) setIncoming(buscando[0]);
    } catch {}
  };

  const carregarContraparte = async (p) => {
    if (!p?.cliente || contraparte?.id === p.cliente) return;
    try { setContraparte(await base44.entities.Usuario.get(p.cliente)); } catch {}
  };

  useEffect(() => { carregarTudo(); }, [prestador?.id]);

  useEffect(() => {
    if (!prestador) return;
    const unsub = base44.entities.Pedido.subscribe((event) => {
      const p = event.data;
      if (!p || p.prestador !== usuario.id) return;
      if (p.status === 'buscando') { setIncoming(p); setContraparte(null); }
      else if (p.status === 'aceito') { setIncoming(null); setPedidoAtual(p); carregarContraparte(p); }
      else if (p.status === 'em_execucao') { setIncoming(null); setPedidoAtual(p); carregarContraparte(p); }
      else if (p.status === 'concluido' || p.status === 'cancelado' || p.status === 'recusado') {
        setIncoming(null);
        if (pedidoAtual?.id === p.id) setPedidoAtual(p);
      }
    });
    const interval = setInterval(async () => {
      if (ativo && !incoming && !pedidoAtual) {
        try {
          const pend = await base44.entities.Pedido.filter({ prestador: usuario.id, status: 'buscando' }, '-updated_date', 1);
          if (pend.length) setIncoming(pend[0]);
        } catch {}
      }
    }, 3000);
    return () => { unsub(); clearInterval(interval); };
  }, [prestador?.id, ativo, incoming, pedidoAtual]);

  const toggleAtivo = async () => {
    setAtualizando(true);
    try {
      let lat = prestador?.latitude, lng = prestador?.longitude;
      const novaLoc = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
      if (novaLoc) { lat = novaLoc.lat; lng = novaLoc.lng; }
      await base44.entities.Prestador.update(prestador.id, { status_ativo: !ativo, disponibilidade: 'livre', latitude: lat, longitude: lng });
      setAtivo(!ativo);
      reload();
    } finally { setAtualizando(false); }
  };

  const aceitar = async () => {
    if (!incoming) return;
    try {
      await base44.entities.Pedido.update(incoming.id, { status: 'aceito', aceito_em: new Date().toISOString() });
      await base44.entities.Prestador.update(prestador.id, { disponibilidade: 'ocupado' });
      setPedidoAtual({ ...incoming, status: 'aceito' });
      setIncoming(null);
      carregarContraparte({ ...incoming, status: 'aceito' });
      reload();
    } catch (e) { console.error(e); }
  };

  const recusar = async () => {
    if (!incoming) return;
    try {
      await base44.entities.Pedido.update(incoming.id, { status: 'recusado' });
      setIncoming(null);
    } catch (e) { console.error(e); }
  };

  const onConcluido = async (p) => {
    try {
      await base44.entities.Prestador.update(prestador.id, { disponibilidade: 'livre', total_servicos: (prestador.total_servicos || 0) + 1 });
    } catch {}
    setPedidoAtual(p);
    reload();
  };

  if (!prestador) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-5">
        <div className="text-center">
          <p className="text-slate-600 mb-3">Perfil de prestador em preparação...</p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Wrench className="w-4 h-4" /></div>
            <div>
              <p className="font-semibold text-slate-900 leading-none capitalize">{prestador.categoria}</p>
              <p className="text-xs text-slate-500 mt-0.5">{usuario.nome.split(' ')[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-700">{(prestador.avaliacao_media || 0).toFixed(1)}</span>
            <span className="text-slate-400">· {prestador.total_servicos || 0} serviços</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Disponibilidade</p>
              <p className="text-sm text-slate-500 mt-0.5">{ativo ? 'A receber pedidos' : 'Indisponível'}</p>
            </div>
            <button onClick={toggleAtivo} disabled={atualizando || !!pedidoAtual} className={`relative w-14 h-8 rounded-full transition ${ativo ? 'bg-emerald-500' : 'bg-slate-200'} disabled:opacity-50`}>
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${ativo ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          {ativo && !incoming && !pedidoAtual && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin" /> À espera de pedidos...
            </div>
          )}
        </div>

        {incoming && (
          <IncomingCard pedido={incoming} onAceitar={aceitar} onRecusar={recusar} />
        )}

        {pedidoAtual && pedidoAtual.status === 'aceito' && (
          <PopupNegociacao pedido={pedidoAtual} usuario={usuario} contraparte={contraparte} isPrestador={true} onAvancou={() => {}} />
        )}

        {pedidoAtual && pedidoAtual.status === 'em_execucao' && (
          <CardMissaoEmCurso
            pedido={pedidoAtual}
            usuario={usuario}
            contraparte={contraparte}
            isPrestador={true}
            onConcluido={onConcluido}
            onAbortado={() => { setPedidoAtual(null); setContraparte(null); reload(); }}
          />
        )}

        {pedidoAtual && pedidoAtual.status === 'concluido' && (
          <AvaliacaoModal
            pedido={pedidoAtual}
            avaliadoId={pedidoAtual.cliente}
            avaliadoTipo="cliente"
            usuario={usuario}
            onDone={() => { setPedidoAtual(null); setContraparte(null); reload(); }}
          />
        )}
      </main>
    </div>
  );
}

function IncomingCard({ pedido, onAceitar, onRecusar }) {
  const [restante, setRestante] = useState(30);
  const [cliente, setCliente] = useState(null);
  const [distancia, setDistancia] = useState(null);

  useEffect(() => {
    const t = setInterval(() => {
      setRestante((r) => { if (r <= 1) { clearInterval(t); onRecusar(); return 0; } return r - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try { if (pedido.cliente) setCliente(await base44.entities.Usuario.get(pedido.cliente)); } catch {}
    })();
    setDistancia(Math.round((Math.random() * 6 + 0.5) * 10) / 10);
  }, [pedido.id]);

  const ano = cliente?.created_date ? new Date(cliente.created_date).getFullYear() : null;
  const pct = (restante / 30) * 100;

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-lg shadow-amber-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Novo pedido</span>
        </div>
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={restante <= 5 ? '#ef4444' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">{restante}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
          {cliente?.foto ? <img src={cliente.foto} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-400" />}
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">{cliente?.nome || 'Cliente'}</p>
          <p className="text-xs text-slate-500">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline mr-1" />
            4.8 {ano ? `· Cliente desde ${ano}` : ''}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{pedido.categoria}</span>
        <p className="text-slate-800 text-sm mt-1 bg-slate-50 rounded-xl px-3 py-2.5">{pedido.descricao}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
        <MapPin className="w-4 h-4 text-slate-400" />
        {distancia !== null ? `A ~${distancia} km de ti` : 'A calcular distância...'}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onRecusar} variant="outline" className="h-11 rounded-xl border-slate-200"><X className="w-4 h-4 mr-1.5" /> Recusar</Button>
        <Button onClick={onAceitar} className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 mr-1.5" /> Aceitar</Button>
      </div>
    </div>
  );
}