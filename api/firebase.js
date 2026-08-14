// ============================================================================
// XPay — Motor Firebase (substitui o @base44/sdk)
// ----------------------------------------------------------------------------
// Este módulo substitui o antigo `base44Client.js`. Expõe uma API compatível:
//   base44.auth.*              → Firebase Authentication (email/senha)
//   base44.entities.<Coleção>  → Firestore (get, create, update, delete,
//                                filter, subscribe) com created_date/
//                                updated_date automáticos
//   base44.integrations.Core.UploadFile → Firebase Storage
// Coleções do Firestore: usuario, prestador, pedido, avaliacao, mensagem
// ============================================================================

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  onAuthStateChanged,
  updatePassword as fbUpdatePassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZnmqwKkJl6DnVZ79A-3KlPule0sJW5VU",
  authDomain: "xpay-app-c7c98.firebaseapp.com",
  projectId: "xpay-app-c7c98",
  storageBucket: "xpay-app-c7c98.firebasestorage.app",
  messagingSenderId: "521658878929",
  appId: "1:521658878929:web:a90789ffab9e86b0982ef0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

if (typeof window !== "undefined" && window.__FIRESTORE_EMULATOR__) {
  connectFirestoreEmulator(db, "localhost", 8080);
}

// ----------------------------------------------------------------------------
// Entidades (Firestore)
// ----------------------------------------------------------------------------

/**
 * Normaliza filtros: { id: "x" } usa where('created_by_id', ...) como no
 * Base44, que usa created_by_id como alias de id nas consultas.
 */
function buildQuery(collectionName, filterObj, orderField, limitCount) {
  let q = collection(db, collectionName);
  const constraints = [];
  if (filterObj) {
    for (const [key, value] of Object.entries(filterObj)) {
      const field = key === "id" ? "created_by_id" : key;
      constraints.push(where(field, "==", value));
    }
  }
  if (orderField) {
    const dir = orderField.startsWith("-") ? "desc" : "asc";
    const field = orderField.startsWith("-") ? orderField.slice(1) : orderField;
    constraints.push(orderBy(field, dir));
  } else if (!filterObj) {
    // Sem filtro, ordena pela data (não precisa de índice composto).
    // Com filtro, NÃO ordena por created_date: isso exigiria um índice
    // composto e bloqueava as queries no Firestore. A ordenação fica a
    // cargo de quem chama quando for realmente necessária.
  }
  if (limitCount) constraints.push(limit(limitCount));
  return query(q, ...constraints);
}

