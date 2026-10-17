import PageHeader from '../components/PageHeader'
import './BinsPage.css'

interface Bin {
  name: string
  location: string
  count: number
}

const BINS: Bin[] = [
  { name: 'Winter Storage', location: 'Hall closet, top shelf', count: 3 },
  { name: 'Off-Season Shoes', location: 'Garage shelving', count: 1 },
  { name: 'Spare Room Bin', location: 'Spare bedroom closet', count: 0 },
]

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function BinIcon({ size }: { size: number }) {
  return (
    <svg {...iconProps} width={size} height={size}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M4.5 8v11a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V8" />
      <path d="M10 12.5h4" />
    </svg>
  )
}

export default function BinsPage() {
  return (
    <>
      <PageHeader eyebrow="Storage" title="Bins">
        <button type="button" className="btn btn--primary bins-new">
          <svg {...iconProps} width={18} height={18}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          NEW BIN
        </button>
      </PageHeader>

      <div className="bins-body">
        <section className="bins-main">
          <div className="bins-grid">
            {BINS.map((b) => (
              <article key={b.name} className="bin">
                <div className="bin__top">
                  <BinIcon size={20} />
                  <span className="bin__count">
                    {b.count} {b.count === 1 ? 'piece' : 'pieces'}
                  </span>
                </div>
                <h3>{b.name}</h3>
                <p>{b.location}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="bins-details">
          <BinIcon size={32} />
          <p>Select a bin to see what's inside.</p>
        </aside>
      </div>
    </>
  )
}
