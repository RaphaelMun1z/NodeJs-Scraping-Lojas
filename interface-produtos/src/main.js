import "./styles.css";

const estado = { pagina: 1, limite: 20, totalPaginas: 0, itens: [], busca: "", categoria: "", fonte: "", precoMin: "", precoMax: "", apenasAtivos: true, ordenacao: "desconto" };
const $ = (seletor) => document.querySelector(seletor);
const grade = $("#products-grid");
const gradeNovidades = $("#new-products-grid");
// Mantém os filtros no topo e os destaques antes da grade de produtos.
$(".products-area").insertBefore($("#new-products"), $("#loading"));
const carregando = $("#loading");
const vazio = $("#empty");
let temporizadorFiltros;
let temporizadorSugestoes;
let graficoHistorico;
const estadoNovidades = { itens: [], pagina: 1, porPagina: 4 };

function formatarPreco(valor) { return valor === undefined || valor === null ? "Preço não informado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor); }
function formatarFonte(fonte) { return { kabum: "KaBuM!", amazon: "Amazon", terabyteshop: "Terabyte Shop" }[fonte] ?? fonte; }
function renderizarFonteComLogo(fonte) { const logos = { kabum: "/kabum-logo.png", amazon: "/amazon-logo.png", terabyteshop: "/terabyte-logo.png" }; return `<span class="source-identity"><img src="${logos[fonte] ?? ""}" alt="" aria-hidden="true" />${escaparHtml(formatarFonte(fonte))}</span>`; }
function escaparHtml(valor = "") { return String(valor).replace(/[&<>'"]/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[caractere])); }
function ocultarSugestoes() { $("#search-suggestions").classList.add("is-hidden"); }
function renderizarSugestoes(titulos) { const area = $("#search-suggestions"); area.innerHTML = titulos.map((titulo) => `<button type="button" role="option" data-suggestion="${escaparHtml(titulo)}"><span aria-hidden="true">⌕</span>${escaparHtml(titulo)}</button>`).join(""); area.classList.toggle("is-hidden", titulos.length === 0); area.querySelectorAll("[data-suggestion]").forEach((botao) => botao.addEventListener("click", () => { $("#search-input").value = botao.dataset.suggestion; estado.busca = botao.dataset.suggestion; estado.pagina = 1; ocultarSugestoes(); carregarProdutos(); })); }
async function carregarSugestoes(texto) { clearTimeout(temporizadorSugestoes); if (texto.trim().length < 2) { ocultarSugestoes(); return; } temporizadorSugestoes = setTimeout(async () => { try { const resposta = await fetch(`/api/itens/sugestoes?q=${encodeURIComponent(texto.trim())}`); if (!resposta.ok) return ocultarSugestoes(); renderizarSugestoes((await resposta.json()).dados ?? []); } catch { ocultarSugestoes(); } }, 250); }
async function carregarCategorias() {
	const area = $("#category-filter");
	try {
		const resposta = await fetch("/api/itens/categorias");
		if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`);
		const categorias = (await resposta.json()).dados ?? [];
		const grupos = new Map();
		for (const categoria of categorias) {
			const [principal, subcategoria] = categoria.split(" > ");
			if (!grupos.has(principal)) grupos.set(principal, []);
			if (subcategoria) grupos.get(principal).push(subcategoria);
		}
		const ordenarCategorias = ([a], [b]) => {
			if (a === "Outros") return 1;
			if (b === "Outros") return -1;
			return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
		};
		const gruposOrdenados = [...grupos.entries()].sort(ordenarCategorias);
		area.innerHTML = `<label class="radio-row category-all-row"><input type="radio" name="category" value="" ${estado.categoria ? "" : "checked"} /> Todas as categorias</label>${gruposOrdenados.map(([principal, subcategorias]) => `<div class="category-filter-group"><div class="category-filter-heading"><label class="radio-row"><input type="radio" name="category" value="${escaparHtml(principal)}" ${estado.categoria === principal ? "checked" : ""} /> <strong>${escaparHtml(principal)}</strong></label></div>${subcategorias.length ? `<div class="category-subcategories">${subcategorias.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })).map((subcategoria) => { const valor = `${principal} > ${subcategoria}`; return `<label class="radio-row"><input type="radio" name="category" value="${escaparHtml(valor)}" ${estado.categoria === valor ? "checked" : ""} /> <span>${escaparHtml(subcategoria)}</span></label>`; }).join("")}</div>` : ""}</div>`).join("")}`;
		document.querySelectorAll("input[name='category']").forEach((radio) => radio.addEventListener("change", () => { estado.categoria = radio.value; estado.pagina = 1; carregarProdutos(); }));
	} catch (erro) {
		area.innerHTML = '<span class="filter-load-error">Não foi possível carregar as categorias.</span>';
		console.error(erro);
	}
}
function calcularDesconto(precoAntigo, preco) { return !precoAntigo || !preco || precoAntigo <= preco ? null : Math.round((1 - preco / precoAntigo) * 100); }
function renderizarSkeletonProdutos(quantidade = 8) { return Array.from({ length: quantidade }, () => '<article class="product-card skeleton-card"><div class="skeleton skeleton-image"></div><div class="product-card-body"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line price"></div><div class="skeleton skeleton-line footer"></div></div></article>').join(""); }
function renderizarSkeletonPainel(quantidade = 3) { return Array.from({ length: quantidade }, () => '<div class="skeleton-panel-card"><span class="skeleton skeleton-line short"></span><span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line medium"></span></div>').join(""); }
function renderizarTempoListagem(item) { if (!item.primeiraColetaEm) return ""; const dias = Math.floor((Date.now() - new Date(item.primeiraColetaEm).getTime()) / 86400000); return dias < 1 ? '<span class="listing-age is-new">★ Novo</span>' : `<span class="listing-age">Há ${dias} ${dias === 1 ? "dia" : "dias"}</span>`; }

function agruparPontosGrafico(pontos, periodo) {
	const agrupados = new Map();
	for (const ponto of pontos) {
		const data = new Date(ponto.coletadoEm);
		const referencia = periodo === "day"
			? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
			: data.toLocaleDateString("pt-BR");
		// Mantém somente o registro mais recente da mesma referência.
		agrupados.set(referencia, ponto);
	}
	return [...agrupados.entries()].map(([referencia, ponto]) => ({ referencia, ponto }));
}

function renderizarPrecos(item) {
	const desconto = calcularDesconto(item.precoAntigo, item.preco);
	return `<div class="product-prices">${item.precoHistorico ? '<span class="historical-price-badge">★ Preço histórico</span>' : ""}${item.precoAntigo > item.preco ? `<span class="old-price">${formatarPreco(item.precoAntigo)}</span>` : ""}<div class="current-price-row"><strong class="product-price">${formatarPreco(item.preco)}</strong>${desconto ? `<span class="discount-badge">-${desconto}%</span>` : ""}</div></div>`;
}

function renderizarCardNovidade(item) {
	const desconto = calcularDesconto(item.precoAntigo, item.preco);
	return `<article class="product-card new-product-card"><a class="product-image" href="#produto/${escaparHtml(item._id)}">${item.imagemUrl ? `<img src="${escaparHtml(item.imagemUrl)}" alt="${escaparHtml(item.titulo)}" loading="lazy" />` : `<span class="image-placeholder">Sem imagem</span>`}</a><div class="product-card-body"><div class="product-meta">${renderizarFonteComLogo(item.fonte)}<span>•</span>${renderizarTempoListagem(item)}</div><h2><a href="#produto/${escaparHtml(item._id)}">${escaparHtml(item.titulo)}</a></h2><div class="product-prices">${item.precoAntigo > item.preco ? `<span class="old-price">${formatarPreco(item.precoAntigo)}</span>` : ""}<div class="current-price-row"><strong class="product-price">${formatarPreco(item.preco)}</strong>${desconto ? `<span class="discount-badge">-${desconto}%</span>` : ""}</div></div><div class="product-footer"><span>Atualizado em ${new Date(item.ultimaColetaEm).toLocaleDateString("pt-BR")}</span><span class="external-link">↗</span></div></div></article>`;
}

async function carregarNovidades() {
	const secao = $("#new-products");
	secao.classList.remove("is-hidden");
	gradeNovidades.innerHTML = renderizarSkeletonProdutos(4);
	try {
		const resposta = await fetch("/api/itens/novidades?limite=30");
		if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`);
		estadoNovidades.itens = (await resposta.json()).dados ?? [];
		estadoNovidades.pagina = 1;
		secao.classList.toggle("is-hidden", estadoNovidades.itens.length === 0);
		if (estadoNovidades.itens.length > 0) renderizarNovidades();
	} catch (erro) {
		secao.classList.add("is-hidden");
		console.error(erro);
	}
}

function renderizarNovidades() {
	const totalPaginas = Math.ceil(estadoNovidades.itens.length / estadoNovidades.porPagina);
	const inicio = (estadoNovidades.pagina - 1) * estadoNovidades.porPagina;
	const itensNovidades = estadoNovidades.itens.slice(inicio, inicio + estadoNovidades.porPagina);
	gradeNovidades.innerHTML = itensNovidades.map(renderizarCardNovidade).join("");
	gradeNovidades.querySelectorAll(".product-card").forEach((card, indice) => { if (itensNovidades[indice]?.precoHistorico) { card.classList.add("is-historical-price"); card.querySelector(".product-prices")?.insertAdjacentHTML("afterbegin", '<span class="historical-price-badge">★ Preço histórico</span>'); } });
	$("#new-products-page").textContent = `${estadoNovidades.pagina} de ${totalPaginas}`;
	$("#new-products-previous").disabled = estadoNovidades.pagina <= 1;
	$("#new-products-next").disabled = estadoNovidades.pagina >= totalPaginas;
}

