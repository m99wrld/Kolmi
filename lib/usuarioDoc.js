// ============================================================================
// XPay — usuarioDoc helper
// ----------------------------------------------------------------------------
// Garante que o documento do usuário exista na coleção `usuario` do Firestore
// assim que alguém faz login (email, Google ou telefone). Se o documento já
// existir, apenas atualiza o phoneNumber mais recente.
// ============================================================================
import { base44 } from "@/api/firebase";

export async function createUsuarioIfNeeded({ uid, phoneNumber }) {
  try {
    // Procura o documento existente pelo uid do Firebase (não pelo docId):
    // o onboarding cria o doc com ID automático, então get(uid) nunca achava
    // e gerava um documento duplicado a cada login.
    const existing = (await base44.entities.Usuario.filter({ id: uid }, null, 1))[0];
    if (existing) {
      // Atualiza o telefone se mudou (ex.: login por SMS primeiro)
      const patch = {};
      if (phoneNumber && existing.phoneNumber !== phoneNumber) patch.phoneNumber = phoneNumber;
      if (Object.keys(patch).length > 0) {
        await base44.entities.Usuario.update(existing.id, patch);
      }
      return;
    }
    const now = new Date().toISOString();
    // Cria com docId = uid (padrão do Base44), garantindo unicidade e
    // permitindo a busca direta por Usuario.get(uid).
    await base44.entities.Usuario.create({
      id: uid,
      created_by_id: uid,
      created_date: now,
      updated_date: now,
      phoneNumber: phoneNumber || "",
      email: "",
      nome: "",
      tipo: "cliente",
      ativo: true,
    });
  } catch (err) {
    console.error("Erro ao garantir documento usuario:", err);
  }
}
