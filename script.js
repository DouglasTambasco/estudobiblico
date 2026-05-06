// ============================================================
// IMPORTAÇÕES
// ============================================================

import { citacoes } from "./citacoes.js";
import { carregarBiblia, listaLivros, biblia, localizarLivro } from "./biblia.js";
import { imprimirMarcacoes } from "./print.js";

await carregarBiblia();

import {
  auth, db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  collection, doc,
  setDoc, updateDoc, deleteDoc,
  getDocs, query, where,
  serverTimestamp
} from "./firebase.js";


// ============================================================
// ESTADO GLOBAL
// ============================================================

/** Versículos selecionados pelo usuário para salvar */
let marcacoesSelecionadas = [];

/**
 * Controla o livro e capítulo atualmente exibidos,
 * bem como os limites de navegação.
 */
const estadoLeitura = {
  livroObj: null,
  capAtual: null,
  capMin: 1,
  capMax: 1
};


// ============================================================
// REFERÊNCIAS AO DOM
// ============================================================

const authMsg   = document.getElementById("auth-message");
const loginBtn  = document.getElementById("login-btn");
const cadastroBtn = document.getElementById("cadastro-btn");
const logoutBtn = document.getElementById("logout-btn");
const themeBtn  = document.getElementById("theme-toggle-square");

const navContainer = document.getElementById("nav-capitulos");
const btnAnterior  = document.getElementById("btn-anterior");
const btnProximo   = document.getElementById("btn-proximo");


// ============================================================
// TEMA (MODO ESCURO / CLARO)
// ============================================================

// Aplica o tema salvo ao carregar a página
if (localStorage.getItem("modoEscuro") === "on") {
  document.body.classList.add("night");
}

themeBtn.addEventListener("click", () => {
  const nightMode = document.body.classList.toggle("night");
  localStorage.setItem("modoEscuro", nightMode ? "on" : "off");
});


// ============================================================
// AUTENTICAÇÃO — VALIDAÇÃO DE E-MAIL
// ============================================================

/**
 * Valida o e-mail via API externa (AbstractAPI).
 * Retorna true se válido, false se inválido, null em caso de erro.
 */
async function isValidEmailAPI(email) {
  const apiKey = "0737d275d3bc4309b26d6c9fbb119f19";
  const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return (
      data.is_valid_format?.value &&
      !data.is_disposable_email?.value &&
      data.deliverability === "DELIVERABLE"
    );
  } catch {
    return null;
  }
}

/**
 * Validação local de e-mail: bloqueia domínios temporários conhecidos.
 * Usado como fallback quando a API não responde.
 */
function isValidEmailFallback(email) {
  const bloqueados = ["mailinator.com", "yopmail.com", "tempmail.com", "guerrillamail.com"];
  const dominio = email.split("@")[1]?.toLowerCase();
  return dominio && !bloqueados.includes(dominio);
}


// ============================================================
// AUTENTICAÇÃO — CADASTRO
// ============================================================

cadastroBtn.addEventListener("click", async () => {
  authMsg.textContent = "";
  const nome  = document.getElementById("cadastro-nome").value.trim();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value.trim();

  if (!nome) return authMsg.textContent = "Por favor, insira seu nome.";

  authMsg.textContent = "Validando e-mail...";
  let valido = await isValidEmailAPI(email);
  if (valido === null) valido = isValidEmailFallback(email);
  if (!valido) {
    alert("E-mail inválido ou temporário.");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    await cred.user.reload();
    await sendEmailVerification(cred.user);

    alert("Conta criada com sucesso! Foi enviado um e-mail para verificação. Confira sua caixa de entrada.");
    authMsg.textContent = "Cadastro realizado! Verifique seu e-mail.";

    await signOut(auth);
  } catch (e) {
    authMsg.textContent = "Erro no cadastro: " + (e.message || e);
  }
});


// ============================================================
// AUTENTICAÇÃO — LOGIN (E-MAIL / SENHA)
// ============================================================

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
      alert("E-mail não verificado. Confira sua caixa de entrada.");
      return;
    }

    initUser(cred.user);
  } catch (e) {
    authMsg.textContent = "Erro no login: " + (e.message || e);
  }
});


// ============================================================
// AUTENTICAÇÃO — LOGIN COM GOOGLE
// ============================================================

const googleBtn = document.getElementById("login-google");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      authMsg.textContent = "Erro no login com Google: " + (err.message || err);
    }
  });
}


