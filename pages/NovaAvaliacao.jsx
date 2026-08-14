import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Star, Loader2, Check } from 'lucide-react';

export default function NovaAvaliacao() {
  const { pedidoId } = useParams();
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [avaliado, setAvaliado] = useState(null);
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await base44.entities.Pedido.get(pedidoId);
        setPedido(p);
        const alvoId = p.cliente === usuario.id ? p.prestador : p.cliente;
        if (alvoId) {
          try { setAvaliado(await base44.entities.Usuario.get(alvoId)); } catch {}
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [pedidoId]);

  const submeter = async () => {
    if (nota < 1) { setErro('Selecciona uma nota de 1 a 5.'); return; }
    if (comentario.trim().length < 10) { setErro('O comentário tem de ter no mínimo 10 caracteres.'); return; }
    setSaving(true);
    setErro('');
    try {
      const alvoId = pedido.cliente === usuario.id ? pedido.prestador : pedido.cliente;
      await base44.entities.Avaliacao.create({
        pedido: pedido.id,
        avaliador: usuario.id,
        avaliado: alvoId,
        nota,
        comentario: comentario.trim()
      });
      // se avaliado é prestador, recalcula média
      if (pedido.cliente === usuario.id && alvoId) {
        const prestadores = await base44.entities.Prestador.filter({ usuario: alvoId });
        if (prestadores.length > 0) {
          const todas = await base44.entities.Avaliacao.filter({ avaliado: alvoId });
          const media = todas.reduce((s, a) => s + (a.nota || 0), 0) / (todas.length || 1);
          await base44.entities.Prestador.update(prestadores[0].id, { avaliacao_media: Math.round(media * 100) / 100 });
        }
      }
      navigate(`/detalhes-pedido/${pedido.id}`);
    } catch (e) {
      setErro(e.message || 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

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
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-slate-900 text-lg">Avaliar serviço</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="text-center mb-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{pedido.categoria}</p>
            {avaliado && <p className="font-semibold text-slate-900 mt-1">Como foi o serviço de {avaliado.nome}?</p>}
            <p className="text-sm text-slate-500 mt-1 bg-slate-50 rounded-xl px-3 py-2.5">{pedido.descricao}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setNota(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>
                <Star className={`w-9 h-9 transition ${(hover || nota) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              </button>
            ))}
          </div>

          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Comentário (mín. 10 caracteres)</label>
          <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Conta como correu o serviço..." className="mb-2" />
          <p className="text-xs text-slate-400 mb-4">{comentario.trim().length}/10</p>

          {erro && <p className="text-sm text-red-500 mb-3">{erro}</p>}

          <Button onClick={submeter} disabled={saving} className="w-full h-11 rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {saving ? 'A guardar...' : 'Enviar avaliação'}
          </Button>
        </div>
      </main>
    </div>
  );
}