// 🔥 Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  getFirestore, collection, query, where, getDocs,
  setDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSy_V62ZUXK-2E1H05uTbvLvM9Q6D_Lng",
  authDomain: "estudobiblico-1b794.firebaseapp.com",
  projectId: "estudobiblico-1b794",
  storageBucket: "estudobiblico-1b794.appspot.com",
  messagingSenderId: "92626454313",
  appId: "1:92626454313:web:ac8cbded596cb179265938",
  measurementId: "G-P927QCEMQM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
let marcacoesSelecionadas = [];

// 🎯 Elementos fixos
const authMsg     = document.getElementById("auth-message");
const loginBtn    = document.getElementById("login-btn");
const cadastroBtn = document.getElementById("cadastro-btn");
const logoutBtn   = document.getElementById("logout-btn");
const themeBtn    = document.getElementById("theme-toggle-square");

// 👤 Login
loginBtn.addEventListener("click", async () => {
  authMsg.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value.trim();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    initUser(cred.user);
  } catch (e) {
    authMsg.textContent = "Erro no login: " + e.message;
  }
});

// 🆕 Cadastro
cadastroBtn.addEventListener("click", async () => {
  authMsg.textContent = "";
  const nome  = document.getElementById("cadastro-nome").value.trim();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value.trim();
  if (!nome) return authMsg.textContent = "Por favor, insira seu nome.";
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    initUser(cred.user);
  } catch (e) {
    authMsg.textContent = "Erro no cadastro: " + e.message;
  }
});

// 🔄 Sessão ativa
onAuthStateChanged(auth, user => {
  if (user) initUser(user);
});

// 🚪 Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => location.reload());
});

// 🌗 Alternar tema
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("night");
});