// ============================================================
// AUTENTICAÇÃO — REDEFINIR SENHA
// ============================================================

const resetSenhaBtn = document.getElementById("reset-senha-btn");

if (resetSenhaBtn) {
  resetSenhaBtn.addEventListener("click", async () => {
    authMsg.textContent = "";
    authMsg.style.color = "";

    let email = prompt("Digite o e-mail cadastrado para redefinir a senha:");
    if (!email) return;
    email = email.trim().toLowerCase();

    try {
      // Envia mesmo com proteção de enumeração ativa no Firebase
      await sendPasswordResetEmail(auth, email);
      authMsg.style.color = "green";
      authMsg.textContent = "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.";
    } catch (e) {
      console.error("[RESET] Erro:", e);
      const code = e.code || "";

      const erros = {
        "auth/invalid-email":         { cor: "red", msg: "E-mail inválido. Verifique e tente novamente." },
        "auth/operation-not-allowed": { cor: "red", msg: "Login por e-mail/senha está desativado no projeto. Ative em Authentication > Sign-in method." },
        "auth/too-many-requests":     { cor: "red", msg: "Muitas tentativas. Tente novamente em alguns minutos." },
        "auth/network-request-failed":{ cor: "red", msg: "Falha de rede. Verifique sua conexão." },
        // Com proteção de enumeração, trata user-not-found como sucesso para não vazar existência da conta
        "auth/user-not-found":        { cor: "green", msg: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." },
      };

      const resposta = erros[code] || { cor: "red", msg: "Não foi possível enviar o e-mail de redefinição agora. Tente mais tarde." };
      authMsg.style.color = resposta.cor;
      authMsg.textContent = resposta.msg;
    }
  });
}


// ============================================================
// AUTENTICAÇÃO — LOGOUT E SESSÃO ATIVA
// ============================================================

logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => location.reload());
});

/**
 * Monitora o estado da sessão.
 * Usuários não verificados não têm acesso ao conteúdo principal.
 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await user.reload();
    if (user.emailVerified) {
      initUser(user);
    } else {
      // Usuário existe mas ainda não verificou o e-mail
      document.getElementById("conteudo").classList.add("hidden");
      document.getElementById("auth-area").classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  } else {
    // Sem sessão: exibe área de login
    document.getElementById("saudacao").classList.add("hidden");
    document.getElementById("auth-area").classList.remove("hidden");
    document.getElementById("conteudo").classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
});


// ============================================================
// INTERFACE — INICIALIZAÇÃO PÓS-LOGIN
// ============================================================

/**
 * Configura a interface para o usuário autenticado:
 * exibe saudação, oculta área de login e revela o conteúdo.
 */
function initUser(user) {
  document.getElementById("saudacao").innerHTML =
    `<img src="https://cdn-icons-png.flaticon.com/128/2600/2600620.png" class="saudacao-icon" />
     Bem-vindo(a), ${user.displayName || user.email}!`;
  document.getElementById("saudacao").classList.remove("hidden");
  document.getElementById("auth-area").classList.add("hidden");
  document.getElementById("conteudo").classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}


// ============================================================
// INTERFACE — MOSTRAR/OCULTAR SENHA
// ============================================================

document.querySelectorAll(".toggle-password").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.getAttribute("data-target"));
    if (!input) return;
    const visivel = input.type !== "password";
    input.type = visivel ? "password" : "text";
    btn.textContent = visivel ? "👁️" : "🙈";
  });
});


// ============================================================
// INTERFACE — ATALHOS DE TECLADO (ENTER)
// ============================================================

// Login
["login-email", "login-senha"].forEach(id => {
  document.getElementById(id).addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); loginBtn.click(); }
  });
});

// Cadastro
["cadastro-nome", "cadastro-email", "cadastro-senha"].forEach(id => {
  document.getElementById(id).addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); cadastroBtn.click(); }
  });
});

// Busca de versículos
["livro", "capitulo"].forEach(id => {
  document.getElementById(id).addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("buscar-btn").click();
    }
  });
});


// ============================================================
// NAVEGAÇÃO — LÓGICA DE CAPÍTULOS E LIVROS
// ============================================================

/**
 * Retorna o número mínimo e máximo de capítulos disponíveis
 * no objeto de livro fornecido.
 */
