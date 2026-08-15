import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { Button } from '@/components/ui/button';
import {
  User,
  Phone,
  Camera,
  Loader2,
  Check,
  BadgeCheck,
  Mail,
  MapPin,
  Calendar,
  Pencil,
  X,
  LogOut,
  Trash2
} from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function Perfil() {
  const { usuario, prestador, reload } = useOutletContext();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', morada: '', data_nascimento: '' });
  const [foto, setFoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (usuario) {
      setForm({
        nome: usuario.nome || '',
        telefone: usuario.telefone || '',
        email: usuario.email || '',
        morada: usuario.morada || '',
        data_nascimento: usuario.data_nascimento || ''
      });
      setFoto(usuario.foto || '');
    }
  }, [usuario?.id]);

  const uploadFoto = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFoto(file_url);
    } catch {
      setErro('Erro ao carregar foto.');
    } finally {
      setUploading(false);
    }
  };

  const guardar = async () => {
    if (!form.nome.trim()) {
      setErro('O nome é obrigatório.');
      return;
    }
    setSaving(true);
    setErro('');
    setOk(false);
    try {
      await base44.entities.Usuario.update(usuario.id, {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        morada: form.morada.trim(),
        data_nascimento: form.data_nascimento || undefined,
        foto
      });
      setOk(true);
      reload();
      setTimeout(() => {
        setOk(false);
        setEdit(false);
      }, 1200);
    } catch (e) {
      setErro(e.message || 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

  const cancelar = () => {
    setForm({
      nome: usuario.nome || '',
      telefone: usuario.telefone || '',
      email: usuario.email || '',
      morada: usuario.morada || '',
      data_nascimento: usuario.data_nascimento || ''
    });
    setFoto(usuario.foto || '');
    setErro('');
    setEdit(false);
  };

  const sair = async () => {
    try {
      await base44.auth.logout();
    } catch {}
    window.location.href = '/login';
  };

  const eliminarConta = async () => {
    try {
      if (usuario.tipo === 'prestador') {
        const ps = await base44.entities.Prestador.filter({ usuario: usuario.id });
        for (const p of ps) {
          try { await base44.entities.Prestador.delete(p.id); } catch {}
        }
      }
      try { await base44.entities.Usuario.delete(usuario.id); } catch {}
    } catch {}
    try { await base44.auth.logout(); } catch {}
    window.location.href = '/register';
  };

  if (!usuario) return null;

  const membroDesde = usuario.created_date
    ? new Date(usuario.created_date).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })
    : '—';

  const Campo = ({ label, value, icon: Icon, editable, type = 'text', field }) => (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
        {edit && editable ? (
          <input
            type={type}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full text-sm text-slate-900 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
          />
        ) : (
          <p className="text-sm text-slate-900 truncate">{value || '—'}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 pt-4 pb-2 flex items-center justify-between">
        <h1 className="font-semibold text-slate-900 text-lg">Perfil</h1>
        {edit ? (
          <button onClick={cancelar} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" /> Cancelar
          </button>
        ) : (
          <button onClick={() => setEdit(true)} className="flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}
      </div>

      <main className="max-w-lg mx-auto px-5 pb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-4 border-white shadow-lg">
              {foto ? (
                <Image src={foto} fittingType="fill" className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-slate-300" />
                </div>
              )}
            </div>
            {edit && (
              <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center cursor-pointer shadow-md border-2 border-white">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && uploadFoto(e.target.files[0])}
                />
              </label>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <p className="font-semibold text-slate-900">{usuario.nome}</p>
            {usuario.tipo === 'prestador' && <BadgeCheck className="w-4 h-4 text-blue-500" />}
          </div>
          <span className="text-xs text-slate-400 capitalize mt-0.5">{usuario.tipo}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 px-4">
          <Campo label="Nome" value={form.nome} icon={User} editable field="nome" />
          <Campo label="Telefone" value={form.telefone} icon={Phone} editable field="telefone" />
          <Campo label="Email" value={form.email} icon={Mail} editable type="email" field="email" />
          <Campo label="Morada" value={form.morada} icon={MapPin} editable field="morada" />
          <Campo label="Data de nascimento" value={form.data_nascimento} icon={Calendar} editable type="date" field="data_nascimento" />
          <Campo label="Tipo de conta" value={usuario.tipo} icon={BadgeCheck} />
          <Campo label="Membro desde" value={membroDesde} icon={Calendar} />
        </div>

        {usuario.tipo === 'prestador' && prestador && (
          <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mt-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Profissões</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-medium capitalize">
                <BadgeCheck className="w-3 h-3" /> {prestador.categoria}
              </span>
              {(prestador.profissoes_extra || []).map((p, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs capitalize">{p}</span>
              ))}
            </div>
          </div>
        )}

        {erro && <p className="text-sm text-red-500 mt-3">{erro}</p>}

        {edit && (
          <Button onClick={guardar} disabled={saving} className="w-full h-11 rounded-xl mt-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : ok ? <Check className="w-4 h-4 mr-2" /> : null}
            {saving ? 'A guardar...' : ok ? 'Guardado!' : 'Guardar alterações'}
          </Button>
        )}

        <Link to="/termos-uso" className="block text-center text-sm text-slate-400 hover:text-slate-900 mt-6">
          Termos de Uso e políticas da Kolmi
        </Link>

        <div className="mt-6 border-t border-slate-100 pt-4 flex justify-center">
          <button
            onClick={() => setLogoutOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-red-600 hover:bg-red-100 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Sair</span>
          </button>
        </div>

        <button
          onClick={() => setDeleteOpen(true)}
          className="block mx-auto mt-4 text-xs text-slate-400 hover:text-red-500 underline"
        >
          Eliminar conta
        </button>
      </main>

      {logoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setLogoutOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">Sair da conta</p>
            <p className="text-sm text-slate-500 mb-5">Queres mesmo sair da tua conta?</p>
            <div className="flex gap-3">
              <Button onClick={() => setLogoutOpen(false)} variant="outline" className="flex-1 h-11 rounded-xl">
                Cancelar
              </Button>
              <Button onClick={sair} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600">
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">Eliminar conta</p>
            <p className="text-sm text-slate-500 mb-5">
              Esta ação é permanente. Os teus dados serão removidos e não poderás entrar novamente com esta conta.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setDeleteOpen(false)} variant="outline" className="flex-1 h-11 rounded-xl">
                Cancelar
              </Button>
              <Button onClick={eliminarConta} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700">
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}