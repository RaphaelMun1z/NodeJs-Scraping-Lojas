import "./styles.css";
import {
	ArrowLeft,
	ArrowRight,
	Braces,
	ChartNoAxesCombined,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock3,
	Download,
	ExternalLink,
	Filter,
	Globe2,
	Info,
	KeyRound,
	List,
	LogOut,
	Monitor,
	Package,
	Pencil,
	Plus,
	Printer,
	RotateCcw,
	Save,
	ScanSearch,
	Search,
	SearchCheck,
	ServerCog,
	Settings,
	ShieldCheck,
	Sparkles,
	Store,
	Timer,
	Trash2,
	TriangleAlert,
	Upload,
	X,
	createIcons,
} from "lucide";

const iconesLucide = {
	ArrowLeft,
	ArrowRight,
	Braces,
	ChartNoAxesCombined,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock3,
	Download,
	ExternalLink,
	Filter,
	Globe2,
	Info,
	KeyRound,
	List,
	LogOut,
	Monitor,
	Package,
	Pencil,
	Plus,
	Printer,
	RotateCcw,
	Save,
	ScanSearch,
	Search,
	SearchCheck,
	ServerCog,
	Settings,
	ShieldCheck,
	Sparkles,
	Store,
	Timer,
	Trash2,
	TriangleAlert,
	Upload,
	X,
};

const estado = {
	pagina: 1,
	limite: 20,
	totalPaginas: 0,
	itens: [],
	busca: "",
	categoria: "",
	fonte: "",
	precoMin: "",
	precoMax: "",
	apenasAtivos: true,
	ordenacao: "desconto",
};
const $ = (seletor) => document.querySelector(seletor);
let logosFontesConfiguradas = {};
let nomesFontesConfiguradas = {};
function formatarErroApi(dados, fallback) {
	const detalhes = Array.isArray(dados?.detalhes)
		? dados.detalhes
				.map((item) =>
					item.campo && item.mensagem
						? `${item.campo}: ${item.mensagem}`
						: item.mensagem,
				)
				.filter(Boolean)
		: [];
	return [dados?.erro, ...detalhes].filter(Boolean).join(" ") || fallback;
}
function fecharDialogoPersonalizado(dialogo) {
	dialogo?.closest(".custom-dialog-layer")?.remove();
}
function abrirDialogoPersonalizado({
	titulo,
	descricao = "",
	campos = [],
	confirmar = "Confirmar",
	variante = "default",
	validar = null,
}) {
	return new Promise((resolver) => {
		const camada = document.createElement("div");
		camada.className = "custom-dialog-layer";
	camada.innerHTML = `<section class="custom-dialog ${variante === "danger" ? "custom-dialog-danger" : ""}" role="dialog" aria-modal="true" aria-labelledby="custom-dialog-title"><div class="custom-dialog-header"><div><h2 id="custom-dialog-title">${escaparHtml(titulo)}</h2>${descricao ? `<p>${escaparHtml(descricao)}</p>` : ""}</div><button type="button" class="custom-dialog-close" aria-label="Fechar"><i data-lucide="x" aria-hidden="true"></i></button></div><form class="custom-dialog-form"><div class="custom-dialog-fields">${campos.map((campo) => `<label>${escaparHtml(campo.rotulo)}<input name="${escaparHtml(campo.nome)}" type="${campo.tipo ?? "text"}" value="${escaparHtml(campo.valor ?? "")}" ${campo.autofocus ? "autofocus" : ""} ${campo.required ? "required" : ""} /></label>`).join("")}</div><div class="custom-dialog-feedback" aria-live="polite"></div><div class="custom-dialog-actions"><button type="button" class="secondary-button custom-dialog-cancel">Cancelar</button><button type="submit" class="${variante === "danger" ? "danger-button" : "primary-button"}">${escaparHtml(confirmar)}</button></div></form></section>`;
		document.body.append(camada);
		const formulario = camada.querySelector("form");
		const fechar = (valor = null) => {
			fecharDialogoPersonalizado(camada);
			resolver(valor);
		};
		camada
			.querySelector(".custom-dialog-close")
			.addEventListener("click", () => fechar());
		camada
			.querySelector(".custom-dialog-cancel")
			.addEventListener("click", () => fechar());
		camada.addEventListener("click", (evento) => {
			if (evento.target === camada) fechar();
		});
		formulario.addEventListener("submit", async (evento) => {
			evento.preventDefault();
			const valores = Object.fromEntries(new FormData(formulario));
			const feedback = formulario.querySelector(
				".custom-dialog-feedback",
			);
			const botao = formulario.querySelector("button[type='submit']");
			if (validar) {
				botao.disabled = true;
				feedback.textContent = "Validando...";
				try {
					const erro = await validar(valores);
					if (erro) {
						feedback.textContent = erro;
						return;
					}
				} catch (erro) {
					feedback.textContent =
						erro instanceof Error
							? erro.message
							: "Não foi possível validar os dados.";
					return;
				} finally {
					botao.disabled = false;
				}
			}
			fechar(valores);
		});
		camada.querySelector("input")?.focus();
	});
}
async function mostrarMensagemPersonalizada(
	titulo,
	mensagem,
	variante = "default",
) {
	await abrirDialogoPersonalizado({
		titulo,
		descricao: mensagem,
		confirmar: "Entendi",
		variante,
	});
}
async function executarResetTotalComSenha(zona) {
	const dadosSenha = await abrirDialogoPersonalizado({
		titulo: "Reset total do sistema",
		descricao: "Informe a senha do administrador para continuar.",
		campos: [
			{
				nome: "senha",
				rotulo: "Senha do administrador",
				tipo: "password",
				required: true,
				autofocus: true,
			},
		],
		confirmar: "Validar senha",
		variante: "danger",
		validar: async ({ senha }) => {
			const validacao = await fetch(
				"/api/admin/configuracoes/scraping/reset-total/validar-senha",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token": obterTokenCsrf(),
					},
					body: JSON.stringify({ senha }),
				},
			);
			if (validacao.ok) return "";
			const dados = await validacao.json();
			return formatarErroApi(dados, "Senha do administrador inválida.");
		},
	});
	if (!dadosSenha) return;
	const feedback = zona.querySelector(".admin-feedback");
	try {
		const validacao = await fetch(
			"/api/admin/configuracoes/scraping/reset-total/validar-senha",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": obterTokenCsrf(),
				},
				body: JSON.stringify({ senha: dadosSenha.senha }),
			},
		);
		if (!validacao.ok) {
			const dados = await validacao.json();
			throw new Error(
				formatarErroApi(dados, "Senha do administrador inválida."),
			);
		}
		const confirmacao = await abrirDialogoPersonalizado({
			titulo: "Confirmar reset total",
			descricao:
				"Esta ação não pode ser desfeita. Digite RESETAR SISTEMA para confirmar.",
			campos: [
				{
					nome: "confirmacao",
					rotulo: "Texto de confirmação",
					required: true,
					autofocus: true,
				},
			],
			confirmar: "Resetar sistema",
			variante: "danger",
			validar: ({ confirmacao: texto }) =>
				texto === "RESETAR SISTEMA"
					? ""
					: "O texto não corresponde. Digite exatamente RESETAR SISTEMA para tentar novamente.",
		});
		if (!confirmacao) return;
		const botao = zona.querySelector("#reset-system");
		botao.disabled = true;
		zona.classList.add("is-saving");
		feedback.textContent = "";
		const resposta = await fetch(
			"/api/admin/configuracoes/scraping/reset-total",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": obterTokenCsrf(),
				},
				body: JSON.stringify({
					senha: dadosSenha.senha,
					confirmacao: confirmacao.confirmacao,
				}),
			},
		);
		const resultado = await resposta.json();
		if (!resposta.ok)
			throw new Error(
				formatarErroApi(
					resultado,
					"Não foi possível resetar o sistema.",
				),
			);
		feedback.className = "admin-feedback success";
		feedback.textContent =
			"Reset concluído. Redirecionando para a página inicial...";
		setTimeout(() => {
			window.location.hash = "";
			window.location.reload();
		}, 900);
	} catch (erro) {
		feedback.className = "admin-feedback error";
		feedback.textContent =
			erro instanceof Error
				? erro.message
				: "Não foi possível resetar o sistema.";
	} finally {
		zona.classList.remove("is-saving");
		const botao = zona.querySelector("#reset-system");
		if (botao) botao.disabled = false;
	}
}
async function confirmarLimpezaProdutosPersonalizada() {
	const confirmacao = await abrirDialogoPersonalizado({
		titulo: "Limpar produtos",
		descricao:
			"Esta ação removerá todos os produtos, históricos e índices do Elasticsearch. Digite reset para confirmar.",
		campos: [
			{
				nome: "confirmacao",
				rotulo: "Confirmação",
				required: true,
				autofocus: true,
			},
		],
		confirmar: "Limpar produtos",
		variante: "danger",
	});
	if (!confirmacao || confirmacao.confirmacao !== "reset") {
		if (confirmacao)
			await mostrarMensagemPersonalizada(
				"Confirmação não realizada",
				"Digite exatamente reset para continuar.",
				"danger",
			);
		return;
	}
	const botao = $("#reset-products");
	botao.disabled = true;
	botao.classList.add("is-saving");
	try {
		const resposta = await fetch(
			"/api/admin/configuracoes/scraping/limpar-produtos",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": obterTokenCsrf(),
				},
				body: JSON.stringify(confirmacao),
			},
		);
		const dados = await resposta.json();
		if (!resposta.ok)
			throw new Error(
				formatarErroApi(dados, "Não foi possível limpar os produtos."),
			);
		await mostrarMensagemPersonalizada(
			"Limpeza concluída",
			`Produtos: ${dados.dados.itens}; históricos: ${dados.dados.historico}; documentos indexados: ${dados.dados.indexados}.`,
		);
	} catch (erro) {
		await mostrarMensagemPersonalizada(
			"Não foi possível limpar os produtos",
			erro.message,
			"danger",
		);
	} finally {
		botao.disabled = false;
		botao.classList.remove("is-saving");
	}
}
async function carregarSistema() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML =
		'<div class="admin-header"><div><h1>Sistema</h1><p class="admin-description">Ações operacionais e de manutenção do sistema.</p></div></div><section class="admin-danger-zone"><div><h2>Limpeza dos produtos</h2><p>Remove os produtos, o histórico de preços e os documentos indexados no Elasticsearch.</p></div><button id="reset-products" class="danger-button" type="button">Limpar produtos</button></section><section class="admin-action-zone"><div><h2>Busca manual</h2><p>Inicie uma coleta agora sem esperar o próximo horário agendado.</p></div><button id="run-scraping-now" class="primary-button" type="button">Iniciar busca</button></section>';
	$("#reset-products").addEventListener("click", () =>
		void confirmarLimpezaProdutosPersonalizada(),
	);
	$("#run-scraping-now").addEventListener("click", iniciarBuscaAgora);
	configurarResetTotal();
	organizarPaginaSistema();
	agendarAtualizacaoIcones();
}
async function salvarNovaFonteBasicaInterna(linha) {
	const nome = linha
		.querySelector("input[name='new-source-name']")
		?.value.trim();
	const feedback = (mensagem, tipo = "error") => {
		let area = linha.querySelector(".new-source-feedback");
		if (!area) {
			area = document.createElement("div");
			area.className = "new-source-feedback";
			linha.querySelector(".new-source-actions")?.before(area);
		}
		area.className = `new-source-feedback ${tipo}`;
		area.textContent = mensagem;
	};
	if (!nome) {
		feedback("Informe o nome da fonte.");
		linha.querySelector("input[name='new-source-name']")?.focus();
		return;
	}
	const fonte = nome
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	if (!fonte) {
		feedback("Informe um nome válido para a fonte.");
		return;
	}
	const arquivo = linha.querySelector("input[name='new-source-logo']")
		?.files?.[0];
	if (arquivo && arquivo.size > 700 * 1024) {
		feedback("A logo deve ter no máximo 700 KB.");
		return;
	}
	if (
		arquivo &&
		!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
			arquivo.type,
		)
	) {
		feedback("Use uma logo PNG, JPEG, WebP ou SVG.");
		return;
	}
	const logo = arquivo
		? await new Promise((resolver) => {
				const leitor = new FileReader();
				leitor.onload = () => resolver(String(leitor.result ?? ""));
				leitor.readAsDataURL(arquivo);
			})
		: "";
	const resposta = await fetch("/api/admin/configuracoes/scraping/fontes", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-CSRF-Token": obterTokenCsrf(),
		},
		body: JSON.stringify({
			fonte,
			nome,
			logo,
			url: "",
			ativa: false,
			seletores: {
				item: "",
				titulo: "",
				preco: "",
				precoAntigo: "",
				imagem: "",
				url: "",
				paginaVirtualizada: false,
				carregarMais: "",
			},
		}),
	});
	const dados = await resposta.json();
	if (!resposta.ok) {
		feedback(
				formatarErroApi(dados, "Não foi possível adicionar a fonte."),
		);
		return;
	}
	window.location.hash = `#admin/fontes/${fonte}`;
}
async function salvarNovaFonteBasica(linha) {
	linha.classList.add("is-saving");
	const botao = linha.querySelector(".confirm-new-source");
	if (botao) botao.disabled = true;
	try {
		return await salvarNovaFonteBasicaInterna(linha);
	} catch (erro) {
		let feedback = linha.querySelector(".new-source-feedback");
		if (!feedback) {
			feedback = document.createElement("div");
			linha.querySelector(".new-source-actions")?.before(feedback);
		}
		feedback.className = "new-source-feedback error";
		feedback.textContent = erro.message;
	} finally {
		linha.classList.remove("is-saving");
		if (botao) botao.disabled = false;
	}
}
async function salvarStatusFonte(evento) {
	const linha = evento.currentTarget.closest(".admin-source");
	linha?.classList.add("is-saving");
	try {
		return await salvarStatusFonteInterno(evento);
	} finally {
		linha?.classList.remove("is-saving");
	}
}
async function executarBuscaManual() {
	const container = $(".manual-search-page");
	const tabela = $("#manual-search-body");
	container?.classList.add("is-saving");
	if (tabela)
		tabela.innerHTML = Array.from(
			{ length: 6 },
			() =>
				'<tr class="manual-search-skeleton-row"><td><span class="skeleton skeleton-line short"></span></td><td><span class="skeleton skeleton-line"></span></td><td><span class="skeleton skeleton-line price"></span></td><td><span class="skeleton skeleton-line price"></span></td><td><span class="skeleton skeleton-line short"></span></td></tr>',
		).join("");
	try {
		return await executarBuscaManualInterna();
	} finally {
		container?.classList.remove("is-saving");
	}
}
function renderizarCardPreviewProduto(item) {
	const desconto = calcularDesconto(item.precoAntigo, item.preco);
	return `<article class="product-card selector-preview-card"><div class="product-image">${item.imagemUrl ? `<img src="${escaparHtml(item.imagemUrl)}" alt="" loading="lazy" />` : '<span class="image-placeholder">Sem imagem</span>'}</div><div class="product-card-body"><div class="product-meta">${renderizarFonteComLogo(item.fonte, nomesFontesConfiguradas[item.fonte])}<span>•</span><span class="listing-age is-new"><i data-lucide="sparkles" aria-hidden="true"></i>Novo</span></div><h2>${escaparHtml(item.titulo || "Produto sem título")}</h2><div class="product-prices">${item.precoAntigo > item.preco ? `<span class="old-price">${formatarPreco(item.precoAntigo)}</span>` : ""}<div class="current-price-row"><strong class="product-price">${formatarPreco(item.preco)}</strong>${desconto ? `<span class="discount-badge">-${desconto}%</span>` : ""}</div></div></div></article>`;
}
function atualizarEstadoBotoesTeste() {
	document.querySelectorAll("[data-test-selectors]").forEach((botao) => {
		if (botao.dataset.busy === "true") return;
		const fonte = botao.dataset.testSelectors;
		const url =
			$(`input[name="url-${fonte}"]`)?.value ||
			$("#source-settings-form input[name='url']")?.value ||
			"";
		const obrigatoriosPreenchidos = [
			"item",
			"titulo",
			"preco",
			"imagem",
		].every((campo) =>
			Boolean($(`input[name="seletor-${campo}-${fonte}"]`)?.value.trim()),
		);
		const pronto = Boolean(url.trim()) && obrigatoriosPreenchidos;
		botao.disabled = !pronto;
		botao.classList.toggle("is-ready", pronto);
		botao.classList.toggle("is-unavailable", !pronto);
		botao.setAttribute("aria-disabled", String(!pronto));
	});
}

