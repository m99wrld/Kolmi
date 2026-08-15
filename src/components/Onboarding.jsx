import React, { useState } from 'react';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, User, Phone, Tag, Plus, X } from 'lucide-react';

const CATEGORIAS = [
  { id: 'canalizador', label: 'Canalizador' },
  { id: 'mecanico', label: 'Mecânico' },
  { id: 'eletricista', label: 'Eletricista' }
];

export default function Onboarding({ user, onDone }) {
  const [nome, setNome] = useState(user?.full_name || '');
  const [telefone, setTelefone] = useState('');
  const [tipo, setTipo] = useState('cliente');
  const [categoria, setCategoria] = useState('canalizador');
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [profissoesExtra, setProfissoesExtra] = useState([]);
  const [extraInput, setExtraInput] = useState('');
  const [precoBase, setPrecoBase] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const addExtra = () => {
    const v = extraInput.trim();
    if (!v || profissoesExtra.includes(v) || profissoesExtra.length >= 5) return;
    setProfissoesExtra([...profissoesExtra, v]);
    setExtraInput('');
  };

  const submit = async () => {
    if (!nome.trim() || !telefone.trim()) {
      setErro('Preenche nome e telefone.');
      return;
    }
    const principal = categoria === 'outra' ? categoriaCustom.trim() : categoria;
    if (tipo === 'prestador' && !principal) {
      setErro('Indica a profissão principal.');
      return;
    }
    setSaving(true);
    setErro('');
    try {
      // O login já cria um documento "placeholder" em usuario (via
      // createUsuarioIfNeeded). Se existir, apenas atualiza em vez de
      // criar um duplicado.
      // Procura o documento existente pelo uid do Firebase (o filtro
      // `id` mapeia para `created_by_id`). Se existir, atualiza; caso
      // contrário cria o documento com `id` = uid do usuário, garantindo
      // que todos os filtros futuros o encontrem sempre.
      const existente = (await base44.entities.Usuario.filter({ id: user.id }, null, 1))[0];
      let criado;
      if (existente) {
        criado = await base44.entities.Usuario.update(existente.id, {
          nome: nome.trim(),
          telefone: telefone.trim(),
          tipo,
          ativo: true
        });
      } else {
        criado = await base44.entities.Usuario.create({
          id: user.id,
          nome: nome.trim(),
          telefone: telefone.trim(),
          tipo,
          ativo: true
        });
      }
      if (tipo === 'prestador') {
        await base44.entities.Prestador.create({
          usuario: criado.id,
          nome: nome.trim(),
          categoria: principal,
          profissoes_extra: profissoesExtra,
          descricao: descricao.trim(),
          preco_base: Number(precoBase) || 0,
          verificado: false,
          disponibilidade: 'livre',
          status_ativo: false,
          avaliacao_media: 0,
          total_servicos: 0
        });
      }
      onDone();
    } catch (e) {
      setErro(e.message || 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Bem-vindo ao Kolmi</h1>
            <p className="text-sm text-slate-500">Configura o teu perfil</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="O teu nome" className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+258 ..." className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de conta</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo('cliente')}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  tipo === 'cliente'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setTipo('prestador')}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  tipo === 'prestador'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                Prestador
              </button>
            </div>
          </div>

          {tipo === 'prestador' && (
            <div className="space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <div className="space-y-1.5">
                <Label>Profissão principal</Label>
                <div className="relative">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="w-full pl-9 h-10 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                      <SelectItem value="outra">Outra (personalizada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {categoria === 'outra' && (
                  <Input
                    value={categoriaCustom}
                    onChange={(e) => setCategoriaCustom(e.target.value)}
                    placeholder="Escreve a profissão"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Profissões extra ({profissoesExtra.length}/5)</Label>
                {profissoesExtra.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profissoesExtra.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 pl-3 pr-1.5 py-1 text-xs text-slate-700">
                        {p}
                        <button
                          type="button"
                          onClick={() => setProfissoesExtra(profissoesExtra.filter((_, idx) => idx !== i))}
                          className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {profissoesExtra.length < 5 && (
                  <div className="flex gap-2">
                    <Input
                      value={extraInput}
                      onChange={(e) => setExtraInput(e.target.value)}
                      placeholder="Adicionar profissão extra"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }}
                    />
                    <Button type="button" variant="outline" onClick={addExtra} className="h-10 px-3 rounded-lg">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Descrição do serviço</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Ex: Reparações urgentes, fugas de água..." />
              </div>
              <div className="space-y-1.5">
                <Label>Preço base (MT)</Label>
                <Input type="number" value={precoBase} onChange={(e) => setPrecoBase(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <Button onClick={submit} disabled={saving} className="w-full rounded-xl h-11">
            {saving ? 'A guardar...' : 'Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}