/**
 * Ações brasileiras que têm logo em public/logos/TICKER.png.
 * Para ver o logo de outra ação: coloque o PNG em public/logos com o nome do código (ex.: MGLU3.png)
 * e acrescente o código nesta lista. Ações fora da lista (ou com arquivo faltando) mostram o código no lugar.
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

const KNOWN = new Set(LOGO_TICKERS)

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

/** Caminho do logo, ou null se esta ação não tem logo na lista. */
export function logoSrc(ticker, name) {
  const t = findTicker(ticker, name)
  return KNOWN.has(t) ? `/logos/${t}.png` : null
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
