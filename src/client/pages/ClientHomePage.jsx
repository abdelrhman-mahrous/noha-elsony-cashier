import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getClientServices,
  getClientBarbers,
  getClientOffers,
  getClientProducts,
  getClientReviews,
} from '../../services/clientService'
import ClientHeader from '../components/ClientHeader'
import BookingWizardModal from '../components/BookingWizardModal'
import TrackBookingModal from '../components/TrackBookingModal'
import SupportModal from '../components/SupportModal'
import AddReviewModal from '../components/AddReviewModal'

const CATEGORIES = [
  { key: 'all',    label: '✨ كل الخدمات' },
  { key: 'hair',   label: '💇‍♀️ العناية بالشعر' },
  { key: 'makeup', label: '💄 الميك أب والسواريه' },
  { key: 'skin',   label: '💆‍♀️ البشرة والهيدرافيشل' },
  { key: 'nails',  label: '💅 الأظافر والسبا' },
  { key: 'bridal', label: '👑 باقات العرائس VIP' },
]

export default function ClientHomePage() {
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [offers, setOffers] = useState([])
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [category, setCategory] = useState('all')

  // Modals state
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedInitialService, setSelectedInitialService] = useState(null)
  const [trackOpen, setTrackOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      const [srvData, barbData, offData, prodData, revData] = await Promise.allSettled([
        getClientServices(),
        getClientBarbers(),
        getClientOffers(),
        getClientProducts(),
        getClientReviews(),
      ])

      if (srvData.status === 'fulfilled') setServices(srvData.value)
      if (barbData.status === 'fulfilled') setBarbers(barbData.value)
      if (offData.status === 'fulfilled') setOffers(offData.value)
      if (prodData.status === 'fulfilled') setProducts(prodData.value)
      if (revData.status === 'fulfilled') setReviews(revData.value)
    }
    loadData()
  }, [])

  function openBookingWithService(srv) {
    setSelectedInitialService(srv)
    setBookingOpen(true)
  }

  const filteredServices = category === 'all'
    ? services
    : services.filter(s => s.category === category || (s.name && s.name.toLowerCase().includes(category)))

  return (
    <div className="client-app">
      {/* ── Top Header ── */}
      <ClientHeader
        onOpenBooking={() => { setSelectedInitialService(null); setBookingOpen(true) }}
        onOpenTrack={() => setTrackOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
      />

      {/* ── Hero Section ── */}
      <section className="client-hero">
        <div className="client-container">
          <div className="client-hero__badge">
            👑 التجربة الجمالية الأرقى في صالون نهي السني
          </div>

          <h1 className="client-hero__title">
            إشراقتكِ الملكية وتألقكِ يبدأ من هنا
          </h1>

          <p className="client-hero__desc">
            نقدم لكِ في صالون نهي السني أرقى جلسات العناية المتكاملة بالشعر، البشرة، الميك أب وباقات العرائس بأحدث التقنيات وأفضل الخامات العالمية.
          </p>

          <div className="client-hero__actions">
            <button
              className="client-btn-book"
              style={{ fontSize: '1.1rem', padding: '0.9rem 2.2rem' }}
              onClick={() => { setSelectedInitialService(null); setBookingOpen(true) }}
            >
              ✨ احجزي موعدكِ الآن
            </button>
            <button
              className="btn btn--secondary"
              style={{ padding: '0.9rem 1.8rem', borderRadius: 30 }}
              onClick={() => setTrackOpen(true)}
            >
              🔍 تتبع حالة حجزكِ
            </button>
          </div>

          {/* ── Quick Stats Strip ── */}
          <div className="client-stats-strip">
            <div className="client-stat-card">
              <div className="client-stat-card__icon">👑</div>
              <div>
                <span className="client-stat-card__num">+15,000</span>
                <span className="client-stat-card__label">عميلة سعيدة وراضية</span>
              </div>
            </div>

            <div className="client-stat-card">
              <div className="client-stat-card__icon">⭐</div>
              <div>
                <span className="client-stat-card__num">4.9 / 5.0</span>
                <span className="client-stat-card__label">تقييم الخدمة الملكية</span>
              </div>
            </div>

            <div className="client-stat-card">
              <div className="client-stat-card__icon">✨</div>
              <div>
                <span className="client-stat-card__num">%100</span>
                <span className="client-stat-card__label">منتجات وخامات أصلية</span>
              </div>
            </div>

            <div className="client-stat-card">
              <div className="client-stat-card__icon">💅</div>
              <div>
                <span className="client-stat-card__num">+35</span>
                <span className="client-stat-card__label">خدمة تجميلية متخصصة</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── قسم الخدمات ── */}
      <section id="services" className="client-section">
        <div className="client-container">
          <div className="client-section-header">
            <span className="client-section-tag">قائمة الخدمات</span>
            <h2 className="client-section-title">خدماتنا التجميلية المتكاملة</h2>
            <p className="client-section-desc">
              اختاري الخدمة التي تناسبكِ واضغطي حجز لتحديد المتخصصة والوقت بكل سهولة.
            </p>
          </div>

          {/* Filter Chips */}
          <div className="client-filter-chips">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                className={`client-chip${category === c.key ? ' client-chip--active' : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Services Grid */}
          <div className="client-services-grid">
            {filteredServices.map((srv) => (
              <div key={srv.id} className="client-service-card">
                <div>
                  <div className="client-service-card__top">
                    <div className="client-service-card__icon">✨</div>
                    <span className="client-service-card__time">
                      ⏳ {srv.duration_minutes || 45} دقيقة
                    </span>
                  </div>

                  <h3 className="client-service-card__title">
                    {srv.arabic_name || srv.name}
                  </h3>

                  <p className="client-service-card__desc">
                    {srv.description || 'خدمة تجميلية احترافية بأفضل المنتجات وبأيدي خبيرات الصالون.'}
                  </p>
                </div>

                <div className="client-service-card__bottom">
                  <div className="client-service-card__price">
                    {srv.base_price || srv.price} <small>ج.م</small>
                  </div>
                  <button
                    className="client-service-btn"
                    onClick={() => openBookingWithService(srv)}
                  >
                    احجزي الآن ✨
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── قسم العروض والباقات الحصرية ── */}
      {offers.length > 0 && (
        <section id="offers" className="client-section" style={{ background: 'rgba(244, 63, 94, 0.03)' }}>
          <div className="client-container">
            <div className="client-section-header">
              <span className="client-section-tag">عروض مميزة</span>
              <h2 className="client-section-title">🏷️ باقات وخصومات حصرية</h2>
              <p className="client-section-desc">
                استفيدي من أقوى العروض والخصومات المتاحة لفترة محدودة.
              </p>
            </div>

            <div className="client-offers-grid">
              {offers.map((offer) => (
                <div key={offer.id} className="client-offer-box">
                  <span className="client-offer-box__tag">
                    {offer.discount_percentage ? `خصم %${offer.discount_percentage}` : 'عرض خاص'}
                  </span>

                  <h3 className="client-offer-box__title">{offer.title || offer.name}</h3>
                  <p className="client-offer-box__desc">{offer.description}</p>

                  <div className="client-offer-box__prices">
                    {offer.discount_price && (
                      <span className="client-offer-box__current">
                        {offer.discount_price} ج.م
                      </span>
                    )}
                    {offer.original_price && (
                      <span className="client-offer-box__old">
                        {offer.original_price} ج.م
                      </span>
                    )}
                  </div>

                  <button
                    className="client-btn-book"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { setSelectedInitialService(offer); setBookingOpen(true) }}
                  >
                    احجزي العرض الآن 🛍️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── متجر المستحضرات والمنتجات ── */}
      {products.length > 0 && (
        <section id="store" className="client-section">
          <div className="client-container">
            <div className="client-section-header">
              <span className="client-section-tag">المتجر والعناية</span>
              <h2 className="client-section-title">🛍️ منتجات العناية الأصلية</h2>
              <p className="client-section-desc">
                مجموعة مختارة من أفضل مستحضرات العناية المنزلية بالشعر والبشرة.
              </p>
            </div>

            <div className="client-products-grid">
              {products.map((prod) => (
                <div key={prod.id} className="client-prod-card">
                  <div>
                    <span className="client-prod-card__category">{prod.category || 'عناية'}</span>
                    <h3 className="client-prod-card__title">{prod.name}</h3>
                    <p className="client-prod-card__desc">{prod.description || 'مستحضر علاجي فائق الجودة متوفر لدى صالون نهي السني.'}</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="client-prod-card__price">{prod.price} ج.م</div>
                    <button
                      className="client-service-btn"
                      onClick={() => setSupportOpen(true)}
                    >
                      طلب المنتج 📦
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── قسم الآراء والتقييمات ── */}
      <section id="reviews" className="client-section" style={{ background: 'rgba(251, 191, 36, 0.02)' }}>
        <div className="client-container">
          <div className="client-section-header">
            <span className="client-section-tag">آراء العميلات</span>
            <h2 className="client-section-title">⭐ تجارب تسعدنا من عميلاتنا</h2>
            <p className="client-section-desc">
              سعداء بثقتكم الغالية دائماً في صالون نهي السني.
            </p>
            <div style={{ marginTop: '1rem' }}>
              <button
                className="btn btn--secondary"
                style={{ borderRadius: 20 }}
                onClick={() => setReviewOpen(true)}
              >
                ✍️ شاركينا تقييمكِ وتجربتكِ
              </button>
            </div>
          </div>

          <div className="client-reviews-grid">
            {reviews.map((rev) => (
              <div key={rev.id} className="client-review-box">
                <div className="client-review-box__stars">
                  {'★'.repeat(rev.rating || 5)}
                </div>
                <p className="client-review-box__text">
                  "{rev.comment}"
                </p>
                <div className="client-review-box__author">
                  👑 {rev.user_name || 'عميلة الصالون'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="client-footer">
        <div className="client-container">
          <div className="client-footer__content">
            <div>
              <h3 style={{ margin: '0 0 6px', color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>
                💎 صالون نهي السني — Noha El Seny Beauty Salon
              </h3>
              <p style={{ margin: 0, color: 'var(--c-text-muted)', fontSize: '0.88rem' }}>
                جمالكِ وتميزكِ مسؤوليتنا — جميع الحقوق محفوظة © {new Date().getFullYear()}
              </p>
            </div>

            <div className="client-admin-links">
              <Link to="/cashier" className="client-admin-link">
                🖥️ شاشة الكاشير (POS)
              </Link>
              <Link to="/owner" className="client-admin-link">
                👑 بوابة الإدارة (الأونر)
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      <BookingWizardModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        barbers={barbers}
        initialService={selectedInitialService}
      />

      <TrackBookingModal
        isOpen={trackOpen}
        onClose={() => setTrackOpen(false)}
      />

      <SupportModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
      />

      <AddReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        barbers={barbers}
        onReviewAdded={async () => {
          const revs = await getClientReviews()
          setReviews(revs)
        }}
      />
    </div>
  )
}
