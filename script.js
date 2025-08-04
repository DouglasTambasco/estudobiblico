// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

// Elementos fixos
const authMsg     = document.getElementById("auth-message");
const loginBtn    = document.getElementById("login-btn");
const cadastroBtn = document.getElementById("cadastro-btn");
const logoutBtn   = document.getElementById("logout-btn");
const themeBtn    = document.getElementById("theme-toggle-square");

if (localStorage.getItem("modoEscuro") === "on") {
  document.body.classList.add("night");
}

// Login
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

// Cadastro
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

document.addEventListener("DOMContentLoaded", () => {

// Captura todo clique na página e filtra pelos botões de toggle de senha
document.addEventListener("click", e => {
  const btn = e.target.closest(".toggle-senha");
  if (!btn) return;

  const input = document.getElementById(btn.dataset.target);
  if (!input) return;

  const isText = input.type === "text";
  input.type = isText ? "password" : "text";
  btn.textContent = isText ? "👁️" : "🙈";
});

  // Enter para login
  ["login-email", "login-senha"].forEach(id => {
    const campo = document.getElementById(id);
    campo.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("login-btn").click();
      }
    });
  });

  //  Enter para cadastro
  ["cadastro-nome", "cadastro-email", "cadastro-senha"].forEach(id => {
    const campo = document.getElementById(id);
    campo.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("cadastro-btn").click();
      }
    });
  });
});

// Sessão ativa
onAuthStateChanged(auth, user => {
  if (user) initUser(user);
});

// Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => location.reload());
});

// Alternar tema (com salvamento)
themeBtn.addEventListener("click", () => {
  const nightMode = document.body.classList.toggle("night");
  localStorage.setItem("modoEscuro", nightMode ? "on" : "off");
});

// Inicialização pós-login
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

// Buscar versículos
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

  // MODO FOCO: mostrar/esconder botão 
    const focusBtn = document.getElementById("focus-toggle");
    if (dados.verses && dados.verses.length > 0) {
      focusBtn.classList.remove("hidden");
    } else {
      focusBtn.classList.add("hidden");
    }

