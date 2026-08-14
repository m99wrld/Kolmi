import React from 'react';
import { Wrench, Droplets, Car, Zap } from 'lucide-react';
import { Image } from '@/components/ui/image';

const CAT_ICON = { canalizador: Droplets, mecanico: Car, eletricista: Zap };

export default function AvatarComBadgeProfissao({
  foto,
  categoria,
  className = 'w-12 h-12',
  rounded = 'rounded-2xl',
  badgeSize = 'w-5 h-5'
}) {
  const Icon = CAT_ICON[categoria] || Wrench;
  return (
    <div className={`relative ${rounded} ${className}`}>
      <div className={`w-full h-full ${rounded} overflow-hidden bg-slate-100 flex items-center justify-center`}>
        {foto ? (
          <Image src={foto} fittingType="fill" className="w-full h-full" />
        ) : (
          <Wrench className="w-1/2 h-1/2 text-slate-300" />
        )}
      </div>
      <span
        className={`absolute -bottom-1 -right-1 ${badgeSize} rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center p-0.5`}
      >
        <span className="w-full h-full rounded-full bg-emerald-400 flex items-center justify-center">
          <Icon className="w-2/3 h-2/3 text-white" />
        </span>
      </span>
    </div>
  );
}