function abrirPreviewPagina(imagem, url) {
	const modal = document.createElement("div");
	modal.className = "selector-page-preview-modal";
	modal.innerHTML = `<div class="selector-page-preview-backdrop"></div><section class="selector-page-preview-dialog" role="dialog" aria-modal="true" aria-label="Prévia da página da loja"><header class="selector-page-preview-header"><div><h2>Prévia da página</h2><p>${escaparHtml(url)}</p></div><button class="icon-button" type="button" data-close-page-preview aria-label="Fechar"><i data-lucide="x" aria-hidden="true"></i></button></header><div class="selector-page-preview-body"><img alt="Captura da página da loja" /></div></section>`;
	modal.querySelector("img").src = imagem;
	const fechar = () => modal.remove();
	modal.querySelector("[data-close-page-preview]").addEventListener("click", fechar);
	modal.querySelector(".selector-page-preview-backdrop").addEventListener("click", fechar);
	document.body.append(modal);
	agendarAtualizacaoIcones();
}

async function testarSeletoresFonte(fonte) {
	const resultado = $(`[data-selector-result="${fonte}"]`);
	const botao = document.querySelector(`[data-test-selectors="${fonte}"]`);
	const url =
		$(`input[name="url-${fonte}"]`)?.value ||
		$("#source-settings-form input[name='url']")?.value ||
		"";
	if (!resultado || !url.trim() || botao?.dataset.busy === "true") return;
	if (botao) {
		botao.dataset.busy = "true";
		botao.disabled = true;
	}
	resultado.className = "selector-test-result is-loading";
	resultado.innerHTML = `<div class="selector-preview-grid selector-preview-loading">${Array.from({ length: 3 }, () => '<article class="product-card selector-preview-card skeleton-card"><div class="skeleton skeleton-image"></div><div class="product-card-body"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line price"></div></div></article>').join("")}</div>`;
	try {
		const resposta = await fetch(
			"/api/admin/configuracoes/scraping/testar-seletores",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": obterTokenCsrf(),
				},
				body: JSON.stringify({
					fonte,
					url,
					seletores: obterSeletoresDoFormulario(fonte),
				}),
			},
		);
		const dados = await resposta.json();
		if (!resposta.ok)
			throw new Error(
				formatarErroApi(dados, "Não foi possível testar os seletores."),
			);
		const produtos = dados.dados?.produtos ?? [];
		resultado.className = "selector-test-result success";
		resultado.innerHTML = `<strong>${dados.dados?.quantidadeProdutos ?? produtos.length} produto(s) encontrado(s)</strong>${produtos.length ? `<div class="selector-preview-grid">${produtos.map(renderizarCardPreviewProduto).join("")}</div>` : '<p class="selector-preview-empty">Nenhum produto foi encontrado com os seletores informados.</p>'}`;
		if (dados.dados?.previewImagem) {
			const preview = document.createElement("button");
			preview.className = "secondary-button selector-page-preview-button";
			preview.type = "button";
			preview.textContent = "Visualizar página capturada";
			preview.addEventListener("click", () => abrirPreviewPagina(dados.dados.previewImagem, url));
			resultado.append(preview);
		}
	} catch (erro) {
		resultado.className = "selector-test-result error";
		resultado.textContent =
			erro instanceof Error
				? erro.message
				: "Não foi possível testar os seletores.";
	} finally {
		if (botao) {
			botao.dataset.busy = "false";
			botao.disabled = false;
		}
	}
	atualizarEstadoBotoesTeste();
}
document.addEventListener(
	"click",
	(evento) => {
		const alvo =
			evento.target instanceof Element
				? evento.target.closest("[data-test-selectors]")
				: null;
		if (!alvo) return;
		evento.preventDefault();
		evento.stopImmediatePropagation();
		void testarSeletoresFonte(alvo.dataset.testSelectors);
	},
	true,
);
document.addEventListener("input", (evento) => {
	if (
		evento.target instanceof HTMLInputElement &&
		(evento.target.name === "url" ||
			evento.target.name.startsWith("url-") ||
			evento.target.name.startsWith("seletor-"))
	)
		atualizarEstadoBotoesTeste();
});
function abrirAnalisadorHtml(fonte) {
	const modal = document.createElement("div");
	modal.className = "selector-analyzer-modal";
	modal.innerHTML = `<div class="selector-analyzer-backdrop"></div><section class="selector-analyzer-dialog" role="dialog" aria-modal="true" aria-labelledby="selector-analyzer-title"><header class="selector-analyzer-header"><div><h2 id="selector-analyzer-title">Analisar HTML do produto</h2><p>Cole dois ou três cards para a IA identificar os seletores CSS.</p></div><button class="icon-button" type="button" data-close-selector-analyzer aria-label="Fechar"><i data-lucide="x"></i></button></header><div class="selector-analyzer-body"><div class="selector-html-toolbar"><label class="selector-html-label" for="selector-html-input">HTML dos cards <span class="required-mark">*</span></label><button class="text-button selector-format-button" type="button" data-format-selector-html><i data-lucide="braces"></i>Formatar HTML</button></div><div class="selector-code-editor"><div class="selector-code-gutter" aria-hidden="true"><pre></pre></div><textarea id="selector-html-input" class="selector-html-editor" placeholder="Cole aqui o HTML de um ou mais cards de produto..." spellcheck="false" wrap="off"></textarea></div><div class="selector-analyzer-actions"><button class="secondary-button" type="button" data-analyze-selector-html><i data-lucide="sparkles"></i>Analisar HTML</button><span class="selector-analyzer-status" aria-live="polite"></span></div><div class="selector-analyzer-result" aria-live="polite"></div></div></section>`;
	document.body.append(modal);
	createIcons({ icons: iconesLucide });
	const fechar = () => modal.remove();
	const editor = modal.querySelector("#selector-html-input");
	const linhas = modal.querySelector(".selector-code-gutter pre");
	const atualizarLinhas = () => {
		const quantidade = Math.max(1, editor.value.split("\n").length);
		linhas.textContent = Array.from({ length: quantidade }, (_, indice) => indice + 1).join("\n");
	};
	editor.addEventListener("input", atualizarLinhas);
	editor.addEventListener("scroll", () => {
		modal.querySelector(".selector-code-gutter").scrollTop = editor.scrollTop;
	});
	atualizarLinhas();
	const formatar = () => {
		const inicio = editor.selectionStart;
		editor.value = formatarHtmlParaEdicao(editor.value);
		atualizarLinhas();
		editor.selectionStart = editor.selectionEnd = Math.min(
			inicio,
			editor.value.length,
		);
	};
	editor.addEventListener("paste", (evento) => {
		const texto = evento.clipboardData?.getData("text/plain") ?? "";
		if (!texto) return;
		evento.preventDefault();
		const inicio = editor.selectionStart;
		editor.setRangeText(
			formatarHtmlParaEdicao(texto),
			inicio,
			editor.selectionEnd,
			"end",
		);
		atualizarLinhas();
	});
	editor.addEventListener("keydown", (evento) => {
		if (
			(evento.ctrlKey || evento.metaKey) &&
			evento.shiftKey &&
			evento.key.toLowerCase() === "f"
		) {
			evento.preventDefault();
			formatar();
			return;
		}
		if (evento.key === "Tab") {
			evento.preventDefault();
			editor.setRangeText(
				"  ",
				editor.selectionStart,
				editor.selectionEnd,
				"end",
			);
			return;
		}
		if (evento.key !== "Enter") return;
		const linha =
			editor.value.slice(0, editor.selectionStart).split("\n").pop() ??
			"";
		const recuo = linha.match(/^\s*/)?.[0] ?? "";
		const abre =
			/<([a-z][^/!\s>]*)(?:\s[^>]*)?>\s*$/i.test(linha) &&
			!/<(br|hr|img|input|meta|link|source|area|base|col|embed|param|track|wbr)(?:\s[^>]*)?\/?\s*>$/i.test(
				linha,
			);
		const fecha = /^\s*<\//.test(editor.value.slice(editor.selectionStart));
		editor.setRangeText(
			`\n${recu}${abre ? "  " : ""}`,
			editor.selectionStart,
			editor.selectionEnd,
			"end",
		);
		if (fecha && abre)
			editor.setRangeText(
				"\n" + recuo,
				editor.selectionStart,
				editor.selectionEnd,
				"end",
			);
	});
	modal
		.querySelector("[data-format-selector-html]")
		.addEventListener("click", formatar);
	modal
		.querySelector("[data-close-selector-analyzer]")
		.addEventListener("click", fechar);
	modal
		.querySelector(".selector-analyzer-backdrop")
		.addEventListener("click", fechar);
	modal
		.querySelector("[data-analyze-selector-html]")
		.addEventListener("click", async () => {
			const botao = modal.querySelector("[data-analyze-selector-html]");
			const status = modal.querySelector(".selector-analyzer-status");
			const resultado = modal.querySelector(".selector-analyzer-result");
			const html = modal
				.querySelector("#selector-html-input")
				.value.trim();
			if (!html) {
				status.textContent = "Cole o HTML antes de analisar.";
				return;
			}
			botao.disabled = true;
			status.textContent = "Analisando o HTML...";
			resultado.className = "selector-analyzer-result is-loading";
			resultado.innerHTML =
				'<div class="selector-analysis-table selector-analysis-skeleton">' +
				Array.from(
					{ length: 7 },
					() =>
						'<div class="selector-analysis-row"><span></span><span></span><strong></strong></div>',
				).join("") +
				"</div>";
			try {
				const resposta = await fetch(
					"/api/admin/configuracoes/scraping/analisar-html",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRF-Token": obterTokenCsrf(),
						},
						body: JSON.stringify({ html }),
					},
				);
				const dados = await resposta.json();
				if (!resposta.ok)
					throw new Error(
						formatarErroApi(
							dados,
							"Não foi possível analisar o HTML.",
						),
					);
				const analise = dados.dados ?? {};
				const campos = analise.seletores ?? {};
				const mapa = [
					["item", "Container do produto"],
					["titulo", "Título"],
					["preco", "Preço atual"],
					["precoAntigo", "Preço antigo"],
					["imagem", "Imagem"],
					["url", "Link do produto"],
					["carregarMais", "Botão carregar mais"],
				];
				const linhas = mapa
					.map(([campo, rotulo]) => {
						const seletor =
							typeof campos[campo] === "string"
								? campos[campo]
								: "";
						const confianca = Number(
							analise.confianca?.[campo] ?? 0,
						);
						return `<div class="selector-analysis-row"><span>${rotulo}</span><code>${escaparHtml(seletor || "Não identificado")}</code><strong>${seletor ? Math.round(confianca * 100) + "%" : "—"}</strong></div>`;
					})
					.join("");
				const observacoes =
					Array.isArray(analise.observacoes) &&
					analise.observacoes.length
						? `<ul>${analise.observacoes.map((item) => `<li>${escaparHtml(item)}</li>`).join("")}</ul>`
						: "";
				resultado.className = "selector-analyzer-result success";
				resultado.innerHTML = `<h3>Seletores sugeridos</h3><div class="selector-analysis-table">${linhas}</div>${observacoes}<button class="primary-button selector-apply-button" type="button" data-apply-selector-analysis><i data-lucide="check"></i>Aplicar seletores</button>`;
				createIcons({ icons: iconesLucide });
				status.textContent =
					"Revise as sugestões ou aplique-as aos campos da fonte.";
				resultado
					.querySelector("[data-apply-selector-analysis]")
					.addEventListener("click", () => {
						document
							.querySelector(
								"#source-settings-form .edit-fields-button",
							)
							?.click();
						for (const [campo] of mapa) {
							const entrada = document.querySelector(
								`input[name="seletor-${campo}-${fonte}"]`,
							);
							if (
								entrada &&
								typeof campos[campo] === "string" &&
								campos[campo]
							)
								entrada.value = campos[campo];
						}
						atualizarEstadoBotoesTeste();
						modal.remove();
						document
							.querySelector(
								"#source-settings-form .selector-config",
							)
							?.scrollIntoView({
								behavior: "smooth",
								block: "start",
							});
					});
			} catch (erro) {
				resultado.className = "selector-analyzer-result error";
				resultado.textContent =
					erro instanceof Error
						? erro.message
						: "Não foi possível analisar o HTML.";
				status.textContent = "";
			} finally {
				botao.disabled = false;
			}
		});
}
function formatarHtmlParaEdicao(html) {
	const tokens =
		String(html ?? "")
			.replace(/>\s+</g, "><")
			.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? [];
	const vazias = new Set([
		"area",
		"base",
		"br",
		"col",
		"embed",
		"hr",
		"img",
		"input",
		"link",
		"meta",
		"param",
		"source",
		"track",
		"wbr",
	]);
	let nivel = 0;
	const linhas = [];
	for (const token of tokens) {
		const valor = token.trim();
		if (!valor) continue;
		const fechamento = /^<\//.test(valor);
		if (fechamento) nivel = Math.max(0, nivel - 1);
		linhas.push("  ".repeat(nivel) + valor);
		const abertura =
			/^<([a-z][^/!\s>]*)(?:\s[^>]*)?>$/i.test(valor) &&
			!/\/\s*>$/.test(valor) &&
			!fechamento &&
			!vazias.has(
				(valor.match(/^<([a-z0-9]+)/i)?.[1] ?? "").toLowerCase(),
			);
		if (abertura) nivel += 1;
	}
	return linhas.join("\n");
}
document.addEventListener(
	"click",
	(evento) => {
		const alvo =
			evento.target instanceof Element
				? evento.target.closest("[data-analyze-html]")
				: null;
		if (!alvo) return;
		evento.preventDefault();
		evento.stopImmediatePropagation();
		abrirAnalisadorHtml(alvo.dataset.analyzeHtml);
	},
	true,
);
function atualizarIconesLucide() {
	const botoes = [
		["#search-form button", "search"],
		["#clear-filters", "rotate-ccw"],
		["#admin-login-form button", "arrow-right"],
		["#start-mfa", "key-round"],
		["#activate-mfa", "check"],
		["#run-manual-search", "search"],
		["#download-manual-csv", "download"],
		["#print-manual-search", "printer"],
		["#filter-monitor-history", "filter"],
		["#reset-products", "trash-2"],
		["#reset-system", "triangle-alert"],
		["#run-scraping-now", "search"],
		["#add-source-button", "plus"],
		["[data-test-selectors]", "search-check"],
		["[data-analyze-html]", "scan-search"],
		[".edit-source-button", "pencil"],
		[".delete-source-button", "trash-2"],
		[".edit-fields-button", "pencil"],
		[".cancel-fields-button", "x"],
		["#source-settings-form .primary-button", "save"],
		[".new-source-actions .primary-button", "arrow-right"],
		[".new-source-actions .secondary-button", "x"],
		[".admin-action-zone .primary-button", "search"],
	];
	botoes.forEach(([seletor, nome]) =>
		document.querySelectorAll(seletor).forEach((botao) => {
			if (botao.querySelector("svg, i[data-lucide]")) return;
			const icone = document.createElement("i");
			icone.setAttribute("data-lucide", nome);
			botao.append(icone);
		}),
	);
	createIcons({ icons: iconesLucide });
}

