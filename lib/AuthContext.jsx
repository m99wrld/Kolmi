// ============================================================================
// XPay — AuthContext (Firebase)
// ----------------------------------------------------------------------------
// Substitui o AuthContext original que dependia do SDK do Base44 e da API
// de "public settings". Com o Firebase, o estado de autenticação vem do
// onAuthStateChanged e não há gateway do Base44 para verificar.
// ============================================================================

import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, auth as fbAuth } from '@/api/firebase';
import { getRedirectResult } from 'firebase/auth';
import { createUsuarioIfNeeded } from '@/lib/usuarioDoc';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // No Base44 não existe mais gateway de "public settings" — o app é
      // autônomo. Carregamos direto o estado de autenticação do Firebase.
      await checkUserAuth();
      setAppPublicSettings({ id: 'xpay-app', public_settings: {} });
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = () => new Promise((resolve) => {
    // Quando o login usa redirect (popup bloqueado, Google ou telefone), o
    // retorno traz o usuário aqui — lemos o resultado uma única vez e
    // garantimos que o documento em `usuario` exista no Firestore.
    (async () => {
      try {
        const result = await getRedirectResult(fbAuth);
        if (result) {
          const u = result.user;
          await createUsuarioIfNeeded({ uid: u.uid, phoneNumber: u.phoneNumber || '' });
          await base44.auth.me(); // sincroniza o estado
        }
      } catch (e) {
        console.error('Redirect result failed:', e);
      }
    })();
    // Observa o estado de autenticação do Firebase (persistente entre recargas).
    // O onAuthStateChanged SEMPRE dispara pelo menos uma vez com o estado
    // atual no momento da inscrição — por isso NÃO usamos timeout cego:
    // um timeout cego marcava authChecked=true antes do login por SMS
    // completar e devolvia o usuário à tela de login.
    const unsubscribe = base44.auth.onAuthChange(async (fbUser) => {
      setIsLoadingAuth(true);
      if (fbUser) {
        try {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          setIsAuthenticated(true);
          setAuthError(null);
        } catch (error) {
          console.error('User auth check failed:', error);
          setIsAuthenticated(false);
          setUser(null);
          if (error.status === 401 || error.status === 403) {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else {
            setAuthError({
              type: 'unknown',
              message: error.message || 'Failed to load user'
            });
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
      unsubscribe();
      resolve();
    });
  });

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
