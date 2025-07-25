import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// 🔥 Firebase config
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
  `<img src="https://cdn-icons-png.flaticon.com/128/2600/2600620.png" alt="Ícone usuário" class="saudacao-icon" /> Bem-vindo(a), ${user.displayName || user.email}!`;
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
      chk.type = "checkbox"; chk.style.marginRight = "10px";

      const p = document.createElement("p");
      p.textContent = `${v.verse} – ${v.text}`;

      row.append(chk, p);
      div.appendChild(row);

      const info = {
        uid: user.uid,
        livro,
        capitulo: parseInt(cap),
        numero: v.verse,
        texto: v.text
      };

      chk.addEventListener("change", () => {
        if (chk.checked) marcacoesSelecionadas.push(info);
        else marcacoesSelecionadas = marcacoesSelecionadas.filter(x => x.numero !== v.verse);
        box.classList.toggle("hidden", marcacoesSelecionadas.length === 0);
      });
    });
  } catch (e) {
    div.innerHTML = `<p style="color:red;">Erro: ${e.message}</p>`;
  }
});

// 💾 Salvar marcações múltiplas
document.getElementById("salvar-todos").addEventListener("click", async () => {
  const tipo   = document.getElementById("tipo-marcacao").value;
  const coment = document.getElementById("comentario-geral").value;
  if (!tipo) return alert("Selecione uma categoria.");
  if (!marcacoesSelecionadas.length) return alert("Nenhum versículo selecionado.");

  try {
    for (const v of marcacoesSelecionadas) {
      const ref  = collection(db, "versiculos_usuario");
      const q    = query(ref,
        where("uid",      "==", v.uid),
        where("livro",    "==", v.livro),
        where("capitulo", "==", v.capitulo),
        where("numero",   "==", v.numero)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const id = snap.docs[0].id;
        await updateDoc(doc(db, "versiculos_usuario", id), { tipo, comentario: coment });
      } else {
        await setDoc(doc(collection(db, "versiculos_usuario")), {
          ...v,
          tipo,
          comentario: coment,
          timestamp: serverTimestamp()
        });
      }
    }

    alert("Versículos salvos!");
    document.getElementById("tipo-marcacao").value = "";
    document.getElementById("comentario-geral").value = "";
    marcacoesSelecionadas = [];
    document.getElementById("marcacao-box").classList.add("hidden");
  } catch (e) {
    console.error(e);
    alert("Erro ao salvar.");
  }
});

// 📂 Exibir versículos marcados
async function exibirVersiculosMarcados() {
  const user      = auth.currentUser;
  const tipoF     = document.getElementById("filtro-marcacao").value;
  const container = document.getElementById("lista-marcados");
  container.innerHTML = "";

  if (!user) {
    container.innerHTML = "<p>Faça login para ver seus versículos.</p>";
    return;
  }

  const ref  = collection(db,"versiculos_usuario");
  const q    = tipoF
    ? query(ref, where("uid","==",user.uid), where("tipo","==",tipoF))
    : query(ref, where("uid","==",user.uid));
  const snap = await getDocs(q);
  if (snap.empty) {
    container.innerHTML = "<p>Nenhum versículo marcado.</p>";
    return;
  }

  const docs = [...snap.docs].sort((a,b) => {
    const A = a.data(), B = b.data();
    return A.livro.localeCompare(B.livro) || A.capitulo - B.capitulo || A.numero - B.numero;
  });

  let ultimoLivro = "";
  docs.forEach(docSnap => {
    const v = docSnap.data();
    if (v.livro !== ultimoLivro) {
      const h4 = document.createElement("h4");
      h4.textContent = `📖 ${v.livro.charAt(0).toUpperCase() + v.livro.slice(1)}`;
      container.appendChild(h4);
      ultimoLivro = v.livro;
    }

    const selectId = `tipo-${docSnap.id}`;
    const textId   = `coment-${docSnap.id}`;
    const btnId    = `editar-${docSnap.id}`;
    const delId    = `excluir-${docSnap.id}`;

    const card = document.createElement("div");
    card.classList.add("versiculo-card", v.tipo);

card.innerHTML = `
  <div class="versiculo-content">
    <p><strong>${v.livro} ${v.capitulo}:${v.numero}</strong> – ${v.texto}</p>
    <div class="versiculo-inputs">
      <select id="${selectId}">
        <option value="promessa" ${v.tipo === "promessa" ? "selected" : ""}>Promessa</option>
        <option value="ordem" ${v.tipo === "ordem" ? "selected" : ""}>Ordem</option>
        <option value="principio" ${v.tipo === "principio" ? "selected" : ""}>Princípio Eterno</option>
      </select>
      <textarea id="${textId}" placeholder="Comentário...">${v.comentario || ""}</textarea>
    </div>
  </div>
  <div class="versiculo-actions">
    <button id="${btnId}" class="btn-save" title="Salvar edição">
      <img src="https://cdn-icons-png.flaticon.com/128/84/84380.png" alt="editar">
    </button>
    <button id="${delId}" class="btn-delete" title="Excluir versículo">
      <img src="https://cdn-icons-png.flaticon.com/128/54/54324.png" alt="Lixeira">
    </button>
  </div>
`;
    container.appendChild(card);

    // ✏️ Editar
    document.getElementById(btnId).addEventListener("click", async () => {
      const novoTipo   = document.getElementById(selectId).value;
      const novoComent = document.getElementById(textId).value;
      try {
        await updateDoc(doc(db, "versiculos_usuario", docSnap.id), {
          tipo: novoTipo,
          comentario: novoComent
        });
        alert("Versículo atualizado com sucesso!");
      } catch (e) {
        console.error(e);
        alert("Erro ao atualizar.");
      }
    });

    // 🗑️ Excluir
    document.getElementById(delId).addEventListener("click", async () => {
      if (!confirm("Tem certeza que deseja excluir este versículo?")) return;
      try {
        await deleteDoc(doc(db, "versiculos_usuario", docSnap.id));
        exibirVersiculosMarcados();
      } catch (e) {
        console.error(e);
        alert("Erro ao excluir.");
      }
    });
  });
}

