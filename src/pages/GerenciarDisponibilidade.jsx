import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Power, Clock, Calendar, Check, Loader2 } from 'lucide-react';

const DIAS = [
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' }
];

const DISPONIBILIDADE = [
  { id: 'livre', label: 'Livre', color: 'bg-emerald-500' },
  { id: 'ocupado', label: 'Ocupado', color: 'bg-red-500' },
  { id: 'pendente', label: 'Pendente', color: 'bg-amber-500' }
];

export default function GerenciarDisponibilidade() {
  const { prestador, reload } = useOutletContext();
  const [ativo, setAtivo] = useState(prestador?.status_ativo || false);
  const [disp, setDisp] = useState(prestador?.disponibilidade || 'livre');
  const [inicio, setInicio] = useState(prestador?.horario_inicio || '08:00');
  const [fim, setFim] = useState(prestador?.horario_fim || '18:00');
  const [dias, setDias] = useState(prestador?.dias_semana || ['seg', 'ter', 'qua', 'qui', 'sex']);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (prestador) {
      setAtivo(prestador.status_ativo || false);
      setDisp(prestador.disponibilidade || 'livre');
      setInicio(prestador.horario_inicio || '08:00');
      setFim(prestador.horario_fim || '18:00');
      setDias(prestador.dias_semana || ['seg', 'ter', 'qua', 'qui', 'sex']);
    }
  }, [prestador?.id]);

  const toggleDia = (id) => {
    setDias((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  };

  const guardar = async () => {
    setSaving(true);
    setOk(false);
    try {
      await base44.entities.Prestador.update(prestador.id, {
        status_ativo: ativo,
        disponibilidade: disp,
        horario_inicio: inicio,
        horario_fim: fim,
        dias_semana: dias
      });
      setOk(true);
      reload();
      setTimeout(() => setOk(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!prestador) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <p className="text-slate-500 text-sm">Perfil de prestador em preparação.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="font-semibold text-slate-900 text-lg">Disponibilidade</h1>
          <p className="text-xs text-slate-500 mt-0.5">Gerencia quando recebes pedidos</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-4">
        {/* toggle principal */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Receber pedidos</p>
                <p className="text-xs text-slate-500">{ativo ? 'Ativo — a receber pedidos' : 'Inativo'}</p>
              </div>
            </div>
            <button
              onClick={() => setAtivo(!ativo)}
              className={`relative w-14 h-8 rounded-full transition ${ativo ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${ativo ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* status manual */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-sm font-semibold text-slate-900 mb-3">Status atual</p>
          <div className="grid grid-cols-3 gap-2">
            {DISPONIBILIDADE.map((d) => (
              <button
                key={d.id}
                onClick={() => setDisp(d.id)}
                className={`rounded-xl border px-3 py-3 text-xs font-medium transition flex flex-col items-center gap-1.5 ${
                  disp === d.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 text-slate-500'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* horário */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Horário de atendimento</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Início</label>
              <input
                type="time"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fim</label>
              <input
                type="time"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* dias da semana */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Dias de atendimento</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d) => {
              const sel = dias.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDia(d.id)}
                  className={`w-12 h-12 rounded-xl text-xs font-medium transition flex items-center justify-center ${
                    sel ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {sel ? <Check className="w-4 h-4" /> : d.label}
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={guardar} disabled={saving} className="w-full h-11 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : ok ? <Check className="w-4 h-4 mr-2" /> : null}
          {saving ? 'A guardar...' : ok ? 'Guardado!' : 'Guardar disponibilidade'}
        </Button>
      </main>
    </div>
  );
}