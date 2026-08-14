import React from 'react';
import { Shield, Heart, Zap, AlertTriangle, Wrench } from 'lucide-react';

export default function TermosUso() {
  const seccoes = [
    {
      icon: Shield,
      titulo: '1. Aceitação dos termos',
      texto: 'Ao registar-te e utilizar a plataforma Kolmi, aceitas integralmente estes termos de uso. Se não concordas com qualquer ponto, deves deixar de utilizar a plataforma.'
    },
    {
      icon: Wrench,
      titulo: '2. Descrição do serviço',
      texto: 'A Kolmi é uma plataforma que conecta clientes a prestadores de serviço (canalizadores, mecânicos, eletricistas, entre outros) para pedidos urgentes. A Kolmi atua como intermediária tecnológica e não emprega diretamente os prestadores.'
    },
    {
      icon: Zap,
      titulo: '3. Matching e disponibilidade',
      texto: 'O matching automático ordena prestadores por distância, avaliação e número de serviços realizados. A disponibilidade de um prestador não é garantida — a atribuição depende da resposta do profissional no prazo definido.'
    },
    {
      icon: AlertTriangle,
      titulo: '4. Responsabilidade',
      texto: 'A qualidade, segurança e legalidade dos serviços prestados são da responsabilidade do prestador. A Kolmi não se responsabiliza por danos, atrasos ou conflitos decorrentes da prestação do serviço.'
    },
    {
      icon: Heart,
      titulo: '5. Avaliações',
      texto: 'Após a conclusão de cada serviço, ambas as partes podem avaliar-se mutuamente. As avaliações devem ser honestas e baseadas na experiência real. Avaliações falsas ou abusivas podem ser removidas.'
    }
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-lg leading-none">Termos de Uso</h1>
            <p className="text-xs text-slate-500 mt-0.5">Plataforma Kolmi</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white mb-6">
          <Shield className="w-8 h-8 mb-3 text-slate-300" />
          <h2 className="text-lg font-semibold mb-1">Transparência em primeiro lugar</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Estes termos definem as regras de utilização da Kolmi para clientes e prestadores. Lê com atenção.
          </p>
          <p className="text-xs text-slate-400 mt-4">Última atualização: Agosto 2026</p>
        </div>

        <div className="space-y-4">
          {seccoes.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.titulo} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm">{s.titulo}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{s.texto}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-6">
          <p className="text-xs text-amber-700 leading-relaxed">
            Em caso de dúvida sobre estes termos, contacta o apoio da Kolmi. A utilização continuada da plataforma após alterações dos termos constitui aceitação dos mesmos.
          </p>
        </div>
      </main>
    </div>
  );
}