function renderizarProdutos() {
	const itens = [...estado.itens];
	grade.innerHTML = itens.map((item) => `<article class="product-card ${item.ativo === false ? "is-inactive" : ""}"><a class="product-image" href="#produto/${escaparHtml(item._id)}">${item.imagemUrl ? `<img src="${escaparHtml(item.imagemUrl)}" alt="${escaparHtml(item.titulo)}" loading="lazy" />` : `<span class="image-placeholder">Sem imagem</span>`}</a><div class="product-card-body"><div class="product-meta">${renderizarFonteComLogo(item.fonte)}<span>●</span>${renderizarTempoListagem(item)}${item.ativo === false ? '<span class="inactive-label">Inativo</span>' : ""}</div><h2><a href="#produto/${escaparHtml(item._id)}">${escaparHtml(item.titulo)}</a></h2>${renderizarPrecos(item)}<div class="product-footer"><span>Atualizado em ${new Date(item.ultimaColetaEm).toLocaleDateString("pt-BR")}</span><span class="external-link">↗</span></div></div></article>`).join("");
	grade.querySelectorAll(".product-card").forEach((card, indice) => { if (itens[indice]?.precoHistorico) card.classList.add("is-historical-price"); });
	vazio.classList.toggle("is-hidden", itens.length > 0);
}

function renderizarPaginacao() {
	const total = estado.totalPaginas;
	if (!total || total <= 1) { $("#pagination").innerHTML = ""; return; }
	const inicio = Math.max(1, estado.pagina - 2); const fim = Math.min(total, inicio + 4);
	const paginas = Array.from({ length: fim - inicio + 1 }, (_, indice) => inicio + indice);
	$("#pagination").innerHTML = `<button class="page-button" data-page="${estado.pagina - 1}" ${estado.pagina === 1 ? "disabled" : ""}>‹</button>${paginas.map((pagina) => `<button class="page-button ${pagina === estado.pagina ? "is-current" : ""}" data-page="${pagina}">${pagina}</button>`).join("")}<button class="page-button" data-page="${estado.pagina + 1}" ${estado.pagina === total ? "disabled" : ""}>›</button>`;
	document.querySelectorAll("[data-page]").forEach((botao) => botao.addEventListener("click", () => { estado.pagina = Number(botao.dataset.page); carregarProdutos(); window.scrollTo({ top: 0, behavior: "smooth" }); }));
}

function renderizarFiltrosAtivos() {
	const filtros = [];
	if (estado.busca) filtros.push(["Busca", estado.busca, () => { estado.busca = ""; $("#search-input").value = ""; }]);
	if (estado.categoria) filtros.push(["Categoria", estado.categoria, () => { estado.categoria = ""; const radio = $("input[name='category'][value='']"); if (radio) radio.checked = true; }]);
	if (estado.fonte) filtros.push(["Fonte", formatarFonte(estado.fonte), () => { estado.fonte = ""; $("input[name='source'][value='']").checked = true; }]);
	if (estado.precoMin) filtros.push(["Mínimo", formatarPreco(Number(estado.precoMin)), () => { estado.precoMin = ""; $("#min-price").value = 0; atualizarValoresPreco(); }]);
	if (estado.precoMax) filtros.push(["Máximo", formatarPreco(Number(estado.precoMax)), () => { estado.precoMax = ""; $("#max-price").value = 20000; atualizarValoresPreco(); }]);
	if (estado.apenasAtivos) filtros.push(["Status", "Somente ativos", () => { estado.apenasAtivos = false; $("#only-active").checked = false; }]);
	$("#active-filters").innerHTML = filtros.map(([rotulo, valor], indice) => `<button class="filter-chip" data-filter-index="${indice}">${escaparHtml(rotulo)}: ${escaparHtml(valor)} <span>×</span></button>`).join("");
	document.querySelectorAll("[data-filter-index]").forEach((botao) => botao.addEventListener("click", () => { filtros[Number(botao.dataset.filterIndex)][2](); estado.pagina = 1; carregarProdutos(); }));
}

async function carregarProdutos() {
	carregando.classList.remove("is-hidden"); grade.innerHTML = renderizarSkeletonProdutos(); vazio.classList.add("is-hidden");
	const parametros = new URLSearchParams({ pagina: estado.pagina, limite: estado.limite, ordenacao: estado.ordenacao });
	if (estado.busca) parametros.set("busca", estado.busca); if (estado.categoria) parametros.set("categoria", estado.categoria); if (estado.fonte) parametros.set("fonte", estado.fonte); if (estado.precoMin) parametros.set("precoMin", estado.precoMin); if (estado.precoMax) parametros.set("precoMax", estado.precoMax); if (estado.apenasAtivos) parametros.set("ativo", "true");
	try { const resposta = await fetch(`/api/itens?${parametros}`); if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`); const resultado = await resposta.json(); estado.itens = resultado.dados; estado.totalPaginas = resultado.paginacao.totalPaginas; $("#result-status").textContent = `${resultado.paginacao.totalItens} produto(s)`; renderizarProdutos(); renderizarPaginacao(); renderizarFiltrosAtivos(); } catch (erro) { grade.innerHTML = `<div class="error-state">Não foi possível carregar os produtos.</div>`; console.error(erro); } finally { carregando.classList.add("is-hidden"); }
}

function atualizarValoresPreco(ladoAlterado) {
	let min = Number($("#min-price").value); let max = Number($("#max-price").value);
	if (min > max) { if (ladoAlterado === "min") { max = min; $("#max-price").value = max; } else { min = max; $("#min-price").value = min; } }
	estado.precoMin = min > 0 ? String(min) : ""; estado.precoMax = max < 20000 ? String(max) : "";
	$("#min-price-label").textContent = min > 0 ? formatarPreco(min) : "R$ 0"; $("#max-price-label").textContent = max < 20000 ? formatarPreco(max) : "Sem limite";
}
function aplicarFiltrosAutomaticamente() { clearTimeout(temporizadorFiltros); estado.pagina = 1; temporizadorFiltros = setTimeout(carregarProdutos, 250); }

function prepararOfertasDetalhe(detalhe, ofertas) {
	const ofertasAtivas = Array.isArray(ofertas) ? ofertas.filter((oferta) => oferta.ativo !== false) : [];
	if (ofertasAtivas.length === 0) return;
	const observador = new MutationObserver(() => {
		const historico = detalhe.querySelector(".history-section");
		if (!historico || detalhe.querySelector(".offers-section")) return;
		const secao = document.createElement("section");
		secao.className = "offers-section";
		secao.innerHTML = `<div class="history-heading"><div><h2>Ofertas nas lojas</h2><span>${ofertasAtivas.length} oferta(s) ativa(s)</span></div></div><div class="offers-list">${ofertasAtivas.map((oferta) => `<article class="offer-card">${oferta.imagemUrl ? `<div class="offer-card-image"><img src="${escaparHtml(oferta.imagemUrl)}" alt="${escaparHtml(oferta.titulo)}" loading="lazy" /></div>` : ""}<div class="offer-card-source">${renderizarFonteComLogo(oferta.fonte)}</div><h3 class="offer-card-title">${escaparHtml(oferta.titulo)}</h3><strong class="offer-card-price">${formatarPreco(oferta.preco)}</strong>${oferta.precoAntigo > oferta.preco ? `<span class="old-price">${formatarPreco(oferta.precoAntigo)}</span>` : ""}${oferta.url ? `<a class="store-link" href="${escaparHtml(oferta.url)}" target="_blank" rel="noreferrer">Ver oferta ↗</a>` : ""}</article>`).join("")}</div>`;
		historico.before(secao);
		observador.disconnect();
	});
	observador.observe(detalhe, { childList: true });
}

async function carregarDetalhe(id) {
	$(".content-layout").classList.add("is-hidden"); carregando.classList.add("is-hidden"); const detalhe = $("#product-detail"); detalhe.classList.remove("is-hidden"); detalhe.innerHTML = '<div class="detail-skeleton"><div class="skeleton skeleton-detail-image"></div><div><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line detail-title"></div><div class="skeleton skeleton-line price"></div></div></div><div class="skeleton skeleton-chart"></div>';
	try {
		const resposta = await fetch(`/api/itens/${encodeURIComponent(id)}/historico`); if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`); const resultado = await resposta.json(); const produto = resultado.produto; const historico = resultado.historico ?? []; const ofertas = resultado.ofertas ?? [produto]; const desconto = calcularDesconto(produto.precoAntigo, produto.preco); prepararOfertasDetalhe(detalhe, ofertas);
	detalhe.innerHTML = `<a class="back-link" href="#">← Voltar para produtos</a><div class="detail-header"><div class="detail-image">${produto.imagemUrl ? `<img src="${escaparHtml(produto.imagemUrl)}" alt="${escaparHtml(produto.titulo)}" />` : "Sem imagem"}</div><div class="detail-summary"><span class="detail-source">${renderizarFonteComLogo(produto.fonte)}${produto.ativo === false ? " · Inativo" : ""}</span><h1>${escaparHtml(produto.titulo)}</h1><div class="detail-prices">${produto.precoAntigo > produto.preco ? `<span class="old-price">${formatarPreco(produto.precoAntigo)}</span>` : ""}<div class="detail-current-price"><strong>${formatarPreco(produto.preco)}</strong>${desconto ? `<span class="discount-badge">-${desconto}% de desconto</span>` : ""}</div></div>${produto.url ? `<a class="store-link" href="${escaparHtml(produto.url)}" target="_blank" rel="noreferrer">Ver na loja ↗</a>` : ""}</div></div><section class="history-section"><div class="history-heading"><div><h2>Histórico de preço</h2><span>${historico.length} registro(s)</span></div><div class="history-periods"><button class="period-button is-active" data-period="day" type="button">Dia</button><button class="period-button" data-period="week" type="button">Semana</button><button class="period-button" data-period="month" type="button">Mês</button><button class="period-button" data-period="3months" type="button">3 meses</button><button class="period-button" data-period="6months" type="button">6 meses</button><button class="period-button" data-period="year" type="button">Ano</button></div></div><div class="chart-wrap"><canvas id="price-chart"></canvas></div></section>`;
		if (historico.length > 0 && window.Chart) { graficoHistorico?.destroy(); const dadosIniciais = agruparPontosGrafico(historico, "day"); graficoHistorico = new window.Chart($("#price-chart"), { type: "line", data: { labels: dadosIniciais.map((item) => item.referencia), datasets: [{ label: "Preço", data: dadosIniciais.map((item) => item.ponto.preco), borderColor: "#2456df", backgroundColor: "rgba(36,86,223,.08)", fill: true, tension: .35, pointRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (valor) => formatarPreco(valor) } }, x: { grid: { display: false } } } } }); document.querySelectorAll(".period-button").forEach((botao) => botao.addEventListener("click", () => { const dias = { day: 1, week: 7, month: 30, "3months": 90, "6months": 180, year: 365 }[botao.dataset.period] ?? 1; const pontos = historico.filter((ponto) => new Date(ponto.coletadoEm).getTime() >= Date.now() - dias * 86400000); const dados = agruparPontosGrafico(pontos.length ? pontos : historico.slice(-1), botao.dataset.period); document.querySelectorAll(".period-button").forEach((item) => item.classList.remove("is-active")); botao.classList.add("is-active"); graficoHistorico.data.labels = dados.map((item) => item.referencia); graficoHistorico.data.datasets[0].data = dados.map((item) => item.ponto.preco); graficoHistorico.update(); })); $(".period-button").click(); }
	} catch (erro) { detalhe.innerHTML = `<div class="empty-state">Não foi possível carregar o histórico deste produto.</div>`; console.error(erro); }
}

