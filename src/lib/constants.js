export const CATEGORIES_OUT = [
  { id: 'mercado', label: 'Mercado', icon: '🛒' },
  { id: 'moradia', label: 'Moradia', icon: '🏠' },
  { id: 'contas', label: 'Luz, água e internet', icon: '💡' },
  { id: 'transporte', label: 'Transporte', icon: '🚗' },
  { id: 'saude', label: 'Saúde e remédios', icon: '💊' },
  { id: 'restaurantes', label: 'Restaurantes', icon: '🍽️' },
  { id: 'lazer', label: 'Lazer', icon: '🎬' },
  { id: 'educacao', label: 'Estudos', icon: '📚' },
  { id: 'roupas', label: 'Roupas', icon: '👕' },
  { id: 'outros_saida', label: 'Outros', icon: '📦' },
]

export const CATEGORIES_IN = [
  { id: 'salario', label: 'Salário', icon: '💼' },
  { id: 'aposentadoria', label: 'Aposentadoria ou pensão', icon: '🧓' },
  { id: 'extra', label: 'Trabalho extra', icon: '🛠️' },
  { id: 'rendimentos', label: 'Rendimentos', icon: '📈' },
  { id: 'presente', label: 'Presente', icon: '🎁' },
  { id: 'outros_entrada', label: 'Outros', icon: '📦' },
]

const ALL = [...CATEGORIES_OUT, ...CATEGORIES_IN]
export const categoryOf = (id) =>
  ALL.find((c) => c.id === id) || { id, label: 'Outros', icon: '📦' }

export const CHART_COLORS = [
  '#1F8A84',
  '#C98A0B',
  '#D4543F',
  '#5B7FE0',
  '#9A6BD1',
  '#3FB07A',
  '#E08A3C',
  '#7F95A0',
  '#B25C86',
  '#6B8E23',
]

export const KINDS = [
  {
    id: 'renda_fixa',
    label: 'Renda fixa',
    icon: '🏦',
    help: 'Poupança, Tesouro Direto, CDB, LCI, LCA',
    example: 'Ex.: Tesouro Selic',
    color: '#1F8A84',
  },
  {
    id: 'renda_variavel',
    label: 'Renda variável',
    icon: '📊',
    help: 'Ações, fundos imobiliários, ETFs',
    example: 'Ex.: Ações da Petrobras',
    color: '#5B7FE0',
  },
  {
    id: 'dolar',
    label: 'Dólar',
    icon: '💵',
    help: 'Dinheiro em dólar, conta global',
    example: 'Ex.: Dólar em conta',
    color: '#C98A0B',
  },
  {
    id: 'outros',
    label: 'Outros',
    icon: '🧩',
    help: 'Criptomoedas, ouro, previdência',
    example: 'Ex.: Previdência privada',
    color: '#9A6BD1',
  },
]

export const kindOf = (id) => KINDS.find((k) => k.id === id) || KINDS[3]