function limitesCapitulos(livroObj) {
  const caps = (livroObj.capitulos || [])
    .map(c => parseInt(c.capitulo, 10))
    .filter(Number.isFinite);
  return {
    min: Math.min(...caps),
    max: Math.max(...caps)
  };
}

/**
 * Atualiza os botões de navegação (Anterior / Próximo)
 * conforme o capítulo e livro atuais.
 */
function atualizarNavegacao() {
  if (!navContainer) return;

  const ativo = !!estadoLeitura.livroObj;
  navContainer.classList.toggle("hidden", !ativo);
  if (!ativo) return;

  const estaNoPrimeiro = estadoLeitura.capAtual <= estadoLeitura.capMin;
  const estaNoUltimo   = estadoLeitura.capAtual >= estadoLeitura.capMax;

  btnAnterior.textContent = estaNoPrimeiro ? "⏪ Livro anterior" : "◀️ Anterior";
  btnProximo.textContent  = estaNoUltimo   ? "Próximo livro ⏩" : "Próximo ▶️";

  btnAnterior.dataset.tipo = estaNoPrimeiro ? "livroAnterior" : "capAnterior";
  btnProximo.dataset.tipo  = estaNoUltimo   ? "livroProximo"  : "capProximo";
}

if (btnAnterior && btnProximo) {
  btnAnterior.addEventListener("click", () => {
    if (!estadoLeitura.livroObj) return;

    if (btnAnterior.dataset.tipo === "capAnterior") {
      mostrarCapitulo(estadoLeitura.livroObj, estadoLeitura.capAtual - 1);
    } else {
      const livros = listaLivros();
      const idx = livros.findIndex(l => l.nome === estadoLeitura.livroObj.nome);
      if (idx > 0) {
        const livroAnterior = livros[idx - 1];
        mostrarCapitulo(livroAnterior, limitesCapitulos(livroAnterior).max);
      }
    }
  });

  btnProximo.addEventListener("click", () => {
    if (!estadoLeitura.livroObj) return;

    if (btnProximo.dataset.tipo === "capProximo") {
      mostrarCapitulo(estadoLeitura.livroObj, estadoLeitura.capAtual + 1);
    } else {
      const livros = listaLivros();
      const idx = livros.findIndex(l => l.nome === estadoLeitura.livroObj.nome);
      if (idx < livros.length - 1) {
        const proximoLivro = livros[idx + 1];
        mostrarCapitulo(proximoLivro, 1);
      }
    }
  });
}


// ============================================================
// LEITURA — RENDERIZAÇÃO DO CAPÍTULO
// ============================================================

/**
 * Exibe os versículos de um capítulo na tela,
 * atualiza o estado de leitura e reconfigura a navegação.
 */
function mostrarCapitulo(livroObj, cap) {
  const user = auth.currentUser;
  const div  = document.getElementById("versiculos");
  const box  = document.getElementById("marcacao-box");

  // Atualiza estado de leitura
  estadoLeitura.livroObj = livroObj;
  estadoLeitura.capAtual = cap;
  const { min, max } = limitesCapitulos(livroObj);
  estadoLeitura.capMin = min;
  estadoLeitura.capMax = max;

  // Sincroniza campos de busca com o capítulo exibido
  document.getElementById("livro").value    = livroObj.nome;
  document.getElementById("capitulo").value = cap;

  // Limpa área de versículos e desmarca seleções anteriores
  div.innerHTML = "";
  box.classList.add("hidden");
  marcacoesSelecionadas = [];

  const capObj = (livroObj.capitulos || []).find(
    c => parseInt(c.capitulo, 10) === parseInt(cap, 10)
  );

  if (!capObj) {
    div.innerHTML = `<p style="color:red;">Não foi possível encontrar ${livroObj.nome} ${cap}.</p>`;
    atualizarNavegacao();
    return;
  }

  // Remove título anterior e insere o novo
  document.getElementById("titulo-capitulo")?.remove();
  const titulo = document.createElement("h2");
  titulo.id = "titulo-capitulo";
  titulo.innerHTML = `📖 ${livroObj.nome} <span>${cap}</span>`;
  titulo.style.cssText = "margin: 10px 0; text-align: center;";
  div.insertAdjacentElement("beforebegin", titulo);

  // Renderiza cada versículo com checkbox de seleção
  capObj.versiculos.forEach(v => {
    const row     = document.createElement("div");
    const chk     = document.createElement("input");
    const sup     = document.createElement("sup");
    const numWrap = document.createElement("div");
    const content = document.createElement("div");

    row.classList.add("versiculo");
    chk.type = "checkbox";
    chk.classList.add("versiculo-checkbox");
    sup.classList.add("num-versiculo");
    sup.textContent = v.versiculo;
    numWrap.classList.add("versiculo-numero");
    numWrap.append(chk, sup);
    content.classList.add("versiculo-conteudo");
    content.textContent = v.texto;
    row.append(numWrap, content);
    div.appendChild(row);

    // Dados que serão salvos se o versículo for selecionado
    const info = {
      uid: user?.uid,
      livro: livroObj.nome,
      capitulo: cap,
      numero: v.versiculo,
      texto: v.texto
    };

    chk.addEventListener("change", () => {
      if (chk.checked) {
        marcacoesSelecionadas.push(info);
      } else {
        marcacoesSelecionadas = marcacoesSelecionadas.filter(x => x.numero !== v.versiculo);
      }
      // Exibe caixa de marcação somente quando há versículos selecionados
      box.classList.toggle("hidden", marcacoesSelecionadas.length === 0);
    });
  });

  atualizarNavegacao();
  titulo.scrollIntoView({ behavior: "smooth", block: "start" });
}