let atualizacaoIconesAgendada = false;
function agendarAtualizacaoIcones() {
	if (atualizacaoIconesAgendada) return;
	atualizacaoIconesAgendada = true;
	window.requestAnimationFrame(() => {
		atualizacaoIconesAgendada = false;
		observadorIcones.takeRecords();
		observadorIcones.disconnect();
		atualizarIconesLucide();
		configurarTooltipsInformativos();
		observadorIcones.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
}
const observadorIcones = new MutationObserver(agendarAtualizacaoIcones);
observadorIcones.observe(document.body, { childList: true, subtree: true });
const grade = $("#products-grid");
const gradeNovidades = $("#new-products-grid");
// Mantém os filtros no topo e os destaques antes da grade de produtos.
$(".products-area").insertBefore($("#new-products"), $("#loading"));
const carregando = $("#loading");
const vazio = $("#empty");
let temporizadorFiltros;
let temporizadorSugestoes;
let controladorSugestoes;
let graficoHistorico;
const estadoNovidades = { itens: [], pagina: 1, porPagina: 4 };

function formatarPreco(valor) {
	return valor === undefined || valor === null
		? "Preço não informado"
		: new Intl.NumberFormat("pt-BR", {
				style: "currency",
				currency: "BRL",
			}).format(valor);
}
function capitalizarNomeFonte(nome) {
	const valor = String(nome ?? "").trim();
	return valor
		? valor.charAt(0).toLocaleUpperCase("pt-BR") + valor.slice(1)
		: valor;
}
function formatarFonte(fonte, nomeExibicao = "") {
	return capitalizarNomeFonte(
		nomeExibicao || nomesFontesConfiguradas[fonte] || fonte,
	);
}
function renderizarFonteComLogo(fonte, nomeExibicao = "") {
	const logo = logosFontesConfiguradas[fonte];
	return `<span class="source-identity">${logo ? `<img src="${escaparHtml(logo)}" alt="" aria-hidden="true" />` : '<i data-lucide="store" class="source-generic-icon" aria-hidden="true"></i>'}${escaparHtml(formatarFonte(fonte, nomeExibicao))}</span>`;
}
function removerLogoDaAtualizacao(fonte) {
	const { logo: _logo, ...dados } = fonte;
	return dados;
}
async function carregarFontesParaFiltros() {
	try {
		const resposta = await fetch("/api/fontes");
		if (!resposta.ok) return;
		const fontes = (await resposta.json()).dados ?? [];
		logosFontesConfiguradas = Object.fromEntries(
			fontes.map((item) => [item.fonte, item.logo ?? ""]),
		);
		nomesFontesConfiguradas = Object.fromEntries(
			fontes.map((item) => [item.fonte, item.nome ?? item.fonte]),
		);
		const filtro = $("#source-filter");
		if (filtro) {
			filtro.innerHTML = `<label class="radio-row"><input type="radio" name="source" value="" ${estado.fonte ? "" : "checked"} /> Todas as fontes</label>${fontes.map((item) => `<label class="radio-row"><input type="radio" name="source" value="${escaparHtml(item.fonte)}" ${estado.fonte === item.fonte ? "checked" : ""} /> ${renderizarFonteComLogo(item.fonte, item.nome)}</label>`).join("")}`;
			filtro.querySelectorAll("input[name='source']").forEach((radio) =>
				radio.addEventListener("change", () => {
					estado.fonte = radio.value;
					aplicarFiltrosAutomaticamente();
				}),
			);
		}
	} catch {
		/* Os filtros nativos permanecem disponíveis se a API estiver indisponível. */
	}
}
async function carregarFontesNosFiltrosAdministrativos() {
	try {
		const resposta = await fetch("/api/admin/configuracoes/scraping");
		if (!resposta.ok) return;
		const fontes = (await resposta.json()).dados?.fontes ?? [];
		const opcoes = fontes
			.map(
				(item) =>
					`<label><input type="checkbox" name="manual-search-source" value="${escaparHtml(item.fonte)}" checked /> ${renderizarFonteComLogo(item.fonte, item.nome)}</label>`,
			)
			.join("");
		const busca = $(".manual-search-sources");
		if (busca) busca.innerHTML = `<legend>Fontes</legend>${opcoes}`;
		const historico = $(".monitor-history-sources");
		if (historico) {
			const selecionada =
				historico.querySelector(
					"input[name='monitor-history-source']:checked",
				)?.value ?? "";
			historico.innerHTML = `<legend>Fonte</legend><label><input type="radio" name="monitor-history-source" value="" ${selecionada ? "" : "checked"} /> Todas</label>${fontes.map((item) => `<label><input type="radio" name="monitor-history-source" value="${escaparHtml(item.fonte)}" ${selecionada === item.fonte ? "checked" : ""} /> ${renderizarFonteComLogo(item.fonte, item.nome)}</label>`).join("")}`;
			historico
				.querySelectorAll("input[name='monitor-history-source']")
				.forEach((campo) =>
					campo.addEventListener("change", aplicarFiltrosHistorico),
				);
		}
	} catch {
		/* A tela continua operando com as opções disponíveis. */
	}
}
function configurarResetTotal() {
	const zonaProdutos = $(".admin-danger-zone");
	if (!zonaProdutos || $(".system-reset-zone")) return;
	const zona = document.createElement("section");
	zona.className = "admin-danger-zone system-reset-zone";
	zona.innerHTML =
		'<div><h2>Reset total do sistema</h2><p>Remove todos os dados operacionais e mantém somente o usuário administrador.</p></div><button id="reset-system" class="danger-button" type="button">Resetar sistema</button><div class="admin-feedback"></div>';
	zonaProdutos.after(zona);
	zona.querySelector("#reset-system").addEventListener("click", () =>
		void executarResetTotalComSenha(zona),
	);
}
function organizarPaginaSistema() {
	const pagina = $("#admin-page");
	if (
		!pagina ||
		pagina.dataset.systemOrdered ||
		!pagina.querySelector(".system-reset-zone")
	)
		return;
	const cabecalho = pagina.querySelector(".admin-header");
	const busca = pagina.querySelector(".admin-action-zone");
	const limpeza = pagina.querySelector(
		".admin-danger-zone:not(.system-reset-zone)",
	);
	const reset = pagina.querySelector(".system-reset-zone");
	if (!cabecalho || !busca || !limpeza || !reset) return;
	cabecalho.querySelector(".detail-source")?.remove();
	const divisor = document.createElement("div");
	divisor.className = "system-alert-divider";
	divisor.innerHTML = "<span>Zona de alerta</span>";
	cabecalho.after(busca, divisor, limpeza, reset);
	pagina.dataset.systemOrdered = "true";
}
function escaparHtml(valor = "") {
	return String(valor).replace(
		/[&<>'"]/g,
		(caractere) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				"'": "&#39;",
				'"': "&quot;",
			})[caractere],
	);
}
function ocultarSugestoes() {
	$("#search-suggestions").classList.add("is-hidden");
}
function renderizarSugestoes(titulos) {
	const area = $("#search-suggestions");
	area.innerHTML = titulos
		.map(
			(titulo) =>
			`<button type="button" role="option" data-suggestion="${escaparHtml(titulo)}"><span aria-hidden="true"><i data-lucide="search"></i></span>${escaparHtml(titulo)}</button>`,
		)
		.join("");
	area.classList.toggle("is-hidden", titulos.length === 0);
	area.querySelectorAll("[data-suggestion]").forEach((botao) =>
		botao.addEventListener("click", () => {
			$("#search-input").value = botao.dataset.suggestion;
			estado.busca = botao.dataset.suggestion;
			estado.pagina = 1;
			ocultarSugestoes();
			carregarProdutos();
		}),
	);
}
async function carregarSugestoes(texto) {
	clearTimeout(temporizadorSugestoes);
	controladorSugestoes?.abort();
	if (texto.trim().length < 2) {
		ocultarSugestoes();
		return;
	}
	temporizadorSugestoes = setTimeout(async () => {
		controladorSugestoes = new AbortController();
		try {
			const resposta = await fetch(
				`/api/itens/sugestoes?q=${encodeURIComponent(texto.trim())}`,
				{ signal: controladorSugestoes.signal },
			);
			if (!resposta.ok) return ocultarSugestoes();
			renderizarSugestoes((await resposta.json()).dados ?? []);
		} catch (erro) {
			if (erro.name === "AbortError") return;
			ocultarSugestoes();
		}
	}, 250);
}
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
		area.innerHTML = `<label class="radio-row category-all-row"><input type="radio" name="category" value="" ${estado.categoria ? "" : "checked"} /> Todas as categorias</label>${gruposOrdenados
			.map(
				([principal, subcategorias]) =>
					`<div class="category-filter-group"><div class="category-filter-heading"><label class="radio-row"><input type="radio" name="category" value="${escaparHtml(principal)}" ${estado.categoria === principal ? "checked" : ""} /> <strong>${escaparHtml(principal)}</strong></label></div>${
						subcategorias.length
							? `<div class="category-subcategories">${subcategorias
									.sort((a, b) =>
										a.localeCompare(b, "pt-BR", {
											sensitivity: "base",
										}),
									)
									.map((subcategoria) => {
										const valor = `${principal} > ${subcategoria}`;
										return `<label class="radio-row"><input type="radio" name="category" value="${escaparHtml(valor)}" ${estado.categoria === valor ? "checked" : ""} /> <span>${escaparHtml(subcategoria)}</span></label>`;
									})
									.join("")}</div>`
							: ""
					}</div>`,
			)
			.join("")}`;
		document.querySelectorAll("input[name='category']").forEach((radio) =>
			radio.addEventListener("change", () => {
				estado.categoria = radio.value;
				estado.pagina = 1;
				carregarProdutos();
			}),
		);
	} catch (erro) {
		area.innerHTML =
			'<span class="filter-load-error">Não foi possível carregar as categorias.</span>';
		console.error(erro);
	}
}
function calcularDesconto(precoAntigo, preco) {
	return !precoAntigo || !preco || precoAntigo <= preco
		? null
		: Math.round((1 - preco / precoAntigo) * 100);
}
function renderizarSkeletonProdutos(quantidade = 8) {
	return Array.from(
		{ length: quantidade },
		() =>
			'<article class="product-card skeleton-card"><div class="skeleton skeleton-image"></div><div class="product-card-body"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line price"></div><div class="skeleton skeleton-line footer"></div></div></article>',
	).join("");
}
function renderizarSkeletonPainel(quantidade = 3) {
	return Array.from(
		{ length: quantidade },
		() =>
			'<div class="skeleton-panel-card"><span class="skeleton skeleton-line short"></span><span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line medium"></span></div>',
	).join("");
}
function renderizarTempoListagem(item) {
	if (!item.primeiraColetaEm) return "";
	const dias = Math.floor(
		(Date.now() - new Date(item.primeiraColetaEm).getTime()) / 86400000,
	);
	return dias < 1
		? '<span class="listing-age is-new"><i data-lucide="sparkles" aria-hidden="true"></i>Novo</span>'
		: `<span class="listing-age">Há ${dias} ${dias === 1 ? "dia" : "dias"}</span>`;
}
function resumirTituloOferta(titulo, limite = 125) {
	const texto = String(titulo ?? "").trim();
	if (texto.length <= limite) return texto;
	return `${texto.slice(0, limite).replace(/\s+\S*$/, "")}…`;
}

function agruparPontosGrafico(pontos, periodo) {
	const agrupados = new Map();
	for (const ponto of pontos) {
		const data = new Date(ponto.coletadoEm);
		const referencia =
			periodo === "day"
				? data.toLocaleTimeString("pt-BR", {
						hour: "2-digit",
						minute: "2-digit",
					})
				: data.toLocaleDateString("pt-BR");
		// Mantém somente o registro mais recente da mesma referência.
		agrupados.set(referencia, ponto);
	}
	return [...agrupados.entries()].map(([referencia, ponto]) => ({
		referencia,
		ponto,
	}));
}

function renderizarFaixaPrecos(pontos, precoAtual) {
	const precos = pontos
		.map((ponto) => Number(ponto.preco))
		.filter((preco) => Number.isFinite(preco));
	const atual = Number(precoAtual);
	if (!precos.length || !Number.isFinite(atual)) return "";

	const menor = Math.min(...precos);
	const maior = Math.max(...precos);
	const posicaoAtual = menor === maior
		? 50
		: Math.min(100, Math.max(0, ((maior - atual) / (maior - menor)) * 100));

	return `<div class="price-range" aria-label="Faixa de preços do período"><div class="price-range-heading"><strong>Faixa de preços</strong></div><div class="price-range-track"><span class="price-range-point price-range-high" style="left: 0%"><span class="price-range-value">${formatarPreco(maior)}</span><span class="price-range-dot" aria-hidden="true"></span></span><span class="price-range-point price-range-current" style="left: ${posicaoAtual}%"><span class="price-range-value">${formatarPreco(atual)}</span><span class="price-range-dot" aria-hidden="true"></span></span><span class="price-range-point price-range-low" style="left: 100%"><span class="price-range-value">${formatarPreco(menor)}</span><span class="price-range-dot" aria-hidden="true"></span></span></div><div class="price-range-labels"><span>Maior preço</span><span>Preço atual</span><span>Menor preço</span></div></div>`;
}

function renderizarPrecos(item) {
	const desconto = calcularDesconto(item.precoAntigo, item.preco);
	return `<div class="product-prices">${item.precoHistorico ? '<span class="historical-price-badge"><i data-lucide="sparkles" aria-hidden="true"></i>Preço histórico</span>' : ""}${item.precoAntigo > item.preco ? `<span class="old-price">${formatarPreco(item.precoAntigo)}</span>` : ""}<div class="current-price-row"><strong class="product-price">${formatarPreco(item.preco)}</strong>${desconto ? `<span class="discount-badge">-${desconto}%</span>` : ""}</div></div>`;
}

function renderizarCardNovidade(item) {
	const desconto = calcularDesconto(item.precoAntigo, item.preco);
	return `<article class="product-card new-product-card"><a class="product-image" href="#produto/${escaparHtml(item._id)}">${item.imagemUrl ? `<img src="${escaparHtml(item.imagemUrl)}" alt="${escaparHtml(item.titulo)}" loading="lazy" />` : `<span class="image-placeholder">Sem imagem</span>`}</a><div class="product-card-body"><div class="product-meta">${renderizarFonteComLogo(item.fonte)}<span>•</span>${renderizarTempoListagem(item)}</div><h2><a href="#produto/${escaparHtml(item._id)}">${escaparHtml(item.titulo)}</a></h2><div class="product-prices">${item.precoAntigo > item.preco ? `<span class="old-price">${formatarPreco(item.precoAntigo)}</span>` : ""}<div class="current-price-row"><strong class="product-price">${formatarPreco(item.preco)}</strong>${desconto ? `<span class="discount-badge">-${desconto}%</span>` : ""}</div></div><div class="product-footer"><span>Atualizado em ${new Date(item.ultimaColetaEm).toLocaleDateString("pt-BR")}</span><span class="external-link"><i data-lucide="external-link" aria-hidden="true"></i></span></div></div></article>`;
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
	const totalPaginas = Math.ceil(
		estadoNovidades.itens.length / estadoNovidades.porPagina,
	);
	const inicio = (estadoNovidades.pagina - 1) * estadoNovidades.porPagina;
	const itensNovidades = estadoNovidades.itens.slice(
		inicio,
		inicio + estadoNovidades.porPagina,
	);
	gradeNovidades.innerHTML = itensNovidades
		.map(renderizarCardNovidade)
		.join("");
	gradeNovidades.querySelectorAll(".product-card").forEach((card, indice) => {
		if (itensNovidades[indice]?.precoHistorico) {
			card.classList.add("is-historical-price");
			card.querySelector(".product-prices")?.insertAdjacentHTML(
				"afterbegin",
				'<span class="historical-price-badge"><i data-lucide="sparkles" aria-hidden="true"></i>Preço histórico</span>',
			);
		}
	});
	$("#new-products-page").textContent =
		`${estadoNovidades.pagina} de ${totalPaginas}`;
	$("#new-products-previous").disabled = estadoNovidades.pagina <= 1;
	$("#new-products-next").disabled = estadoNovidades.pagina >= totalPaginas;
}

function renderizarProdutos() {
	const itens = [...estado.itens];
	grade.innerHTML = itens
		.map(
			(item) =>
				`<article class="product-card ${item.ativo === false ? "is-inactive" : ""}"><a class="product-image" href="#produto/${escaparHtml(item._id)}">${item.imagemUrl ? `<img src="${escaparHtml(item.imagemUrl)}" alt="${escaparHtml(item.titulo)}" loading="lazy" />` : `<span class="image-placeholder">Sem imagem</span>`}</a><div class="product-card-body"><div class="product-meta">${renderizarFonteComLogo(item.fonte)}<span>•</span>${renderizarTempoListagem(item)}${item.ativo === false ? '<span class="inactive-label">Inativo</span>' : ""}</div><h2><a href="#produto/${escaparHtml(item._id)}">${escaparHtml(item.titulo)}</a></h2>${renderizarPrecos(item)}<div class="product-footer"><span>Atualizado em ${new Date(item.ultimaColetaEm).toLocaleDateString("pt-BR")}</span><span class="external-link"><i data-lucide="external-link" aria-hidden="true"></i></span></div></div></article>`,
		)
		.join("");
	grade.querySelectorAll(".product-card").forEach((card, indice) => {
		if (itens[indice]?.precoHistorico)
			card.classList.add("is-historical-price");
	});
	vazio.classList.toggle("is-hidden", itens.length > 0);
}

function renderizarPaginacao() {
	const total = estado.totalPaginas;
	if (!total || total <= 1) {
		$("#pagination").innerHTML = "";
		return;
	}
	const inicio = Math.max(1, estado.pagina - 2);
	const fim = Math.min(total, inicio + 4);
	const paginas = Array.from(
		{ length: fim - inicio + 1 },
		(_, indice) => inicio + indice,
	);
	$("#pagination").innerHTML =
		`<button class="page-button" data-page="${estado.pagina - 1}" aria-label="Página anterior" ${estado.pagina === 1 ? "disabled" : ""}><i data-lucide="chevron-left" aria-hidden="true"></i></button>${paginas.map((pagina) => `<button class="page-button ${pagina === estado.pagina ? "is-current" : ""}" data-page="${pagina}">${pagina}</button>`).join("")}<button class="page-button" data-page="${estado.pagina + 1}" aria-label="Próxima página" ${estado.pagina === total ? "disabled" : ""}><i data-lucide="chevron-right" aria-hidden="true"></i></button>`;
	document.querySelectorAll("[data-page]").forEach((botao) =>
		botao.addEventListener("click", () => {
			estado.pagina = Number(botao.dataset.page);
			carregarProdutos();
			window.scrollTo({ top: 0, behavior: "smooth" });
		}),
	);
}

