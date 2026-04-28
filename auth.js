import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

loginBtn.addEventListener("click", async () => {
  authMsg.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value.trim();
  if (!email || !senha) return authMsg.textContent = "Informe e-mail e senha.";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    await cred.user.reload();
    if (!cred.user.emailVerified) {
      await signOut(auth);
      alert("E-mail não verificado. Confira sua caixa de entrada."); // Apenas aqui
      return;
    }
    initUser(cred.user);
  } catch (e) {
    authMsg.textContent = "Erro no login: " + (e.message || e);
  }
});

export async function login(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  await cred.user.reload();

  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw new Error("EMAIL_NAO_VERIFICADO");
  }

  return cred.user;
}
