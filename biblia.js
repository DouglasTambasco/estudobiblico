export function normalizar(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function listaLivros() {
  return (biblia?.antigoTestamento || []).concat(biblia?.novoTestamento || []);
}

export let biblia = null;

export async function carregarBiblia() {
  const res = await fetch("bibliaAveMaria.json");
  biblia = await res.json();
}

export const abreviacoes = {
  "gn":"genesis","ex":"exodo","lv":"levitico","nm":"numeros","dt":"deuteronomio",
  "js":"josue","jz":"juizes","rt":"rute",
  "1sm":"1samuel","2sm":"2samuel",
  "1rs":"1reis","2rs":"2reis",
  "1cr":"1cronicas","2cr":"2cronicas",
  "ed":"esdras","ne":"neemias","et":"ester",
  "jó":"jo","sl":"salmos","pv":"proverbios","ec":"eclesiastes","ct":"cantares",
  "is":"isaias","jr":"jeremias","lm":"lamentacoes","ez":"ezequiel","dn":"daniel",
  "os":"oseias","jl":"joel","am":"amos","ob":"obadias","jn":"jonas","mq":"miqueias",
  "na":"naum","hc":"habacuque","sf":"sofonias",
  "ag":"ageu","zc":"zacarias","ml":"malaquias",
  "mt":"mateus","mc":"marcos","lc":"lucas","jo":"joao","atos":"atos",
  "rm":"romanos","1co":"1corintios","2co":"2corintios",
  "gl":"galatas","ef":"efesios","fp":"filipenses","cl":"colossenses",
  "1ts":"1tessalonicenses","2ts":"2tessalonicenses",
  "1tm":"1timoteo","2tm":"2timoteo",
  "tt":"tito","fm":"filemom","hb":"hebreus","tg":"tiago",
  "1pe":"1pedro","2pe":"2pedro",
  "1jo":"1joao","2jo":"2joao","3jo":"3joao",
  "jd":"judas","ap":"apocalipse"
};

// Localiza livro (com abreviação e normalização)
export function localizarLivro(livroInputRaw) {
  if (!biblia) {
    console.warn("Bíblia ainda não carregada");
    return null;
  }

  const todos = listaLivros();
  const inputN = normalizar(livroInputRaw.trim());

  return todos.find(l => {
    const nomeN = normalizar(l.nome);
    return nomeN === inputN || abreviacoes[inputN] === nomeN;
  }) || null;
}
