import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Wrench, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import AvatarComBadgeProfissao from '@/components/AvatarComBadgeProfissao';

export default function CardMissaoEmCurso({ pedido, usuario, contraparte, isPrestador, onAbortado, onConcluido }) {
  const [atual, setAtual] = useState(pedido);
  const [modal, setModal] = useState(false);
  const [confirmaAbort, setConfirmaAbort] = useState(false);
  const [pronto, setPronto] = useState(isPrestador ? pedido.prestador_pronto : pedido.cliente_pronto);

  useEffect(() => setAtual(pedido), [pedido]);
  useEffect(() => {
    const unsub = base44.entities.Pedido.subscribe((event) => {
      if (event.data && event.data.id === pedido.id) setAtual(event.data);
    });
    return unsub;
  }, [pedido?.id]);

  useEffect(() => {
    if (atual?.status === 'concluido') onConcluido?.(atual);
    if (atual?.status === 'cancelado') onAbortado?.(atual);
  }, [atual?.status]);

  const marcarPronto = async () => {
    const meuCampo = isPrestador ? 'prestador_pronto' : 'cliente_pronto';
    const outroCampo = isPrestador ? 'cliente_pronto' : 'prestador_pronto';
    setPronto(true);
    const updated = await base44.entities.Pedido.update(pedido.id, { [meuCampo]: true });
    if (updated && updated[outroCampo]) {
      await base44.entities.Pedido.update(pedido.id, { status: 'concluido', concluido_em: new Date().toISOString() });
    }
  };

  const abortar = async () => {
    await base44.entities.Pedido.update(pedido.id, { status: 'cancelado' });
    setConfirmaAbort(false);
    setModal(false);
  };

  const clientePronto = atual?.cliente_pronto;
  const prestadorPronto = atual?.prestador_pronto;

  return (
    <>
      <button onClick={() => setModal(true)} className="w-full max-w-sm mx-auto bg-white rounded-2xl border border-slate-100 shadow-lg p-4 text-left hover:shadow-xl transition">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm capitalize">{pedido.categoria} · #{pedido.id.slice(-5)}</p>
            <p className="text-xs text-slate-500 line-clamp-1">{pedido.descricao}</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
        <p className="text-xs text-slate-500">
          Em curso {pedido.preco_negociado != null ? `· ${pedido.preco_negociado} MT combinados` : ''}
        </p>
      </button>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Serviço em curso</h3>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {contraparte && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 mb-4">
                <AvatarComBadgeProfissao foto={contraparte.foto} categoria={pedido.categoria} className="w-10 h-10" rounded="rounded-full" badgeSize="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{contraparte.nome}</p>
                  <p className="text-xs text-slate-500 capitalize">{pedido.categoria}</p>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Cliente</span>
                <span className={clientePronto ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  {clientePronto ? '✅ Pronto' : '⏳ Aguardando...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Prestador</span>
                <span className={prestadorPronto ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  {prestadorPronto ? '✅ Pronto' : '⏳ Aguardando...'}
                </span>
              </div>
            </div>

            {!confirmaAbort ? (
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setConfirmaAbort(true)} variant="outline" className="h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50">
                  <AlertTriangle className="w-4 h-4 mr-1.5" /> Abortar
                </Button>
                <Button onClick={marcarPronto} disabled={pronto} className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700">
                  <Check className="w-4 h-4 mr-1.5" /> {pronto ? 'Aguardando outro' : 'Concluir'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 text-center">Queres mesmo abortar este pedido? Será movido para o histórico como cancelado.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setConfirmaAbort(false)} variant="outline" className="h-11 rounded-xl">Cancelar</Button>
                  <Button onClick={abortar} className="h-11 rounded-xl bg-red-600 hover:bg-red-700">Abortar pedido</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}