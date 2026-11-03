import { useCallback, useEffect, useState } from 'react'

/** Guarda uma preferência simples (tema, tamanho da letra) neste aparelho. */
export function useLocalSetting(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const v = window.localStorage.getItem(key)
      return v === null ? initial : v
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (v) => {
      setValue(v)
      try {
        window.localStorage.setItem(key, v)
      } catch {
        /* sem armazenamento: segue sem salvar */
      }
    },
    [key],
  )
  return [value, set]
}

export const ROUTES = ['inicio', 'gastos', 'patrimonio', 'investimentos', 'simulador', 'metas', 'cartoes', 'ajustes']

const readRoute = () => {
  const h = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.includes(h) ? h : 'inicio'
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

const CDI_REFERENCIA = 13.9

/**
 * CDI do ano (% ao ano) do Banco Central. Se não conseguir buscar, usa a última
 * taxa salva neste aparelho, ou um valor de referência.
 */
export function useCdi() {
  const [cdi, setCdi] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('nb-cdi'))
      if (saved && saved.value > 0) return { value: saved.value, live: false }
    } catch {
      /* usa a referência */
    }
    return { value: CDI_REFERENCIA, live: false }
  })

  useEffect(() => {
    let cancelled = false
    fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json')
      .then((r) => r.json())
      .then((rows) => {
        const value = Number(rows?.[0]?.valor)
        if (!(value > 0 && value < 100) || cancelled) return
        setCdi({ value, live: true })
        try {
          window.localStorage.setItem('nb-cdi', JSON.stringify({ value }))
        } catch {
          /* ignora */
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return cdi
}

/** Cotação do dólar em reais (AwesomeAPI, gratuita). Guarda a última no aparelho. */
export function useUsdRate() {
  const [rate, setRate] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('nb-usd'))
      return saved && saved.value ? { ...saved, live: false } : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    let cancelled = false
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
      .then((r) => r.json())
      .then((d) => {
        const value = Number(d?.USDBRL?.bid)
        if (!value || cancelled) return
        const next = { value, at: Date.now() }
        setRate({ ...next, live: true })
        try {
          window.localStorage.setItem('nb-usd', JSON.stringify(next))
        } catch {
          /* ignora */
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return rate
}