// ============================================================
// LEITURA — BUSCA DE CAPÍTULO
// ============================================================

document.getElementById("buscar-btn").addEventListener("click", () => {
  const livroInputRaw = document.getElementById("livro").value.trim();
  const cap = parseInt(document.getElementById("capitulo").value.trim(), 10);
  const div = document.getElementById("versiculos");
  const user = auth.currentUser;

  if (!user)          return alert("Faça login para continuar.");
  if (!livroInputRaw || !cap) return alert("Informe livro e capítulo.");
  if (!biblia)        return div.innerHTML = `<p style="color:red;">Bíblia ainda não carregada.</p>`;

  const livroObj = localizarLivro(livroInputRaw);
  if (!livroObj) return div.innerHTML = `<p style="color:red;">Não foi possível encontrar "${livroInputRaw}".</p>`;

  mostrarCapitulo(livroObj, cap);
});


// ============================================================
// MARCAÇÕES — SALVAR GRUPO DE VERSÍCULOS
// ============================================================

document.getElementById("salvar-todos").addEventListener("click", async () => {
  const tipo    = document.getElementById("tipo-marcacao").value;
  const coment  = document.getElementById("comentario-geral").value.trim();
  const favorito = document.getElementById("marcar-favorito")?.checked || false;
  const user    = auth.currentUser;

  if (!user)                      return alert("Faça login para continuar.");
  if (!tipo)                      return alert("Selecione uma categoria.");
  if (!marcacoesSelecionadas.length) return alert("Nenhum versículo selecionado.");

  try {
    const refMarc = doc(collection(db, "marcacoes_grupadas"));
    await setDoc(refMarc, {
      uid: user.uid,
      tipo,
      comentario: coment,
      favorito,
      timestamp: serverTimestamp(),
      versiculos: marcacoesSelecionadas.map(v => ({
        livro: v.livro,
        capitulo: v.capitulo,
        numero: v.numero,
        texto: v.texto
      }))
    });

    // Limpa seleção e formulário após salvar
    marcacoesSelecionadas = [];
    document.querySelectorAll(".versiculo-checkbox").forEach(chk => chk.checked = false);
    document.getElementById("tipo-marcacao").value    = "";
    document.getElementById("comentario-geral").value = "";
    document.getElementById("marcacao-box").classList.add("hidden");

    // Exibe a lista de marcações automaticamente
    document.getElementById("versiculos-marcados").classList.remove("hidden");
    await exibirGruposMarcacoes();
  } catch (e) {
    console.error(e);
    alert("Erro ao salvar os versículos agrupados.");
  }
});


// ============================================================
// MARCAÇÕES — EXIBIR GRUPOS SALVOS
// ============================================================

/**
 * Busca no Firestore e renderiza os grupos de marcações do usuário,
 * aplicando os filtros ativos de categoria e livro.
 */
