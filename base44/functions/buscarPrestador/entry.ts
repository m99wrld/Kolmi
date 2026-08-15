import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { haversineKm } from '../../shared/haversine.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const pedidoId = body.pedido_id;
    if (!pedidoId) return Response.json({ error: 'pedido_id obrigatorio' }, { status: 400 });

    let pedido;
    try {
      pedido = await base44.asServiceRole.entities.Pedido.get(pedidoId);
    } catch {
      return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    }

    const tentados = pedido.prestadores_tentados || [];

    const todos = await base44.asServiceRole.entities.Prestador.filter({
      status_ativo: true,
      disponibilidade: 'livre'
    });
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const cat = norm(pedido.categoria);
    const candidatos = todos.filter(
      (p) => norm(p.categoria) === cat || (p.profissoes_extra || []).some((x) => norm(x) === cat)
    );

    const elegiveis = candidatos.filter(
      (p) =>
        p.usuario &&
        !tentados.includes(p.usuario) &&
        p.usuario !== pedido.cliente &&
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number'
    );

    if (elegiveis.length === 0) {
      await base44.asServiceRole.entities.Pedido.update(pedidoId, {
        prestador: null,
        status: 'buscando'
      });
      return Response.json({
        ok: true,
        encontrado: false,
        motivo: 'sem prestadores disponiveis'
      });
    }

    const comDist = elegiveis.map((p) => ({
      p,
      dist: haversineKm(
        pedido.latitude_cliente,
        pedido.longitude_cliente,
        p.latitude,
        p.longitude
      )
    }));

    const maxDist = Math.max(...comDist.map((x) => x.dist), 0.0001);
    const maxNota = Math.max(...comDist.map((x) => x.p.avaliacao_media || 0), 0.0001);
    const maxServ = Math.max(...comDist.map((x) => x.p.total_servicos || 0), 0.0001);

    const scored = comDist.map((x) => {
      const scoreDist = 1 - x.dist / maxDist;
      const scoreNota = (x.p.avaliacao_media || 0) / maxNota;
      const scoreServ = (x.p.total_servicos || 0) / maxServ;
      const score = 0.5 * scoreDist + 0.3 * scoreNota + 0.2 * scoreServ;
      return { ...x, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const melhor = scored[0];

    await base44.asServiceRole.entities.Pedido.update(pedidoId, {
      prestador: melhor.p.usuario,
      status: 'buscando'
    });

    return Response.json({
      ok: true,
      encontrado: true,
      prestador_id: melhor.p.usuario,
      prestador_nome: melhor.p.nome,
      distancia_km: Math.round(melhor.dist * 10) / 10
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}