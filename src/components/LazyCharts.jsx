import { lazy, Suspense } from 'react'

// Os gráficos usam uma biblioteca grande. Aqui eles só são baixados quando uma tela
// precisa deles, então o site abre mais rápido (principalmente no celular).
const Lazy = {
  Donut: lazy(() => import('./charts').then((m) => ({ default: m.Donut }))),
  MonthlyBars: lazy(() => import('./charts').then((m) => ({ default: m.MonthlyBars }))),
  EvolutionLines: lazy(() => import('./charts').then((m) => ({ default: m.EvolutionLines }))),
  NetWorthLine: lazy(() => import('./charts').then((m) => ({ default: m.NetWorthLine }))),
  GrowthChart: lazy(() => import('./charts').then((m) => ({ default: m.GrowthChart }))),
}

const fallback = <div className="chart-skeleton" aria-hidden="true" />

function wrap(Component) {
  return function WithFallback(props) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    )
  }
}

export const Donut = wrap(Lazy.Donut)
export const MonthlyBars = wrap(Lazy.MonthlyBars)
export const EvolutionLines = wrap(Lazy.EvolutionLines)
export const NetWorthLine = wrap(Lazy.NetWorthLine)
export const GrowthChart = wrap(Lazy.GrowthChart)
