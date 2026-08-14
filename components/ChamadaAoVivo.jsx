import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Check, X, Loader2 } from 'lucide-react';

// Chamada simulada — VoIP real requer integração externa (ex: Agora/Twilio).
export default function ChamadaAoVivo({ contraparte, onTerminar }) {
  const [estado, setEstado] = useState('chamando');
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setEstado('emchamada'), 2500);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (estado !== 'emchamada') return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6">
        {estado !== 'terminada' ? (
          <>
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                <Phone className="w-8 h-8 text-slate-600" />
              </div>
              <p className="font-semibold text-slate-900 text-lg">{contraparte?.nome || 'Contraparte'}</p>
              <p className="text-sm text-slate-500">
                {estado === 'chamando' ? 'A chamar...' : `${mm}:${ss}`}
              </p>
              {estado === 'chamando' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            <p className="text-xs text-center text-slate-400 mb-4">Chamada simulada — VoIP real requer integração externa.</p>
            <Button onClick={() => setEstado('terminada')} variant="outline" className="w-full h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50">
              <PhoneOff className="w-4 h-4 mr-2" /> Terminar chamada
            </Button>
          </>
        ) : (
          <>
            <p className="font-semibold text-slate-900 text-center mb-1">Chegaram a um acordo?</p>
            <p className="text-sm text-slate-500 text-center mb-5">Duração: {mm}:{ss}</p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => onTerminar(true)} className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700">
                <Check className="w-4 h-4 mr-1.5" /> Sim, avançar
              </Button>
              <Button onClick={() => onTerminar(false)} variant="outline" className="h-11 rounded-xl">
                <X className="w-4 h-4 mr-1.5" /> Não
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}