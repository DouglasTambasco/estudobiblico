import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// 🔥 Configuração Firebase
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
const db = getFirestore(app);
const marcacoesSelecionadas = [];

// 👤 Login/Cadastro
document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("password").value.trim();
  const mensagem = document.getElementById("auth-message");
  mensagem.textContent = "";

  signInWithEmailAndPassword(auth, email, senha)
    .then(() => desbloquearConteudo())
    .catch(() => {
      createUserWithEmailAndPassword(auth, email, senha)
        .then(() => desbloquearConteudo())
        .catch(error => {
          mensagem.textContent = "Erro: " + error.message;
        });
    });
});

// 🔄 Sessão ativa
onAuthStateChanged(auth, user => {
  if (user) desbloquearConteudo();
});

function desbloquearConteudo() {
  document.getElementById("auth-area").style.display = "none";
  document.getElementById("conteudo").style.display = "block";

  if (!document.getElementById("logout-btn")) {
    const btn = document.createElement("button");
    btn.id = "logout-btn";
    btn.textContent = "Sair";
    btn.style.marginTop = "20px";
    btn.addEventListener("click", () => {
      signOut(auth).then(() => location.reload());
    });
    document.body.appendChild(btn);
  }
}

// 📖 Busca de versículos
document.getElementById("buscar-btn").addEventListener("click", async () => {
  const livro = document.getElementById("livro").value.toLowerCase();
  const capitulo = document.getElementById("capitulo").value;
  const versiculosDiv = document.getElementById("versiculos");
  const box = document.getElementById("marcacao-box");

  versiculosDiv.innerHTML = "";
  box.style.display = "none";
  marcacoesSelecionadas.length = 0;

  const user = auth.currentUser;
  if (!user) return alert("Faça login primeiro.");

  try {
    const resposta = await fetch(`https://bible-api.com/${livro}+${capitulo}?translation=almeida`);
    const dados = await resposta.json();

    dados.verses.forEach(verso => {
      const bloco = document.createElement("div");
      bloco.className = "versiculo";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.style.marginRight = "10px";

      const texto = document.createElement("p");
      texto.textContent = `${verso.verse} - ${verso.text}`;

      bloco.appendChild(check);
      bloco.appendChild(texto);
      versiculosDiv.appendChild(bloco);

      const infoVersiculo = {
        uid: user.uid,
        livro,
        capitulo: parseInt(capitulo),
        numero: verso.verse,
        texto: verso.text
      };

      check.addEventListener("change", () => {
        if (check.checked) {
          marcacoesSelecionadas.push(infoVersiculo);
        } else {
          const index = marcacoesSelecionadas.findIndex(v => v.numero === verso.verse);
          if (index !== -1) marcacoesSelecionadas.splice(index, 1);
        }
        box.style.display = marcacoesSelecionadas.length > 0 ? "block" : "none";
      });
    });
  } catch (erro) {
    versiculosDiv.innerHTML = `<p style="color:red;">Erro ao buscar versículos: ${erro.message}</p>`;
  }
});

// 💾 Salvamento em lote
document.getElementById("salvar-todos").addEventListener("click", async () => {
  const tipo = document.getElementById("tipo-marcacao").value;
  const comentario = document.getElementById("comentario-geral").value;

  if (!tipo) return alert("Escolha uma marcação!");
  if (marcacoesSelecionadas.length === 0) return alert("Nenhum versículo selecionado.");

  try {
    for (const v of marcacoesSelecionadas) {
      const ref = collection(db, "versiculos_usuario");
      const filtro = query(ref,
        where("uid", "==", v.uid),
        where("livro", "==", v.livro),
        where("capitulo", "==", v.capitulo),
        where("numero", "==", v.numero)
      );

      const snap = await getDocs(filtro);
      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await updateDoc(doc(db, "versiculos_usuario", docId), { tipo, comentario });
      } else {
        await setDoc(doc(collection(db, "versiculos_usuario")), {
          ...v,
          tipo,
          comentario,
          timestamp: serverTimestamp()
        });
      }
    }

    alert("Marcações salvas com sucesso!");
    document.getElementById("tipo-marcacao").value = "";
    document.getElementById("comentario-geral").value = "";
    marcacoesSelecionadas.length = 0;
    document.getElementById("marcacao-box").style.display = "none";
  } catch (erro) {
    console.error("Erro ao salvar:", erro);
    alert("Erro ao salvar marcações.");
  }
});

// 👀 Exibir aba de versículos marcados
document.getElementById("ver-marcados-btn").addEventListener("click", () => {
  const area = document.getElementById("versiculos-marcados");
  const lista = document.getElementById("lista-marcados");
  area.style.display = area.style.display === "none" ? "block" : "none";
  lista.innerHTML = "";
  exibirVersiculosMarcados();
});

document.getElementById("filtro-marcacao").addEventListener("change", () => {
  exibirVersiculosMarcados();
});

async function exibirVersiculosMarcados() {
  const user = auth.currentUser;
  const tipoFiltro = document.getElementById("filtro-marcacao").value;
  const container = document.getElementById("lista-marcados");
  container.innerHTML = "";

  if (!user) {
    container.innerHTML = "<p>Faça login para ver seus versículos.</p>";
    return;
  }

  const ref = collection(db, "versiculos_usuario");
  const filtros = tipoFiltro
    ? query(ref, where("uid", "==", user.uid), where("tipo", "==", tipoFiltro))
    : query(ref, where("uid", "==", user.uid));

  const snap = await getDocs(filtros);

  if (snap.empty) {
    container.innerHTML = "<p>Nenhum versículo marcado com esse filtro.</p>";
    return;
  }

  snap.forEach(docSnap => {
    const v = docSnap.data();
    const bloco = document.createElement("div");
    bloco.className = "versiculo";
    bloco.style.backgroundColor = "#FFF3E0";

    const selectId = `tipo-${docSnap.id}`;
    const textId = `coment-${docSnap.id}`;
    const btnId = `editar-${docSnap.id}`;

    bloco.innerHTML = `
      <p><strong>${v.livro} ${v.capitulo}:${v.numero}</strong> - ${v.texto}</p>
      <select id="${selectId}">
        <option value="promessa" ${v.tipo === "promessa" ? "selected" : ""}>Promessa</option>
        <option value="ordem" ${v.tipo === "ordem" ? "selected" : ""}>Ordem</option>
        <option value="principio" ${v.tipo === "principio" ? "selected" : ""}>Princípio Eterno</option>
      </select>
      <textarea id="${textId}" placeholder="Comentário...">${v.comentario || ""}</textarea>
      <button id="${btnId}">Salvar edição</button>
    `;
    container.appendChild(bloco);

    document.getElementById(btnId).addEventListener("click", async () => {
      const novoTipo = document.getElementById(selectId).value;
      const novoComent = document.getElementById(textId).value;

      try {
        await updateDoc(doc(db, "versiculos_usuario", docSnap.id), {
          tipo: novoTipo,
          comentario: novoComent
        });
        alert("Versículo atualizado com sucesso!");
      } catch (erro) {
        console.error("Erro ao atualizar:", erro);
        alert("Não foi possível atualizar.");
      }
    });
  });
}