function buildEntityApi(collectionName) {
  return {
    // GET
    get: async (id) => {
      const snap = await getDoc(doc(db, collectionName, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : undefined;
    },

    // CREATE
    // `created_by_id` sempre recebe o uid do usuário autenticado (como no
    // Base44), para que os filtros `where('created_by_id','==',user.id)`
    // encontrem os documentos do usuário logado. No modo de teste (SMS
    // indisponível), o uid vem da sessão local em localStorage, caso o
    // auth.currentUser real ainda não exista.
    create: async (data) => {
      const ref = doc(collection(db, collectionName));
      const now = new Date().toISOString();
      const owner =
        auth.currentUser?.uid || readTestSession()?.uid || ref.id;
      const payload = {
        ...data,
        created_by_id: owner,
        created_date: now,
        updated_date: now,
      };
      await setDoc(ref, payload);
      return { id: ref.id, ...payload };
    },

    // UPDATE
    update: async (id, data) => {
      const ref = doc(db, collectionName, id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return undefined;
      const merged = { ...snap.data(), ...data, updated_date: new Date().toISOString() };
      await updateDoc(ref, merged);
      return { id, ...merged };
    },

    // DELETE
    delete: async (id) => {
      await deleteDoc(doc(db, collectionName, id));
      return true;
    },

    // FILTER(filter, orderField?, limitCount?)
    // Envolto em `promiseWithTimeout` (30s): se o Firestore nunca responder
    // (rede instável, API key inválida, permissões), a query falha com um
    // erro claro em vez de deixar a UI presa num loading infinito.
    filter: async (filterObj, orderField, limitCount) => {
      const snap = await promiseWithTimeout(
        getDocs(buildQuery(collectionName, filterObj, orderField, limitCount)),
        30000,
        "A ligação ao servidor demorou demasiado tempo. Tenta novamente.",
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // SUBSCRIBE(callback) — tempo real via onSnapshot
    subscribe: (callback) => {
      return onSnapshot(collection(db, collectionName), (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type === "added" || change.type === "modified") {
            callback({ data: { id: change.doc.id, ...change.doc.data() } });
          }
        }
      });
    },
  };
}

// ----------------------------------------------------------------------------
// Auth
// ----------------------------------------------------------------------------
// Phone OTP (sendOtp/verifyOtp/resendOtp) está definido em phoneAuthApi abaixo
// e espalhado no authApi via spread.
let recaptchaVerifier = null;

function createRecaptchaVerifier() {
  // Descarta a instância anterior — o RecaptchaVerifier só pode ser usado UMA vez
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (_) {
      /* ignore */
    }
    recaptchaVerifier = null;
  }
  let container = document.getElementById("recaptcha-container");
  if (!container) {
    // ReCaptcha invisível: cria um elemento oculto para o SDK montar
    container = document.createElement("div");
    container.id = "recaptcha-container";
    container.style.position = "absolute";
    container.style.width = "0";
    container.style.height = "0";
    container.style.overflow = "hidden";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => undefined,
    "expired-callback": () => undefined,
  });
  return recaptchaVerifier;
}

// Modo de teste: número + código pré-registrados no provedor Smartphone do
// Firebase (Authentication → Método de login → Smartphone → números de teste).
// Com ele o login funciona instantaneamente sem SMS, útil enquanto a região
// +258 não é habilitada no projeto (feito depois pela Firebase CLI).
const TEST_PHONE_NUMBER = import.meta.env.VITE_TEST_PHONE_NUMBER || "+258878415395";
const TEST_SMS_CODE = import.meta.env.VITE_TEST_SMS_CODE || "123456";
const TEST_MODE = import.meta.env.VITE_TEST_MODE === "true";

const phoneAuthApi = {
  /** Envia o código SMS para o número. Retorna o confirmationResult para
   *  confirmar depois com o código de 6 dígitos. */
  sendOtp: async (phoneNumber) => {
    // Normaliza: garantir prefixo + (ex.: 878415395 → +258878415395)
    const number = phoneNumber.includes("+") ? phoneNumber : `+258${phoneNumber}`;

    if (TEST_MODE && number === TEST_PHONE_NUMBER) {
      // Em TEST_MODE o login é instantâneo (sem SMS e sem recaptcha):
      // descarta qualquer verifier antigo para não montar o widget do
      // reCAPTCHA (que ficava pendente e "travava" o botão em
      // "Enviando código...") e usa o caminho real do Firebase — se o
      // número de teste estiver registrado no console do Firebase
      // (Authentication > Phone > test numbers), o confirm funciona de
      // verdade e a sessão persiste.
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (_) {
          /* ignore */
        }
        recaptchaVerifier = null;
      }
      try {
        const real = await promiseWithTimeout(
          signInWithPhoneNumber(auth, number, null),
          20000,
          "Tempo limite ao iniciar o login com o Firebase.",
        );
        window.__confirmationResult = {
          source: real,
          confirm: async (code) => {
            if (code !== TEST_SMS_CODE) {
              throw new Error("Código incorreto. Use " + TEST_SMS_CODE + " neste modo de teste.");
            }
            return real.confirm(TEST_SMS_CODE);
          },
        };
        return { phoneNumber: number, confirmationId: true, testMode: true };
      } catch (fbErr) {
        // Se o Firebase rejeitar (ex.: região não habilitada —
        // auth/operation-not-allowed) ou a chamada ficar presa,
        // cai num modo de sessão local que espelha o estado de
        // autenticação (dev only). A sessão real volta a funcionar
        // automaticamente quando o número de teste estiver registrado
        // e a região habilitada no console do Firebase.
        console.warn("[Firebase] Phone provider indisponível; usando sessão local de teste:", fbErr.code || fbErr.message);
        recaptchaVerifier = null;
        window.__confirmationResult = null;
        const fakeUser = { uid: "test", phoneNumber: number };
        // A sessão de teste só é criada quando o código for confirmado
        // (verifyOtp), nunca ao enviar o OTP — caso contrário o usuário
        // ficaria autenticado antes de digitar o código.
        window.__fakeTestUser = fakeUser;
        window.__confirmationResult = {
          confirm: async (code) => {
            if (code !== TEST_SMS_CODE) {
              throw new Error("Código incorreto. Use " + TEST_SMS_CODE + " neste modo de teste.");
            }
            // Confirmação bem-sucedida: o usuário precisa de um uid
            // real do Firebase para que as regras do Firestore
            // (`request.auth.uid != null`) autorizem as escritas do
            // perfil. Tenta em cascata: (1) login anónimo; (2) email/
            // senha do provedor de teste; (3) sessão local de reserva.
            let realUser = fakeUser;
            try {
              try {
                realUser = (await signInAnonymously(auth)).user;
              } catch {
                realUser = (await createTestAccount(number)).user;
              }
              // Regista o número de telefone no documento de conta
              realUser.updateProfile?.({ displayName: "Teste Kolmi" });
            } catch (_) {
              writeTestSession(fakeUser);
            }
            window.__fakeTestUser = null;
            return { user: realUser };
          },
        };
        return { phoneNumber: number, confirmationId: true, testMode: true };
      }
    }

    let confirmationResult;
    const appVerifier = createRecaptchaVerifier();
    try {
      confirmationResult = await promiseWithTimeout(
        signInWithPhoneNumber(auth, number, appVerifier),
        20000,
        "O Firebase demorou demais para responder. Verifique a conexão e tente novamente.",
      );
    } catch (err) {
      // Limpa para que a próxima tentativa crie um verifier fresco
      try {
        appVerifier.clear();
      } catch (_) {
        /* ignore */
      }
      recaptchaVerifier = null;
      throw err;
    }
    window.__confirmationResult = confirmationResult;
    return { phoneNumber: number, confirmationId: true };
  },

  /** Confirma o código SMS recebido. */
  verifyOtp: async (otpCode) => {
    const confirmationResult = window.__confirmationResult;
    if (!confirmationResult) throw new Error("Envie o código primeiro.");
    let cred;
    try {
      cred = await confirmationResult.confirm(otpCode);
    } catch (err) {
      // Propaga o erro do Firebase (ex.: código incorreto/expirado) em vez
      // de cair num usuário fictício — isso era a causa de loops pós-OTP.
      throw err;
    }
    if (!cred?.user) {
      throw new Error("Verificação falhou: tente reenviar o código.");
    }
    // Limpa para o próximo fluxo
    window.__confirmationResult = null;
    return {
      id: cred.user.uid,
      phoneNumber: cred.user.phoneNumber || "",
    };
  },

  /** Reenvia o código SMS usando o número armazenado no fluxo. */
  resendOtp: async (phoneNumber) => {
    window.__confirmationResult = null;
    return phoneAuthApi.sendOtp(phoneNumber);
  },
};