function renderizarFiltrosAtivos() {
	const filtros = [];
	if (estado.busca)
		filtros.push([
			"Busca",
			estado.busca,
			() => {
				estado.busca = "";
				$("#search-input").value = "";
			},
		]);
	if (estado.categoria)
		filtros.push([
			"Categoria",
			estado.categoria,
			() => {
				estado.categoria = "";
				const radio = $("input[name='category'][value='']");
				if (radio) radio.checked = true;
			},
		]);
	if (estado.fonte)
		filtros.push([
			"Fonte",
			formatarFonte(estado.fonte),
			() => {
				estado.fonte = "";
				$("input[name='source'][value='']").checked = true;
			},
		]);
	if (estado.precoMin)
		filtros.push([
			"Mínimo",
			formatarPreco(Number(estado.precoMin)),
			() => {
				estado.precoMin = "";
				$("#min-price").value = 0;
				atualizarValoresPreco();
			},
		]);
	if (estado.precoMax)
		filtros.push([
			"Máximo",
			formatarPreco(Number(estado.precoMax)),
			() => {
				estado.precoMax = "";
				$("#max-price").value = 20000;
				atualizarValoresPreco();
			},
		]);
	if (estado.apenasAtivos)
		filtros.push([
			"Status",
			"Somente ativos",
			() => {
				estado.apenasAtivos = false;
				$("#only-active").checked = false;
			},
		]);
	$("#active-filters").innerHTML = filtros
		.map(
			([rotulo, valor], indice) =>
			`<button class="filter-chip" data-filter-index="${indice}">${escaparHtml(rotulo)}: ${escaparHtml(valor)} <i data-lucide="x" aria-hidden="true"></i></button>`,
		)
		.join("");
	document.querySelectorAll("[data-filter-index]").forEach((botao) =>
		botao.addEventListener("click", () => {
			filtros[Number(botao.dataset.filterIndex)][2]();
			estado.pagina = 1;
			carregarProdutos();
		}),
	);
}

async function carregarProdutos() {
	carregando.classList.remove("is-hidden");
	grade.innerHTML = renderizarSkeletonProdutos();
	vazio.classList.add("is-hidden");
	const parametros = new URLSearchParams({
		pagina: estado.pagina,
		limite: estado.limite,
		ordenacao: estado.ordenacao,
	});
	if (estado.busca) parametros.set("busca", estado.busca);
	if (estado.categoria) parametros.set("categoria", estado.categoria);
	if (estado.fonte) parametros.set("fonte", estado.fonte);
	if (estado.precoMin) parametros.set("precoMin", estado.precoMin);
	if (estado.precoMax) parametros.set("precoMax", estado.precoMax);
	if (estado.apenasAtivos) parametros.set("ativo", "true");
	try {
		const resposta = await fetch(`/api/itens?${parametros}`);
		if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`);
		const resultado = await resposta.json();
		estado.itens = resultado.dados;
		estado.totalPaginas = resultado.paginacao.totalPaginas;
		$("#result-status").textContent =
			`${resultado.paginacao.totalItens} produto(s)`;
		renderizarProdutos();
		renderizarPaginacao();
		renderizarFiltrosAtivos();
	} catch (erro) {
		grade.innerHTML = `<div class="error-state">Não foi possível carregar os produtos.</div>`;
		console.error(erro);
	} finally {
		carregando.classList.add("is-hidden");
	}
}

function atualizarValoresPreco(ladoAlterado) {
	let min = Number($("#min-price").value);
	let max = Number($("#max-price").value);
	if (min > max) {
		if (ladoAlterado === "min") {
			max = min;
			$("#max-price").value = max;
		} else {
			min = max;
			$("#min-price").value = min;
		}
	}
	estado.precoMin = min > 0 ? String(min) : "";
	estado.precoMax = max < 20000 ? String(max) : "";
	$("#min-price-label").textContent = min > 0 ? formatarPreco(min) : "R$ 0";
	$("#max-price-label").textContent =
		max < 20000 ? formatarPreco(max) : "Sem limite";
}
function aplicarFiltrosAutomaticamente() {
	clearTimeout(temporizadorFiltros);
	estado.pagina = 1;
	temporizadorFiltros = setTimeout(carregarProdutos, 250);
}

function prepararOfertasDetalhe(detalhe, ofertas) {
	const ofertasAtivas = Array.isArray(ofertas)
		? ofertas.filter((oferta) => oferta.ativo !== false)
		: [];
	if (ofertasAtivas.length === 0) return;
	const historico = detalhe.querySelector(".history-section");
	if (!historico || detalhe.querySelector(".offers-section")) return;
	const secao = document.createElement("section");
	secao.className = "offers-section";
	secao.innerHTML = `<div class="history-heading"><div><h2>Ofertas nas lojas</h2><span>${ofertasAtivas.length} oferta(s) ativa(s)</span></div></div><div class="offers-list">${ofertasAtivas
		.map((oferta) => {
			const titulo = String(oferta.titulo ?? "").trim();
			const tituloResumido = resumirTituloOferta(titulo);
			const possuiResumo = tituloResumido !== titulo;
			return `<article class="offer-card">${oferta.imagemUrl ? `<div class="offer-card-image"><img src="${escaparHtml(oferta.imagemUrl)}" alt="${escaparHtml(titulo)}" loading="lazy" /></div>` : ""}<div class="offer-card-source">${renderizarFonteComLogo(oferta.fonte)}</div><div class="offer-card-title-wrap"><h3 class="offer-card-title" data-summary-title="${escaparHtml(tituloResumido)}" data-full-title="${escaparHtml(titulo)}">${escaparHtml(tituloResumido)}</h3>${possuiResumo ? '<button class="offer-title-toggle" type="button" aria-expanded="false">Ver título completo</button>' : ""}</div><strong class="offer-card-price">${formatarPreco(oferta.preco)}</strong>${oferta.precoAntigo > oferta.preco ? `<span class="old-price">${formatarPreco(oferta.precoAntigo)}</span>` : ""}${oferta.url ? `<a class="store-link" href="${escaparHtml(oferta.url)}" target="_blank" rel="noreferrer">Ver oferta <i data-lucide="external-link" aria-hidden="true"></i></a>` : ""}</article>`;
		})
		.join("")}</div>`;
	secao.querySelectorAll(".offer-title-toggle").forEach((botao) =>
		botao.addEventListener("click", () => {
			const card = botao.closest(".offer-card");
			const titulo = card?.querySelector(".offer-card-title");
			if (!card || !titulo) return;
			card.classList.add("is-title-expanded");
			titulo.textContent = titulo.dataset.fullTitle;
			botao.setAttribute("aria-expanded", "true");
			botao.hidden = true;
		}),
	);
	historico.before(secao);
}

async function carregarDetalhe(id) {
	$(".content-layout").classList.add("is-hidden");
	carregando.classList.add("is-hidden");
	const detalhe = $("#product-detail");
	detalhe.classList.remove("is-hidden");
	detalhe.innerHTML =
		'<div class="detail-skeleton"><div class="skeleton skeleton-detail-image"></div><div><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line detail-title"></div><div class="skeleton skeleton-line price"></div></div></div><div class="skeleton skeleton-chart"></div>';
	try {
		const resposta = await fetch(
			`/api/itens/${encodeURIComponent(id)}/historico`,
		);
		if (!resposta.ok) throw new Error(`API respondeu ${resposta.status}`);
		const resultado = await resposta.json();
		const produto = resultado.produto;
		const historico = resultado.historico ?? [];
		const ofertas = resultado.ofertas ?? [produto];
		const desconto = calcularDesconto(produto.precoAntigo, produto.preco);
		detalhe.innerHTML = `<a class="back-link" href="#"><i data-lucide="arrow-left" aria-hidden="true"></i>Voltar para produtos</a><div class="detail-header"><div class="detail-image">${produto.imagemUrl ? `<img src="${escaparHtml(produto.imagemUrl)}" alt="${escaparHtml(produto.titulo)}" />` : "Sem imagem"}</div><div class="detail-summary"><span class="detail-source">${renderizarFonteComLogo(produto.fonte)}${produto.ativo === false ? " · Inativo" : ""}</span><h1>${escaparHtml(produto.titulo)}</h1><div class="detail-prices">${produto.precoAntigo > produto.preco ? `<span class="old-price">${formatarPreco(produto.precoAntigo)}</span>` : ""}<div class="detail-current-price"><strong>${formatarPreco(produto.preco)}</strong>${desconto ? `<span class="discount-badge">-${desconto}% de desconto</span>` : ""}</div></div>${produto.url ? `<a class="store-link" href="${escaparHtml(produto.url)}" target="_blank" rel="noreferrer">Ver na loja <i data-lucide="external-link" aria-hidden="true"></i></a>` : ""}</div></div><section class="history-section"><div class="history-heading"><div><h2>Histórico de preço</h2><span>${historico.length} registro(s)</span></div><div class="history-periods"><button class="period-button" data-period="day" type="button">Dia</button><button class="period-button" data-period="week" type="button">Semana</button><button class="period-button is-active" data-period="month" type="button">Mês</button><button class="period-button" data-period="3months" type="button">3 meses</button><button class="period-button" data-period="6months" type="button">6 meses</button><button class="period-button" data-period="year" type="button">Ano</button></div></div><div id="price-range" class="price-range-wrap">${renderizarFaixaPrecos(historico, produto.preco)}</div><div class="chart-wrap"><canvas id="price-chart"></canvas></div></section>`;
		prepararOfertasDetalhe(detalhe, ofertas);
		if (historico.length > 0 && window.Chart) {
			graficoHistorico?.destroy();
			const dadosIniciais = agruparPontosGrafico(historico, "month");
			graficoHistorico = new window.Chart($("#price-chart"), {
				type: "line",
				data: {
					labels: dadosIniciais.map((item) => item.referencia),
					datasets: [
						{
							label: "Preço",
							data: dadosIniciais.map((item) => item.ponto.preco),
							borderColor: "#2456df",
							backgroundColor: "rgba(36,86,223,.08)",
							fill: true,
							tension: 0.35,
							pointRadius: 3,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: { legend: { display: false } },
					scales: {
						y: {
							ticks: {
								callback: (valor) => formatarPreco(valor),
							},
						},
						x: { grid: { display: false } },
					},
				},
			});
			document.querySelectorAll(".period-button").forEach((botao) =>
				botao.addEventListener("click", () => {
					const dias =
						{
							day: 1,
							week: 7,
							month: 30,
							"3months": 90,
							"6months": 180,
							year: 365,
						}[botao.dataset.period] ?? 1;
					const pontos = historico.filter(
						(ponto) =>
							new Date(ponto.coletadoEm).getTime() >=
							Date.now() - dias * 86400000,
					);
					const dados = agruparPontosGrafico(
						pontos.length ? pontos : historico.slice(-1),
						botao.dataset.period,
					);
					document
						.querySelectorAll(".period-button")
						.forEach((item) => item.classList.remove("is-active"));
					botao.classList.add("is-active");
					graficoHistorico.data.labels = dados.map(
						(item) => item.referencia,
					);
					graficoHistorico.data.datasets[0].data = dados.map(
						(item) => item.ponto.preco,
					);
					graficoHistorico.update();
				}),
			);
			$('.period-button[data-period="month"]')?.click();
		}
	} catch (erro) {
		detalhe.innerHTML = `<div class="empty-state">Não foi possível carregar o histórico deste produto.</div>`;
		console.error(erro);
	}
}

function obterTokenCsrf() {
	return (
		document.cookie
			.split(";")
			.map((item) => item.trim())
			.find((item) => item.startsWith("csrf-token="))
			?.split("=")
			.slice(1)
			.join("=") ?? ""
	);
}
function atualizarNavegacaoAdministrativa() {
	const rota = window.location.hash.replace(/^#/, "") || "admin";
	document
		.querySelectorAll("[data-admin-nav]")
		.forEach((link) =>
			link.classList.toggle("is-active", link.dataset.adminNav === rota),
		);
}

function mostrarPaginaAdministracao() {
	$(".content-layout").classList.add("is-hidden");
	$("#product-detail").classList.add("is-hidden");
	$("#admin-shell").classList.remove("is-hidden");
	$("#admin-sidebar").classList.remove("is-hidden");
	$("#admin-page").classList.remove("is-hidden");
	atualizarNavegacaoAdministrativa();
}
async function configurarMfa() {
	const inicio = await fetch("/api/autenticacao/mfa/iniciar", {
		method: "POST",
		headers: { "X-CSRF-Token": obterTokenCsrf() },
	});
	if (!inicio.ok) {
		await mostrarMensagemPersonalizada(
			"Não foi possível configurar o MFA",
			"O servidor não conseguiu iniciar a configuração. Tente novamente.",
			"danger",
		);
		return;
	}
	const dados = (await inicio.json()).dados;
	const area = document.querySelector(".admin-mfa");
	area.insertAdjacentHTML(
		"beforeend",
		`<div class="mfa-setup"><img src="${dados.qrCodeDataUrl}" alt="QR Code para configurar o MFA" /><p>Escaneie o QR Code no aplicativo autenticador e informe o código gerado.</p><input id="mfa-code" inputmode="numeric" maxlength="6" placeholder="Código de 6 dígitos" /><button id="activate-mfa" class="primary-button" type="button">Ativar MFA</button></div>`,
	);
	$("#activate-mfa").addEventListener("click", async () => {
		const codigo = $("#mfa-code").value.trim();
		if (!codigo) return;
		const resposta = await fetch("/api/autenticacao/mfa/ativar", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": obterTokenCsrf(),
			},
			body: JSON.stringify({ codigo }),
		});
		await mostrarMensagemPersonalizada(
			resposta.ok ? "MFA ativado" : "Código inválido",
			resposta.ok
				? "A autenticação em dois fatores foi ativada com sucesso."
				: "Confira o código informado e tente novamente.",
			resposta.ok ? "default" : "danger",
		);
	});
}

async function carregarConfiguracaoAdministracao() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML =
		'<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div>';
	try {
		const sessao = await fetch("/api/autenticacao/sessao");
		if (!sessao.ok) {
			mostrarLoginAdministracao();
			return;
		}
		const resposta = await fetch("/api/admin/configuracoes/scraping");
		if (!resposta.ok)
			throw new Error("Não foi possível carregar as configurações");
		const configuracao = (await resposta.json()).dados;
		logosFontesConfiguradas = Object.fromEntries(
			configuracao.fontes.map((item) => [item.fonte, item.logo ?? ""]),
		);
		nomesFontesConfiguradas = Object.fromEntries(
			configuracao.fontes.map((item) => [
				item.fonte,
				item.nome ?? item.fonte,
			]),
		);
		pagina.innerHTML = `<div class="admin-header"><h1>Configurações do scraping</h1></div><form id="scraping-settings-form" class="admin-settings">${configuracao.fontes.map((fonte) => `<section class="admin-source"><div><h2>${renderizarFonteComLogo(fonte.fonte, fonte.nome)}</h2><label class="toggle-row"><input class="toggle-input" type="checkbox" name="ativa-${fonte.fonte}" ${fonte.ativa ? "checked" : ""} /><span class="toggle-control"></span><span>Ativa</span></label></div><label>URL da fonte<div class="url-edit"><input name="url-${fonte.fonte}" type="url" value="${escaparHtml(fonte.url)}" readonly required /><button class="edit-button" type="button" data-edit-url="${fonte.fonte}" aria-label="Editar URL"><i data-lucide="pencil" aria-hidden="true"></i></button></div></label></section>`).join("")}<div id="admin-feedback" class="admin-feedback"></div><button class="primary-button" type="submit">Salvar configurações</button></form><section class="admin-mfa"><h2>Autenticação em dois fatores</h2><button id="start-mfa" class="secondary-button" type="button">Configurar MFA</button></section></div>`;
		if (configuracao.fontes.length === 0) {
			const formularioVazio = $("#scraping-settings-form");
			formularioVazio.innerHTML =
				'<section class="admin-empty-sources"><div class="admin-empty-sources-icon"><i data-lucide="store" aria-hidden="true"></i><span class="admin-empty-sources-plus"><i data-lucide="plus" aria-hidden="true"></i></span></div><div class="admin-empty-sources-content"><span class="detail-source">Primeiro passo</span><h2>Comece cadastrando uma fonte</h2><p>Adicione uma loja para configurar a URL, os seletores dos produtos e iniciar suas primeiras coletas.</p><div class="admin-empty-sources-benefits"><span><i data-lucide="globe-2" aria-hidden="true"></i> URL da loja</span><span><i data-lucide="scan-search" aria-hidden="true"></i> Seletores personalizados</span><span><i data-lucide="chart-no-axes-combined" aria-hidden="true"></i> Monitoramento</span></div><button id="add-source-button" class="initial-source-cta add-source-button" type="button">Adicionar primeira fonte <i data-lucide="arrow-right" aria-hidden="true"></i></button></div></section><div id="admin-feedback" class="admin-feedback"></div>';
			agendarAtualizacaoIcones();
		}
		document.querySelectorAll("[data-edit-url]").forEach((botao) =>
			botao.addEventListener("click", () => {
				const campo = $(`input[name='url-${botao.dataset.editUrl}']`);
				campo.readOnly = false;
				campo.focus();
			}),
		);
		pagina.querySelector(".admin-mfa")?.remove();
		$("#scraping-settings-form").addEventListener(
			"submit",
			salvarConfiguracaoAdministracaoGeral,
		);
		adicionarBotoesEdicaoFontes();
		configurarRotulosAcoesFontes();
		agendarAtualizacaoIcones();
	} catch (erro) {
		pagina.innerHTML = `<div class="admin-card"><div class="admin-error">${escaparHtml(erro.message)}</div></div>`;
	}
}

function renderizarCamposSeletores(fonte) {
	const campos = [
		["item", "Container do produto"],
		["titulo", "Título"],
		["preco", "Preço atual"],
		["precoAntigo", "Preço antigo"],
		["imagem", "Imagem"],
		["url", "Link do produto"],
		["carregarMais", "Botão carregar mais"],
	];
	const dicas = {
		item: "Elemento que representa cada produto na página.",
		titulo: "Elemento que contém o nome do produto.",
		preco: "Elemento que mostra o preço atual.",
		precoAntigo: "Elemento que mostra o preço anterior, quando existir.",
		imagem: "Imagem principal exibida no produto.",
		url: "Link que leva à página do produto.",
		carregarMais: "Botão usado para carregar mais produtos, se houver.",
	};
	return `<div class="selector-config"><div class="selector-config-heading"><div><h3>Seletores dos elementos</h3></div><div class="selector-config-actions"><button class="secondary-button" type="button" data-test-selectors="${fonte.fonte}">Testar seletores</button><button class="secondary-button" type="button" data-analyze-html="${fonte.fonte}">Analisar HTML</button></div></div><div class="selector-fields">${campos.map(([campo, rotulo]) => { const obrigatorio = campo === "item" || campo === "titulo" || campo === "preco" || campo === "imagem"; return `<label class="selector-field ${campo === "item" ? "selector-field-item" : ""}"><span class="selector-field-label"><span class="info-icon" tabindex="0" title="${dicas[campo] ?? "Configuração do produto."}" aria-label="${dicas[campo] ?? "Configuração do produto."}"><i data-lucide="info" aria-hidden="true"></i></span>${rotulo}${obrigatorio ? '<span class="required-mark">*</span>' : ""}</span><input name="seletor-${campo}-${fonte.fonte}" value="${escaparHtml(fonte.seletores?.[campo] ?? "")}" placeholder="Ex.: .product-card h2" ${obrigatorio ? "required" : ""} /></label>`; }).join("")}</div><label class="check-row selector-virtualized"><input type="checkbox" name="paginaVirtualizada-${fonte.fonte}" ${fonte.seletores?.paginaVirtualizada ? "checked" : ""} /><span class="info-icon" tabindex="0" title="Ative quando a página renderiza os produtos dinamicamente conforme você rola ou interage." aria-label="Ative quando a página renderiza os produtos dinamicamente conforme você rola ou interage."><i data-lucide="info" aria-hidden="true"></i></span><span>Página com produtos virtualizados</span></label><div class="selector-test-result" data-selector-result="${fonte.fonte}" aria-live="polite"></div></div>`;
}

async function salvarConfiguracaoFonte(evento, fonte, configuracao) {
	evento.preventDefault();
	const botaoSalvar = evento.currentTarget.querySelector(".primary-button");
	const formularioElemento = evento.currentTarget;
	formularioElemento.classList.add("is-saving");
	if (botaoSalvar) botaoSalvar.disabled = true;
	const formulario = new FormData(evento.currentTarget);
	const urlAtual =
		evento.currentTarget.querySelector("input[name='url']")?.value ??
		configuracao.fontes.find((item) => item.fonte === fonte)?.url ??
		"";
	const fonteAtiva =
		evento.currentTarget.querySelector("input[name='ativa']")?.checked ??
		formulario.get("ativa") === "on";
	const fontes = configuracao.fontes.map((fonteConfigurada) => {
		const item = removerLogoDaAtualizacao(fonteConfigurada);
		return item.fonte === fonte
			? {
					...item,
					logo: formulario.get("logo") ?? fonteConfigurada.logo ?? "",
					url: urlAtual,
					ativa: fonteAtiva,
					seletores: obterSeletoresDoFormulario(fonte),
				}
			: item;
	});
	const feedback = $("#source-settings-feedback");
	feedback.className = "admin-feedback";
	feedback.textContent = "";
	try {
		const resposta = await fetch("/api/admin/configuracoes/scraping", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": obterTokenCsrf(),
			},
			body: JSON.stringify({ fontes }),
		});
		const dados = await resposta.json();
		if (!resposta.ok)
			throw new Error(dados.erro ?? "Não foi possível salvar");
		feedback.className = "admin-feedback success";
		feedback.textContent = "Configurações da fonte salvas com sucesso.";
		window.setTimeout(() => {
			if (feedback.classList.contains("success")) {
				feedback.textContent = "";
				feedback.className = "admin-feedback";
			}
		}, 4000);
	} catch (erro) {
		feedback.className = "admin-feedback error";
		feedback.textContent = erro.message;
	} finally {
		formularioElemento.classList.remove("is-saving");
		if (botaoSalvar) botaoSalvar.disabled = false;
	}
}

async function carregarConfiguracaoFonte(fonte) {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML =
		'<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div></div>';
	try {
		const sessao = await fetch("/api/autenticacao/sessao");
		if (!sessao.ok) {
			mostrarLoginAdministracao();
			return;
		}
		const resposta = await fetch("/api/admin/configuracoes/scraping");
		if (!resposta.ok)
			throw new Error(
				"Não foi possível carregar a configuração da fonte",
			);
		const configuracao = (await resposta.json()).dados;
		const item = configuracao.fontes.find(
			(fonteConfigurada) => fonteConfigurada.fonte === fonte,
		);
		if (!item) throw new Error("Fonte não encontrada");
		logosFontesConfiguradas = Object.fromEntries(
			configuracao.fontes.map((fonteConfigurada) => [
				fonteConfigurada.fonte,
				fonteConfigurada.logo ?? "",
			]),
		);
		nomesFontesConfiguradas = Object.fromEntries(
			configuracao.fontes.map((fonteConfigurada) => [
				fonteConfigurada.fonte,
				fonteConfigurada.nome ?? fonteConfigurada.fonte,
			]),
		);
		pagina.innerHTML =
			'<div class="admin-header"><div><a class="back-link" href="#admin">Voltar para configurações</a><h1>Configurar ' +
			escaparHtml(item.nome) +
			'</h1><p class="admin-description">Ajuste os seletores usados para localizar os produtos nesta fonte.</p></div></div><form id="source-settings-form" class="admin-settings source-settings-form"><section class="admin-source source-settings-main"><div><h2>' +
			renderizarFonteComLogo(item.fonte) +
			'</h2><label class="toggle-row"><input class="toggle-input" type="checkbox" name="ativa" ' +
			(item.ativa ? "checked" : "") +
			' /><span class="toggle-control"></span><span>Fonte ativa</span></label></div><label>URL da fonte<div class="url-edit"><input name="url" type="url" value="' +
			escaparHtml(item.url) +
			'" required /><span class="source-url-hint">A URL será usada na próxima coleta.</span></div></label></section>' +
			'<input type="hidden" name="logo" value="' + escaparHtml(item.logo ?? "") + '" />' +
			renderizarCamposSeletores(item) +
			'<div id="source-settings-feedback" class="admin-feedback"></div><button class="primary-button" type="submit">Salvar configurações</button></form>';
		atualizarEstadoBotoesTeste();
		$("#source-settings-form").addEventListener(
			"submit",
			(evento) =>
				void salvarConfiguracaoFonte(evento, fonte, configuracao),
		);
		const campoUrlFonte = $("#source-settings-form input[name='url']");
		campoUrlFonte?.insertAdjacentHTML(
			"afterend",
			'<input type="hidden" name="url-' +
				fonte +
				'" value="' +
				escaparHtml(item.url) +
				'" />',
		);
		campoUrlFonte?.addEventListener("input", () => {
			const oculto = $(
				"#source-settings-form input[name='url-" + fonte + "']",
			);
			if (oculto) oculto.value = campoUrlFonte.value;
		});
		posicionarNotaUrlFonte();
		configurarLogoFonte(item);
		configurarTooltipsInformativos();
		configurarEdicaoFonte();
		agendarAtualizacaoIcones();
	} catch (erro) {
		pagina.innerHTML =
			'<div class="admin-card"><div class="admin-error">' +
			escaparHtml(erro.message) +
			"</div></div>";
	}
}

function configurarLogoFonte(item) {
	const formulario = $("#source-settings-form");
	const areaIdentidade = formulario?.querySelector(".source-settings-main > div");
	const entradaOculta = formulario?.querySelector("input[name='logo']");
	if (!formulario || !areaIdentidade || !entradaOculta || formulario.dataset.logoConfigured) return;
	formulario.dataset.logoConfigured = "true";

	const seletor = document.createElement("label");
	seletor.className = `source-logo-picker${item.logo ? " has-logo" : ""}`;
	const entrada = document.createElement("input");
	entrada.type = "file";
	entrada.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
	entrada.className = "source-logo-input";
	entrada.setAttribute("aria-label", "Alterar logo da fonte");
	const preview = document.createElement("img");
	preview.className = "source-logo-preview";
	preview.alt = "Logo da fonte";
	if (item.logo) preview.src = item.logo;
	seletor.prepend(entrada);
	seletor.append(preview);
	areaIdentidade.append(seletor);

	entrada.addEventListener("change", () => {
		const arquivo = entrada.files?.[0];
		if (!arquivo) return;
		if (arquivo.size > 700 * 1024 || !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(arquivo.type)) {
			entrada.value = "";
			return;
		}
		const leitor = new FileReader();
		leitor.addEventListener("load", () => {
			const logo = String(leitor.result ?? "");
			if (!logo) return;
			entradaOculta.value = logo;
			preview.src = logo;
			seletor.classList.add("has-logo");
		});
		leitor.readAsDataURL(arquivo);
	});
	agendarAtualizacaoIcones();
}

async function carregarConfiguracaoAutenticacao() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML =
		'<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div></div>';
	try {
		const sessao = await fetch("/api/autenticacao/sessao");
		if (!sessao.ok) {
			mostrarLoginAdministracao();
			return;
		}
		pagina.innerHTML =
			'<div class="admin-header"><h1>Autenticação</h1></div><section class="admin-mfa"><h2>Autenticação em dois fatores</h2><p class="admin-description">Proteja sua conta usando um aplicativo autenticador.</p><button id="start-mfa" class="secondary-button" type="button">Configurar MFA</button></section>';
		$("#start-mfa").addEventListener("click", configurarMfa);
	} catch (erro) {
		pagina.innerHTML = `<div class="admin-card"><div class="admin-error">${escaparHtml(erro.message)}</div></div>`;
	}
}

let resultadoBuscaManual = { itens: [], erros: [] };

function escaparCsvManual(valor) {
	return `"${String(valor ?? "").replaceAll('"', '""')}"`;
}
function baixarArquivoBuscaManual(nome, conteudo, tipo) {
	const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
	const link = document.createElement("a");
	link.href = url;
	link.download = nome;
	link.click();
	URL.revokeObjectURL(url);
}
async function carregarBuscaManual() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML =
		'<div class="admin-card skeleton-admin"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line title"></div><div class="skeleton skeleton-line"></div></div>';
	try {
		const sessao = await fetch("/api/autenticacao/sessao");
		if (!sessao.ok) {
			mostrarLoginAdministracao();
			return;
		}
		pagina.innerHTML =
			'<div class="admin-header"><div><h1>Busca manual</h1><p class="admin-description">Execute uma busca sem salvar os resultados no banco de dados.</p></div></div><section class="admin-card manual-search-page"><div class="manual-search-toolbar"><fieldset class="manual-search-sources"><legend>Fontes</legend></fieldset><label class="manual-search-multiple-filter"><input id="manual-search-multiple-filter" type="checkbox" /> Presente em mais de uma loja</label><button id="run-manual-search" class="primary-button" type="button">Executar busca</button></div><div id="manual-search-feedback" class="admin-feedback"></div><div class="manual-search-actions"><label class="manual-search-text-filter"><span>Buscar no resultado</span><input id="manual-search-text-filter" type="search" placeholder="Nome do produto" /></label><strong id="manual-search-count">0 produto(s)</strong><button id="download-manual-csv" class="secondary-button" type="button" disabled>Exportar CSV</button><button id="print-manual-search" class="secondary-button" type="button" disabled>Exportar PDF</button></div><div id="manual-search-errors"></div><div class="manual-search-table-wrap"><table class="manual-search-table"><thead><tr><th>Fonte</th><th>Produto</th><th>Preço</th><th>Preço antigo</th><th>Link</th></tr></thead><tbody id="manual-search-body"><tr><td colspan="5" class="manual-search-empty">Execute uma busca para visualizar os produtos.</td></tr></tbody></table></div></section>';
		$("#run-manual-search").addEventListener("click", executarBuscaManual);
		$("#manual-search-text-filter").addEventListener("input", (evento) => {
			filtroBuscaManual.texto = evento.target.value;
			renderizarTabelaBuscaManual();
		});
		$("#manual-search-multiple-filter").addEventListener("change", (evento) => {
			filtroBuscaManual.somenteMultilojas = evento.target.checked;
			renderizarTabelaBuscaManual();
		});
		$("#download-manual-csv").addEventListener("click", () =>
			baixarArquivoBuscaManual(
				"produtos-busca-manual.csv",
				gerarCsvBuscaManual(),
				"text/csv;charset=utf-8",
			),
		);
		$("#print-manual-search").addEventListener("click", () =>
			window.print(),
		);
	} catch (erro) {
		pagina.innerHTML = `<div class="admin-card"><div class="admin-error">${escaparHtml(erro.message)}</div></div>`;
	}
}
async function executarBuscaManualInterna() {
	const botao = $("#run-manual-search");
	const feedback = $("#manual-search-feedback");
	botao.disabled = true;
	feedback.textContent = "Buscando produtos...";
	resultadoBuscaManual = { itens: [], erros: [] };
	try {
		const fontes = [
			...document.querySelectorAll(
				"input[name='manual-search-source']:checked",
			),
		].map((campo) => campo.value);
		const resposta = await fetch("/api/admin/busca-manual", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": obterTokenCsrf(),
			},
			body: JSON.stringify({ fontes }),
		});
		const resultado = await resposta.json();
		if (!resposta.ok)
			throw new Error(
				resultado.erro ?? "Não foi possível executar a busca",
			);
		resultadoBuscaManual = resultado.dados;
		renderizarTabelaBuscaManual();
		$("#download-manual-csv").disabled =
			resultadoBuscaManual.itens.length === 0;
		$("#print-manual-search").disabled =
			resultadoBuscaManual.itens.length === 0;
		feedback.textContent = `Busca concluída em ${formatarDuracao(new Date(resultado.dados.finalizadaEm).getTime() - new Date(resultado.dados.iniciadaEm).getTime())}.`;
	} catch (erro) {
		feedback.className = "admin-feedback error";
		feedback.textContent = erro.message;
	} finally {
		botao.disabled = false;
	}
}

