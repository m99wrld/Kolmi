import React, { useState } from 'react';
import { Phone, MessageSquare, MessageCircle, X } from 'lucide-react';

export default function ChatNegotiation({ telefone, nome }) {
  const [open, setOpen] = useState(false);
  if (!telefone) return null;

  const limpo = telefone.replace(/[^0-9]/g, '');
  const whatsapp = limpo.replace(/^0/, '');
  const destinatario = nome || 'prestador';

  const opcoes = [
    {
      label: 'Ligar',
      desc: 'Chamada telefónica',
      icon: Phone,
      href: `tel:${limpo}`,
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: 'SMS',
      desc: 'Enviar mensagem por SMS',
      icon: MessageSquare,
      href: `sms:${limpo}?body=Ol%C3%A1%2C%20sou%20o%20cliente%20da%20Kolmi.`,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'WhatsApp',
      desc: 'Mandar mensagem',
      icon: MessageCircle,
      href: `https://wa.me/${whatsapp}`,
      color: 'bg-green-50 text-green-600'
    }
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-28 right-5 z-30 w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/30 flex items-center justify-center hover:scale-105 active:scale-95 transition"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">Negociar com {destinatario}</h3>
                <p className="text-xs text-slate-500">{telefone}</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {opcoes.map((o) => {
                const Icon = o.icon;
                return (
                  <a
                    key={o.label}
                    href={o.href}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${o.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{o.label}</p>
                      <p className="text-xs text-slate-500">{o.desc}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}