async function exibirGruposMarcacoes() {
  const user       = auth.currentUser;
  const tipoF      = document.getElementById("filtro-marcacao").value;
  const livroF     = document.getElementById("filtro-livro").value.toLowerCase();
  const container  = document.getElementById("lista-marcados");

  container.innerHTML = "";

  if (!user) {
    container.innerHTML = "<p>Faça login para ver suas marcações.</p>";
    return;
  }

  // Monta a query com filtros dinâmicos
  const ref     = collection(db, "marcacoes_grupadas");
  const filtros = [where("uid", "==", user.uid)];
  if (tipoF === "favorito") filtros.push(where("favorito", "==", true));
  else if (tipoF)           filtros.push(where("tipo", "==", tipoF));

  const snap = await getDocs(query(ref, ...filtros));

  if (snap.empty) {
    container.innerHTML = "<p>Nenhuma marcação agrupada.</p>";
    return;
  }

  // Popula o filtro de livros com os valores únicos encontrados
  const livrosUnicos = new Set();
  snap.docs.forEach(docSnap => {
    docSnap.data().versiculos.forEach(v => { if (v.livro) livrosUnicos.add(v.livro); });
  });

  const filtroLivro = document.getElementById("filtro-livro");
  filtroLivro.innerHTML = '<option value="">Todos</option>';
  [...livrosUnicos].sort().forEach(livro => {
    const opt = document.createElement("option");
    opt.value = livro.toLowerCase();
    opt.textContent = livro;
    filtroLivro.appendChild(opt);
  });

  // Aplica filtro por livro (client-side, pois Firestore não suporta facilmente)
  let grupos = snap.docs;
  if (livroF) {
    grupos = grupos.filter(docSnap =>
      docSnap.data().versiculos.some(v => v.livro.toLowerCase() === livroF)
    );
  }

  // Ordena grupos por: livro → capítulo → número do versículo
  grupos.sort((a, b) => {
    function primeiroVerso(docSnap) {
      return docSnap.data().versiculos
        .map(v => ({ livro: v.livro, cap: parseInt(v.capitulo), num: parseInt(v.numero) }))
        .sort((x, y) => x.livro.localeCompare(y.livro) || x.cap - y.cap || x.num - y.num)[0];
    }
    const vA = primeiroVerso(a);
    const vB = primeiroVerso(b);
    return vA.livro.localeCompare(vB.livro) || vA.cap - vB.cap || vA.num - vB.num;
  });

  // Renderiza cada grupo como um card, agrupado por título de livro
  let ultimoLivro = "";

  grupos.forEach(docSnap => {
    const g    = docSnap.data();
    const card = document.createElement("div");
    card.classList.add("versiculo-card", g.tipo);

    // Insere cabeçalho de livro quando muda o livro
    const livroAtual = g.versiculos[0]?.livro;
    if (livroAtual !== ultimoLivro) {
      const h4 = document.createElement("h4");
      h4.textContent = `📖 ${livroAtual.charAt(0).toUpperCase() + livroAtual.slice(1)}`;
      container.appendChild(h4);
      ultimoLivro = livroAtual;
    }

    // Cabeçalho do card: select de categoria (desabilitado por padrão)
    const header = document.createElement("div");
    header.style.marginBottom = "12px";
    header.innerHTML = `
      <p><strong>Categoria: <select class="group-tipo" disabled>
        <option value="promessa"  ${g.tipo === "promessa"  ? "selected" : ""}>Promessa</option>
        <option value="ordem"     ${g.tipo === "ordem"     ? "selected" : ""}>Ordem</option>
        <option value="principio" ${g.tipo === "principio" ? "selected" : ""}>Princípio Eterno</option>
      </select></strong></p>`;

    // Lista de versículos do grupo
    const lista = document.createElement("div");
    g.versiculos.forEach(v => {
      const p = document.createElement("p");
      p.textContent = `${v.livro} ${v.capitulo}:${v.numero} – ${v.texto}`;
      lista.appendChild(p);
    });

    // Área de comentário (somente leitura por padrão)
    const comentEl = document.createElement("textarea");
    comentEl.classList.add("group-comment");
    comentEl.readOnly    = true;
    comentEl.value       = g.comentario;
    comentEl.style.marginTop = "5px";

    // Botões de ação do card
    const actions = document.createElement("div");
    actions.className = "versiculo-actions";
    actions.innerHTML = `
      <button class="btn-edit"           title="Editar grupo">✏️</button>
      <button class="btn-save hidden"    title="Salvar alterações">💾</button>
      <button class="btn-delete"         title="Excluir grupo">🗑️</button>`;

    const editBtn   = actions.querySelector(".btn-edit");
    const saveBtn   = actions.querySelector(".btn-save");
    const deleteBtn = actions.querySelector(".btn-delete");

    // Botão de favorito inserido antes do botão excluir
    const favBtn = document.createElement("button");
    favBtn.className = "btn-save";
    favBtn.title     = "Favoritar";
    favBtn.textContent = g.favorito ? "⭐" : "☆";
    actions.insertBefore(favBtn, deleteBtn);

    // --- Evento: favoritar / desfavoritar ---
    favBtn.addEventListener("click", async () => {
      const novoFav = !g.favorito;
      try {
        await updateDoc(doc(db, "marcacoes_grupadas", docSnap.id), { favorito: novoFav });
        g.favorito = novoFav;
        favBtn.textContent = novoFav ? "⭐" : "☆";
      } catch (e) {
        console.error(e);
        alert("Erro ao favoritar/desfavoritar.");
      }
    });

    // --- Evento: entrar em modo de edição ---
    editBtn.addEventListener("click", () => {
      header.querySelector(".group-tipo").disabled = false;
      comentEl.readOnly = false;
      editBtn.classList.add("hidden");
      saveBtn.classList.remove("hidden");
    });

    // --- Evento: salvar edição ---
    saveBtn.addEventListener("click", async () => {
      const novoTipo   = header.querySelector(".group-tipo").value;
      const novoComent = comentEl.value.trim();
      try {
        await updateDoc(doc(db, "marcacoes_grupadas", docSnap.id), {
          tipo: novoTipo,
          comentario: novoComent
        });
        alert("Grupo atualizado com sucesso!");

        // Retorna ao modo de visualização
        header.querySelector(".group-tipo").disabled = true;
        comentEl.readOnly = true;
        saveBtn.classList.add("hidden");
        editBtn.classList.remove("hidden");
        card.classList.remove("promessa", "ordem", "principio");
        card.classList.add(novoTipo);
      } catch (e) {
        console.error(e);
        alert("Erro ao atualizar grupo.");
      }
    });

    // --- Evento: excluir grupo ---
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Excluir este grupo de marcações?")) return;
      try {
        await deleteDoc(doc(db, "marcacoes_grupadas", docSnap.id));
        await exibirGruposMarcacoes();
      } catch (e) {
        console.error(e);
        alert("Erro ao excluir grupo.");
      }
    });

    card.append(header, lista, comentEl, actions);
    container.appendChild(card);
  });
}


