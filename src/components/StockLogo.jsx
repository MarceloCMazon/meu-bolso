import { useState } from 'react'
import { logoFallback, logoSources } from '../lib/logos'

/**
 * Logo da empresa ao lado da ação (vem do repositório Ícones B3).
 * Tenta cada endereço em ordem; se nenhum carregar, mostra o código da ação (ou as iniciais)
 * numa plaquinha. Nunca fica imagem quebrada.
 */
export default function StockLogo({ ticker, name }) {
  const sources = logoSources(ticker, name)
  const key = sources[0] || ''
  const [state, setState] = useState({ key: '', tried: 0 })
  const tried = state.key === key ? state.tried : 0
  const src = sources[tried]

  return (
    <span className={`stock-logo ${src ? 'has-image' : 'is-text'}`} aria-hidden="true">
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          width="44"
          height="44"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setState({ key, tried: tried + 1 })}
        />
      ) : (
        <span className="stock-logo-text">{logoFallback(ticker, name)}</span>
      )}
    </span>
  )
}