async function atualizarConta() {
	const resposta = await fetch("/api/autenticacao/sessao");
	const avatar = $("#account-avatar");
	if (!resposta.ok) {
		avatar.textContent = "Entrar";
		avatar.classList.remove("is-authenticated");
		avatar.classList.add("account-login-button");
		return;
	}
	const administrador = (await resposta.json()).dados;
	avatar.textContent = administrador.email.slice(0, 1).toUpperCase();
	avatar.classList.add("is-authenticated");
	avatar.classList.remove("account-login-button");
}

function configurarConta() {
	$("#account-avatar").addEventListener("click", async () => {
		const autenticado =
			$("#account-avatar").classList.contains("is-authenticated");
		if (!autenticado) {
			window.location.hash = "login";
			return;
		}
		$("#account-menu").classList.add("is-hidden");
		window.location.hash = "admin";
	});
	$("#account-monitoring").addEventListener("click", () => {
		$("#account-menu").classList.add("is-hidden");
		window.location.hash = "admin/scraping";
	});
	$("#account-settings").addEventListener("click", () => {
		$("#account-menu").classList.add("is-hidden");
		window.location.hash = "admin";
	});
	const sair = async () => {
		await fetch("/api/autenticacao/logout", {
			method: "POST",
			headers: { "X-CSRF-Token": obterTokenCsrf() },
		});
		$("#account-menu").classList.add("is-hidden");
		atualizarConta();
		window.location.hash = "login";
	};
	$("#account-logout").addEventListener("click", sair);
	$("#admin-sidebar-logout").addEventListener("click", sair);
}

let conexaoEventosScraping;
let temporizadorReconexaoScraping;
let temporizadorAtualizacaoMonitoramento;
let temporizadorContagemRegressiva;
let atualizacaoMonitoramentoEmAndamento = false;

function formatarDuracao(duracaoMs) {
	if (!duracaoMs) return "Em andamento";
	const segundos = Math.floor(duracaoMs / 1000);
	return segundos < 60
		? `${segundos}s`
		: `${Math.floor(segundos / 60)}m ${segundos % 60}s`;
}
function formatarDuracaoExecucao(execucao) {
	const duracao =
		execucao.duracaoMs ??
		(execucao.finalizadoEm && execucao.iniciadoEm
			? new Date(execucao.finalizadoEm).getTime() -
				new Date(execucao.iniciadoEm).getTime()
			: undefined);
	return formatarDuracao(duracao);
}
function formatarHorario(data) {
	return data ? new Date(data).toLocaleTimeString("pt-BR") : "—";
}