// 📑 Botão ver marcados
document.getElementById("ver-marcados-btn").addEventListener("click", () => {
  const area = document.getElementById("versiculos-marcados");
  area.classList.toggle("hidden");
  document.getElementById("lista-marcados").innerHTML = "";
  exibirVersiculosMarcados();
});
document.getElementById("filtro-marcacao").addEventListener("change", exibirVersiculosMarcados);

// 📜 Citação aleatória no rodapé
const citacoes = [
  "\"Porque Deus tanto amou o mundo que deu o seu Filho Unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna.\" — João 3:16",
  "\"Portanto, vão e façam discípulos de todas as nações, batizando-os em nome do Pai e do Filho e do Espírito Santo, ensinando-os a obedecer a tudo o que eu lhes ordenei. E eu estarei sempre com vocês, até o fim dos tempos.\" — Mateus 28:19-20",
  "\"Busquem, pois, em primeiro lugar o Reino de Deus e a sua justiça, e todas essas coisas lhes serão acrescentadas.\" — Mateus 6:33",
  "\"E a paz de Deus, que excede todo o entendimento, guardará os seus corações e as suas mentes em Cristo Jesus.\" — Filipenses 4:7",
  "\"Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.\" — Jeremias 29:11",
  "\"Eu sou o caminho, a verdade e a vida. Ninguém vem ao Pai, a não ser por mim.\" — João 14:6",
  "\"Eu disse essas coisas para que em mim vocês tenham paz. Neste mundo vocês terão aflições; contudo, tenham ânimo! Eu venci o mundo.\" — João 16:33",
  "\"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça; o Senhor volte para ti o seu rosto e te dê paz.\" — Números 6:24-26",
  "\"Por isso não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o segurarei com a minha mão direita vitoriosa.\" — Isaías 41:10",
  "\"Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.\" — Provérbios 3:5",
  "\"Pai nosso, que estás nos céus! Santificado seja o teu nome. Venha o teu Reino; seja feita a tua vontade, assim na terra como no céu. Dá-nos hoje o nosso pão de cada dia. Perdoa as nossas dívidas, assim como perdoamos aos nossos devedores. E não nos deixes cair em tentação, mas livra-nos do mal, porque teu é o Reino, o poder e a glória para sempre. Amém.\" — Mateus 6:9-13",
  "\"O Senhor é o meu pastor; de nada terei falta.\" — Salmos 23:1",
  "\"Assim, eles já não são dois, mas sim uma só carne. Portanto, o que Deus uniu, ninguém separe.\" — Mateus 19:6",
  "\"Que diremos, pois, diante dessas coisas? Se Deus é por nós, quem será contra nós?\" — Romanos 8:31",
  "\"Honra teu pai e tua mãe, a fim de que tenhas vida longa na terra que o Senhor, o teu Deus, te dá.\" — Êxodo 20:12",
  "\"Portanto, não se preocupem com o amanhã, pois o amanhã trará as suas próprias preocupações. Basta a cada dia o seu próprio mal.\" — Mateus 6:34",
  "\"Tudo posso naquele que me fortalece.\" — Filipenses 4:13",
  "\"Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.\" — Josué 1:9",
  "\"O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha. Não maltrata, não procura seus interesses, não se ira facilmente, não guarda rancor. O amor não se alegra com a injustiça, mas se alegra com a verdade. Tudo sofre, tudo crê, tudo espera, tudo suporta.\" — 1 Coríntios 13:4-7"
];
document.getElementById("citacao-biblica").innerHTML =
  `<em>${citacoes[Math.floor(Math.random() * citacoes.length)]}</em>`;