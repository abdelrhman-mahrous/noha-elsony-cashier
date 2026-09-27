export default function OfferBanner({ details }) {
  const label = details.offerTitleAr || 'عرض خاص مطبق'
  const coveredCount = details.items.filter(i => i.isCoveredByOffer).length

  return (
    <div className="offer-banner">
      <span style={{ fontSize: '1.2rem' }}>🏷️</span>
      <div>
        <div>{label}</div>
        {coveredCount > 0 && (
          <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: 2 }}>
            يشمل {coveredCount} بند
          </div>
        )}
      </div>
    </div>
  )
}