function obterTokenCsrf() { return document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith("csrf-token="))?.split("=").slice(1).join("=") ?? ""; }
function atualizarNavegacaoAdministrativa() {
	const rota = window.location.hash.replace(/^#/, "") || "admin";
	document.querySelectorAll("[data-admin-nav]").forEach((link) => link.classList.toggle("is-active", link.dataset.adminNav === rota));
}

function mostrarPaginaAdministracao() { $(".content-layout").classList.add("is-hidden"); $("#product-detail").classList.add("is-hidden"); $("#admin-shell").classList.remove("is-hidden"); $("#admin-sidebar").classList.remove("is-hidden"); $("#admin-page").classList.remove("is-hidden"); atualizarNavegacaoAdministrativa(); }
function mostrarLoginAdministracaoAnterior(mensagem = "") {
	mostrarPaginaAdministracao(); const pagina = $("#admin-page"); pagina.innerHTML = `<div class="admin-card admin-login"><h1>Administração</h1><p class="admin-description">Entre para configurar as fontes do scraping.</p>${mensagem ? `<div class="admin-error">${escaparHtml(mensagem)}</div>` : ""}<form id="admin-login-form"><label>E-mail<input name="email" type="email" required autocomplete="username" /></label><label>Senha<input name="senha" type="password" required autocomplete="current-password" /></label><label>Código MFA<input name="codigoTotp" inputmode="numeric" autocomplete="one-time-code" /></label><button class="primary-button full-button" type="submit">Entrar</button></form></div>`;
	$("#admin-login-form").addEventListener("submit", async (evento) => { evento.preventDefault(); const formulario = new FormData(evento.currentTarget); try { const resposta = await fetch("/api/autenticacao/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(formulario)) }); if (!resposta.ok) throw new Error((await resposta.json()).erro ?? "Não foi possível entrar"); await carregarConfiguracaoAdministracao(); } catch (erro) { mostrarLoginAdministracao(erro.message); } });
}

async function carregarConfiguracaoAdministracaoAnterior() {
	mostrarPaginaAdministracao(); const pagina = $("#admin-page"); pagina.innerHTML = '<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div>';
	try { const sessao = await fetch("/api/autenticacao/sessao"); if (!sessao.ok) { mostrarLoginAdministracao(); return; } const resposta = await fetch("/api/admin/configuracoes/scraping"); if (!resposta.ok) throw new Error("Não foi possível carregar as configurações"); const configuracao = (await resposta.json()).dados;
		pagina.innerHTML = `<div class="admin-header"><div><span class="detail-source">Área protegida</span><h1>Configurações do scraping</h1><p class="admin-description">Ative fontes e altere as URLs usadas nas próximas coletas.</p></div><button id="admin-logout" class="text-button" type="button">Sair</button></div><form id="scraping-settings-form" class="admin-settings">${configuracao.fontes.map((fonte) => `<section class="admin-source"><div><h2>${escaparHtml(fonte.nome)}</h2><label class="check-row"><input type="checkbox" name="ativa-${fonte.fonte}" ${fonte.ativa ? "checked" : ""} /> Fonte ativa</label></div><label>URL da fonte<input name="url-${fonte.fonte}" type="url" value="${escaparHtml(fonte.url)}" required /></label></section>`).join("")}<div id="admin-feedback" class="admin-feedback"></div><button class="primary-button" type="submit">Salvar configurações</button></form><section class="admin-mfa"><h2>Autenticação em dois fatores</h2><p class="admin-description">Ative MFA com um aplicativo autenticador para proteger esta área.</p><button id="start-mfa" class="secondary-button" type="button">Configurar MFA</button></section></div>`;
		$("#admin-logout").addEventListener("click", async () => { await fetch("/api/autenticacao/logout", { method: "POST", headers: { "X-CSRF-Token": obterTokenCsrf() } }); mostrarLoginAdministracao(); }); $("#scraping-settings-form").addEventListener("submit", salvarConfiguracaoAdministracao); $("#start-mfa").addEventListener("click", configurarMfa);
	} catch (erro) { pagina.innerHTML = `<div class="admin-card"><div class="admin-error">${escaparHtml(erro.message)}</div></div>`; }
}

async function salvarConfiguracaoAdministracao(evento) { evento.preventDefault(); const formulario = new FormData(evento.currentTarget); const fontes = ["kabum", "amazon", "terabyteshop"].map((fonte) => ({ fonte, url: formulario.get(`url-${fonte}`), ativa: formulario.get(`ativa-${fonte}`) === "on" })); const feedback = $("#admin-feedback"); feedback.className = "admin-feedback"; feedback.textContent = "Salvando..."; try { const resposta = await fetch("/api/admin/configuracoes/scraping", { method: "PUT", headers: { "Content-Type": "application/json", "X-CSRF-Token": obterTokenCsrf() }, body: JSON.stringify({ fontes }) }); if (!resposta.ok) throw new Error((await resposta.json()).erro ?? "Não foi possível salvar"); feedback.className = "admin-feedback success"; feedback.textContent = "Configurações salvas com sucesso."; } catch (erro) { feedback.className = "admin-feedback error"; feedback.textContent = erro.message; } }

async function configurarMfa() { const inicio = await fetch("/api/autenticacao/mfa/iniciar", { method: "POST", headers: { "X-CSRF-Token": obterTokenCsrf() } }); if (!inicio.ok) { alert("Não foi possível iniciar o MFA."); return; } const dados = (await inicio.json()).dados; const area = document.querySelector(".admin-mfa"); area.insertAdjacentHTML("beforeend", `<div class="mfa-setup"><img src="${dados.qrCodeDataUrl}" alt="QR Code para configurar o MFA" /><p>Escaneie o QR Code no aplicativo autenticador e informe o código gerado.</p><input id="mfa-code" inputmode="numeric" maxlength="6" placeholder="Código de 6 dígitos" /><button id="activate-mfa" class="primary-button" type="button">Ativar MFA</button></div>`); $("#activate-mfa").addEventListener("click", async () => { const codigo = $("#mfa-code").value.trim(); if (!codigo) return; const resposta = await fetch("/api/autenticacao/mfa/ativar", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": obterTokenCsrf() }, body: JSON.stringify({ codigo }) }); alert(resposta.ok ? "MFA ativado com sucesso." : "Código inválido. Tente novamente."); }); }

function renderizarRotaAnterior() { if (window.location.hash === "#admin") { carregarConfiguracaoAdministracaoAnterior(); return; } $("#admin-page").classList.add("is-hidden"); const rota = window.location.hash.match(/^#produto\/(.+)$/); if (rota) carregarDetalhe(rota[1]); else { $(".content-layout").classList.remove("is-hidden"); $("#product-detail").classList.add("is-hidden"); carregarProdutos(); } }

// Mostra o login sem expor detalhes administrativos na tela inicial.
function mostrarLoginAdministracaoLegado(mensagem = "") {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML = `<div class="admin-card admin-login"><h1>Entrar</h1>${mensagem ? `<div class="admin-error">${escaparHtml(mensagem)}</div>` : ""}<form id="admin-login-form"><label>E-mail<input name="email" type="email" required autocomplete="username" /></label><label>Senha<input name="senha" type="password" required autocomplete="current-password" /></label><label>Código de verificação<input name="codigoTotp" inputmode="numeric" autocomplete="one-time-code" /></label><button class="primary-button full-button" type="submit">Entrar</button></form></div>`;
	$("#admin-login-form").addEventListener("submit", async (evento) => {
		evento.preventDefault();
		try {
			const resposta = await fetch("/api/autenticacao/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(evento.currentTarget))) });
			if (!resposta.ok) throw new Error((await resposta.json()).erro ?? "Não foi possível entrar");
			atualizarConta();
			window.location.hash = "admin";
		} catch (erro) { mostrarLoginAdministracao(erro.message); }
	});
}

// Mantém os campos bloqueados até o usuário solicitar uma edição.
async function carregarConfiguracaoAdministracao() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML = '<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div>';
	try {
		const sessao = await fetch("/api/autenticacao/sessao");
		if (!sessao.ok) { mostrarLoginAdministracao(); return; }
		const resposta = await fetch("/api/admin/configuracoes/scraping");
		if (!resposta.ok) throw new Error("Não foi possível carregar as configurações");
		const configuracao = (await resposta.json()).dados;
	pagina.innerHTML = `<div class="admin-header"><h1>Configurações do scraping</h1></div><form id="scraping-settings-form" class="admin-settings">${configuracao.fontes.map((fonte) => `<section class="admin-source"><div><h2>${renderizarFonteComLogo(fonte.fonte)}</h2><label class="toggle-row"><input class="toggle-input" type="checkbox" name="ativa-${fonte.fonte}" ${fonte.ativa ? "checked" : ""} /><span class="toggle-control"></span><span>Ativa</span></label></div><label>URL da fonte<div class="url-edit"><input name="url-${fonte.fonte}" type="url" value="${escaparHtml(fonte.url)}" readonly required /><button class="edit-button" type="button" data-edit-url="${fonte.fonte}" aria-label="Editar URL">✎</button></div></label></section>`).join("")}<div id="admin-feedback" class="admin-feedback"></div><button class="primary-button" type="submit">Salvar configurações</button></form><section class="admin-mfa"><h2>Autenticação em dois fatores</h2><button id="start-mfa" class="secondary-button" type="button">Configurar MFA</button></section></div>`;
		document.querySelectorAll("[data-edit-url]").forEach((botao) => botao.addEventListener("click", () => { const campo = $(`input[name='url-${botao.dataset.editUrl}']`); campo.readOnly = false; campo.focus(); }));
		pagina.querySelector(".admin-mfa")?.remove(); $("#scraping-settings-form").addEventListener("submit", salvarConfiguracaoAdministracao);
		pagina.insertAdjacentHTML("beforeend", '<section class="admin-danger-zone"><div><h2>Limpeza dos produtos</h2><p>Remove os produtos, o histórico de preços e os documentos indexados no Elasticsearch.</p></div><button id="reset-products" class="danger-button" type="button">Limpar produtos</button></section>');
		$("#reset-products").addEventListener("click", confirmarLimpezaProdutos);
		pagina.insertAdjacentHTML("beforeend", '<section class="admin-action-zone"><div><h2>Busca manual</h2><p>Inicie uma coleta agora sem esperar o próximo horário agendado.</p></div><button id="run-scraping-now" class="primary-button" type="button">Iniciar busca</button></section>');
		$("#run-scraping-now").addEventListener("click", iniciarBuscaAgora);
	} catch (erro) { pagina.innerHTML = `<div class="admin-card"><div class="admin-error">${escaparHtml(erro.message)}</div></div>`; }
}

async function confirmarLimpezaProdutos() {
	const confirmacao = window.prompt("Esta ação removerá todos os produtos, históricos e índices do Elasticsearch. Digite reset para confirmar:");
	if (confirmacao !== "reset") return;
	const botao = $("#reset-products");
	botao.disabled = true;
	botao.textContent = "Limpando...";
	try {
		const resposta = await fetch("/api/admin/configuracoes/scraping/limpar-produtos", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": obterTokenCsrf() }, body: JSON.stringify({ confirmacao }) });
		const dados = await resposta.json();
		if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível limpar os produtos");
		alert(`Limpeza concluída. Produtos: ${dados.dados.itens}; históricos: ${dados.dados.historico}; documentos indexados: ${dados.dados.indexados}.`);
	} catch (erro) {
		alert(erro.message);
	} finally {
		botao.disabled = false;
		botao.textContent = "Limpar produtos";
	}
}

async function carregarConfiguracaoAutenticacao() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML = '<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div></div>';
	try {
		const sessao = await fetch("/api/autenticacao/sessao");
		if (!sessao.ok) { mostrarLoginAdministracao(); return; }
		pagina.innerHTML = '<div class="admin-header"><h1>Autenticação</h1></div><section class="admin-mfa"><h2>Autenticação em dois fatores</h2><p class="admin-description">Proteja sua conta usando um aplicativo autenticador.</p><button id="start-mfa" class="secondary-button" type="button">Configurar MFA</button></section>';
		$("#start-mfa").addEventListener("click", configurarMfa);
	} catch (erro) { pagina.innerHTML = `<div class="admin-card"><div class="admin-error">${escaparHtml(erro.message)}</div></div>`; }
}

let resultadoBuscaManual = { itens: [], erros: [] };

function escaparCsvManual(valor) { return `"${String(valor ?? "").replaceAll('"', '""')}"`; }
function gerarCsvBuscaManual() { const linhas = resultadoBuscaManual.itens.map((item) => [item.fonte, item.titulo, item.preco, item.precoAntigo, item.url, item.imagemUrl].map(escaparCsvManual).join(";")); return `\uFEFFfonte;titulo;preco;precoAntigo;url;imagemUrl\n${linhas.join("\n")}\n`; }
function baixarArquivoBuscaManual(nome, conteudo, tipo) { const url = URL.createObjectURL(new Blob([conteudo], { type: tipo })); const link = document.createElement("a"); link.href = url; link.download = nome; link.click(); URL.revokeObjectURL(url); }
function renderizarTabelaBuscaManual() { const corpo = $("#manual-search-body"); if (!corpo) return; corpo.innerHTML = resultadoBuscaManual.itens.map((item) => `<tr><td>${renderizarFonteComLogo(item.fonte)}</td><td>${escaparHtml(item.titulo)}</td><td>${formatarPreco(item.preco)}</td><td>${item.precoAntigo ? formatarPreco(item.precoAntigo) : "—"}</td><td><a href="${escaparHtml(item.url)}" target="_blank" rel="noreferrer">Abrir</a></td></tr>`).join("") || '<tr><td colspan="5" class="manual-search-empty">Nenhum produto encontrado.</td></tr>'; $("#manual-search-count").textContent = `${resultadoBuscaManual.itens.length} produto(s)`; $("#manual-search-errors").innerHTML = resultadoBuscaManual.erros.map((erro) => `<div class="admin-error">${renderizarFonteComLogo(erro.fonte)}: ${escaparHtml(erro.mensagem)}</div>`).join(""); }
async function carregarBuscaManual() { mostrarPaginaAdministracao(); const pagina = $("#admin-page"); pagina.innerHTML = '<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div></div>'; try { const sessao = await fetch("/api/autenticacao/sessao"); if (!sessao.ok) { mostrarLoginAdministracao(); return; } pagina.innerHTML = '<div class="admin-header"><div><h1>Busca manual</h1><p class="admin-description">Execute uma busca sem salvar os resultados no banco de dados.</p></div></div><section class="admin-card manual-search-page"><div class="manual-search-toolbar"><fieldset class="manual-search-sources"><legend>Fontes</legend><label><input type="checkbox" name="manual-search-source" value="kabum" checked /><img src="/kabum-logo.png" alt="" aria-hidden="true" /> KaBuM!</label><label><input type="checkbox" name="manual-search-source" value="amazon" checked /><img src="/amazon-logo.png" alt="" aria-hidden="true" /> Amazon</label><label><input type="checkbox" name="manual-search-source" value="terabyteshop" checked /><img src="/terabyte-logo.png" alt="" aria-hidden="true" /> Terabyte Shop</label></fieldset><button id="run-manual-search" class="primary-button" type="button">Executar busca</button></div><div id="manual-search-feedback" class="admin-feedback"></div><div class="manual-search-actions"><strong id="manual-search-count">0 produto(s)</strong><button id="download-manual-csv" class="secondary-button" type="button" disabled>Exportar CSV</button><button id="print-manual-search" class="secondary-button" type="button" disabled>Exportar PDF</button></div><div id="manual-search-errors"></div><div class="manual-search-table-wrap"><table class="manual-search-table"><thead><tr><th>Fonte</th><th>Produto</th><th>Preço</th><th>Preço antigo</th><th>Link</th></tr></thead><tbody id="manual-search-body"><tr><td colspan="5" class="manual-search-empty">Execute uma busca para visualizar os produtos.</td></tr></tbody></table></div></section>'; $("#run-manual-search").addEventListener("click", executarBuscaManual); $("#download-manual-csv").addEventListener("click", () => baixarArquivoBuscaManual("produtos-busca-manual.csv", gerarCsvBuscaManual(), "text/csv;charset=utf-8")); $("#print-manual-search").addEventListener("click", () => window.print()); } catch (erro) { pagina.innerHTML = `<div class="admin-card"><div class="admin-error">${escaparHtml(erro.message)}</div></div>`; } }
async function executarBuscaManual() { const botao = $("#run-manual-search"); const feedback = $("#manual-search-feedback"); botao.disabled = true; feedback.textContent = "Buscando produtos..."; resultadoBuscaManual = { itens: [], erros: [] }; try { const fontes = [...document.querySelectorAll("input[name='manual-search-source']:checked")].map((campo) => campo.value); const resposta = await fetch("/api/admin/busca-manual", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": obterTokenCsrf() }, body: JSON.stringify({ fontes }) }); const resultado = await resposta.json(); if (!resposta.ok) throw new Error(resultado.erro ?? "Não foi possível executar a busca"); resultadoBuscaManual = resultado.dados; renderizarTabelaBuscaManual(); $("#download-manual-csv").disabled = resultadoBuscaManual.itens.length === 0; $("#print-manual-search").disabled = resultadoBuscaManual.itens.length === 0; feedback.textContent = `Busca concluída em ${formatarDuracao(new Date(resultado.dados.finalizadaEm).getTime() - new Date(resultado.dados.iniciadaEm).getTime())}.`; } catch (erro) { feedback.className = "admin-feedback error"; feedback.textContent = erro.message; } finally { botao.disabled = false; } }

async function salvarConfiguracaoAdministracaoAnterior(evento) {
	evento.preventDefault();
	const formulario = new FormData(evento.currentTarget);
	const fontes = ["kabum", "amazon", "terabyteshop"].map((fonte) => ({ fonte, url: formulario.get(`url-${fonte}`), ativa: formulario.get(`ativa-${fonte}`) === "on" }));
	const feedback = $("#admin-feedback"); feedback.className = "admin-feedback"; feedback.textContent = "Salvando...";
	try { const resposta = await fetch("/api/admin/configuracoes/scraping", { method: "PUT", headers: { "Content-Type": "application/json", "X-CSRF-Token": obterTokenCsrf() }, body: JSON.stringify({ fontes }) }); if (!resposta.ok) throw new Error((await resposta.json()).erro ?? "Não foi possível salvar"); feedback.className = "admin-feedback success"; feedback.textContent = "Configurações salvas com sucesso."; } catch (erro) { feedback.className = "admin-feedback error"; feedback.textContent = erro.message; }
}

async function atualizarConta() {
	const resposta = await fetch("/api/autenticacao/sessao"); const avatar = $("#account-avatar");
	if (!resposta.ok) { avatar.textContent = "Entrar"; avatar.classList.remove("is-authenticated"); avatar.classList.add("account-login-button"); return; }
	const administrador = (await resposta.json()).dados; avatar.textContent = administrador.email.slice(0, 1).toUpperCase(); avatar.classList.add("is-authenticated"); avatar.classList.remove("account-login-button");
}

function configurarConta() {
	$("#account-avatar").addEventListener("click", async () => { const autenticado = $("#account-avatar").classList.contains("is-authenticated"); if (!autenticado) { window.location.hash = "login"; return; } $("#account-menu").classList.add("is-hidden"); window.location.hash = "admin"; });
	$("#account-monitoring").addEventListener("click", () => { $("#account-menu").classList.add("is-hidden"); window.location.hash = "admin/scraping"; });
	$("#account-settings").addEventListener("click", () => { $("#account-menu").classList.add("is-hidden"); window.location.hash = "admin"; });
	const sair = async () => { await fetch("/api/autenticacao/logout", { method: "POST", headers: { "X-CSRF-Token": obterTokenCsrf() } }); $("#account-menu").classList.add("is-hidden"); atualizarConta(); window.location.hash = "login"; };
	$("#account-logout").addEventListener("click", sair);
	$("#admin-sidebar-logout").addEventListener("click", sair);
}

let conexaoEventosScraping;
let temporizadorReconexaoScraping;
let temporizadorAtualizacaoMonitoramento;
let temporizadorContagemRegressiva;
let atualizacaoMonitoramentoEmAndamento = false;

function formatarDuracao(duracaoMs) { if (!duracaoMs) return "Em andamento"; const segundos = Math.floor(duracaoMs / 1000); return segundos < 60 ? `${segundos}s` : `${Math.floor(segundos / 60)}m ${segundos % 60}s`; }
function formatarDuracaoExecucao(execucao) { const duracao = execucao.duracaoMs ?? (execucao.finalizadoEm && execucao.iniciadoEm ? new Date(execucao.finalizadoEm).getTime() - new Date(execucao.iniciadoEm).getTime() : undefined); return formatarDuracao(duracao); }
function formatarHorario(data) { return data ? new Date(data).toLocaleTimeString("pt-BR") : "—"; }

async function carregarMonitoramento() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML = `<div class="admin-header"><div><span class="detail-source">Área protegida</span><h1>Scrapings em tempo real</h1></div></div><div class="monitor-summary" id="monitor-summary"></div><section id="monitor-errors-panel" class="monitor-panel monitor-errors-panel is-hidden"><div class="monitor-panel-heading"><h2>Fontes com problemas</h2><span class="monitor-error-caption" title="Atenção necessária" aria-label="Atenção necessária">!</span></div><div id="monitor-errors" class="monitor-status-grid"></div></section><section class="monitor-panel"><div class="monitor-panel-heading"><h2>Status por fonte</h2><div class="monitor-filters"><select id="monitor-source-filter"><option value="">Todas as fontes</option><option value="kabum">KaBuM!</option><option value="amazon">Amazon</option><option value="terabyteshop">Terabyte Shop</option></select><button id="open-monitor-logs" class="secondary-button" type="button">Ver console de logs</button></div></div><div id="monitor-status" class="monitor-status-grid"></div></section><section class="monitor-panel"><div class="monitor-panel-heading"><h2>Histórico recente</h2></div><div class="monitor-history-wrap"><table class="monitor-history"><thead><tr><th>Fonte</th><th>Status</th><th>Início</th><th>Duração</th><th>Produtos</th><th></th></tr></thead><tbody id="monitor-history-body"></tbody></table></div></section><div id="monitor-logs-modal" class="monitor-modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="monitor-logs-title"><div class="monitor-modal-backdrop" data-close-monitor-logs></div><div class="monitor-modal-content"><div class="monitor-panel-heading"><h2 id="monitor-logs-title">Console de logs</h2><button id="close-monitor-logs" class="icon-button" type="button" aria-label="Fechar console">×</button></div><div id="monitor-execution-progress" class="monitor-execution-progress"></div><div class="monitor-filters"><select id="monitor-log-level"><option value="">Todos os níveis</option><option value="info">Informação</option><option value="sucesso">Sucesso</option><option value="aviso">Aviso</option><option value="erro">Erro</option></select><button id="clear-monitor-logs" class="secondary-button" type="button">Limpar visualização</button></div><div id="monitor-logs" class="monitor-logs"></div></div></div></div>`;
	const cabecalhoMonitoramento = pagina.querySelector(".admin-header"); cabecalhoMonitoramento.classList.add("monitor-header"); cabecalhoMonitoramento.insertAdjacentHTML("beforeend", '<div class="monitor-next-search"><span class="monitor-clock-icon" aria-hidden="true">◷</span><div><small>Próxima busca</small><strong id="monitor-countdown">—</strong></div></div>');
	const painelErros = $("#monitor-errors-panel"); const painelStatus = $("#monitor-status").closest(".monitor-panel"); const painelHistorico = $("#monitor-history-body").closest(".monitor-panel"); const layoutMonitoramento = document.createElement("div"); layoutMonitoramento.className = "monitor-layout"; const conteudoMonitoramento = document.createElement("div"); conteudoMonitoramento.className = "monitor-main"; const asideMonitoramento = document.createElement("aside"); asideMonitoramento.className = "monitor-aside"; painelStatus.classList.add("monitor-status-panel"); pagina.insertBefore(layoutMonitoramento, $("#monitor-logs-modal")); layoutMonitoramento.append(conteudoMonitoramento, asideMonitoramento); conteudoMonitoramento.append(painelHistorico); asideMonitoramento.append(painelErros, painelStatus);
	$("#monitor-summary").innerHTML = renderizarSkeletonPainel(4); $("#monitor-status").innerHTML = renderizarSkeletonPainel(2); $("#monitor-history-body").innerHTML = '<tr><td colspan="6"><div class="skeleton skeleton-table"></div></td></tr>';
	configurarPainelMonitoramento();
	await atualizarPainelMonitoramentoFinal();
	abrirEventosScrapingFinal();
}

function configurarPainelMonitoramento() {
	$("#open-monitor-logs")?.remove();
	$("#monitor-source-filter")?.remove();
	$("#clear-monitor-logs")?.remove();
	$("#monitor-log-level")?.replaceWith(Object.assign(document.createElement("fieldset"), { className: "monitor-log-levels", innerHTML: '<legend>Níveis</legend><label><input type="checkbox" name="monitor-log-level" value="info" checked /> Informação</label><label><input type="checkbox" name="monitor-log-level" value="sucesso" checked /> Sucesso</label><label><input type="checkbox" name="monitor-log-level" value="aviso" checked /> Aviso</label><label><input type="checkbox" name="monitor-log-level" value="erro" checked /> Erro</label>' }));
	$(".monitor-history thead tr").innerHTML = "<th>Data e hora</th><th>Fonte</th><th>Status</th><th>Duração</th><th>Produtos</th><th></th>";
	document.querySelectorAll("input[name='monitor-log-level']").forEach((caixa) => caixa.addEventListener("change", renderizarLogsMonitoramento));
	$(".monitor-history-wrap").insertAdjacentHTML("beforebegin", '<div class="monitor-history-filters"><fieldset class="monitor-history-sources"><legend>Fonte</legend><label><input type="radio" name="monitor-history-source" value="" checked /> Todas</label><label><input type="radio" name="monitor-history-source" value="kabum" /><img src="/kabum-logo.png" alt="" aria-hidden="true" /> KaBuM!</label><label><input type="radio" name="monitor-history-source" value="amazon" /><img src="/amazon-logo.png" alt="" aria-hidden="true" /> Amazon</label><label><input type="radio" name="monitor-history-source" value="terabyteshop" /><img src="/terabyte-logo.png" alt="" aria-hidden="true" /> Terabyte Shop</label></fieldset><div class="monitor-history-date-filters"><label>De <input id="monitor-history-start" type="date" /></label><label>Até <input id="monitor-history-end" type="date" /></label><button id="filter-monitor-history" class="secondary-button" type="button">Filtrar</button></div></div>');
	$(".monitor-history-wrap").insertAdjacentHTML("afterend", '<nav id="monitor-history-pagination" class="monitor-history-pagination" aria-label="Paginação do histórico"></nav>');
	$("#filter-monitor-history").addEventListener("click", aplicarFiltrosHistorico);
	document.querySelectorAll("input[name='monitor-history-source'], #monitor-history-start, #monitor-history-end").forEach((campo) => campo.addEventListener("change", aplicarFiltrosHistorico));
	$("#close-monitor-logs").addEventListener("click", () => $("#monitor-logs-modal").classList.add("is-hidden"));
	$("[data-close-monitor-logs]").addEventListener("click", () => $("#monitor-logs-modal").classList.add("is-hidden"));
	$("#clear-monitor-logs")?.addEventListener("click", () => { $("#monitor-logs").innerHTML = ""; });
}

async function iniciarBuscaAgora() {
	const botao = $("#run-scraping-now");
	botao.disabled = true;
	botao.textContent = "Iniciando...";
	try {
		const resposta = await fetch("/api/admin/scraping/executar", { method: "POST", headers: { "X-CSRF-Token": obterTokenCsrf() } });
		const dados = await resposta.json();
		if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível iniciar a busca");
		botao.textContent = "Busca iniciada";
		setTimeout(() => { botao.disabled = false; botao.textContent = "Iniciar busca"; }, 2500);
	} catch (erro) {
		botao.disabled = false;
		botao.textContent = "Iniciar busca";
		alert(erro.message);
	}
}

function formatarDataHora(data) { return data ? new Date(data).toLocaleString("pt-BR") : "—"; }
function aplicarFiltrosHistorico() { const fonte = document.querySelector("input[name='monitor-history-source']:checked")?.value ?? ""; dadosMonitoramento.filtrosHistorico = { fonte, dataInicio: $("#monitor-history-start").value, dataFim: $("#monitor-history-end").value }; dadosMonitoramento.paginaHistorico = 1; void carregarHistoricoMonitoramento(); }
async function carregarHistoricoMonitoramento() { const filtros = dadosMonitoramento.filtrosHistorico; const parametros = new URLSearchParams({ pagina: String(dadosMonitoramento.paginaHistorico), limite: "9" }); if (filtros.fonte) parametros.set("fonte", filtros.fonte); if (filtros.dataInicio) parametros.set("dataInicio", filtros.dataInicio); if (filtros.dataFim) parametros.set("dataFim", filtros.dataFim); const resposta = await fetch(`/api/admin/scraping/execucoes?${parametros}`); if (!resposta.ok) return; const resultado = await resposta.json(); dadosMonitoramento.execucoes = resultado.dados ?? []; dadosMonitoramento.totalPaginasHistorico = resultado.paginacao?.totalPaginas ?? 0; renderizarHistoricoMonitoramentoPaginado(); }
function renderizarBarraProgresso(valor, rotulo = "") { const percentual = Math.max(0, Math.min(100, Number(valor) || 0)); return `<div class="progress-item"><div class="progress-label"><span>${rotulo}</span><strong>${percentual}%</strong></div><div class="progress-track"><span style="width: ${percentual}%"></span></div></div>`; }
function renderizarProgressoExecucao(progresso = {}, incluirGeral = false) { const barras = [renderizarBarraProgresso(progresso.coleta, "Coleta"), renderizarBarraProgresso(progresso.classificacao, "Classificação"), renderizarBarraProgresso(progresso.embeddings, "Embeddings"), renderizarBarraProgresso(progresso.indexacao, "Indexação")]; if (incluirGeral) barras.unshift(renderizarBarraProgresso(progresso.geral, "Progresso geral")); return barras.join(""); }
function formatarStatusHistorico(status, execucao = {}) { if (status === "executando") return `<div class="history-status-progress"><span class="history-status status-running"><span class="status-icon status-loading"></span>Executando</span>${renderizarBarraProgresso(execucao.progresso?.geral, "")}</div>`; if (status === "erro") return '<span class="history-status status-error"><span class="status-icon">×</span>Erro</span>'; return '<span class="history-status status-success"><span class="status-icon">✓</span>Concluído</span>'; }
function renderizarHistoricoMonitoramentoPaginado() { $("#monitor-history-body").innerHTML = dadosMonitoramento.execucoes.map((item) => `<tr class="history-row status-${item.status}"><td class="history-date">${formatarDataHora(item.iniciadoEm)}</td><td>${renderizarFonteComLogo(item.fonte)}</td><td>${formatarStatusHistorico(item.status, item)}</td><td>${formatarDuracaoExecucao(item)}</td><td>${item.produtosEncontrados ?? 0}</td><td><button class="history-details-button" data-monitor-detail="${item._id}" aria-label="Ver detalhes da execução"><span aria-hidden="true">☷</span> Detalhes</button></td></tr>`).join(""); $("#monitor-history-pagination").innerHTML = dadosMonitoramento.totalPaginasHistorico > 1 ? `<button class="page-button" data-monitor-page="prev" ${dadosMonitoramento.paginaHistorico === 1 ? "disabled" : ""}>‹</button><span>Página ${dadosMonitoramento.paginaHistorico} de ${dadosMonitoramento.totalPaginasHistorico}</span><button class="page-button" data-monitor-page="next" ${dadosMonitoramento.paginaHistorico === dadosMonitoramento.totalPaginasHistorico ? "disabled" : ""}>›</button>` : ""; document.querySelectorAll("[data-monitor-detail]").forEach((botao) => botao.addEventListener("click", () => carregarLogsExecucao(botao.dataset.monitorDetail))); document.querySelectorAll("[data-monitor-page]").forEach((botao) => botao.addEventListener("click", () => { dadosMonitoramento.paginaHistorico += botao.dataset.monitorPage === "next" ? 1 : -1; void carregarHistoricoMonitoramento(); })); }

let dadosMonitoramento = { execucoes: [], statusFontes: [], logs: [], resumo: {}, paginaHistorico: 1, totalPaginasHistorico: 0, filtrosHistorico: { fonte: "", dataInicio: "", dataFim: "" } };
function renderizarStatusMonitoramento() {
	const filtro = $("#monitor-source-filter")?.value;
	const execucoes = dadosMonitoramento.statusFontes.filter((item) => !filtro || item.fonte === filtro);
	$("#monitor-status").innerHTML = execucoes.length ? execucoes.map((item) => `<article class="monitor-source-card"><div class="monitor-card-title"><strong>${renderizarFonteComLogo(item.fonte)}</strong><span class="monitor-status-badge ${item.status}">${escaparHtml(item.status)}</span></div><span>Início: ${formatarHorario(item.iniciadoEm)}</span><span>Produtos encontrados: ${item.produtosEncontrados ?? 0}</span><span>Última mensagem: ${escaparHtml(item.ultimaMensagem ?? "Aguardando...")}</span></article>`).join("") : '<div class="empty-state">Nenhuma fonte em execução.</div>';
	const execucoesComProblema = execucoes.filter((item) => item.status === "erro");
	const execucoesNormais = execucoes.filter((item) => item.status !== "erro");
	$("#monitor-errors-panel").classList.toggle("is-hidden", execucoesComProblema.length === 0);
	$("#monitor-errors").innerHTML = execucoesComProblema.map((item) => `<article class="monitor-source-card monitor-source-error"><div class="monitor-card-title"><strong>${renderizarFonteComLogo(item.fonte)}</strong><span class="monitor-status-badge erro">Erro</span></div><span>Início: ${formatarHorario(item.iniciadoEm)}</span><span>Erro: ${escaparHtml(item.erro ?? item.ultimaMensagem ?? "Falha não detalhada")}</span><span>Produtos encontrados: ${item.produtosEncontrados ?? 0}</span></article>`).join("");
	$("#monitor-status").innerHTML = execucoesNormais.length ? execucoesNormais.map((item) => `<article class="monitor-source-card"><div class="monitor-card-title"><strong>${renderizarFonteComLogo(item.fonte)}</strong><span class="monitor-status-badge ${item.status}">${escaparHtml(item.status)}</span></div><span>Início: ${formatarHorario(item.iniciadoEm)}</span><span>Produtos encontrados: ${item.produtosEncontrados ?? 0}</span><span>Última mensagem: ${escaparHtml(item.ultimaMensagem ?? "Aguardando...")}</span></article>`).join("") : '<div class="empty-state">Nenhuma fonte em execução.</div>';
	const executando = dadosMonitoramento.statusFontes.filter((item) => item.status === "executando").length;
	renderizarResumoMonitoramento();
	if (typeof atualizarResumoMonitoramento === "function") void atualizarResumoMonitoramento();
}
function renderizarResumoMonitoramentoLegado() { const resumo = dadosMonitoramento.resumo; $("#monitor-summary").innerHTML = `<div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">◷</span><strong>${resumo.ultimaAtualizacao ? formatarDataHora(resumo.ultimaAtualizacao) : "—"}</strong><span>Última atualização</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">✓</span><strong>${resumo.produtosAtivos ?? 0}</strong><span>Produtos listados atualmente</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">▦</span><strong>${resumo.produtosSalvos ?? 0}</strong><span>Produtos salvos</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">⏱</span><strong>${resumo.duracaoMediaMs ? formatarDuracao(resumo.duracaoMediaMs) : "—"}</strong><span>Tempo médio das buscas</span></div>`; }
function renderizarLogsMonitoramento() { const area = $("#monitor-logs"); if (!area) return; const estavaNoFinal = area.scrollHeight - area.scrollTop - area.clientHeight < 24; const filtroFonte = $("#monitor-source-filter")?.value; const niveisSelecionados = [...document.querySelectorAll("input[name='monitor-log-level']:checked")].map((caixa) => caixa.value); area.innerHTML = dadosMonitoramento.logs.filter((item) => (!filtroFonte || item.fonte === filtroFonte) && niveisSelecionados.includes(item.nivel)).map((item) => `<div class="monitor-log ${item.nivel}"><time>${formatarHorario(item.criadoEm)}</time><strong>${renderizarFonteComLogo(item.fonte)}</strong><span>${escaparHtml(item.mensagem)}</span></div>`).join("") || '<div class="empty-state">Nenhuma mensagem registrada.</div>'; if (estavaNoFinal) area.scrollTop = area.scrollHeight; }
function renderizarHistoricoMonitoramento() { $("#monitor-history-body").innerHTML = dadosMonitoramento.execucoes.map((item) => `<tr><td>${escaparHtml(formatarFonte(item.fonte))}</td><td><span class="monitor-status-badge ${item.status}">${escaparHtml(item.status)}</span></td><td>${formatarHorario(item.iniciadoEm)}</td><td>${formatarDuracao(item.duracaoMs)}</td><td>${item.produtosEncontrados ?? 0}</td><td><button class="text-button" data-monitor-detail="${item._id}">Detalhes</button></td></tr>`).join(""); document.querySelectorAll("[data-monitor-detail]").forEach((botao) => botao.addEventListener("click", () => carregarLogsExecucao(botao.dataset.monitorDetail))); }
async function atualizarPainelMonitoramento() { const [status, historico] = await Promise.all([fetch("/api/admin/scraping/status"), fetch("/api/admin/scraping/execucoes?limite=50")]); if (!status.ok || !historico.ok) { mostrarLoginAdministracao("Sessão expirada. Entre novamente."); return; } dadosMonitoramento.execucoes = (await historico.json()).dados ?? []; const execucoesAtivas = (await status.json()).dados ?? []; dadosMonitoramento.execucoes = [...execucoesAtivas, ...dadosMonitoramento.execucoes.filter((item) => !execucoesAtivas.some((ativo) => ativo._id === item._id))]; renderizarStatusMonitoramento(); renderizarHistoricoMonitoramento(); }
async function carregarLogsExecucao(id) { const [respostaExecucao, respostaLogs] = await Promise.all([fetch(`/api/admin/scraping/execucoes/${encodeURIComponent(id)}`), fetch(`/api/admin/scraping/execucoes/${encodeURIComponent(id)}/logs`)]); if (!respostaExecucao.ok || !respostaLogs.ok) return; const execucao = (await respostaExecucao.json()).dados; dadosMonitoramento.logs = (await respostaLogs.json()).dados ?? []; $("#monitor-execution-progress").innerHTML = renderizarProgressoExecucao(execucao.progresso, true); $("#monitor-logs-modal").classList.remove("is-hidden"); renderizarLogsMonitoramento(); $("#monitor-logs").scrollTop = $("#monitor-logs").scrollHeight; }
function adicionarEventoMonitoramento(evento) { if (evento.tipo === "log") { dadosMonitoramento.logs.push(evento.dados); if (dadosMonitoramento.logs.length > 500) dadosMonitoramento.logs.shift(); renderizarLogsMonitoramento(); } if (evento.tipo === "execucao") { const indice = dadosMonitoramento.execucoes.findIndex((item) => item._id === evento.dados._id); if (indice >= 0) dadosMonitoramento.execucoes[indice] = { ...dadosMonitoramento.execucoes[indice], ...evento.dados }; else dadosMonitoramento.execucoes.unshift(evento.dados); renderizarStatusMonitoramento(); renderizarHistoricoMonitoramento(); } }
async function atualizarPainelMonitoramentoSeparado() { const [status, historico] = await Promise.all([fetch("/api/admin/scraping/status"), fetch("/api/admin/scraping/execucoes?limite=50")]); if (!status.ok || !historico.ok) { mostrarLoginAdministracao("Sessão expirada. Entre novamente."); return; } dadosMonitoramento.statusFontes = (await status.json()).dados ?? []; dadosMonitoramento.execucoes = (await historico.json()).dados ?? []; renderizarStatusMonitoramento(); renderizarHistoricoMonitoramento(); }
function adicionarEventoMonitoramentoSeparado(evento) { if (evento.tipo === "log") { dadosMonitoramento.logs.push(evento.dados); if (dadosMonitoramento.logs.length > 500) dadosMonitoramento.logs.shift(); renderizarLogsMonitoramento(); } if (evento.tipo === "execucao") { const indiceStatus = dadosMonitoramento.statusFontes.findIndex((item) => item._id === evento.dados._id); if (indiceStatus >= 0) dadosMonitoramento.statusFontes[indiceStatus] = { ...dadosMonitoramento.statusFontes[indiceStatus], ...evento.dados }; else dadosMonitoramento.statusFontes.push(evento.dados); const indiceHistorico = dadosMonitoramento.execucoes.findIndex((item) => item._id === evento.dados._id); if (indiceHistorico >= 0) dadosMonitoramento.execucoes[indiceHistorico] = { ...dadosMonitoramento.execucoes[indiceHistorico], ...evento.dados }; else dadosMonitoramento.execucoes.unshift(evento.dados); renderizarStatusMonitoramento(); renderizarHistoricoMonitoramento(); } }
function abrirEventosScraping() { conexaoEventosScraping?.close(); clearTimeout(temporizadorReconexaoScraping); conexaoEventosScraping = new EventSource("/api/admin/scraping/eventos"); conexaoEventosScraping.addEventListener("execucao", (evento) => adicionarEventoMonitoramentoSeparado({ tipo: "execucao", dados: JSON.parse(evento.data) })); conexaoEventosScraping.addEventListener("log", (evento) => adicionarEventoMonitoramentoSeparado({ tipo: "log", dados: JSON.parse(evento.data) })); conexaoEventosScraping.onerror = () => { conexaoEventosScraping.close(); temporizadorReconexaoScraping = setTimeout(() => { if (window.location.hash === "#admin/scraping") { void atualizarPainelMonitoramentoSeparado().then(abrirEventosScraping); } }, 3000); }; }
async function atualizarPainelMonitoramentoFinal() { if (atualizacaoMonitoramentoEmAndamento) return; atualizacaoMonitoramentoEmAndamento = true; try { const resposta = await fetch("/api/admin/scraping/status"); if (!resposta.ok) { mostrarLoginAdministracao("Sessão expirada. Entre novamente."); return; } const resultado = await resposta.json(); dadosMonitoramento.statusFontes = resultado.dados ?? []; dadosMonitoramento.resumo = resultado.resumo ?? {}; await carregarHistoricoMonitoramento(); renderizarStatusMonitoramento(); } finally { atualizacaoMonitoramentoEmAndamento = false; } }
function adicionarEventoMonitoramentoAtual(evento) { if (evento.tipo === "log") { dadosMonitoramento.logs.push(evento.dados); if (dadosMonitoramento.logs.length > 500) dadosMonitoramento.logs.shift(); renderizarLogsMonitoramento(); } if (evento.tipo === "execucao") { const indiceStatus = dadosMonitoramento.statusFontes.findIndex((item) => item._id === evento.dados._id); if (indiceStatus >= 0) dadosMonitoramento.statusFontes[indiceStatus] = { ...dadosMonitoramento.statusFontes[indiceStatus], ...evento.dados }; else dadosMonitoramento.statusFontes.push(evento.dados); renderizarStatusMonitoramento(); void carregarHistoricoMonitoramento(); } }
function abrirEventosScrapingFinal() { conexaoEventosScraping?.close(); clearTimeout(temporizadorReconexaoScraping); clearInterval(temporizadorAtualizacaoMonitoramento); temporizadorAtualizacaoMonitoramento = setInterval(() => { if (window.location.hash === "#admin/scraping") void atualizarPainelMonitoramentoFinal(); }, 5000); conexaoEventosScraping = new EventSource("/api/admin/scraping/eventos"); conexaoEventosScraping.addEventListener("execucao", (evento) => adicionarEventoMonitoramentoAtual({ tipo: "execucao", dados: JSON.parse(evento.data) })); conexaoEventosScraping.addEventListener("log", (evento) => adicionarEventoMonitoramentoAtual({ tipo: "log", dados: JSON.parse(evento.data) })); conexaoEventosScraping.onerror = () => { conexaoEventosScraping.close(); temporizadorReconexaoScraping = setTimeout(() => { if (window.location.hash === "#admin/scraping") { void atualizarPainelMonitoramentoFinal().then(abrirEventosScrapingFinal); } }, 3000); }; }

function formatarDataResumo(data) { if (!data) return '<strong>—</strong>'; const valor = new Date(data); return `<strong class="monitor-stat-time">${valor.toLocaleTimeString("pt-BR")}</strong><small class="monitor-stat-date">${valor.toLocaleDateString("pt-BR")}</small>`; }
function formatarContagemRegressiva(data) { if (!data) return "Sem previsão"; const restante = new Date(data).getTime() - Date.now(); if (restante <= 0) return "Iniciando em instantes"; const totalSegundos = Math.floor(restante / 1000); const horas = Math.floor(totalSegundos / 3600); const minutos = Math.floor((totalSegundos % 3600) / 60); const segundos = totalSegundos % 60; return `Em ${horas > 0 ? `${horas}h ` : ""}${minutos}m ${String(segundos).padStart(2, "0")}s`; }
function atualizarContagemRegressiva() { const elemento = $("#monitor-countdown"); if (elemento) elemento.textContent = formatarContagemRegressiva(dadosMonitoramento.resumo.proximaBusca); }
function renderizarResumoMonitoramento() { const resumo = dadosMonitoramento.resumo; clearInterval(temporizadorContagemRegressiva); $("#monitor-summary").innerHTML = `<div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">◷</span>${formatarDataResumo(resumo.ultimaAtualizacao)}<span>Última atualização</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">✓</span><strong>${resumo.produtosAtivos ?? 0}</strong><span>Produtos listados atualmente</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">▦</span><strong>${resumo.produtosSalvos ?? 0}</strong><span>Produtos salvos</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true">⏱</span><strong>${resumo.duracaoMediaMs ? formatarDuracao(resumo.duracaoMediaMs) : "—"}</strong><span>Tempo médio por rodada</span></div>`; atualizarContagemRegressiva(); temporizadorContagemRegressiva = setInterval(atualizarContagemRegressiva, 1000); }

function renderizarRota() { if (window.location.hash === "#login") { clearInterval(temporizadorAtualizacaoMonitoramento); $("#new-products").classList.add("is-hidden"); mostrarLoginAdministracao(); return; } if (window.location.hash === "#admin") { clearInterval(temporizadorAtualizacaoMonitoramento); $("#new-products").classList.add("is-hidden"); carregarConfiguracaoAdministracao(); return; } if (window.location.hash === "#admin/autenticacao") { clearInterval(temporizadorAtualizacaoMonitoramento); $("#new-products").classList.add("is-hidden"); carregarConfiguracaoAutenticacao(); return; } if (window.location.hash === "#admin/busca") { clearInterval(temporizadorAtualizacaoMonitoramento); $("#new-products").classList.add("is-hidden"); carregarBuscaManual(); return; } if (window.location.hash === "#admin/scraping") { $("#new-products").classList.add("is-hidden"); carregarMonitoramento(); return; } clearInterval(temporizadorAtualizacaoMonitoramento); $("#admin-shell").classList.add("is-hidden"); $("#admin-page").classList.add("is-hidden"); const rota = window.location.hash.match(/^#produto\/(.+)$/); if (rota) { $("#new-products").classList.add("is-hidden"); carregarDetalhe(rota[1]); } else { $(".content-layout").classList.remove("is-hidden"); $("#product-detail").classList.add("is-hidden"); carregando.classList.remove("is-hidden"); carregarProdutos(); carregarNovidades(); } }

function mostrarLoginAdministracao(mensagem = "") {
	mostrarPaginaAdministracao();
	$("#admin-sidebar").classList.add("is-hidden");
	const pagina = $("#admin-page");
	pagina.innerHTML = `<div class="admin-card admin-login"><h1>Entrar</h1>${mensagem ? `<div class="admin-error">${escaparHtml(mensagem)}</div>` : ""}<form id="admin-login-form"><label>E-mail<input name="email" type="email" required autocomplete="username" /></label><label>Senha<input name="senha" type="password" required autocomplete="current-password" /></label><label id="totp-field" class="is-hidden">Código de verificação<input name="codigoTotp" inputmode="numeric" autocomplete="one-time-code" /></label><p id="totp-hint" class="admin-description is-hidden">Informe o código do seu aplicativo autenticador.</p><button class="primary-button full-button" type="submit">Entrar</button></form></div>`;
	$("#admin-login-form").addEventListener("submit", async (evento) => {
		evento.preventDefault();
		try {
			const formulario = evento.currentTarget;
			const dados = Object.fromEntries(new FormData(formulario));
			if (!formulario.dataset.mfaNecessario) {
				const verificacao = await fetch("/api/autenticacao/login/verificar-mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: dados.email, senha: dados.senha }) });
				const resultadoVerificacao = await verificacao.json();
				if (!verificacao.ok) throw new Error(resultadoVerificacao.erro ?? "Credenciais inválidas");
				if (resultadoVerificacao.dados.mfaNecessario) { formulario.dataset.mfaNecessario = "true"; $("#totp-field").classList.remove("is-hidden"); $("#totp-hint").classList.remove("is-hidden"); $("#totp-field input").required = true; $("#totp-field input").focus(); return; }
			}
			const resposta = await fetch("/api/autenticacao/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(formulario))) });
			if (!resposta.ok) throw new Error((await resposta.json()).erro ?? "Não foi possível entrar");
			atualizarConta();
			window.location.hash = "admin";
		} catch (erro) { mostrarLoginAdministracao(erro.message); }
	});
}

$("#new-products-previous").addEventListener("click", () => { if (estadoNovidades.pagina > 1) { estadoNovidades.pagina -= 1; renderizarNovidades(); } });
$("#new-products-next").addEventListener("click", () => { if (estadoNovidades.pagina < Math.ceil(estadoNovidades.itens.length / estadoNovidades.porPagina)) { estadoNovidades.pagina += 1; renderizarNovidades(); } });

let filtroBuscaManual = { texto: "", somenteMultilojas: false };
function obterChaveBuscaManual(titulo) { return String(titulo ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function obterItensBuscaManualVisiveis() {
	const grupos = new Map();
	for (const item of resultadoBuscaManual.itens) {
		const chave = obterChaveBuscaManual(item.titulo);
		const fontes = grupos.get(chave) ?? new Set();
		fontes.add(item.fonte);
		grupos.set(chave, fontes);
	}
	const texto = filtroBuscaManual.texto.trim().toLocaleLowerCase();
	return resultadoBuscaManual.itens.filter((item) => {
		const correspondeTexto = !texto || item.titulo.toLocaleLowerCase().includes(texto);
		const correspondeLojas = !filtroBuscaManual.somenteMultilojas || (grupos.get(obterChaveBuscaManual(item.titulo))?.size ?? 0) > 1;
		return correspondeTexto && correspondeLojas;
	});
}
function renderizarTabelaBuscaManualFiltrada() {
	const corpo = $("#manual-search-body");
	if (!corpo) return;
	if (!$("#manual-search-text-filter")) {
		$("#manual-search-count").insertAdjacentHTML("afterend", '<label class="manual-search-text-filter"><span>Buscar no resultado</span><input id="manual-search-text-filter" type="search" placeholder="Nome do produto" /></label>');
		$("#run-manual-search").insertAdjacentHTML("beforebegin", '<label class="manual-search-multiple-filter"><input id="manual-search-multiple-filter" type="checkbox" /> Presente em mais de uma loja</label>');
		$("#manual-search-text-filter").addEventListener("input", (evento) => { filtroBuscaManual.texto = evento.target.value; renderizarTabelaBuscaManual(); });
		$("#manual-search-multiple-filter").addEventListener("change", (evento) => { filtroBuscaManual.somenteMultilojas = evento.target.checked; renderizarTabelaBuscaManual(); });
	}
	const itens = obterItensBuscaManualVisiveis();
	corpo.innerHTML = itens.map((item) => `<tr><td>${renderizarFonteComLogo(item.fonte)}</td><td>${escaparHtml(item.titulo)}</td><td>${formatarPreco(item.preco)}</td><td>${item.precoAntigo ? formatarPreco(item.precoAntigo) : "—"}</td><td><a href="${escaparHtml(item.url)}" target="_blank" rel="noreferrer">Abrir</a></td></tr>`).join("") || '<tr><td colspan="5" class="manual-search-empty">Nenhum produto encontrado com esses filtros.</td></tr>';
	$("#manual-search-count").textContent = `${itens.length} produto(s)`;
	$("#manual-search-errors").innerHTML = resultadoBuscaManual.erros.map((erro) => `<div class="admin-error">${renderizarFonteComLogo(erro.fonte)}: ${escaparHtml(erro.mensagem)}</div>`).join("");
}
function gerarCsvBuscaManualFiltrado() { return `\uFEFFfonte;titulo;preco;precoAntigo;url;imagemUrl\n${obterItensBuscaManualVisiveis().map((item) => [item.fonte, item.titulo, item.preco, item.precoAntigo, item.url, item.imagemUrl].map(escaparCsvManual).join(";")).join("\n")}\n`; }
renderizarTabelaBuscaManual = renderizarTabelaBuscaManualFiltrada;
gerarCsvBuscaManual = gerarCsvBuscaManualFiltrado;
const observadorBuscaManual = new MutationObserver(() => {
	const acoes = $(".manual-search-actions");
	if (!acoes || $("#manual-search-text-filter")) return;
	acoes.insertAdjacentHTML("afterbegin", '<label class="manual-search-text-filter"><span>Buscar no resultado</span><input id="manual-search-text-filter" type="search" placeholder="Nome do produto" /></label>');
	$("#run-manual-search").insertAdjacentHTML("beforebegin", '<label class="manual-search-multiple-filter"><input id="manual-search-multiple-filter" type="checkbox" /> Presente em mais de uma loja</label>');
	$("#manual-search-text-filter").addEventListener("input", (evento) => { filtroBuscaManual.texto = evento.target.value; renderizarTabelaBuscaManual(); });
	$("#manual-search-multiple-filter").addEventListener("change", (evento) => { filtroBuscaManual.somenteMultilojas = evento.target.checked; renderizarTabelaBuscaManual(); });
});
observadorBuscaManual.observe($("#admin-page"), { childList: true, subtree: true });

$("#search-form").addEventListener("submit", (evento) => { evento.preventDefault(); estado.busca = $("#search-input").value.trim(); estado.pagina = 1; ocultarSugestoes(); carregarProdutos(); });
$("#search-input").addEventListener("input", (evento) => carregarSugestoes(evento.target.value));
$("#search-input").addEventListener("blur", () => setTimeout(ocultarSugestoes, 150));
document.querySelectorAll("input[name='source']").forEach((radio) => radio.addEventListener("change", () => { estado.fonte = radio.value; aplicarFiltrosAutomaticamente(); }));
$("#min-price").addEventListener("input", () => { atualizarValoresPreco("min"); aplicarFiltrosAutomaticamente(); }); $("#max-price").addEventListener("input", () => { atualizarValoresPreco("max"); aplicarFiltrosAutomaticamente(); }); $("#only-active").addEventListener("change", (evento) => { estado.apenasAtivos = evento.target.checked; aplicarFiltrosAutomaticamente(); });
$("#clear-filters").addEventListener("click", () => { estado.busca = ""; estado.categoria = ""; estado.fonte = ""; estado.precoMin = ""; estado.precoMax = ""; estado.apenasAtivos = true; $("#search-input").value = ""; $("input[name='category'][value='']").checked = true; $("input[name='source'][value='']").checked = true; $("#min-price").value = 0; $("#max-price").value = 20000; $("#only-active").checked = true; atualizarValoresPreco(); estado.pagina = 1; carregarProdutos(); });
$("#sort-filter").addEventListener("change", (evento) => { estado.ordenacao = evento.target.value; estado.pagina = 1; carregarProdutos(); }); document.querySelectorAll("[data-category]").forEach((botao) => botao.addEventListener("click", () => { const estavaEmOutraPagina = !$("#admin-shell").classList.contains("is-hidden") || !$("#product-detail").classList.contains("is-hidden"); document.querySelectorAll("[data-category]").forEach((item) => item.classList.remove("is-active")); botao.classList.add("is-active"); estado.busca = botao.dataset.category ?? ""; $("#search-input").value = estado.busca; estado.pagina = 1; $("#admin-shell").classList.add("is-hidden"); $("#admin-page").classList.add("is-hidden"); $("#product-detail").classList.add("is-hidden"); $(".content-layout").classList.remove("is-hidden"); window.location.hash = ""; if (!estavaEmOutraPagina) carregarProdutos(); }));
configurarConta(); atualizarConta(); void carregarCategorias(); window.addEventListener("hashchange", renderizarRota); atualizarValoresPreco(); renderizarRota();