// montando versículo
(dados.verses || []).forEach(v => {
// 1. Linha principal
const row = document.createElement("div");
row.classList.add("versiculo");

// 2. checkbox
const chk = document.createElement("input");
chk.type = "checkbox";
chk.classList.add("versiculo-checkbox");

// 3. número
const sup = document.createElement("sup");
sup.classList.add("num-versiculo");
sup.textContent = v.verse;

// 4. agrupa checkbox + número
const numeroContainer = document.createElement("div");
numeroContainer.classList.add("versiculo-numero");
numeroContainer.append(chk, sup);

// 5. texto do versículo
const content = document.createElement("div");
content.classList.add("versiculo-conteudo");
content.textContent = v.text;

// 6. monta tudo na ordem desejada
row.append(numeroContainer, content);
div.appendChild(row);

      // evento de marcação
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

// Salvar marcações agrupadas
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
        timestamp:  serverTimestamp(),
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

// Exibir grupos de marcações (com filtros dinâmicos)
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

  const ref = collection(db, "marcacoes_grupadas");
// Monta array de filtros sempre incluindo UID
const filtros = [ where("uid", "==", user.uid) ];

// Se escolher “Favoritos”, filtra pelo booleano
if (tipoF === "favorito") {
  filtros.push( where("favorito", "==", true) );

// Senão, filtra pelo tipo (promessa, ordem, princípio)
} else if (tipoF) {
  filtros.push( where("tipo", "==", tipoF) );
}

const q = query(ref, ...filtros);
const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = "<p>Nenhuma marcação agrupada.</p>";
    return;
  }

  // Gerar filtro de livros dinamicamente
  const livrosUnicos = new Set();
  snap.docs.forEach(docSnap => {
    docSnap.data().versiculos.forEach(v => {
      if (v.livro) livrosUnicos.add(v.livro);
    });
  });

  const filtroLivro = document.getElementById("filtro-livro");
  filtroLivro.innerHTML = '<option value="">Todos</option>';
  [...livrosUnicos].sort().forEach(livro => {
    const opt = document.createElement("option");
    opt.value       = livro.toLowerCase();
    opt.textContent = livro;
    filtroLivro.appendChild(opt);
  });

  // Aplicar filtro por livro
  let grupos = snap.docs;
  if (livroF) {
    grupos = grupos.filter(docSnap =>
      docSnap.data().versiculos.some(v => v.livro.toLowerCase() === livroF)
    );
  }

  // ordenar alfabeticamente pelo primeiro versículo
  grupos.sort((a, b) => {
    const livroA = a.data().versiculos[0]?.livro.toLowerCase() || "";
    const livroB = b.data().versiculos[0]?.livro.toLowerCase() || "";
    return livroA.localeCompare(livroB);
  });

  let ultimoLivro = "";

  grupos.forEach(docSnap => {
    const g    = docSnap.data();
    const card = document.createElement("div");
    card.classList.add("versiculo-card", g.tipo);

    // Cabeçalho de livro
    const livroAtual = g.versiculos[0]?.livro;
    if (livroAtual !== ultimoLivro) {
      const h4 = document.createElement("h4");
      h4.textContent =
        `📖 ${livroAtual.charAt(0).toUpperCase() + livroAtual.slice(1)}`;
      container.appendChild(h4);
      ultimoLivro = livroAtual;
    }

    // IMPRESSÃO (categoria e data)
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
    comentEl.readOnly        = true;
    comentEl.value           = g.comentario;
    comentEl.style.marginTop = "5px";

    // Ações (editar, salvar, favoritar, excluir)
    const actions = document.createElement("div");
    actions.className = "versiculo-actions";
    actions.innerHTML = `
      <button class="btn-edit" title="Editar grupo">✏️</button>
      <button class="btn-save hidden" title="Salvar alterações">💾</button>
      <button class="btn-delete" title="Excluir grupo">🗑️</button>
    `;

    const editBtn   = actions.querySelector(".btn-edit");
    const saveBtn   = actions.querySelector(".btn-save");
    const deleteBtn = actions.querySelector(".btn-delete");

    // Inserir o botão de favorito (usa .btn-save para herdar o mesmo estilo)
    const favBtn = document.createElement("button");
    favBtn.className   = "btn-save";
    favBtn.title       = "Favoritar";
    favBtn.textContent = g.favorito ? "⭐" : "☆";
    actions.insertBefore(favBtn, deleteBtn);

    favBtn.addEventListener("click", async () => {
      const novoFav = !g.favorito;
      try {
        await updateDoc(
          doc(db, "marcacoes_grupadas", docSnap.id),
          { favorito: novoFav }
        );
        g.favorito         = novoFav;
        favBtn.textContent = novoFav ? "⭐" : "☆";
      } catch (e) {
        console.error(e);
        alert("Erro ao favoritar/desfavoritar.");
      }
    });

    // Editar ⟶ Salvar
    editBtn.addEventListener("click", () => {
      header.querySelector(".group-tipo").disabled = false;
      comentEl.readOnly   = false;
      editBtn.classList.add("hidden");
      saveBtn.classList.remove("hidden");
    });

    saveBtn.addEventListener("click", async () => {
      const novoTipo   = header.querySelector(".group-tipo").value;
      const novoComent = comentEl.value.trim();
      try {
        await updateDoc(
          doc(db, "marcacoes_grupadas", docSnap.id),
          { tipo: novoTipo, comentario: novoComent }
        );
        alert("Grupo atualizado com sucesso!");
        header.querySelector(".group-tipo").disabled = true;
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

// Botões e filtros
document.getElementById("ver-marcados-btn").addEventListener("click", () => {
  const area = document.getElementById("versiculos-marcados");
  area.classList.toggle("hidden");
  exibirGruposMarcacoes();
});
document.getElementById("filtro-marcacao").addEventListener("change", exibirGruposMarcacoes);
document.getElementById("filtro-livro").addEventListener("change", exibirGruposMarcacoes);

// Citação bíblica aleatória
const citacoes = [
  "\"Porque Deus tanto amou o mundo que deu o seu Filho Unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna.\" — João 3:16",
  "\"Portanto, vão e façam discípulos de todas as nações, batizando-os em nome do Pai e do Filho e do Espírito Santo, ensinando-os a obedecer a tudo o que eu lhes ordenei. E eu estarei sempre com vocês, até o fim dos tempos.\" — Mateus 28:19-20",
  "\"Busquem, pois, em primeiro lugar o Reino de Deus e a sua justiça, e todas essas coisas lhes serão acrescentadas.\" — Mateus 6:33",
  "\"E a paz de Deus, que excede todo o entendimento, guardará os seus corações e as suas mentes em Cristo Jesus.\" — Filipenses 4:7",
  "\"Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.\" — Jeremias 29:11",
  "\"Eu sou o caminho, a verdade e a vida. Ninguém vem ao Pai, a não ser por mim.\" — João 14:6",
  "\"Eu disse essas coisas para que em mim vocês tenham paz. Neste mundo vocês terão aflições; contudo, tenham ânimo! Eu venci o mundo.\" — João 16:33",
  "\"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça; o Senhor volte para ti o seu rosto e te dê paz.\" — Números 6:24-26",
  "\"Por isso não temas, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o segurarei com a minha mão direita vitoriosa.\" — Isaías 41:10",
  "\"Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.\" — Provérbios 3:5",
  "\"Vocês, orem assim: Pai nosso, que estás nos céus! Santificado seja o teu nome. Venha o teu Reino; seja feita a tua vontade, assim na terra como no céu. Dá-nos hoje o nosso pão de cada dia. Perdoa as nossas dívidas, assim como perdoamos aos nossos devedores. E não nos deixes cair em tentação, mas livra-nos do mal, porque teu é o Reino, o poder e a glória para sempre. Amém.\" — Mateus 6:9-13",
  "\"O Senhor é o meu pastor; de nada terei falta.\" — Salmos 23:1",
  "\"Assim, eles já não são dois, mas sim uma só carne. Portanto, o que Deus uniu, ninguém separe.\" — Mateus 19:6",
  "\"Que diremos, pois, diante dessas coisas? Se Deus é por nós, quem será contra nós?\" — Romanos 8:31",
  "\"Honra teu pai e tua mãe, a fim de que tenhas vida longa na terra que o Senhor, o teu Deus, te dá.\" — Êxodo 20:12",
  "\"Portanto, não se preocupem com o amanhã, pois o amanhã trará as suas próprias preocupações. Basta a cada dia o seu próprio mal.\" — Mateus 6:34",
  "\"Tudo posso naquele que me fortalece.\" — Filipenses 4:13",
  "\"Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.\" — Josué 1:9",
  "\"O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha. Não maltrata, não procura seus interesses, não se ira facilmente, não guarda rancor. O amor não se alegra com a injustiça, mas se alegra com a verdade. Tudo sofre, tudo crê, tudo espera, tudo suporta.\" — 1 Coríntios 13:4-7",
  "\"Então Pedro aproximou-se de Jesus e perguntou: 'Senhor, quantas vezes deverei perdoar a meu irmão quando ele pecar contra mim? Até sete vezes?' Jesus respondeu: 'Eu digo a você: Não até sete, mas até setenta vezes sete.'\" — Mateus 18:21-22"
];
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("citacao-biblica");
    if (!el || citacoes.length === 0) return;

    const index = Math.floor(Math.random() * citacoes.length);
    el.textContent = citacoes[index];
  });
 // está em itálico por causa do <em> no HTML

  // impressão 
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
      padding: 20px;
      line-height: 1;
      color: #333;
    }
    h1 {
      text-align: center;
      margin-bottom: 10px;
    }
    h4 {
      margin-top: 5px;
      font-size: 15px;
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
      background-color: #C8E6C9;
    }
    .versiculo-card.ordem {
      border-left-color: #3F51B5;
      background-color: #E1BEE7;
    }
    .versiculo-card.principio {
      border-left-color: #F44336;
      background-color: #FFE0B2;
    }
    .versiculo-card p {
      margin: 4px 0;
      font-size: 10px;
    }
    .group-comment {
      display: block;
      margin-top: 12px;
      font-style: italic;
      font-weight: bold;
      color: #000000;
      white-space: pre-wrap;
    }
    .group-tipo {
      font-weight: bold;
      color: #006699;
    }
  </style>
`;
  const htmlContent = `
    <h1>Meu Estudo Bíblico Católico</h1>
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

document.addEventListener("DOMContentLoaded", () => {
  const focusBtn = document.getElementById("focus-toggle");
  focusBtn.addEventListener("click", () => {
    console.log("🎯 Modo foco clicado");
    document.body.classList.toggle("focus-mode");
  });
});