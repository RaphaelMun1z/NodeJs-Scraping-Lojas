export interface SourceIdentity {
  fonte: string;
  nome: string;
  logo?: string;
}

export interface Selectors {
  item: string;
  titulo: string;
  preco: string;
  precoAntigo: string;
  imagem: string;
  url: string;
  paginaVirtualizada: boolean;
  carregarMais: string;
}

export interface SourceCategory {
  id: string;
  categoria: string;
  icone: string;
  url: string;
  ativa: boolean;
  seletores: Selectors;
}

export interface ConfiguredSource extends SourceIdentity {
  ativa: boolean;
  categorias: SourceCategory[];
}

export interface ScrapingConfig {
  chave?: string;
  fontes: ConfiguredSource[];
  atualizadaEm?: string;
}

export interface Product {
  _id?: string;
  id?: string;
  fonte: string;
  chave?: string;
  grupoProdutoId?: string;
  categoria?: string;
  categoriaOriginal?: string;
  titulo: string;
  preco?: number;
  precoAntigo?: number;
  ativo?: boolean;
  novaNaUltimaColeta?: boolean;
  precoHistorico?: boolean;
  imagemUrl?: string;
  url?: string;
  primeiraColetaEm?: string;
  ultimaColetaEm?: string;
}

export interface PriceHistoryEntry {
  fonte?: string;
  preco?: number;
  precoAntigo?: number;
  coletadoEm?: string;
  criadoEm?: string;
  data?: string;
}

export interface ProductHistoryResponse {
  dados?: Product;
  item?: Product;
  produto?: Product;
  historico: PriceHistoryEntry[];
  ofertas?: Product[];
}

export type ExecutionStatus = 'aguardando' | 'executando' | 'concluido' | 'erro';
export type LogLevel = 'info' | 'sucesso' | 'aviso' | 'erro';

export interface ScrapingProgress {
  coleta: number;
  embeddings: number;
  indexacao: number;
  geral: number;
}

export interface ScrapingExecution {
  _id: string;
  fonte: string;
  categoria?: string;
  rodadaId?: string;
  status: ExecutionStatus;
  iniciadoEm: string;
  finalizadoEm?: string;
  duracaoMs?: number;
  produtosEncontrados?: number;
  produtosNovos?: number;
  produtosAtualizados?: number;
  produtosInativados?: number;
  progresso?: ScrapingProgress;
  ultimaMensagem?: string;
  erro?: string;
}

export interface ScrapingSummary {
  ultimaAtualizacao?: string;
  produtosSalvos: number;
  produtosAtivos: number;
  duracaoMediaMs?: number;
  proximaBusca?: string;
}

export interface ScrapingStatusResponse {
  dados: ScrapingExecution[];
  resumo: ScrapingSummary;
}

export interface ScrapingLog {
  _id: string;
  execucaoId: string;
  fonte: string;
  nivel: LogLevel;
  mensagem: string;
  criadoEm: string;
}

export interface ManualSearchResult {
  itens: Product[];
  erros: { fonte: string; mensagem: string }[];
  iniciadaEm: string;
  finalizadaEm: string;
}

export interface SelectorTestResult {
  quantidadeProdutos: number;
  produtos: Product[];
  previewImagem?: string;
}

export interface SelectorAnalysis {
  seletores: Partial<Selectors>;
  confianca?: Partial<Record<keyof Selectors, number>>;
  observacoes?: string[];
}

export interface Administrator {
  id: string;
  email: string;
  nome?: string;
  mfaAtivo?: boolean;
}

export interface MfaSetup {
  segredo?: string;
  qrCode?: string;
  qrCodeDataUrl?: string;
  otpauthUrl?: string;
}
