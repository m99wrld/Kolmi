import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Wrench, Droplets, Car, Zap, Pencil, MapPin, X, Loader2, ChevronRight
} from 'lucide-react';
import AvaliacaoModal from '@/components/AvaliacaoModal';
import CardMatchingPrestador from '@/components/CardMatchingPrestador';
import PopupNegociacao from '@/components/PopupNegociacao';
import CardMissaoEmCurso from '@/components/CardMissaoEmCurso';

const CATEGORIAS = [
  { id: 'canalizador', label: 'Canalizador', icon: Droplets },
  { id: 'mecanico', label: 'Mecânico', icon: Car },
  { id: 'eletricista', label: 'Eletricista', icon: Zap }
];

function haversine(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lat2 == null) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ClienteHome({ usuario }) {
  const [stage, setStage] = useState('idle');
  const [categoria, setCategoria] = useState(null);
  const [categoriaManual, setCategoriaManual] = useState('');
  const [descricao, setDescricao] = useState('');
  const [coords, setCoords] = useState(null);
  const [erro, setErro] = useState('');
  const [pedido, setPedido] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [contraparte, setContraparte] = useState(null);
  const [avaliarPedido, setAvaliarPedido] = useState(null);

  const obterLocalizacao = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ lat: -25.9692, lng: 32.5732 });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: -25.9692, lng: 32.5732 }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const carregarContraparte = async (p) => {
    if (!p?.prestador || contraparte?.id === p.prestador) return;
    try { setContraparte(await base44.entities.Usuario.get(p.prestador)); } catch {}
  };

  const aplicarStatus = (p) => {
    setPedido(p);
    if (p.status === 'aceito') { carregarContraparte(p); setStage('negociacao'); }
    else if (p.status === 'em_execucao') { carregarContraparte(p); setStage('missao'); }
    else if (p.status === 'concluido') { setAvaliarPedido(p); setPedido(null); setStage('idle'); }
    else if (p.status === 'cancelado') { setPedido(null); setStage('idle'); }
  };

  useEffect(() => {
    (async () => {
      const c = await obterLocalizacao();
      setCoords(c);
      try {
        const emExec = await base44.entities.Pedido.filter({ cliente: usuario.id, status: 'em_execucao' }, '-updated_date', 1);
        if (emExec.length) { const p = emExec[0]; setPedido(p); await carregarContraparte(p); setStage('missao'); return; }
        const aceitos = await base44.entities.Pedido.filter({ cliente: usuario.id, status: 'aceito' }, '-updated_date', 1);
        if (aceitos.length) { const p = aceitos[0]; setPedido(p); await carregarContraparte(p); setStage('negociacao'); return; }
        const buscando = await base44.entities.Pedido.filter({ cliente: usuario.id, status: 'buscando' }, '-updated_date', 1);
        if (buscando.length) { setPedido(buscando[0]); setStage('espera'); return; }
        const concluidos = await base44.entities.Pedido.filter({ cliente: usuario.id, status: 'concluido' }, '-concluido_em', 10);
        for (const p of concluidos) {
          const avs = await base44.entities.Avaliacao.filter({ pedido: p.id, avaliador: usuario.id });
          if (avs.length === 0) { setAvaliarPedido(p); break; }
        }
      } catch {}
    })();
  }, [usuario?.id]);

  useEffect(() => {
    if (!pedido) return;
    const unsub = base44.entities.Pedido.subscribe((event) => {
      if (event.data && event.data.id === pedido.id) aplicarStatus(event.data);
    });
    const interval = setInterval(async () => {
      try { const p = await base44.entities.Pedido.get(pedido.id); if (p) aplicarStatus(p); } catch {}
    }, 4000);
    return () => { unsub(); clearInterval(interval); };
  }, [pedido?.id]);

  const abrirCategorias = () => { setErro(''); setStage('categorias'); };

  const iniciarBusca = async () => {
    const catFinal = categoria ? categoria.id : categoriaManual.trim();
    if (!catFinal) { setErro('Indica a categoria do serviço.'); return; }
    if (descricao.trim().length < 5) { setErro('Descreve o problema (mín. 5 caracteres).'); return; }
    setErro(''); setBuscando(true);
    try {
      const todos = await base44.entities.Prestador.filter({ status_ativo: true, disponibilidade: 'livre' });
      let cands = todos.filter((p) => p.usuario !== usuario.id);
      if (catFinal) {
        const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const cat = norm(catFinal);
        cands = cands.filter((p) => {
          const principal = norm(p.categoria);
          const extras = (p.profissoes_extra || []).map(norm);
          return principal === cat || extras.includes(cat);
        });
      }
      cands = cands
        .map((p) => {
          const dist = haversine(coords?.lat, coords?.lng, p.latitude, p.longitude);
          const dScore = 1 / (1 + dist);
          const rScore = (p.avaliacao_media || 0) / 5;
          const tScore = Math.min((p.total_servicos || 0) / 50, 1);
          return { ...p, _score: 0.5 * dScore + 0.3 * rScore + 0.2 * tScore };
        })
        .sort((a, b) => b._score - a._score);
      if (cands.length === 0) { setErro('Sem prestadores disponíveis para esta categoria. Tenta mais tarde.'); setBuscando(false); return; }
      setCandidates(cands);
      setCardIndex(0);
      setStage('matching');
    } catch (e) {
      setErro(e.message || 'Erro ao procurar.');
    } finally { setBuscando(false); }
  };

  const aceitarCandidato = async (candidate) => {
    setBuscando(true);
    try {
      const catFinal = categoria ? categoria.id : categoriaManual.trim();
      let p;
      if (pedido) {
        const tentados = [...(pedido.prestadores_tentados || []), pedido.prestador].filter(Boolean);
        p = await base44.entities.Pedido.update(pedido.id, { prestador: candidate.usuario, status: 'buscando', prestadores_tentados: tentados });
      } else {
        p = await base44.entities.Pedido.create({
          cliente: usuario.id, categoria: catFinal, descricao: descricao.trim(),
          status: 'buscando', latitude_cliente: coords?.lat, longitude_cliente: coords?.lng,
          prestador: candidate.usuario, prestadores_tentados: []
        });
      }
      setPedido(p);
      setContraparte(null);
      setStage('espera');
    } catch (e) {
      setErro(e.message || 'Erro ao enviar pedido.');
    } finally { setBuscando(false); }
  };

  const rejeitarCandidato = () => {
    const ni = cardIndex + 1;
    if (ni >= candidates.length) { setErro('Não há mais prestadores disponíveis.'); setStage('form'); return; }
    setCardIndex(ni);
  };

  const proximoCandidato = () => {
    const ni = cardIndex + 1;
    if (ni >= candidates.length) { setErro('Não há mais prestadores disponíveis.'); setStage('form'); return; }
    setCardIndex(ni);
    aceitarCandidato(candidates[ni]);
  };

  const cancelarEspera = async () => {
    if (pedido) { try { await base44.entities.Pedido.update(pedido.id, { status: 'cancelado' }); } catch {} }
    reset();
  };

  const reset = () => {
    setPedido(null); setContraparte(null); setCategoria(null); setCategoriaManual(''); setDescricao('');
    setCandidates([]); setCardIndex(0); setStage('idle');
  };

  return (
    <div className="flex flex-col bg-gradient-to-b from-slate-100 to-slate-200" style={{ height: 'calc(100vh - 10.5rem)' }}>
      <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
        {stage === 'missao' && pedido ? (
          <CardMissaoEmCurso
            pedido={pedido}
            usuario={usuario}
            contraparte={contraparte}
            isPrestador={false}
            onConcluido={(p) => { setAvaliarPedido(p); setPedido(null); setContraparte(null); setStage('idle'); }}
            onAbortado={() => { setPedido(null); setContraparte(null); setStage('idle'); }}
          />
        ) : stage === 'negociacao' && pedido ? (
          <PopupNegociacao
            pedido={pedido}
            usuario={usuario}
            contraparte={contraparte}
            isPrestador={false}
            onAvancou={() => setStage('missao')}
          />
        ) : stage === 'espera' && pedido ? (
          <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
            {pedido.status === 'recusado' ? (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">O prestador não respondeu a tempo. Procurar outro?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={cancelarEspera} variant="outline" className="h-11 rounded-xl">Cancelar</Button>
                  <Button onClick={proximoCandidato} className="h-11 rounded-xl">Próximo prestador</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="relative w-14 h-14 mb-3">
                  <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
                  <div className="relative w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                </div>
                <p className="font-medium text-slate-900 text-sm">Aguardando confirmação do prestador</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">O prestador tem 30s para responder.</p>
                <Button onClick={cancelarEspera} variant="ghost" className="text-xs text-slate-400">Cancelar pedido</Button>
              </div>
            )}
          </div>
        ) : stage === 'matching' ? (
          candidates[cardIndex] ? (
            <CardMatchingPrestador
              prestador={candidates[cardIndex]}
              coords={coords}
              onAceitar={() => aceitarCandidato(candidates[cardIndex])}
              onRejeitar={rejeitarCandidato}
            />
          ) : (
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-4">Sem mais prestadores disponíveis.</p>
              <Button onClick={() => setStage('form')} variant="outline" className="rounded-xl">Tentar novamente</Button>
            </div>
          )
        ) : (
          <>
            <button
              onClick={abrirCategorias}
              className="relative w-[68vw] max-w-[280px] aspect-square rounded-[2.5rem] bg-slate-900/60 backdrop-blur-md border border-white/15 shadow-2xl flex flex-col items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <span className="text-white font-semibold text-lg">Pedir Assistência</span>
              <span className="text-white/60 text-xs text-center px-4">Canalizador · Mecânico · Eletricista</span>
              <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-400 text-white flex items-center justify-center border-[3px] border-slate-100 shadow">
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
            <Link to="/busca-prestadores" className="mt-10 text-sm text-slate-500 underline hover:text-slate-900 text-center">
              ou procura um prestador específico
            </Link>
          </>
        )}
      </main>

      {avaliarPedido && (
        <div className="max-w-lg mx-auto px-5 pb-4 w-full">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm text-slate-600 mb-3">Avalia o teu prestador pelo serviço concluído.</p>
            <AvaliacaoModal pedido={avaliarPedido} avaliadoId={avaliarPedido.prestador} avaliadoTipo="prestador" usuario={usuario} onDone={() => setAvaliarPedido(null)} />
          </div>
        </div>
      )}

      {stage === 'categorias' && (
        <PopupSheet onClose={reset} title="Escolhe o serviço">
          <p className="text-sm text-slate-500 mb-4">Mais frequentes</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {CATEGORIAS.map((c) => {
              const Icon = c.icon;
              return (
                <button key={c.id} onClick={() => { setCategoria(c); setCategoriaManual(''); setDescricao(''); setStage('form'); }} className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-300 hover:shadow-md transition">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                  <span className="text-xs font-medium text-slate-700">{c.label}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => { setCategoria(null); setCategoriaManual(''); setDescricao(''); setStage('form'); }} className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 hover:border-slate-400 hover:bg-slate-50 transition text-left">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Pencil className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-medium text-slate-800">Personalizar busca</p>
              <p className="text-xs text-slate-500">Descreve manualmente o que precisas</p>
            </div>
          </button>
        </PopupSheet>
      )}

      {stage === 'form' && (
        <PopupSheet onClose={() => setStage('categorias')} title={categoria ? categoria.label : 'Personalizar busca'}>
          <div className="space-y-4">
            {!categoria && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Categoria do serviço</label>
                <input value={categoriaManual} onChange={(e) => setCategoriaManual(e.target.value)} placeholder="Ex: serralheiro, vidraceiro..." className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descreve o problema</label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} placeholder="Ex: Fuga de água debaixo do lava-loiça, urgente..." />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              <MapPin className="w-3.5 h-3.5" /> Localização obtida
            </div>
            {erro && <p className="text-sm text-red-500">{erro}</p>}
            <Button onClick={iniciarBusca} disabled={buscando} className="w-full h-11 rounded-xl">
              {buscando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {buscando ? 'A procurar...' : 'Procurar prestadores'}
            </Button>
          </div>
        </PopupSheet>
      )}
    </div>
  );
}

function PopupSheet({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}