async function carregarMonitoramento() {
	mostrarPaginaAdministracao();
	const pagina = $("#admin-page");
	pagina.innerHTML = `<div class="admin-header"><div><h1>Scrapings em tempo real</h1></div></div><div class="monitor-summary" id="monitor-summary"></div><section id="monitor-errors-panel" class="monitor-panel monitor-errors-panel is-hidden"><div class="monitor-panel-heading"><h2>Fontes com problemas</h2><span class="monitor-error-caption" title="Atenção necessária" aria-label="Atenção necessária"><i data-lucide="triangle-alert" aria-hidden="true"></i></span></div><div id="monitor-errors" class="monitor-status-grid"></div></section><section class="monitor-panel"><div class="monitor-panel-heading"><h2>Status por fonte</h2><div class="monitor-filters"></div></div><div id="monitor-status" class="monitor-status-grid"></div></section><section class="monitor-panel"><div class="monitor-panel-heading"><h2>Histórico recente</h2></div><div class="monitor-history-wrap"><table class="monitor-history"><thead><tr><th>Início</th><th>Rodada</th><th>Fonte</th><th>Status</th><th>Duração</th><th>Produtos</th><th></th></tr></thead><tbody id="monitor-history-body"></tbody></table></div></section><div id="monitor-logs-modal" class="monitor-modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="monitor-logs-title"><div class="monitor-modal-backdrop" data-close-monitor-logs></div><div class="monitor-modal-content"><div class="monitor-panel-heading"><h2 id="monitor-logs-title">Console de logs</h2><button id="close-monitor-logs" class="icon-button" type="button" aria-label="Fechar console"><i data-lucide="x" aria-hidden="true"></i></button></div><div id="monitor-execution-progress" class="monitor-execution-progress"></div><div class="monitor-filters"><fieldset class="monitor-log-levels"><legend>Níveis</legend><label><input type="checkbox" name="monitor-log-level" value="info" checked /> Informação</label><label><input type="checkbox" name="monitor-log-level" value="sucesso" checked /> Sucesso</label><label><input type="checkbox" name="monitor-log-level" value="aviso" checked /> Aviso</label><label><input type="checkbox" name="monitor-log-level" value="erro" checked /> Erro</label></fieldset></div><div id="monitor-logs" class="monitor-logs"></div></div></div></div>`;
	const cabecalhoMonitoramento = pagina.querySelector(".admin-header");
	cabecalhoMonitoramento.classList.add("monitor-header");
	cabecalhoMonitoramento.insertAdjacentHTML(
		"beforeend",
		'<div class="monitor-next-search"><span class="monitor-clock-icon" aria-hidden="true"><i data-lucide="clock-3"></i></span><div><small>Próxima busca</small><strong id="monitor-countdown">—</strong></div></div>',
	);
	const painelErros = $("#monitor-errors-panel");
	const painelStatus = $("#monitor-status").closest(".monitor-panel");
	const painelHistorico = $("#monitor-history-body").closest(
		".monitor-panel",
	);
	const layoutMonitoramento = document.createElement("div");
	layoutMonitoramento.className = "monitor-layout";
	const conteudoMonitoramento = document.createElement("div");
	conteudoMonitoramento.className = "monitor-main";
	const asideMonitoramento = document.createElement("aside");
	asideMonitoramento.className = "monitor-aside";
	painelStatus.classList.add("monitor-status-panel");
	pagina.insertBefore(layoutMonitoramento, $("#monitor-logs-modal"));
	layoutMonitoramento.append(conteudoMonitoramento, asideMonitoramento);
	conteudoMonitoramento.append(painelHistorico);
	asideMonitoramento.append(painelErros, painelStatus);
	$("#monitor-summary").innerHTML = renderizarSkeletonPainel(4);
	$("#monitor-status").innerHTML = renderizarSkeletonPainel(2);
	$("#monitor-history-body").innerHTML =
		'<tr><td colspan="7"><div class="skeleton skeleton-table"></div></td></tr>';
	configurarPainelMonitoramento();
	await atualizarPainelMonitoramento();
	abrirEventosScraping();
}

function configurarPainelMonitoramento() {
	document
		.querySelectorAll("input[name='monitor-log-level']")
		.forEach((caixa) =>
			caixa.addEventListener("change", renderizarLogsMonitoramento),
		);
	$(".monitor-history-wrap").insertAdjacentHTML(
		"beforebegin",
		'<div class="monitor-history-filters"><fieldset class="monitor-history-sources"><legend>Fonte</legend><label><input type="radio" name="monitor-history-source" value="" checked /> Todas</label></fieldset><div class="monitor-history-date-filters"><label>De <input id="monitor-history-start" type="date" /></label><label>Até <input id="monitor-history-end" type="date" /></label><button id="filter-monitor-history" class="secondary-button" type="button">Filtrar</button></div></div>',
	);
	$(".monitor-history-wrap").insertAdjacentHTML(
		"afterend",
		'<nav id="monitor-history-pagination" class="monitor-history-pagination" aria-label="Paginação do histórico"></nav>',
	);
	$("#filter-monitor-history").addEventListener(
		"click",
		aplicarFiltrosHistorico,
	);
	document
		.querySelectorAll(
			"input[name='monitor-history-source'], #monitor-history-start, #monitor-history-end",
		)
		.forEach((campo) =>
			campo.addEventListener("change", aplicarFiltrosHistorico),
		);
	$("#close-monitor-logs").addEventListener("click", () => {
		dadosMonitoramento.execucaoAbertaId = "";
		$("#monitor-logs-modal").classList.add("is-hidden");
	});
	$("[data-close-monitor-logs]").addEventListener("click", () => {
		dadosMonitoramento.execucaoAbertaId = "";
		$("#monitor-logs-modal").classList.add("is-hidden");
	});
	$("#clear-monitor-logs")?.addEventListener("click", () => {
		$("#monitor-logs").innerHTML = "";
	});
}

async function iniciarBuscaAgora() {
	const botao = $("#run-scraping-now");
	botao.disabled = true;
	botao.textContent = "Iniciando...";
	try {
		const resposta = await fetch("/api/admin/scraping/executar", {
			method: "POST",
			headers: { "X-CSRF-Token": obterTokenCsrf() },
		});
		const dados = await resposta.json();
		if (!resposta.ok)
			throw new Error(dados.erro ?? "Não foi possível iniciar a busca");
		botao.textContent = "Busca iniciada";
		setTimeout(() => {
			botao.disabled = false;
			botao.textContent = "Iniciar busca";
		}, 2500);
	} catch (erro) {
		botao.disabled = false;
		botao.textContent = "Iniciar busca";
		await mostrarMensagemPersonalizada(
			"Não foi possível iniciar a busca",
			erro.message,
			"danger",
		);
	}
}

function formatarDataHora(data) {
	return data ? new Date(data).toLocaleString("pt-BR") : "—";
}
function aplicarFiltrosHistorico() {
	const fonte =
		document.querySelector("input[name='monitor-history-source']:checked")
			?.value ?? "";
	dadosMonitoramento.filtrosHistorico = {
		fonte,
		dataInicio: $("#monitor-history-start").value,
		dataFim: $("#monitor-history-end").value,
	};
	dadosMonitoramento.paginaHistorico = 1;
	void carregarHistoricoMonitoramento();
}
async function carregarHistoricoMonitoramento() {
	const filtros = dadosMonitoramento.filtrosHistorico;
	const parametros = new URLSearchParams({
		pagina: String(dadosMonitoramento.paginaHistorico),
		limite: "1",
	});
	if (filtros.fonte) parametros.set("fonte", filtros.fonte);
	if (filtros.dataInicio) parametros.set("dataInicio", filtros.dataInicio);
	if (filtros.dataFim) parametros.set("dataFim", filtros.dataFim);
	const resposta = await fetch(`/api/admin/scraping/execucoes?${parametros}`);
	if (!resposta.ok) return;
	const resultado = await resposta.json();
	dadosMonitoramento.execucoes = resultado.dados ?? [];
	dadosMonitoramento.totalPaginasHistorico =
		resultado.paginacao?.totalPaginas ?? 0;
	renderizarHistoricoMonitoramentoPaginado();
}
function formatarTempoRestante(milisegundos) {
	if (!Number.isFinite(milisegundos) || milisegundos <= 0) return "";
	const segundos = Math.max(1, Math.round(milisegundos / 1000));
	if (segundos < 60) return `~${segundos}s restantes`;
	const minutos = Math.round(segundos / 60);
	if (minutos < 60) return `~${minutos}min restantes`;
	const horas = Math.floor(minutos / 60);
	const minutosRestantes = minutos % 60;
	return `~${horas}h${minutosRestantes ? ` ${minutosRestantes}min` : ""} restantes`;
}
function estimarTempoRestante(valor, iniciadoEm) {
	const percentual = Number(valor);
	const inicio = iniciadoEm ? new Date(iniciadoEm).getTime() : 0;
	const decorrido = Date.now() - inicio;
	if (percentual >= 100) return "Concluída";
	if (!inicio || percentual <= 0 || decorrido < 1000) return "Calculando…";
	return (
		formatarTempoRestante((decorrido / percentual) * (100 - percentual)) ||
		"Calculando…"
	);
}
const descricoesProgresso = {
	"Progresso geral":
		"Percentual estimado de conclusão de todas as etapas da rodada.",
	Coleta: "Leitura dos produtos na página da fonte e extração dos dados encontrados.",
	Indexação: "Atualização dos produtos e dos preços no índice de pesquisa.",
	Classificação: "Identificação da categoria e do tipo de cada produto.",
	Embeddings:
		"Geração das representações numéricas usadas para encontrar produtos semelhantes.",
};
function renderizarInfoProgresso(rotulo) {
	const descricao =
		descricoesProgresso[rotulo] ??
		"Informações sobre esta etapa do processamento.";
	return `<span class="info-icon progress-info-icon" tabindex="0" data-tooltip="${escaparHtml(descricao)}" aria-label="${escaparHtml(descricao)}"><i data-lucide="info" aria-hidden="true"></i></span>`;
}
function renderizarBarraProgresso(valor, rotulo = "", tempoRestante = "") {
	const percentual = Math.max(0, Math.min(100, Number(valor) || 0));
	const classeEstado = percentual >= 100 ? " is-complete" : " is-active";
	const barraGeral = rotulo === "Progresso geral";
	const eta = tempoRestante
		? `<span class="progress-eta">${tempoRestante}</span>`
		: "";
	return `<div class="progress-item${barraGeral ? " progress-item-general" : ""}">${barraGeral ? `<div class="progress-label progress-label-general"><span><small>${renderizarInfoProgresso(rotulo)} SEU PROGRESSO</small><strong>${percentual}% <em>concluído</em></strong></span><span class="progress-remaining">${tempoRestante || "Calculando…"}</span></div>` : `<div class="progress-label"><span class="progress-label-name">${renderizarInfoProgresso(rotulo)}${escaparHtml(rotulo)}</span><strong>${percentual}%</strong>${eta}</div>`}<div class="progress-track"><span class="progress-fill${classeEstado}" style="width: ${percentual}%"></span></div>${barraGeral ? '<span class="progress-stage">Acompanhando o processo de busca de produtos</span>' : ""}</div>`;
}
function renderizarProgressoExecucao(
	progresso = {},
	incluirGeral = false,
	iniciadoEm,
) {
	const barras = [
		renderizarBarraProgresso(
			progresso.coleta,
			"Coleta",
			estimarTempoRestante(progresso.coleta, iniciadoEm),
		),
		renderizarBarraProgresso(
			progresso.classificacao,
			"Classificação",
			estimarTempoRestante(progresso.classificacao, iniciadoEm),
		),
		renderizarBarraProgresso(
			progresso.embeddings,
			"Embeddings",
			estimarTempoRestante(progresso.embeddings, iniciadoEm),
		),
		renderizarBarraProgresso(
			progresso.indexacao,
			"Indexação",
			estimarTempoRestante(progresso.indexacao, iniciadoEm),
		),
	];
	if (incluirGeral)
		barras.unshift(
			renderizarBarraProgresso(
				progresso.geral,
				"Progresso geral",
				estimarTempoRestante(progresso.geral, iniciadoEm),
			),
		);
	return barras.join("");
}
function formatarStatusHistorico(status, execucao = {}) {
	if (status === "executando" && !execucao.erro && !execucao.finalizadoEm) {
		const percentual = Math.max(
			0,
			Math.min(100, Number(execucao.progresso?.geral) || 0),
		);
		return `<div class="history-status-progress"><span class="history-status status-running"><span class="status-icon status-loading"></span>Executando</span><strong class="history-progress-percent">${percentual}%</strong></div>`;
	}
	if (status === "erro" || execucao.erro)
		return '<span class="history-status status-error"><span class="status-icon"><i data-lucide="x" aria-hidden="true"></i></span>Erro</span>';
	return '<span class="history-status status-success"><span class="status-icon"><i data-lucide="check" aria-hidden="true"></i></span>Concluído</span>';
}
function renderizarHistoricoMonitoramentoPaginado() {
	const principal = dadosMonitoramento.paginaHistorico === 1;
	$("#monitor-history-body").innerHTML = dadosMonitoramento.execucoes
		.map((item) => {
			const rodada = String(item.rodadaId ?? "legada");
		return `<tr class="history-row status-${item.status}"><td class="history-date">${formatarDataHora(item.iniciadoEm)}</td><td class="history-round" title="${escaparHtml(rodada)}">${principal ? "Principal" : escaparHtml(rodada.slice(0, 8))}</td><td>${renderizarFonteComLogo(item.fonte)}</td><td>${formatarStatusHistorico(item.status, item)}</td><td>${formatarDuracaoExecucao(item)}</td><td>${item.produtosEncontrados ?? 0}</td><td><button class="history-details-button" data-monitor-detail="${item._id}" aria-label="Ver detalhes da execução"><i data-lucide="list" aria-hidden="true"></i> Detalhes</button></td></tr>`;
		})
		.join("");
	$("#monitor-history-pagination").innerHTML =
		dadosMonitoramento.totalPaginasHistorico > 1
			? `<button class="page-button" data-monitor-page="prev" aria-label="Rodada anterior" ${dadosMonitoramento.paginaHistorico === 1 ? "disabled" : ""}><i data-lucide="chevron-left" aria-hidden="true"></i></button><span>Rodada ${principal ? "principal" : dadosMonitoramento.paginaHistorico} de ${dadosMonitoramento.totalPaginasHistorico}</span><button class="page-button" data-monitor-page="next" aria-label="Próxima rodada" ${dadosMonitoramento.paginaHistorico === dadosMonitoramento.totalPaginasHistorico ? "disabled" : ""}><i data-lucide="chevron-right" aria-hidden="true"></i></button>`
			: "";
	document
		.querySelectorAll("[data-monitor-detail]")
		.forEach((botao) =>
			botao.addEventListener("click", () =>
				carregarLogsExecucao(botao.dataset.monitorDetail),
			),
		);
	document.querySelectorAll("[data-monitor-page]").forEach((botao) =>
		botao.addEventListener("click", () => {
			dadosMonitoramento.paginaHistorico +=
				botao.dataset.monitorPage === "next" ? 1 : -1;
			void carregarHistoricoMonitoramento();
		}),
	);
}

