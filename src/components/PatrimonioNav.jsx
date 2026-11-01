const ITEMS = [
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'patrimonio', label: 'Patrimônio' },
  { id: 'simulador', label: 'Simulador' },
]

/** Troca entre as três telas da aba Patrimônio. */
export default function PatrimonioNav({ current }) {
  return (
    <nav className="subnav" aria-label="Patrimônio">
      {ITEMS.map((i) => (
        <a key={i.id} href={`#/${i.id}`} aria-current={current === i.id ? 'page' : undefined}>
          {i.label}
        </a>
      ))}
    </nav>
  )
}
