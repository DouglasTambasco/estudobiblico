import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

export async function login(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  await cred.user.reload();

  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw new Error("EMAIL_NAO_VERIFICADO");
  }

  return cred.user;
}

export async function login(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  await cred.user.reload();

  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw new Error("EMAIL_NAO_VERIFICADO");
  }

  return cred.user;
}
