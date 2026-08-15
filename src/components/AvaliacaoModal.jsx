import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

export default function AvaliacaoModal({ pedido, avaliadoId, avaliadoTipo, usuario, onDone }) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [jaAvaliou, setJaAvaliou] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const existentes = await base44.entities.Avaliacao.filter({
          pedido: pedido.id,
          avaliador: usuario.id
        });
        if (existentes.length > 0) setJaAvaliou(true);
      } catch {}
      setVerificado(true);
    };
    check();
  }, [pedido.id]);

  const submeter = async () => {
    if (nota < 1) {
      setErro('Selecciona uma nota de 1 a 5.');
      return;
    }
    if (comentario.trim().length < 10) {
      setErro('O comentário tem de ter no mínimo 10 caracteres.');
      return;
    }
    setSaving(true);
    setErro('');
    try {
      await base44.entities.Avaliacao.create({
        pedido: pedido.id,
        avaliador: usuario.id,
        avaliado: avaliadoId,
        nota,
        comentario: comentario.trim()
      });
      // se avaliado é prestador, recalcula média
      if (avaliadoTipo === 'prestador' && avaliadoId) {
        const prestadores = await base44.entities.Prestador.filter({ usuario: avaliadoId });
        if (prestadores.length > 0) {
          const prest = prestadores[0];
          const todas = await base44.entities.Avaliacao.filter({ avaliado: avaliadoId });
          const media = todas.reduce((s, a) => s + (a.nota || 0), 0) / (todas.length || 1);
          await base44.entities.Prestador.update(prest.id, {
            avaliacao_media: Math.round(media * 100) / 100
          });
        }
      }
      onDone();
    } catch (e) {
      setErro(e.message || 'Erro ao guardar avaliação.');
    } finally {
      setSaving(false);
    }
  };

  if (!verificado) return null;

  if (jaAvaliou) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
        <p className="text-slate-600 text-sm">Já avaliaste este {avaliadoTipo}.</p>
        <Button onClick={onDone} className="mt-3 w-full rounded-xl h-10">Fechar</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-semibold text-slate-900 mb-1">Avalia o {avaliadoTipo}</h3>
      <p className="text-sm text-slate-500 mb-4">A tua avaliação ajuda a comunidade Kolmi.</p>

      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              className={`w-8 h-8 transition ${
                (hover || nota) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
              }`}
            />
          </button>
        ))}
      </div>

      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium text-slate-700">Comentário (mín. 10 caracteres)</label>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          placeholder="Conta como correreu o serviço..."
        />
        <p className="text-xs text-slate-400">{comentario.trim().length}/10</p>
      </div>

      {erro && <p className="text-sm text-red-500 mb-3">{erro}</p>}

      <Button onClick={submeter} disabled={saving} className="w-full h-11 rounded-xl">
        {saving ? 'A guardar...' : 'Enviar avaliação'}
      </Button>
    </div>
  );
}