// 🎉 Inicialização pós-login
function initUser(user) {
  document.getElementById("saudacao").innerHTML =
    `<img src="https://cdn-icons-png.flaticon.com/128/2600/2600620.png"
          alt="Ícone usuário"
          class="saudacao-icon" />
     Bem-vindo(a), ${user.displayName || user.email}!`;
  document.getElementById("saudacao").classList.remove("hidden");
  document.getElementById("auth-area").classList.add("hidden");
  document.getElementById("conteudo").classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

// 📖 Buscar versículos
document.getElementById("buscar-btn").addEventListener("click", async () => {
  const livro = document.getElementById("livro").value.trim().toLowerCase();
  const cap   = document.getElementById("capitulo").value.trim();
  const div   = document.getElementById("versiculos");
  const box   = document.getElementById("marcacao-box");

  div.innerHTML = "";
  box.classList.add("hidden");
  marcacoesSelecionadas = [];

  const user = auth.currentUser;
  if (!user) return alert("Faça login para continuar.");

  try {
    const res   = await fetch(`https://bible-api.com/${livro}+${cap}?translation=almeida`);
    const dados = await res.json();

    (dados.verses || []).forEach(v => {
      const row = document.createElement("div");
      row.className = "versiculo";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.style.marginRight = "10px";

      const p = document.createElement("p");
      p.textContent = `${v.verse} – ${v.text}`;

      row.append(chk, p);
      div.appendChild(row);

      const info = {
        uid:      user.uid,
        livro,
        capitulo: parseInt(cap),
        numero:   v.verse,
        texto:    v.text
      };

      chk.addEventListener("change", () => {
        if (chk.checked) {
          marcacoesSelecionadas.push(info);
        } else {
          marcacoesSelecionadas =
            marcacoesSelecionadas.filter(x => x.numero !== v.verse);
        }
        box.classList.toggle("hidden", marcacoesSelecionadas.length === 0);
      });
    });
  } catch (e) {
    div.innerHTML = `<p style="color:red;">Erro: ${e.message}</p>`;
  }
});

// 💾 Salvar marcações agrupadas
document.getElementById("salvar-todos").addEventListener("click", async () => {
  const tipo   = document.getElementById("tipo-marcacao").value;
  const coment = document.getElementById("comentario-geral").value.trim();
  const user   = auth.currentUser;

  if (!user)      return alert("Faça login para continuar.");
  if (!tipo)      return alert("Selecione uma categoria.");
  if (!marcacoesSelecionadas.length)
    return alert("Nenhum versículo selecionado.");

  try {
    const versiculosArray = marcacoesSelecionadas.map(v => ({
      livro:    v.livro,
      capitulo: v.capitulo,
      numero:   v.numero,
      texto:    v.texto
    }));

    await setDoc(
      doc(collection(db, "marcacoes_grupadas")),
      {
        uid:        user.uid,
        tipo,
        comentario: coment,
        versiculos: versiculosArray,
        timestamp:  serverTimestamp()
      }
    );

    alert("Versículos salvos em grupo!");
    document.getElementById("tipo-marcacao").value    = "";
    document.getElementById("comentario-geral").value = "";
    marcacoesSelecionadas = [];
    document.getElementById("marcacao-box").classList.add("hidden");
  } catch (e) {
    console.error(e);
    alert("Erro ao salvar os versículos agrupados.");
  }
});

// 📂 Exibir grupos de marcações (com filtros dinâmicos)
async function exibirGruposMarcacoes() {
  const user      = auth.currentUser;
  const tipoF     = document.getElementById("filtro-marcacao").value;
  const livroF    = document.getElementById("filtro-livro").value.toLowerCase();
  const container = document.getElementById("lista-marcados");
  container.innerHTML = "";

  if (!user) {
    container.innerHTML = "<p>Faça login para ver suas marcações.</p>";
    return;
  }

  const ref  = collection(db, "marcacoes_grupadas");
  const q    = tipoF
    ? query(ref, where("uid","==",user.uid), where("tipo","==",tipoF))
    : query(ref, where("uid","==",user.uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = "<p>Nenhuma marcação agrupada.</p>";
    return;
  }

  // 🔄 Gerar filtro de livros dinamicamente
  const livrosUnicos = new Set();
  snap.docs.forEach(docSnap => {
    const versiculos = docSnap.data().versiculos;
    versiculos.forEach(v => {
      if (v.livro) livrosUnicos.add(v.livro);
    });
  });

  const filtroLivro = document.getElementById("filtro-livro");
  filtroLivro.innerHTML = '<option value="">Todos</option>';
  [...livrosUnicos].sort().forEach(livro => {
    const opt = document.createElement("option");
    opt.value = livro.toLowerCase();
    opt.textContent = livro;
    filtroLivro.appendChild(opt);
  });

  // 🔍 Aplicar filtro por livro
  let grupos = snap.docs;
  if (livroF) {
    grupos = grupos.filter(docSnap => {
      const versiculos = docSnap.data().versiculos;
      return versiculos.some(v => v.livro.toLowerCase() === livroF);
    });
  }

  let ultimoLivro = "";

grupos.sort((a, b) => {
  const livroA = a.data().versiculos[0]?.livro.toLowerCase() || "";
  const livroB = b.data().versiculos[0]?.livro.toLowerCase() || "";
  return livroA.localeCompare(livroB);
});
  grupos.forEach(docSnap => {
    const g    = docSnap.data();
    const card = document.createElement("div");
    card.classList.add("versiculo-card", g.tipo);

    const livroAtual = g.versiculos[0]?.livro;
    if (livroAtual !== ultimoLivro) {
      const h4 = document.createElement("h4");
      h4.textContent = `📖 ${livroAtual.charAt(0).toUpperCase() + livroAtual.slice(1)}`;
      container.appendChild(h4);
      ultimoLivro = livroAtual;
    }

    // Header (categoria e data)
    const header = document.createElement("div");
    header.innerHTML = `
      <p><strong>Categoria:</strong></p>
      <select class="group-tipo" disabled>
        <option value="promessa"  ${g.tipo==="promessa"  ? "selected":""}>Promessa</option>
        <option value="ordem"     ${g.tipo==="ordem"     ? "selected":""}>Ordem</option>
        <option value="principio" ${g.tipo==="principio" ? "selected":""}>Princípio Eterno</option>
      </select>
      <p style="margin-top:8px;"><strong>Data:</strong> ${g.timestamp?.toDate().toLocaleDateString()||"-"}</p>
    `;
    header.style.marginBottom = "12px";

    // Lista de versos
    const lista = document.createElement("div");
    g.versiculos.forEach(v => {
      const p = document.createElement("p");
      p.textContent = `${v.livro} ${v.capitulo}:${v.numero} – ${v.texto}`;
      lista.appendChild(p);
    });

    // Comentário geral
    const comentEl = document.createElement("textarea");
    comentEl.classList.add("group-comment");
    comentEl.readOnly       = true;
    comentEl.value          = g.comentario;
    comentEl.style.marginTop = "12px";

    // Ações
    const actions = document.createElement("div");
    actions.className = "versiculo-actions";
    actions.innerHTML = `
      <button class="btn-edit" title="Editar grupo">✏️</button>
      <button class="btn-save-edit hidden" title="Salvar alterações">💾</button>
      <button class="btn-delete" title="Excluir grupo">🗑️</button>
    `;

    const tipoSelect  = header.querySelector(".group-tipo");
    const saveBtn     = actions.querySelector(".btn-save-edit");
    const editBtn     = actions.querySelector(".btn-edit");
    const deleteBtn   = actions.querySelector(".btn-delete");

    // Modo edição
    editBtn.addEventListener("click", () => {
      tipoSelect.disabled = false;
      comentEl.readOnly   = false;
      editBtn.classList.add("hidden");
      saveBtn.classList.remove("hidden");
    });

    saveBtn.addEventListener("click", async () => {
      const novoTipo   = tipoSelect.value;
      const novoComent = comentEl.value.trim();
      try {
        await updateDoc(
          doc(db, "marcacoes_grupadas", docSnap.id),
          { tipo: novoTipo, comentario: novoComent }
        );
        alert("Grupo atualizado com sucesso!");
        tipoSelect.disabled = true;
        comentEl.readOnly   = true;
        saveBtn.classList.add("hidden");
        editBtn.classList.remove("hidden");
        card.classList.replace(card.classList[1], novoTipo);
      } catch (e) {
        console.error(e);
        alert("Erro ao atualizar grupo.");
      }
    });

    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Excluir este grupo de marcações?")) return;
      await deleteDoc(doc(db, "marcacoes_grupadas", docSnap.id));
      exibirGruposMarcacoes();
    });

    card.append(header, lista, comentEl, actions);
    container.appendChild(card);
  });
}