let dadosMonitoramento = {
	execucoes: [],
	statusFontes: [],
	logs: [],
	resumo: {},
	execucaoAbertaId: "",
	execucaoAberta: null,
	paginaHistorico: 1,
	totalPaginasHistorico: 0,
	filtrosHistorico: { fonte: "", dataInicio: "", dataFim: "" },
};
function renderizarStatusMonitoramento() {
	const filtro = $("#monitor-source-filter")?.value;
	const execucoes = dadosMonitoramento.statusFontes.filter(
		(item) => !filtro || item.fonte === filtro,
	);
	$("#monitor-status").innerHTML = execucoes.length
		? execucoes
				.map(
					(item) =>
						`<article class="monitor-source-card"><div class="monitor-card-title"><strong>${renderizarFonteComLogo(item.fonte)}</strong><span class="monitor-status-badge ${item.status}">${escaparHtml(item.status)}</span></div><span>Início: ${formatarHorario(item.iniciadoEm)}</span><span>Produtos encontrados: ${item.produtosEncontrados ?? 0}</span><span>Última mensagem: ${escaparHtml(item.ultimaMensagem ?? "Aguardando...")}</span></article>`,
				)
				.join("")
		: '<div class="empty-state">Nenhuma fonte em execução.</div>';
	const execucoesComProblema = execucoes.filter(
		(item) => item.status === "erro",
	);
	const execucoesNormais = execucoes.filter((item) => item.status !== "erro");
	$("#monitor-errors-panel").classList.toggle(
		"is-hidden",
		execucoesComProblema.length === 0,
	);
	$("#monitor-errors").innerHTML = execucoesComProblema
		.map(
			(item) =>
				`<article class="monitor-source-card monitor-source-error"><div class="monitor-card-title"><strong>${renderizarFonteComLogo(item.fonte)}</strong><span class="monitor-status-badge erro">Erro</span></div><span>Início: ${formatarHorario(item.iniciadoEm)}</span><span>Erro: ${escaparHtml(item.erro ?? item.ultimaMensagem ?? "Falha não detalhada")}</span><span>Produtos encontrados: ${item.produtosEncontrados ?? 0}</span></article>`,
		)
		.join("");
	$("#monitor-status").innerHTML = execucoesNormais.length
		? execucoesNormais
				.map(
					(item) =>
						`<article class="monitor-source-card"><div class="monitor-card-title"><strong>${renderizarFonteComLogo(item.fonte)}</strong><span class="monitor-status-badge ${item.status}">${escaparHtml(item.status)}</span></div><span>Início: ${formatarHorario(item.iniciadoEm)}</span><span>Produtos encontrados: ${item.produtosEncontrados ?? 0}</span><span>Última mensagem: ${escaparHtml(item.ultimaMensagem ?? "Aguardando...")}</span></article>`,
				)
				.join("")
		: '<div class="empty-state">Nenhuma fonte em execução.</div>';
	const executando = dadosMonitoramento.statusFontes.filter(
		(item) => item.status === "executando",
	).length;
	renderizarResumoMonitoramento();
	if (typeof atualizarResumoMonitoramento === "function")
		void atualizarResumoMonitoramento();
}
function renderizarPainelExecucaoAberta(execucao) {
	const painel = $("#monitor-execution-progress");
	if (!painel || !execucao) return;
	if (execucao.status === "erro" || execucao.erro) {
		painel.innerHTML = `<div class="monitor-execution-failed"><span class="monitor-execution-failed-icon" aria-hidden="true"><i data-lucide="triangle-alert"></i></span><div><strong>Execução interrompida</strong><p>${escaparHtml(execucao.erro ?? "A busca não foi concluída. Tente novamente.")}</p></div></div>`;
		return;
	}
	painel.innerHTML = renderizarProgressoExecucao(
		execucao.progresso,
		true,
		execucao.iniciadoEm,
	);
}
function atualizarPainelExecucaoAberta(execucao) {
	if (
		!dadosMonitoramento.execucaoAbertaId ||
		!execucao?._id ||
		String(execucao._id) !== dadosMonitoramento.execucaoAbertaId
	)
		return;
	dadosMonitoramento.execucaoAberta = {
		...dadosMonitoramento.execucaoAberta,
		...execucao,
	};
	renderizarPainelExecucaoAberta(dadosMonitoramento.execucaoAberta);
}
function renderizarLogsMonitoramento() {
	const area = $("#monitor-logs");
	if (!area) return;
	const estavaNoFinal =
		area.scrollHeight - area.scrollTop - area.clientHeight < 24;
	const filtroFonte = $("#monitor-source-filter")?.value;
	const niveisSelecionados = [
		...document.querySelectorAll("input[name='monitor-log-level']:checked"),
	].map((caixa) => caixa.value);
	area.innerHTML =
		dadosMonitoramento.logs
			.filter(
				(item) =>
					(!dadosMonitoramento.execucaoAbertaId ||
						String(item.execucaoId) ===
							dadosMonitoramento.execucaoAbertaId) &&
					(!filtroFonte || item.fonte === filtroFonte) &&
					niveisSelecionados.includes(item.nivel),
			)
			.map(
				(item) =>
					`<div class="monitor-log ${item.nivel}"><time>${formatarHorario(item.criadoEm)}</time><strong>${renderizarFonteComLogo(item.fonte)}</strong><span>${escaparHtml(item.mensagem)}</span></div>`,
			)
			.join("") ||
		'<div class="empty-state">Nenhuma mensagem registrada para esta execução.</div>';
	if (estavaNoFinal) area.scrollTop = area.scrollHeight;
}
async function carregarLogsExecucao(id) {
	dadosMonitoramento.execucaoAbertaId = String(id);
	dadosMonitoramento.execucaoAberta = null;
	$("#monitor-execution-progress").innerHTML =
		'<div class="monitor-execution-loading">Carregando detalhes desta execução…</div>';
	$("#monitor-logs").innerHTML =
		'<div class="empty-state">Carregando logs desta execução…</div>';
	const [respostaExecucao, respostaLogs] = await Promise.all([
		fetch(`/api/admin/scraping/execucoes/${encodeURIComponent(id)}`),
		fetch(`/api/admin/scraping/execucoes/${encodeURIComponent(id)}/logs`),
	]);
	if (
		!respostaExecucao.ok ||
		!respostaLogs.ok ||
		dadosMonitoramento.execucaoAbertaId !== String(id)
	)
		return;
	const execucao = (await respostaExecucao.json()).dados;
	dadosMonitoramento.execucaoAberta = execucao;
	dadosMonitoramento.logs = (await respostaLogs.json()).dados ?? [];
	renderizarPainelExecucaoAberta(execucao);
	$("#monitor-logs-modal").classList.remove("is-hidden");
	renderizarLogsMonitoramento();
	$("#monitor-logs").scrollTop = $("#monitor-logs").scrollHeight;
}
async function atualizarPainelMonitoramento() {
	if (atualizacaoMonitoramentoEmAndamento) return;
	atualizacaoMonitoramentoEmAndamento = true;
	try {
		const resposta = await fetch("/api/admin/scraping/status");
		if (!resposta.ok) {
			mostrarLoginAdministracao("Sessão expirada. Entre novamente.");
			return;
		}
		const resultado = await resposta.json();
		dadosMonitoramento.statusFontes = resultado.dados ?? [];
		dadosMonitoramento.resumo = resultado.resumo ?? {};
		await carregarHistoricoMonitoramento();
		renderizarStatusMonitoramento();
	} finally {
		atualizacaoMonitoramentoEmAndamento = false;
	}
}
function adicionarEventoMonitoramento(evento) {
	if (evento.tipo === "log") {
		dadosMonitoramento.logs.push(evento.dados);
		if (dadosMonitoramento.logs.length > 500)
			dadosMonitoramento.logs.shift();
		renderizarLogsMonitoramento();
	}
	if (evento.tipo === "execucao") {
		const indiceStatus = dadosMonitoramento.statusFontes.findIndex(
			(item) => item._id === evento.dados._id,
		);
		if (indiceStatus >= 0)
			dadosMonitoramento.statusFontes[indiceStatus] = {
				...dadosMonitoramento.statusFontes[indiceStatus],
				...evento.dados,
			};
		else dadosMonitoramento.statusFontes.push(evento.dados);
		atualizarPainelExecucaoAberta(evento.dados);
		renderizarStatusMonitoramento();
		void carregarHistoricoMonitoramento();
	}
}
function abrirEventosScraping() {
	conexaoEventosScraping?.close();
	clearTimeout(temporizadorReconexaoScraping);
	clearInterval(temporizadorAtualizacaoMonitoramento);
	temporizadorAtualizacaoMonitoramento = setInterval(() => {
		if (window.location.hash === "#admin/scraping")
			void atualizarPainelMonitoramento();
	}, 5000);
	conexaoEventosScraping = new EventSource("/api/admin/scraping/eventos");
	conexaoEventosScraping.addEventListener("execucao", (evento) =>
		adicionarEventoMonitoramento({
			tipo: "execucao",
			dados: JSON.parse(evento.data),
		}),
	);
	conexaoEventosScraping.addEventListener("log", (evento) =>
		adicionarEventoMonitoramento({
			tipo: "log",
			dados: JSON.parse(evento.data),
		}),
	);
	conexaoEventosScraping.onerror = () => {
		conexaoEventosScraping.close();
		temporizadorReconexaoScraping = setTimeout(() => {
			if (window.location.hash === "#admin/scraping") {
				void atualizarPainelMonitoramento().then(
					abrirEventosScraping,
				);
			}
		}, 3000);
	};
}

function fecharEventosScraping() {
	conexaoEventosScraping?.close();
	conexaoEventosScraping = undefined;
	clearTimeout(temporizadorReconexaoScraping);
	clearInterval(temporizadorAtualizacaoMonitoramento);
	clearInterval(temporizadorContagemRegressiva);
}

function formatarDataResumo(data) {
	if (!data) return "<strong>—</strong>";
	const valor = new Date(data);
	return `<strong class="monitor-stat-time">${valor.toLocaleTimeString("pt-BR")}</strong><small class="monitor-stat-date">${valor.toLocaleDateString("pt-BR")}</small>`;
}
function formatarContagemRegressiva(data) {
	if (!data) return "Sem previsão";
	const restante = new Date(data).getTime() - Date.now();
	if (restante <= 0) return "Iniciando em instantes";
	const totalSegundos = Math.floor(restante / 1000);
	const horas = Math.floor(totalSegundos / 3600);
	const minutos = Math.floor((totalSegundos % 3600) / 60);
	const segundos = totalSegundos % 60;
	return `Em ${horas > 0 ? `${horas}h ` : ""}${minutos}m ${String(segundos).padStart(2, "0")}s`;
}
function atualizarContagemRegressiva() {
	const elemento = $("#monitor-countdown");
	if (elemento)
		elemento.textContent = formatarContagemRegressiva(
			dadosMonitoramento.resumo.proximaBusca,
		);
}
function renderizarResumoMonitoramento() {
	const resumo = dadosMonitoramento.resumo;
	clearInterval(temporizadorContagemRegressiva);
	$("#monitor-summary").innerHTML =
		`<div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true"><i data-lucide="clock-3"></i></span>${formatarDataResumo(resumo.ultimaAtualizacao)}<span>Última atualização</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true"><i data-lucide="check"></i></span><strong>${resumo.produtosAtivos ?? 0}</strong><span>Produtos listados atualmente</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true"><i data-lucide="package"></i></span><strong>${resumo.produtosSalvos ?? 0}</strong><span>Produtos salvos</span></div><div class="monitor-stat"><span class="monitor-stat-icon" aria-hidden="true"><i data-lucide="timer"></i></span><strong>${resumo.duracaoMediaMs ? formatarDuracao(resumo.duracaoMediaMs) : "—"}</strong><span>Tempo médio por rodada</span></div>`;
	agendarAtualizacaoIcones();
	atualizarContagemRegressiva();
	temporizadorContagemRegressiva = setInterval(
		atualizarContagemRegressiva,
		1000,
	);
}

function atualizarAcessoInicial(fontes) {
	const semFontes = fontes.length === 0;
	document
		.querySelectorAll("[data-requer-fonte]")
		.forEach((link) => link.classList.toggle("is-hidden", semFontes));
	return !semFontes;
}
function renderizarCadastroInicial() {
	mostrarPaginaAdministracao();
	document
		.querySelectorAll("[data-requer-fonte]")
		.forEach((link) => link.classList.add("is-hidden"));
	$("#admin-page").innerHTML =
		'<section class="admin-card initial-source-card"><div class="initial-source-icon"><i data-lucide="store" aria-hidden="true"></i></div><h1>Cadastre sua primeira fonte</h1><p>Para acessar o monitoramento e a busca manual, configure pelo menos uma loja para o sistema coletar produtos.</p><a href="#admin" class="primary-button">Cadastrar fonte <i data-lucide="arrow-right" aria-hidden="true"></i></a></section>';
	atualizarIconesLucide();
}
async function carregarRotaQueExigeFonte(carregar) {
	const resposta = await fetch("/api/admin/configuracoes/scraping");
	if (!resposta.ok) {
		mostrarLoginAdministracao();
		return;
	}
	const fontes = (await resposta.json()).dados?.fontes ?? [];
	if (!atualizarAcessoInicial(fontes)) {
		renderizarCadastroInicial();
		return;
	}
	await carregar();
	await carregarFontesNosFiltrosAdministrativos();
}
async function atualizarAcessoFontesAdministrativas() {
	const resposta = await fetch("/api/admin/configuracoes/scraping");
	if (!resposta.ok) return;
	atualizarAcessoInicial((await resposta.json()).dados?.fontes ?? []);
}
function renderizarRota() {
	if (window.location.hash === "#login") {
		fecharEventosScraping();
		$("#new-products").classList.add("is-hidden");
		mostrarLoginAdministracao();
		return;
	}
	if (window.location.hash === "#admin") {
		fecharEventosScraping();
		$("#new-products").classList.add("is-hidden");
		void atualizarAcessoFontesAdministrativas();
		carregarConfiguracaoAdministracao();
		return;
	}
	if (window.location.hash === "#admin/autenticacao") {
		fecharEventosScraping();
		$("#new-products").classList.add("is-hidden");
		carregarConfiguracaoAutenticacao();
		return;
	}
	if (window.location.hash === "#admin/busca") {
		fecharEventosScraping();
		$("#new-products").classList.add("is-hidden");
		void carregarRotaQueExigeFonte(carregarBuscaManual);
		return;
	}
	if (window.location.hash === "#admin/scraping") {
		$("#new-products").classList.add("is-hidden");
		void carregarRotaQueExigeFonte(carregarMonitoramento);
		return;
	}
	if (window.location.hash === "#admin/sistema") {
		fecharEventosScraping();
		$("#new-products").classList.add("is-hidden");
		void carregarRotaQueExigeFonte(carregarSistema);
		return;
	}
	const rotaFonte = window.location.hash.match(
		/^#admin\/fontes\/([a-z0-9]+(?:-[a-z0-9]+)*)$/,
	);
	if (rotaFonte) {
		fecharEventosScraping();
		$("#new-products").classList.add("is-hidden");
		void carregarConfiguracaoFonte(rotaFonte[1]);
		return;
	}
	fecharEventosScraping();
	$("#admin-shell").classList.add("is-hidden");
	$("#admin-page").classList.add("is-hidden");
	const rota = window.location.hash.match(/^#produto\/(.+)$/);
	if (rota) {
		$("#new-products").classList.add("is-hidden");
		carregarDetalhe(rota[1]);
	} else {
		$(".content-layout").classList.remove("is-hidden");
		$("#product-detail").classList.add("is-hidden");
		carregando.classList.remove("is-hidden");
		carregarProdutos();
		carregarNovidades();
	}
}

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
				const verificacao = await fetch(
					"/api/autenticacao/login/verificar-mfa",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							email: dados.email,
							senha: dados.senha,
						}),
					},
				);
				const resultadoVerificacao = await verificacao.json();
				if (!verificacao.ok)
					throw new Error(
						resultadoVerificacao.erro ?? "Credenciais inválidas",
					);
				if (resultadoVerificacao.dados.mfaNecessario) {
					formulario.dataset.mfaNecessario = "true";
					$("#totp-field").classList.remove("is-hidden");
					$("#totp-hint").classList.remove("is-hidden");
					$("#totp-field input").required = true;
					$("#totp-field input").focus();
					return;
				}
			}
			const resposta = await fetch("/api/autenticacao/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(
					Object.fromEntries(new FormData(formulario)),
				),
			});
			if (!resposta.ok)
				throw new Error(
					(await resposta.json()).erro ?? "Não foi possível entrar",
				);
			atualizarConta();
			window.location.hash = "admin";
		} catch (erro) {
			mostrarLoginAdministracao(erro.message);
		}
	});
}

$("#new-products-previous").addEventListener("click", () => {
	if (estadoNovidades.pagina > 1) {
		estadoNovidades.pagina -= 1;
		renderizarNovidades();
	}
});
$("#new-products-next").addEventListener("click", () => {
	if (
		estadoNovidades.pagina <
		Math.ceil(estadoNovidades.itens.length / estadoNovidades.porPagina)
	) {
		estadoNovidades.pagina += 1;
		renderizarNovidades();
	}
});

