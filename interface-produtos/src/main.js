import "./styles.css";

const state = { pagina: 1, limite: 20, totalPaginas: 0, itens: [], busca: "", fonte: "", precoMin: "", precoMax: "", apenasAtivos: true, ordenacao: "recent" };
const $ = (seletor) => document.querySelector(seletor);
const grid = $("#products-grid");
const loading = $("#loading");
const empty = $("#empty");
let timerFiltros;

function formatarPreco(valor) {
  if (valor === undefined || valor === null) return "Preço não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarFonte(fonte) {
  return { kabum: "KaBuM!", amazon: "Amazon", terabyteshop: "Terabyte Shop" }[fonte] ?? fonte;
}

function escaparHtml(valor = "") {
  return String(valor).replace(/[&<>'"]/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[caractere]));
}

function renderizarProdutos() {
  const itens = [...state.itens];
  if (state.ordenacao === "price-asc") itens.sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity));
  if (state.ordenacao === "price-desc") itens.sort((a, b) => (b.preco ?? 0) - (a.preco ?? 0));
  grid.innerHTML = itens.map((item) => `
    <article class="product-card ${item.ativo === false ? "is-inactive" : ""}">
      <a class="product-image" href="#produto/${escaparHtml(item._id)}">
        ${item.imagemUrl ? `<img src="${escaparHtml(item.imagemUrl)}" alt="${escaparHtml(item.titulo)}" loading="lazy" />` : `<span class="image-placeholder">Sem imagem</span>`}
      </a>
      <div class="product-card-body">
        <div class="product-meta"><span>${escaparHtml(formatarFonte(item.fonte))}</span><span>●</span>${item.ativo === false ? '<span class="inactive-label">Inativo</span>' : ""}</div>
        <h2><a href="#produto/${escaparHtml(item._id)}">${escaparHtml(item.titulo)}</a></h2>
        <div class="product-prices">
          ${item.precoAntigo !== undefined && item.precoAntigo !== null ? `<span class="old-price">${formatarPreco(item.precoAntigo)}</span>` : ""}
          <strong class="product-price">${formatarPreco(item.preco)}</strong>
        </div>
        <div class="product-footer"><span>Atualizado em ${new Date(item.ultimaColetaEm).toLocaleDateString("pt-BR")}</span><span class="external-link">↗</span></div>
      </div>
    </article>`).join("");
  empty.classList.toggle("is-hidden", itens.length > 0);
}

function renderizarPaginacao() {
  const total = state.totalPaginas;
  if (!total || total <= 1) { $("#pagination").innerHTML = ""; return; }
  const paginas = [];
  const inicio = Math.max(1, state.pagina - 2);
  const fim = Math.min(total, inicio + 4);
  for (let pagina = inicio; pagina <= fim; pagina += 1) paginas.push(pagina);
  $("#pagination").innerHTML = `<button class="page-button" data-page="${state.pagina - 1}" ${state.pagina === 1 ? "disabled" : ""}>‹</button>${paginas.map((pagina) => `<button class="page-button ${pagina === state.pagina ? "is-current" : ""}" data-page="${pagina}">${pagina}</button>`).join("")}<button class="page-button" data-page="${state.pagina + 1}" ${state.pagina === total ? "disabled" : ""}>›</button>`;
  document.querySelectorAll("[data-page]").forEach((botao) => botao.addEventListener("click", () => { state.pagina = Number(botao.dataset.page); carregarProdutos(); window.scrollTo({ top: 0, behavior: "smooth" }); }));
}

function renderizarFiltrosAtivos() {
  const filtros = [];
  if (state.busca) filtros.push(["Busca", state.busca, () => { state.busca = ""; $("#search-input").value = ""; }]);
  if (state.fonte) filtros.push(["Fonte", formatarFonte(state.fonte), () => { state.fonte = ""; $("input[name='source'][value='']").checked = true; }]);
  if (state.precoMin) filtros.push(["Mínimo", formatarPreco(Number(state.precoMin)), () => { state.precoMin = ""; $("#min-price").value = 0; atualizarValoresPreco(); }]);
  if (state.precoMax) filtros.push(["Máximo", formatarPreco(Number(state.precoMax)), () => { state.precoMax = ""; $("#max-price").value = 20000; atualizarValoresPreco(); }]);
  if (state.apenasAtivos) filtros.push(["Status", "Somente ativos", () => { state.apenasAtivos = false; $("#only-active").checked = false; }]);
  $("#active-filters").innerHTML = filtros.map(([rotulo, valor], indice) => `<button class="filter-chip" data-filter-index="${indice}">${escaparHtml(rotulo)}: ${escaparHtml(valor)} <span>×</span></button>`).join("");
  $("#active-filters").querySelectorAll("[data-filter-index]").forEach((botao) => botao.addEventListener("click", () => { filtros[Number(botao.dataset.filterIndex)][2](); state.pagina = 1; carregarProdutos(); }));
}

