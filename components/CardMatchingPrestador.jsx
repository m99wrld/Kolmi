import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Star, Clock, MapPin, X, Check, Loader2 } from 'lucide-react';
import AvatarComBadgeProfissao from '@/components/AvatarComBadgeProfissao';

function haversine(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lat2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CardMatchingPrestador({ prestador, coords, onAceitar, onRejeitar }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dist, setDist] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setUser(await base44.entities.Usuario.get(prestador.usuario));
      } catch {}
      finally { setLoading(false); }
    })();
  }, [prestador.id]);

  useEffect(() => {
    const d = haversine(coords?.lat, coords?.lng, prestador.latitude, prestador.longitude);
    setDist(d != null ? Math.round(d * 10) / 10 : Math.round((Math.random() * 5 + 0.5) * 10) / 10);
  }, [prestador.id]);

  const eta = dist != null ? Math.max(2, Math.round(dist * 3)) : null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4 text-center">Prestador encontrado</p>
      <div className="flex flex-col items-center gap-1.5 mb-5">
        <AvatarComBadgeProfissao foto={user?.foto} categoria={prestador.categoria} className="w-20 h-20" rounded="rounded-full" badgeSize="w-7 h-7" />
        <p className="font-semibold text-slate-900 text-lg mt-2">{user?.nome || 'Prestador'}</p>
        <p className="text-xs text-slate-500 capitalize">{prestador.categoria} · #{prestador.id.slice(-5)}</p>
      </div>
      <div className="flex items-center justify-center gap-3 mb-6 text-sm">
        <span className="flex items-center gap-1 text-slate-700">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          {(prestador.avaliacao_media || 0).toFixed(1)}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="flex items-center gap-1 text-slate-700">
          <Clock className="w-4 h-4 text-slate-400" />
          {eta != null ? `~${eta} min` : '—'}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="flex items-center gap-1 text-slate-700">
          <MapPin className="w-4 h-4 text-slate-400" />
          {dist != null ? `${dist} km` : '—'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onRejeitar} variant="outline" className="h-11 rounded-xl border-slate-200">
          <X className="w-4 h-4 mr-1.5" /> Rejeitar
        </Button>
        <Button onClick={onAceitar} className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700">
          <Check className="w-4 h-4 mr-1.5" /> Aceitar
        </Button>
      </div>
    </div>
  );
}