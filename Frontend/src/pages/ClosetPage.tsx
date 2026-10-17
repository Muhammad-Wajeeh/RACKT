import PageHeader from '../components/PageHeader'
import './ClosetPage.css'

const FILTERS = [
  'All',
  'Clothing',
  'Tops',
  'Bottoms',
  'Footwear',
  'Jewelry',
  'Headwear',
  'Accessories',
]

interface Piece {
  category: string
  name: string
  brand: string
  perWear: string
  binned?: boolean
}

const PIECES: Piece[] = [
  { category: 'Clothing', name: 'Ribbed Turtleneck', brand: 'Isadora Studio', perWear: '$4.86' },
  { category: 'Clothing', name: 'Oxford Poplin Shirt', brand: 'Fielding & Rose', perWear: '$4.38' },
  { category: 'Clothing', name: 'Silk Camisole', brand: 'Lune', perWear: '$6.00' },
  { category: 'Clothing', name: 'Wide-Leg Trouser', brand: 'Fielding & Rose', perWear: '$7.11' },
  { category: 'Clothing', name: 'Raw Denim', brand: 'Atelier Noir', perWear: '$4.83' },
  { category: 'Clothing', name: 'Pleated Midi Skirt', brand: 'Lune', perWear: '$14.00' },
  { category: 'Clothing', name: 'Wool Overcoat', brand: 'Atelier Noir', perWear: '$15.45', binned: true },
  { category: 'Clothing', name: 'Waxed Field Jacket', brand: 'Fielding & Rose', perWear: '$14.00' },
  { category: 'Shoes', name: 'Leather Loafer', brand: 'Atelier Noir', perWear: '$9.20', binned: true },
  { category: 'Shoes', name: 'Canvas Sneaker', brand: 'Lune', perWear: '$3.10' },
  { category: 'Shoes', name: 'Chelsea Boot', brand: 'Fielding & Rose', perWear: '$11.75' },
  { category: 'Jewelry', name: 'Signet Ring', brand: 'Isadora Studio', perWear: '$2.40' },
]

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function ImageIcon({ size = 26 }: { size?: number }) {
  return (
    <svg {...iconProps} width={size} height={size} strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  )
}

export default function ClosetPage() {
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="The Closet">
        <label className="closet-search">
          <svg {...iconProps} width={16} height={16}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search your closet..." />
        </label>

        <div className="closet-actions">
          <button type="button" className="btn btn--icon" aria-label="Sort and filter">
            <svg {...iconProps}>
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="8" cy="17" r="2" />
            </svg>
          </button>
          <button type="button" className="btn">
            <svg {...iconProps}>
              <path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17M11 6.5h10M11 12.5h10M11 18.5h10" />
            </svg>
            SELECT
          </button>
          <button type="button" className="btn btn--primary">
            <svg {...iconProps}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            ADD PIECE
          </button>
        </div>
      </PageHeader>

      <div className="closet-body">
        <section className="closet-main">
          <div className="closet-filters">
            {FILTERS.map((f, i) => (
              <button
                key={f}
                type="button"
                className={`chip${i === 0 ? ' chip--active' : ''}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="closet-grid">
            {PIECES.map((p) => (
              <article key={p.name} className="piece">
                <div className="piece__image">
                  {p.binned && (
                    <span className="piece__badge" title="In a bin">
                      <svg {...iconProps} width={12} height={12}>
                        <rect x="3" y="4" width="18" height="4" rx="1" />
                        <path d="M4.5 8v11a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V8M10 12.5h4" />
                      </svg>
                    </span>
                  )}
                  <ImageIcon />
                  <span className="piece__drop">{p.category}</span>
                  <span className="piece__browse">
                    or <u>browse files</u>
                  </span>
                </div>
                <div className="piece__info">
                  <span className="piece__category">{p.category}</span>
                  <h3>{p.name}</h3>
                  <div className="piece__meta">
                    <span>{p.brand}</span>
                    <span>{p.perWear} / wear</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="closet-details">
          <svg {...iconProps} width={32} height={32} strokeWidth={1.4}>
            <path d="M12 7.5a2.2 2.2 0 1 0-2.2-2.2" />
            <path d="M12 7.5v2L3 17a1.5 1.5 0 0 0 1 2.6h16a1.5 1.5 0 0 0 1-2.6l-9-7.5" />
          </svg>
          <p>Select a piece to see details.</p>
        </aside>
      </div>
    </>
  )
}