async function carregarProdutos() {
  loading.classList.remove("is-hidden"); grid.innerHTML = ""; empty.classList.add("is-hidden");
  const parametros = new URLSearchParams({ pagina: state.pagina, limite: state.limite });
  if (state.busca) parametros.set("busca", state.busca);
  if (state.fonte) parametros.set("fonte", state.fonte);
  if (state.precoMin) parametros.set("precoMin", state.precoMin);
  if (state.precoMax) parametros.set("precoMax", state.precoMax);
  if (state.apenasAtivos) parametros.set("ativo", "true");
  try {
    const resposta = await fetch(`/api/itens?${parametros}`);
    if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`);
    const resultado = await resposta.json();
    state.itens = resultado.dados; state.totalPaginas = resultado.paginacao.totalPaginas;
    $("#result-status").textContent = `${resultado.paginacao.totalItens} produto(s)`;
    renderizarProdutos(); renderizarPaginacao(); renderizarFiltrosAtivos();
  } catch (erro) {
    grid.innerHTML = `<div class="error-state">Não foi possível carregar os produtos. Verifique se a API está rodando em http://localhost:3000.</div>`;
    console.error(erro);
  } finally { loading.classList.add("is-hidden"); }
}

function atualizarValoresPreco() {
  const min = Number($("#min-price").value); const max = Number($("#max-price").value);
  state.precoMin = min > 0 ? String(min) : ""; state.precoMax = max < 20000 ? String(max) : "";
  $("#min-price-label").textContent = min > 0 ? formatarPreco(min) : "R$ 0";
  $("#max-price-label").textContent = max < 20000 ? formatarPreco(max) : "Sem limite";
}

function aplicarFiltrosAutomaticamente() {
  clearTimeout(timerFiltros); state.pagina = 1; timerFiltros = setTimeout(carregarProdutos, 250);
}

$("#search-form").addEventListener("submit", (evento) => { evento.preventDefault(); state.busca = $("#search-input").value.trim(); state.pagina = 1; carregarProdutos(); });
document.querySelectorAll("input[name='source']").forEach((radio) => radio.addEventListener("change", () => { state.fonte = radio.value; aplicarFiltrosAutomaticamente(); }));
$("#min-price").addEventListener("input", () => { atualizarValoresPreco(); aplicarFiltrosAutomaticamente(); });
$("#max-price").addEventListener("input", () => { atualizarValoresPreco(); aplicarFiltrosAutomaticamente(); });
$("#only-active").addEventListener("change", (evento) => { state.apenasAtivos = evento.target.checked; aplicarFiltrosAutomaticamente(); });
$("#clear-filters").addEventListener("click", () => { state.busca = ""; state.fonte = ""; state.precoMin = ""; state.precoMax = ""; state.apenasAtivos = false; $("#search-input").value = ""; $("input[name='source'][value='']").checked = true; $("#min-price").value = 0; $("#max-price").value = 20000; $("#only-active").checked = false; atualizarValoresPreco(); state.pagina = 1; carregarProdutos(); });
$("#sort-filter").addEventListener("change", (evento) => { state.ordenacao = evento.target.value; renderizarProdutos(); });
document.querySelectorAll("[data-category]").forEach((botao) => botao.addEventListener("click", () => { document.querySelectorAll("[data-category]").forEach((item) => item.classList.remove("is-active")); botao.classList.add("is-active"); state.busca = botao.dataset.category ?? ""; $("#search-input").value = state.busca; state.pagina = 1; carregarProdutos(); }));
atualizarValoresPreco(); carregarProdutos();