let filtroBuscaManual = { texto: "", somenteMultilojas: false };
function obterChaveBuscaManual(titulo) {
	return String(titulo ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}
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
		const correspondeTexto =
			!texto || item.titulo.toLocaleLowerCase().includes(texto);
		const correspondeLojas =
			!filtroBuscaManual.somenteMultilojas ||
			(grupos.get(obterChaveBuscaManual(item.titulo))?.size ?? 0) > 1;
		return correspondeTexto && correspondeLojas;
	});
}
function renderizarTabelaBuscaManual() {
	const corpo = $("#manual-search-body");
	if (!corpo) return;
	const itens = obterItensBuscaManualVisiveis();
	corpo.innerHTML =
		itens
			.map(
				(item) =>
					`<tr><td>${renderizarFonteComLogo(item.fonte)}</td><td>${escaparHtml(item.titulo)}</td><td>${formatarPreco(item.preco)}</td><td>${item.precoAntigo ? formatarPreco(item.precoAntigo) : "—"}</td><td><a href="${escaparHtml(item.url)}" target="_blank" rel="noreferrer">Abrir</a></td></tr>`,
			)
			.join("") ||
		'<tr><td colspan="5" class="manual-search-empty">Nenhum produto encontrado com esses filtros.</td></tr>';
	$("#manual-search-count").textContent = `${itens.length} produto(s)`;
	$("#manual-search-errors").innerHTML = resultadoBuscaManual.erros
		.map(
			(erro) =>
				`<div class="admin-error">${renderizarFonteComLogo(erro.fonte)}: ${escaparHtml(erro.mensagem)}</div>`,
		)
		.join("");
}
function gerarCsvBuscaManual() {
	return `\uFEFFfonte;titulo;preco;precoAntigo;url;imagemUrl\n${obterItensBuscaManualVisiveis()
		.map((item) =>
			[
				item.fonte,
				item.titulo,
				item.preco,
				item.precoAntigo,
				item.url,
				item.imagemUrl,
			]
				.map(escaparCsvManual)
				.join(";"),
		)
		.join("\n")}\n`;
}
async function salvarStatusFonteInterno(evento) {
	const campo = evento.currentTarget;
	const fonte = campo.name.replace("ativa-", "");
	const feedback = $("#admin-feedback");
	feedback.className = "admin-feedback";
	feedback.textContent = "Salvando...";
	campo.disabled = true;
	try {
		const atual = await fetch("/api/admin/configuracoes/scraping");
		if (!atual.ok)
			throw new Error(
				"Não foi possível carregar as configurações atuais",
			);
		const configuracao = (await atual.json()).dados;
		const fontes = configuracao.fontes.map((fonteConfigurada) => {
			const item = removerLogoDaAtualizacao(fonteConfigurada);
			return {
				...item,
				ativa: item.fonte === fonte ? campo.checked : item.ativa,
			};
		});
		const resposta = await fetch("/api/admin/configuracoes/scraping", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": obterTokenCsrf(),
			},
			body: JSON.stringify({ fontes }),
		});
		if (!resposta.ok)
			throw new Error(
				(await resposta.json()).erro ??
					"Não foi possível salvar o status",
			);
		feedback.className = "admin-feedback success";
		feedback.textContent = "Status da fonte atualizado.";
	} catch (erro) {
		campo.checked = !campo.checked;
		feedback.className = "admin-feedback error";
		feedback.textContent = erro.message;
	} finally {
		campo.disabled = false;
	}
}
async function salvarConfiguracaoAdministracaoGeral(evento) {
	evento.preventDefault();
	const formulario = new FormData(evento.currentTarget);
	const feedback = $("#admin-feedback");
	feedback.className = "admin-feedback";
	feedback.textContent = "Salvando...";
	try {
		const atual = await fetch("/api/admin/configuracoes/scraping");
		if (!atual.ok)
			throw new Error(
				"Não foi possível carregar as configurações atuais",
			);
		const configuracao = (await atual.json()).dados;
		const fontes = configuracao.fontes.map((fonteConfigurada) => {
			const fonte = removerLogoDaAtualizacao(fonteConfigurada);
			return {
				...fonte,
				url: formulario.get(`url-${fonte.fonte}`),
				ativa: formulario.get(`ativa-${fonte.fonte}`) === "on",
			};
		});
		const resposta = await fetch("/api/admin/configuracoes/scraping", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": obterTokenCsrf(),
			},
			body: JSON.stringify({ fontes }),
		});
		if (!resposta.ok)
			throw new Error(
				(await resposta.json()).erro ?? "Não foi possível salvar",
			);
		feedback.className = "admin-feedback success";
		feedback.textContent = "Configurações salvas com sucesso.";
	} catch (erro) {
		feedback.className = "admin-feedback error";
		feedback.textContent = erro.message;
	}
}
function obterSeletoresDoFormulario(fonte) {
	const valor = (campo) =>
		$(`input[name="seletor-${campo}-${fonte}"]`)?.value.trim() ?? "";
	return {
		item: valor("item"),
		titulo: valor("titulo"),
		preco: valor("preco"),
		precoAntigo: valor("precoAntigo"),
		imagem: valor("imagem"),
		url: valor("url"),
		carregarMais: valor("carregarMais"),
		paginaVirtualizada: Boolean(
			$(`input[name="paginaVirtualizada-${fonte}"]`)?.checked,
		),
	};
}
function posicionarNotaUrlFonte() {
	const formulario = $("#source-settings-form");
	const campo = formulario?.querySelector("input[name='url']");
	const rotulo = campo?.closest("label");
	if (!rotulo || rotulo.querySelector(".url-label-note")) return;
	rotulo.querySelector(".source-url-hint")?.remove();
	const titulo = document.createElement("span");
	titulo.className = "url-label-title";
	titulo.innerHTML =
		"URL da fonte <span class='required-mark'>*</span> <span class='url-label-note'>(A URL será usada na próxima coleta.)</span>";
	rotulo.firstChild?.replaceWith(titulo);
}
function configurarTooltipsInformativos() {
	document.querySelectorAll(".info-icon[title]").forEach((icone) => {
		icone.dataset.tooltip = icone.getAttribute("title") ?? "";
		icone.removeAttribute("title");
	});
}
function configurarEdicaoFonte() {
	const formulario = $("#source-settings-form");
	if (!formulario || formulario.dataset.editConfigured) return;
	formulario.dataset.editConfigured = "true";
	const campos = [
		...formulario.querySelectorAll(
			"input[name='url'], input[name^='seletor-'], input[name^='paginaVirtualizada-']",
		),
	];
	const salvar = formulario.querySelector(".primary-button");
	if (!salvar) return;
	const originais = new Map(
		campos.map((campo) => [
			campo,
			{ valor: campo.value, marcado: campo.checked },
		]),
	);
	const atualizarEstadoVisual = (modo) => {
		formulario.classList.toggle("is-editing", modo);
		formulario.classList.toggle("is-locked", !modo);
	};
	campos.forEach((campo) => {
		campo.disabled = true;
	});
	atualizarEstadoVisual(false);
	const acoes = document.createElement("div");
	acoes.className = "fields-actions";
	const editar = document.createElement("button");
	editar.type = "button";
	editar.className = "secondary-button edit-fields-button";
	editar.textContent = "Editar campos";
	const cancelar = document.createElement("button");
	cancelar.type = "button";
	cancelar.className = "secondary-button cancel-fields-button is-hidden";
	cancelar.textContent = "Cancelar";
	const ativar = (modo) => {
		campos.forEach((campo) => {
			campo.disabled = !modo;
		});
		editar.classList.toggle("is-hidden", modo);
		cancelar.classList.toggle("is-hidden", !modo);
		atualizarEstadoVisual(modo);
	};
	editar.addEventListener("click", () => ativar(true));
	cancelar.addEventListener("click", () => {
		campos.forEach((campo) => {
			const original = originais.get(campo);
			if (!original) return;
			campo.value = original.valor;
			campo.checked = original.marcado;
		});
		ativar(false);
	});
	salvar.remove();
	acoes.append(editar, cancelar, salvar);
	formulario.querySelector("#source-settings-feedback")?.after(acoes);
	formulario.addEventListener("submit", () => {
		window.setTimeout(() => {
			const feedback = $("#source-settings-feedback");
			if (feedback?.classList.contains("success")) {
				campos.forEach((campo) =>
					originais.set(campo, {
						valor: campo.value,
						marcado: campo.checked,
					}),
				);
				ativar(false);
			}
		}, 100);
	});
}
function adicionarBotoesEdicaoFontes() {
	const formulario = $("#scraping-settings-form");
	formulario?.querySelector(".primary-button")?.remove();
	formulario?.querySelectorAll("input[name^='ativa-']").forEach((campo) => {
		if (campo.dataset.autoSave) return;
		campo.dataset.autoSave = "true";
		campo.addEventListener(
			"change",
			(evento) => void salvarStatusFonte(evento),
		);
	});
	if (formulario) {
		let botaoAdicionar = $("#add-source-button");
		if (!botaoAdicionar) {
			botaoAdicionar = document.createElement("button");
		botaoAdicionar.id = "add-source-button";
		botaoAdicionar.type = "button";
		botaoAdicionar.className = "secondary-button add-source-button";
		botaoAdicionar.innerHTML =
			'Adicionar fonte <i data-lucide="plus" aria-hidden="true"></i>';
		formulario.querySelector("#admin-feedback")?.before(botaoAdicionar);
		}
		if (!botaoAdicionar.dataset.configured) {
			botaoAdicionar.dataset.configured = "true";
			botaoAdicionar.addEventListener("click", abrirLinhaNovaFonte);
		}
	}
	document.querySelectorAll(".admin-source").forEach((secao) => {
		const campo = secao.querySelector("input[name^='ativa-']");
		const fonte = campo?.name.replace("ativa-", "");
		if (!fonte) return;
		if (!secao.querySelector("[data-edit-source]")) {
			const url = secao.querySelector("input[name^='url-']");
			if (url) {
				const oculto = document.createElement("input");
				oculto.type = "hidden";
				oculto.name = url.name;
				oculto.value = url.value;
				url.closest("label")?.replaceWith(oculto);
			}
			const botao = document.createElement("a");
			botao.className = "edit-source-button secondary-button";
			botao.href = "#admin/fontes/" + fonte;
			botao.dataset.editSource = fonte;
			botao.setAttribute("aria-label", "Editar fonte");
			botao.innerHTML = "<i data-lucide='pencil' aria-hidden='true'></i>";
			secao.append(botao);
		}
		if (!secao.querySelector("[data-delete-source]")) {
			const botaoExcluir = document.createElement("button");
			botaoExcluir.type = "button";
			botaoExcluir.className = "delete-source-button";
			botaoExcluir.dataset.deleteSource = fonte;
			botaoExcluir.setAttribute("aria-label", "Excluir fonte");
			botaoExcluir.innerHTML =
				"<i data-lucide='trash-2' aria-hidden='true'></i>";
			botaoExcluir.addEventListener(
				"click",
				() => void removerFonte(fonte, formatarFonte(fonte)),
			);
			secao.append(botaoExcluir);
		}
	});
}
function configurarRotulosAcoesFontes() {
	document.querySelectorAll(".edit-source-button").forEach((botao) => {
		botao.setAttribute("aria-label", "Editar fonte");
		botao.title = "Editar fonte";
	});
	document.querySelectorAll(".delete-source-button").forEach((botao) => {
		botao.setAttribute("aria-label", "Excluir fonte");
		botao.title = "Excluir fonte";
	});
}
function abrirLinhaNovaFonte() {
	if ($("[data-new-source-row]")) return;
	const formulario = $("#scraping-settings-form");
	if (!formulario) return;
	const linha = document.createElement("section");
	linha.className = "admin-source new-source-row";
	linha.dataset.newSourceRow = "true";
	linha.innerHTML =
		'<div class="new-source-identity"><label class="toggle-row"><input class="toggle-input" type="checkbox" disabled /><span class="toggle-control"></span><span>Inativa</span></label><label class="new-source-name-label"><span class="sr-only">Nome da fonte</span><input name="new-source-name" type="text" placeholder="Nome da nova fonte" /></label></div><div class="new-source-actions"><button type="button" class="secondary-button cancel-new-source">Cancelar <i data-lucide="x" aria-hidden="true"></i></button><button type="button" class="new-source-save-button confirm-new-source">Salvar fonte <i data-lucide="save" aria-hidden="true"></i></button></div>';
	formulario.querySelector("#admin-feedback")?.before(linha);
	$("#add-source-button")?.classList.add("is-hidden");
	linha.querySelector(".cancel-new-source").addEventListener("click", () => {
		linha.remove();
		$("#add-source-button")?.classList.remove("is-hidden");
	});
	linha
		.querySelector(".confirm-new-source")
		.addEventListener("click", () => void salvarNovaFonteBasica(linha));
	linha
		.querySelector("input[name='new-source-name']")
		.addEventListener("keydown", (evento) => {
			if (evento.key === "Enter") void salvarNovaFonteBasica(linha);
		});
	configurarLogoNovaFonte();
	linha.querySelector("input[name='new-source-name']")?.focus();
}
function configurarLogoNovaFonte() {
	const linha = $("[data-new-source-row]");
	if (!linha || linha.dataset.logoConfigured) return;
	linha.dataset.logoConfigured = "true";
	const entrada = document.createElement("input");
	entrada.type = "file";
	entrada.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
	entrada.name = "new-source-logo";
	entrada.className = "new-source-logo-input";
	entrada.setAttribute("aria-label", "Selecionar logo da fonte");
	const preview = document.createElement("img");
	preview.className = "new-source-logo-preview is-hidden";
	preview.alt = "Pré-visualização da logo";
	const seletor = document.createElement("label");
	seletor.className = "new-source-logo-picker";
	seletor.innerHTML =
		'<span class="new-source-logo-button"><i data-lucide="upload" aria-hidden="true"></i><span>Adicionar logo</span></span>';
	seletor.prepend(entrada);
	seletor.append(preview);
	entrada.addEventListener("change", () => {
		const arquivo = entrada.files?.[0];
		if (!arquivo) return;
		if (preview.src) URL.revokeObjectURL(preview.src);
		const urlPreview = URL.createObjectURL(arquivo);
		preview.addEventListener("load", () => URL.revokeObjectURL(urlPreview), {
			once: true,
		});
		preview.src = urlPreview;
		preview.classList.remove("is-hidden");
		seletor.classList.add("has-logo");
	});
	linha.querySelector(".new-source-name-label")?.before(seletor);
	agendarAtualizacaoIcones();
}
function configurarInteracoesCatalogo() {
	$("#search-form").addEventListener("submit", (evento) => {
		evento.preventDefault();
		estado.busca = $("#search-input").value.trim();
		estado.pagina = 1;
		ocultarSugestoes();
		void carregarProdutos();
	});
	$("#search-input").addEventListener("input", (evento) =>
		void carregarSugestoes(evento.target.value),
	);
	$("#search-input").addEventListener("blur", () =>
		setTimeout(ocultarSugestoes, 150),
	);
	document.querySelectorAll("input[name='source']").forEach((radio) =>
		radio.addEventListener("change", () => {
			estado.fonte = radio.value;
			aplicarFiltrosAutomaticamente();
		}),
	);
	$("#min-price").addEventListener("input", () => {
		atualizarValoresPreco("min");
		aplicarFiltrosAutomaticamente();
	});
	$("#max-price").addEventListener("input", () => {
		atualizarValoresPreco("max");
		aplicarFiltrosAutomaticamente();
	});
	$("#only-active").addEventListener("change", (evento) => {
		estado.apenasAtivos = evento.target.checked;
		aplicarFiltrosAutomaticamente();
	});
	$("#clear-filters").addEventListener("click", () => {
		Object.assign(estado, {
			busca: "",
			categoria: "",
			fonte: "",
			precoMin: "",
			precoMax: "",
			apenasAtivos: true,
			pagina: 1,
		});
		$("#search-input").value = "";
		const categoriaTodas = $("input[name='category'][value='']");
		const fonteTodas = $("input[name='source'][value='']");
		if (categoriaTodas) categoriaTodas.checked = true;
		if (fonteTodas) fonteTodas.checked = true;
		$("#min-price").value = 0;
		$("#max-price").value = 20000;
		$("#only-active").checked = true;
		atualizarValoresPreco();
		void carregarProdutos();
	});
	$("#sort-filter").addEventListener("change", (evento) => {
		estado.ordenacao = evento.target.value;
		estado.pagina = 1;
		void carregarProdutos();
	});
	document.querySelectorAll("[data-category]").forEach((botao) =>
		botao.addEventListener("click", () => {
			const estavaEmOutraPagina =
				!$("#admin-shell").classList.contains("is-hidden") ||
				!$("#product-detail").classList.contains("is-hidden");
			document
				.querySelectorAll("[data-category]")
				.forEach((item) => item.classList.remove("is-active"));
			botao.classList.add("is-active");
			estado.busca = botao.dataset.category ?? "";
			$("#search-input").value = estado.busca;
			estado.pagina = 1;
			$("#admin-shell").classList.add("is-hidden");
			$("#admin-page").classList.add("is-hidden");
			$("#product-detail").classList.add("is-hidden");
			$(".content-layout").classList.remove("is-hidden");
			window.location.hash = "";
			if (!estavaEmOutraPagina) void carregarProdutos();
		}),
	);
}
async function removerFonte(fonte, nome) {
	const confirmacao = await abrirDialogoPersonalizado({
		titulo: `Excluir ${nome}?`,
		descricao: "Essa ação não poderá ser desfeita.",
		confirmar: "Excluir fonte",
		variante: "danger",
	});
	if (!confirmacao) return;
	try {
		const resposta = await fetch(
			"/api/admin/configuracoes/scraping/fontes/" + encodeURIComponent(fonte),
			{ method: "DELETE", headers: { "X-CSRF-Token": obterTokenCsrf() } },
		);
		const dados = await resposta.json();
		if (!resposta.ok) {
			throw new Error(formatarErroApi(dados, "Não foi possível excluir a fonte."));
		}
		await carregarConfiguracaoAdministracao();
	} catch (erro) {
		await mostrarMensagemPersonalizada(
			"Não foi possível excluir a fonte",
			erro.message,
			"danger",
		);
	}
}

if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		observadorIcones.disconnect();
		fecharEventosScraping();
		controladorSugestoes?.abort();
		clearTimeout(temporizadorFiltros);
		clearTimeout(temporizadorSugestoes);
	});
}

atualizarIconesLucide();
configurarConta();
configurarInteracoesCatalogo();
atualizarConta();
void carregarCategorias();
void carregarFontesParaFiltros();
window.addEventListener("hashchange", renderizarRota);
atualizarValoresPreco();
renderizarRota();