// ============================================================
// MARCAÇÕES — FILTROS E BUSCA TEXTUAL
// ============================================================

document.getElementById("ver-marcados-btn").addEventListener("click", () => {
  const area = document.getElementById("versiculos-marcados");
  area.classList.toggle("hidden");
  exibirGruposMarcacoes();
});

document.getElementById("filtro-marcacao").addEventListener("change", exibirGruposMarcacoes);
document.getElementById("filtro-livro").addEventListener("change", exibirGruposMarcacoes);

// Filtra cards visíveis em tempo real conforme o texto digitado
document.getElementById("buscar-marcados")?.addEventListener("input", () => {
  const termo = document.getElementById("buscar-marcados").value.toLowerCase();

  document.querySelectorAll("#lista-marcados .versiculo-card").forEach(card => {
    const versiculosText  = Array.from(card.querySelectorAll("p")).map(p => p.innerText).join(" ");
    const comentarioText  = card.querySelector(".group-comment")?.value
                         || card.querySelector(".group-comment")?.innerText
                         || "";
    const textoCompleto   = (versiculosText + " " + comentarioText).toLowerCase();
    card.style.display    = textoCompleto.includes(termo) ? "" : "none";
  });
});


// ============================================================
// UTILITÁRIOS — BOTÃO VOLTAR AO TOPO
// ============================================================

const btnTopo = document.getElementById("btn-topo");

window.addEventListener("scroll", () => {
  btnTopo.style.display = window.scrollY > 300 ? "block" : "none";
});

btnTopo.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});


// ============================================================
// RODAPÉ — CITAÇÃO BÍBLICA ALEATÓRIA
// ============================================================

document.getElementById("citacao-biblica").innerHTML =
  `<em><strong>${citacoes[Math.floor(Math.random() * citacoes.length)]}</strong></em>`;


// ============================================================
// IMPRESSÃO
// ============================================================

document.getElementById("btn-imprimir").addEventListener("click", imprimirMarcacoes);