// 📑 Botões e filtros
document.getElementById("ver-marcados-btn").addEventListener("click", () => {
  const area = document.getElementById("versiculos-marcados");
  area.classList.toggle("hidden");
  exibirGruposMarcacoes();
});
document.getElementById("filtro-marcacao").addEventListener("change", exibirGruposMarcacoes);
document.getElementById("filtro-livro").addEventListener("change", exibirGruposMarcacoes);

// 📜 Citação bíblica aleatória
const citacoes = [
  "\"Tudo posso naquele que me fortalece.\" — Filipenses 4:13",
  "\"Confie no Senhor de todo o seu coração...\" — Provérbios 3:5",
  "\"O Senhor é o meu pastor; de nada terei falta.\" — Salmos 23:1",
  "\"Eu sou o caminho, a verdade e a vida...\" — João 14:6",
  "\"Se Deus é por nós, quem será contra nós?\" — Romanos 8:31"
];
document.getElementById("citacao-biblica").innerHTML =
  `<em>${citacoes[Math.floor(Math.random() * citacoes.length)]}</em>`;

  //impressão 
document.getElementById("btn-imprimir").addEventListener("click", () => {
  const area = document.getElementById("lista-marcados");
  if (area.innerHTML.trim() === "") {
    alert("Nada para imprimir.");
    return;
  }

  // Clona o conteúdo para adaptar para impressão
  const clone = area.cloneNode(true);

  // Converte comentários de <textarea> para <p>
  clone.querySelectorAll("textarea.group-comment").forEach(textarea => {
    const p = document.createElement("p");
    p.className = "group-comment";
    p.textContent = textarea.value;
    textarea.replaceWith(p);
  });

  // Remove botões de ações
  clone.querySelectorAll(".versiculo-actions").forEach(el => el.remove());

  // Estilos personalizados para impressão tipo livreto
const styles = `
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 40px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      text-align: center;
      margin-bottom: 40px;
    }
    h4 {
      margin-top: 40px;
      font-size: 20px;
      color: #222;
      border-bottom: 1px solid #aaa;
      padding-bottom: 4px;
    }
    .versiculo-card {
      margin-bottom: 20px;
      padding: 12px;
      border-left: 6px solid #888;
      background-color: #f9f9f9;
      page-break-inside: avoid;
      border-radius: 6px;
    }
    .versiculo-card.promessa {
      border-left-color: #4CAF50;
      background-color: #E8F5E9;
    }
    .versiculo-card.ordem {
      border-left-color: #3F51B5;
      background-color: #FFEBEE;
    }
    .versiculo-card.principio {
      border-left-color: #F44336;
      background-color: #E8EAF6;
    }
    .versiculo-card p {
      margin: 6px 0;
      font-size: 16px;
    }
    .group-comment {
      display: block;
      margin-top: 12px;
      font-style: italic;
      color: #555;
      white-space: pre-wrap;
    }
    .group-tipo {
      font-weight: bold;
      color: #006699;
    }
  </style>
`;
  const htmlContent = `
    <h1>Meus Versículos Agrupados</h1>
    ${clone.innerHTML}
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head><title>Marcações Bíblicas</title>${styles}</head>
      <body>${htmlContent}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
});

