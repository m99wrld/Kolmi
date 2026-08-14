import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/firebase';
import { useAuth } from '@/lib/AuthContext';
import Onboarding from '@/components/Onboarding';
import KeepAliveOutlet from '@/components/KeepAliveOutlet';
import HeaderGlobal from '@/components/HeaderGlobal';
import {
  Home as HomeIcon,
  Search,
  Bell,
  MessageCircle,
  User,
  LayoutDashboard,
  Power
} from 'lucide-react';

const HEADER_ROUTES = ['/', '/chat', '/notificacoes', '/perfil'];

export default function Layout() {
  const { user } = useAuth();
  const [usuario, setUsuario] = useState(null);
  const [prestador, setPrestador] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const load = async () => {
    if (!user) return;
    try {
      const us = await base44.entities.Usuario.filter({ created_by_id: user.id });
      const u = us[0] || null;
      setUsuario(u);
      if (u && u.tipo === 'prestador') {
        const ps = await base44.entities.Prestador.filter({ usuario: u.id });
        setPrestador(ps[0] || null);
      } else {
        setPrestador(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!usuario) return <Onboarding user={user} onDone={load} />;

  const isPrestador = usuario.tipo === 'prestador';
  const pathname = location.pathname;
  const showGlobalHeader = !isPrestador && HEADER_ROUTES.includes(pathname);

  const navCliente = [
    { to: '/', label: 'Início', icon: HomeIcon },
    { to: '/busca-prestadores', label: 'Buscar', icon: Search },
    { to: '/chat', label: 'Chat', icon: MessageCircle },
    { to: '/perfil', label: 'Perfil', icon: User }
  ];
  const navPrestador = [
    { to: '/', label: 'Início', icon: HomeIcon },
    { to: '/painel-prestador', label: 'Painel', icon: LayoutDashboard },
    { to: '/gerenciar-disponibilidade', label: 'Disponível', icon: Power },
    { to: '/notificacoes', label: 'Alertas', icon: Bell },
    { to: '/perfil', label: 'Perfil', icon: User }
  ];
  const navItems = isPrestador ? navPrestador : navCliente;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {showGlobalHeader && <HeaderGlobal usuario={usuario} />}
      <KeepAliveOutlet context={{ usuario, prestador, reload: load }} />

      <nav className="fixed bottom-4 inset-x-0 z-30 px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="relative max-w-lg mx-auto">
          <div className="relative bg-white rounded-full shadow-lg shadow-slate-300/40 border border-slate-100 flex items-center justify-around py-2 px-3 transition-all duration-300">
            {navItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-all duration-300 ${
                    active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-all duration-300 ${active ? 'stroke-[2.5]' : ''}`} />
                  <span className="text-[9px] font-medium whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>

        </div>
      </nav>
    </div>
  );
}