/** Conta de email/senha de teste (TEST_MODE). Cria (ou reutiliza) uma
 *  conta real no Firebase Authentication com uid permanente, de modo
 *  que `request.auth.uid` exista nas regras do Firestore e as escritas
 *  do perfil sejam autorizadas. Determinística: o mesmo número de
 *  telefone sempre gera o mesmo email. */
async function createTestAccount(phoneNumber) {
  // eslint-disable-next-line no-undef
  const { createUserWithEmailAndPassword, signInWithEmailAndPassword } =
    await import("firebase/auth");
  const email = `kolmi+test+${phoneNumber.replace(/[^0-9]/g, "")}@kolmi.app`;
  const password = "KolmiTeste123!";
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    if (err && err.code === "auth/email-already-in-use") {
      return await signInWithEmailAndPassword(auth, email, password);
    }
    throw err;
  }
}

/** Sessão local de teste (TEST_MODE com região de SMS bloqueada). */
const TEST_SESSION_KEY = "xpay_test_session";

/** Rejeita a promessa se `ms` milissegundos se passarem sem resolução. */
function promiseWithTimeout(promise, ms, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function writeTestSession(user) {
  try {
    localStorage.setItem(
      TEST_SESSION_KEY,
      JSON.stringify({ uid: user.uid, phoneNumber: user.phoneNumber || "" }),
    );
  } catch (_) {
    /* localStorage indisponível */
  }
}

function readTestSession() {
  try {
    const raw = localStorage.getItem(TEST_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      uid: data.uid,
      email: null,
      emailVerified: false,
      phoneNumber: data.phoneNumber || null,
      displayName: null,
      metadata: null,
      isAnonymous: false,
    };
  } catch (_) {
    return null;
  }
}

const authApi = {
  ...phoneAuthApi,

  /** Auth do usuário atual (substitui base44.auth.me()) */
  me: async () => {
    const user = auth.currentUser || readTestSession();
    if (!user) throw Object.assign(new Error("Not authenticated"), { status: 401 });
    return {
      id: user.uid,
      email: user.email,
      email_verified: user.emailVerified ?? false,
      phoneNumber: user.phoneNumber || "",
      created_at: user.metadata?.creationTime ?? null,
      full_name: user.displayName || "",
    };
  },

  /** Registo por telefone/SMS OTP — o fluxo está em phoneAuthApi (sendOtp/verifyOtp).
   *  Mantido como atalho para compatibilidade com chamadas antigas: cria a conta
   *  via telefone. O Register.jsx chama base44.auth.sendOtp diretamente. */

  loginWithProvider: async (providerName, returnTo) => {
    if (providerName === "google") {
      const provider = new GoogleAuthProvider();
      // Primeiro tenta popup; se o navegador bloquear (ex.: navegadores
      // automatizados ou iframes), usa o fluxo de redirect (padrão em apps
      // mobile/Flutter também).
      try {
        const cred = await signInWithPopup(auth, provider);
        return {
          id: cred.user.uid,
          email: cred.user.email,
          access_token: cred.user.accessToken || null,
        };
      } catch (err) {
        if (err && (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user")) {
          await signInWithRedirect(auth, provider);
          // O navegador será redirecionado para accounts.google.com e
          // voltará a esta página; o AuthContext lê o resultado do redirect.
          return { redirect: true };
        }
        throw err;
      }
    }
    throw new Error(`Provedor não suportado: ${providerName}`);
  },

  resetPasswordRequest: async (email) => {
    await sendPasswordResetEmail(auth, email);
    return true;
  },

  resetPassword: async ({ resetToken, newPassword }) => {
    // Firebase usa o link de reset que contém o token na URL. O token vindo
    // de ?token= é trocado pela API applyActionCode; aqui aplicamos o código
    // se parecer um action code, senão tentamos atualizar diretamente.
    try {
      if (resetToken) {
        // tenta confirmar o código de ação (o link de reset usa actionCode,
        // que alguns fluxos colocam em resetToken)
        // eslint-disable-next-line no-undef
        const { applyActionCode } = await import("firebase/auth");
        await applyActionCode(auth, resetToken);
      }
    } catch {
      // se não for um action code válido, o reset será feito abaixo apenas
      // se houver sessão de usuário logada (caso raro)
    }
    const user = auth.currentUser;
    if (!user) throw new Error("Faça login primeiro para definir a nova senha.");
    await fbUpdatePassword(user, newPassword);
    return true;
  },

  setToken: (_token) => {
    // Sem efeito: o Firebase Auth gerencia a sessão automaticamente.
  },

  logout: (returnTo) => {
    try {
      localStorage.removeItem(TEST_SESSION_KEY);
    } catch (_) {
      /* ignore */
    }
    const doLogout = async () => {
      await signOut(auth).catch(() => {});
      if (returnTo) window.location.href = returnTo;
    };
    if (returnTo) {
      doLogout();
    } else {
      signOut(auth).catch(() => {});
    }
  },

  redirectToLogin: (returnTo) => {
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  },

  /** Subscrição ao estado de autenticação (usado pelo AuthContext) */
  onAuthChange: (callback) => {
    // Em TEST_MODE, quando o provider de SMS está indisponível (região não
    // habilitada), a sessão vive em localStorage — notifica o callback
    // imediatamente com esse usuário fake para não travar o AuthContext.
    const fbUnsub = onAuthStateChanged(auth, (fbUser) => {
      const finalUser = fbUser || readTestSession();
      callback(finalUser);
      // Se existe uma sessão real do Firebase (ex.: login por Google ou SMS
      // que agora funciona), a sessão local de teste torna-se obsoleta —
      // removê-la evita contas "fantasma" duplicadas em sessões futuras.
      if (fbUser) {
        try {
          const testUser = readTestSession();
          if (testUser && testUser.uid !== fbUser.uid) {
            localStorage.removeItem(TEST_SESSION_KEY);
          }
        } catch (_) {
          /* ignore */
        }
      }
    });
    const testUser = readTestSession();
    if (testUser) callback(testUser);
    return fbUnsub;
  },

  /** Aguarda o estado de autenticação estável (usado pelo AuthContext em
   *  vez de um timeout cego: o Firebase sempre dispara o observador com o
   *  estado atual no momento da inscrição). */
  waitForAuth: () =>
    new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub();
        resolve(auth.currentUser);
      });
    }),

  get currentUser() {
    return auth.currentUser;
  },
};

// ----------------------------------------------------------------------------
// Integrações — Storage
// ----------------------------------------------------------------------------

const uploadFile = async ({ file }) => {
  const ext = file.name.split(".").pop() || "bin";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const r = storageRef(storage, path);
  const snap = await uploadBytes(r, file);
  const url = await getDownloadURL(snap.ref);
  return { file_url: url, storagePath: path };
};

// ----------------------------------------------------------------------------
// Exportar no mesmo formato usado por todos os componentes: base44.{auth,
// entities.<X>, integrations.Core.UploadFile}
// ----------------------------------------------------------------------------

export const base44 = {
  auth: authApi,
  entities: {
    Avaliacao: buildEntityApi("avaliacao"),
    Mensagem: buildEntityApi("mensagem"),
    Pedido: buildEntityApi("pedido"),
    Prestador: buildEntityApi("prestador"),
    User: buildEntityApi("user"),
    Usuario: buildEntityApi("usuario"),
  },
  integrations: {
    Core: { UploadFile: uploadFile },
  },
  // Atalho usado em alguns lugares: import direto de createClient não existe
  // mais, mas mantemos referenciais úteis:
  db,
  authInstance: auth,
};

export { auth, db, storage };
export default base44;
