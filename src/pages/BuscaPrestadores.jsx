import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MapPin, X, Search, Wrench, Loader2 } from 'lucide-react';
import { Image } from '@/components/ui/image';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'canalizador', label: 'Canalizador' },
  { id: 'mecanico', label: 'Mecânico' },
  { id: 'eletricista', label: 'Eletricista' }
];

export default function BuscaPrestadores() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [prestadores, setPrestadores] = useState(null);
  const [coords, setCoords] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [selecionado, setSelecionado] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      const loc = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: -25.9692, lng: 32.5732 });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: -25.9692, lng: 32.5732 }),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
      setCoords(loc);
      const lista = await base44.entities.Prestador.filter({ status_ativo: true });
      const comDist = lista.map((p) => ({
        ...p,
        distancia: p.latitude != null && p.longitude != null ? haversineKm(loc.lat, loc.lng, p.latitude, p.longitude) : null
      }));
      comDist.sort((a, b) => {
        if (a.distancia === null) return 1;
        if (b.distancia === null) return -1;
        if (Math.abs(a.distancia - b.distancia) < 0.3) return (b.avaliacao_media || 0) - (a.avaliacao_media || 0);
        return a.distancia - b.distancia;
      });
      setPrestadores(comDist);
    })();
  }, []);

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const filtrados = filtro === 'todos'
    ? prestadores || []
    : (prestadores || []).filter((p) => {
        const f = norm(filtro);
        return norm(p.categoria) === f || (p.profissoes_extra || []).some((x) => norm(x) === f);
      });

  const confirmar = async () => {
    if (descricao.trim().length < 5) {
      setErro('Descreve o problema (mín. 5 caracteres).');
      return;
    }
    setCriando(true);
    setErro('');
    try {
      const novo = await base44.entities.Pedido.create({
        cliente: usuario.id,
        prestador: selecionado.usuario,
        categoria: selecionado.categoria,
        descricao: descricao.trim(),
        status: 'buscando',
        latitude_cliente: coords.lat,
        longitude_cliente: coords.lng,
        prestadores_tentados: []
      });
      navigate(`/detalhes-pedido/${novo.id}`);
    } catch (e) {
      setErro(e.message || 'Erro ao criar pedido.');
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="font-semibold text-slate-900 text-lg">Procurar prestador</h1>
          <p className="text-xs text-slate-500 mt-0.5">Ordenados por distância e avaliação</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-5">
        {/* filtros */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                filtro === f.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {prestadores === null ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Nenhum prestador disponível.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelecionado(p)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 text-left hover:border-slate-300 hover:shadow-md transition text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{p.nome}</p>
                  <p className="text-xs text-slate-400 capitalize">{p.categoria}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-slate-600">{(p.avaliacao_media || 0).toFixed(1)}</span>
                    </span>
                    {p.distancia != null && (
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {p.distancia < 1 ? `${Math.round(p.distancia * 1000)} m` : `${p.distancia.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                </div>
                {p.preco_base ? (
                  <span className="text-xs font-semibold text-slate-700">{p.preco_base} MT</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* popup de seleção */}
      {selecionado && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelecionado(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{selecionado.nome}</p>
                  <p className="text-xs text-slate-400 capitalize">{selecionado.categoria}</p>
                </div>
              </div>
              <button onClick={() => setSelecionado(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{(selecionado.avaliacao_media || 0).toFixed(1)}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{selecionado.total_servicos || 0} serviços</span>
              {selecionado.preco_base ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">desde {selecionado.preco_base} MT</span>
                </>
              ) : null}
            </div>

            {selecionado.descricao && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 mb-4">{selecionado.descricao}</p>
            )}

            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descreve o problema</label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Ex: Fuga de água urgente..." className="mb-3" />
            {erro && <p className="text-sm text-red-500 mb-3">{erro}</p>}
            <Button onClick={confirmar} disabled={criando} className="w-full h-11 rounded-xl">
              {criando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {criando ? 'A enviar...' : 'Selecionar e pedir'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}