/**
 * Logos das ações: carregados automaticamente do repositório público "Ícones B3"
 * (github.com/thefintz/icones-b3), pelo código da ação. Nada é baixado nem cadastrado à mão.
 * Se o logo não existir ou não carregar, aparece o código da ação numa plaquinha.
 * LOGO_TICKERS é só a lista de referência das 15 ações escolhidas.
 */
export const LOGO_TICKERS = [
  'PETR4', // Petrobras (preferencial)
  'PETR3', // Petrobras (ordinária)
  'VALE3', // Vale
  'ITUB4', // Itaú Unibanco
  'BBDC4', // Bradesco
  'BBAS3', // Banco do Brasil
  'BPAC11', // BTG Pactual
  'B3SA3', // B3
  'PRIO3', // PRIO
  'AXIA3', // Axia Energia
  'SBSP3', // Sabesp
  'EMBJ3', // Embraer
  'WEGE3', // WEG
  'ABEV3', // Ambev
  'ITSA4', // Itaúsa
]

/** Código limpo: maiúsculas, sem espaços, e sem o "F" do mercado fracionário (PETR4F vira PETR4). */
export function cleanTicker(ticker) {
  const t = String(ticker || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z]{4}\d{1,2}F$/.test(t) ? t.slice(0, -1) : t
}

/** O código da ação: o campo "código" ou, se não tiver, um código escrito no nome (ex.: "Banco do Brasil BBAS3"). */
export function findTicker(ticker, name) {
  const t = cleanTicker(ticker)
  if (t) return t
  const m = String(name || '').toUpperCase().match(/\b[A-Z]{4}\d{1,2}F?\b/)
  return m ? cleanTicker(m[0]) : ''
}

/** Códigos novos que ainda não existem no repositório Ícones B3: usa o logo do código antigo da mesma empresa. */
const ALIASES = { AXIA3: 'ELET3', EMBJ3: 'EMBR3' }

const REPO = 'thefintz/icones-b3'

/**
 * Endereços possíveis do logo, em ordem: primeiro o CDN (jsDelivr), depois o GitHub direto.
 * Lista vazia = o código não parece uma ação (ex.: "Tesouro Selic"), então só mostra a plaquinha.
 */
export function logoSources(ticker, name) {
  const t = findTicker(ticker, name)
  if (!/^[A-Z]{4}\d{1,2}$/.test(t)) return []
  const file = `${ALIASES[t] || t}.png`
  return [
    `https://cdn.jsdelivr.net/gh/${REPO}@main/icones/${file}`,
    `https://raw.githubusercontent.com/${REPO}/main/icones/${file}`,
  ]
}

/** Primeiro endereço do logo (ou null). */
export function logoSrc(ticker, name) {
  return logoSources(ticker, name)[0] || null
}

/** Texto curto para mostrar no lugar do logo: o código da ação ou as iniciais do nome. */
export function logoFallback(ticker, name) {
  const t = findTicker(ticker, name)
  if (t) return t.slice(0, 4)
  const skip = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E'])
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !skip.has(w.toUpperCase()))
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)
  return letters.toUpperCase()
}
