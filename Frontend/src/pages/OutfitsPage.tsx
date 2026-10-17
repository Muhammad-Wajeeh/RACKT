import PageHeader from '../components/PageHeader'
import './OutfitsPage.css'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export default function OutfitsPage() {
  return (
    <>
      <PageHeader eyebrow="The Archive" title="Your Looks">
        <button type="button" className="btn btn--primary outfits-new">
          <svg {...iconProps} width={18} height={18} strokeWidth={1.8}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          NEW LOOK
        </button>
      </PageHeader>

      <div className="outfits-empty">
        <svg {...iconProps} width={32} height={32}>
          <path d="M12 6.5a2 2 0 1 0-2-2" />
          <path d="M12 6.5v2" />
          <path d="M12 8.5 4 13l2 3 2-1v5h8v-5l2 1 2-3-8-4.5Z" />
        </svg>
        <p>No looks saved yet — build your first.</p>
      </div>
    </>
  )
}
