export function imprimirMarcacoes() {
  const area = document.getElementById("lista-marcados");

  if (!area || area.innerHTML.trim() === "") {
    alert("Nada para imprimir.");
    return;
  }

  const clone = area.cloneNode(true);

  // Substituir textareas por texto
  clone.querySelectorAll("textarea.group-comment").forEach(textarea => {
    const p = document.createElement("p");
    p.className = "group-comment";
    p.textContent = textarea.value;
    textarea.replaceWith(p);
  });

  // Remover botões
  clone.querySelectorAll(".versiculo-actions").forEach(el => el.remove());

  const styles = `
    <style>
      body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.4; color: #333; }
      h1 { text-align: center; margin-bottom: 10px; }
      h4 { margin-top: 5px; font-size: 15px; color: #222; border-bottom: 1px solid #aaa; padding-bottom: 4px; }
      .versiculo-card { margin-bottom: 20px; padding: 12px; border-left: 6px solid #888; background-color: #f9f9f9; page-break-inside: avoid; border-radius: 6px; }
      .versiculo-card.promessa { border-left-color: #4CAF50; background-color: #C8E6C9; }
      .versiculo-card.ordem { border-left-color: #3F51B5; background-color: #E1BEE7; }
      .versiculo-card.principio { border-left-color: #F44336; background-color: #FFE0B2; }
      .versiculo-card p { margin: 4px 0; font-size: 12px; }
      .group-comment { display: block; margin-top: 12px; font-style: italic; font-weight: bold; color: #000; white-space: pre-wrap; }
      .group-tipo { font-weight: bold; color: #006699; }
    </style>
  `;

  const htmlContent = `
    <html>
      <head>
        <title>Impressão do Estudo Bíblico</title>
        ${styles}
      </head>
      <body>
        <h1>Meu Estudo Bíblico</h1>
        ${clone.innerHTML}
      </body>
    </html>
  `;

const win = window.open("", "_blank");

if (!win) {
  alert("Permita pop-ups para imprimir.");
  return;
}

  win.document.write(htmlContent);
  win.document.close();
  win.focus();
  win.print();
}
