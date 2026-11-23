import { useState } from 'react'
import { logoFallback, logoSrc } from '../lib/logos'

/**
 * Logo da empresa ao lado da ação. Se não houver logo, ou se a imagem não carregar,
 * mostra o código da ação (ou as iniciais) numa plaquinha. Nunca fica imagem quebrada.
 */
export default function StockLogo({ ticker, name }) {
  const src = logoSrc(ticker, name)
  const [failedSrc, setFailedSrc] = useState(null)
  const showImage = src && failedSrc !== src

  return (
    <span className={`stock-logo ${showImage ? 'has-image' : 'is-text'}`} aria-hidden="true">
      {showImage ? (
        <img
          src={src}
          alt=""
          width="44"
          height="44"
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="stock-logo-text">{logoFallback(ticker, name)}</span>
      )}
    </span>
  )
}
