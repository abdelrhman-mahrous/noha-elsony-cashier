import { Link } from 'react-router-dom'

const OWNER_OPTIONS = [
  {
    title: 'توزيع المهام اليومية',
    subtitle: 'متابعة الحجوزات وتعيين الكوافيرات للمواعيد',
    icon: '📋',
    badge: 'توزيع المهام اليومية',
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800',
    to: '/owner/tasks',
  },
  {
    title: 'المخزن والمنتجات',
    subtitle: 'إدارة مخزون المستحضرات، الكميات وأسعار البيع',
    icon: '🛍️',
    badge: 'المخزن',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800',
    to: '/owner/products',
  },
  {
    title: 'البوفيه والمشروبات',
    subtitle: 'إدارة قائمة المشروبات الساخنة والباردة، الإضافات والأسعار',
    icon: '☕',
    badge: 'البوفيه',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
    to: '/owner/buffet',
  },
  {
    title: 'الحسابات والمالية والأرباح',
    subtitle: 'تقارير الأرباح، دخل البوفيه، الإكراميات، دايجرامز يومية، وسجل تدقيق الكاشير',
    icon: '💰',
    badge: 'الحسابات والمالية',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    to: '/owner/financials',
  },
  {
    title: 'إدارة طاقم العمل',
    subtitle: 'تقييمات، أداء، ونسب التنافس بين الكوافيرات والموظفات',
    icon: '👥',
    badge: 'إدارة طاقم العمل',
    imageUrl: 'https://i.pinimg.com/1200x/c4/26/1f/c4261f1e61b2f152d2a585a9eeb194c4.jpg',
    to: '/owner/team',
  },
  {
    title: 'العروض والتسويق',
    subtitle: 'تعديل الأسعار، الخصومات والأرباح الخاصة بالعروض',
    icon: '🏷️',
    badge: 'العروض والتسويق',
    imageUrl: 'https://i.pinimg.com/736x/f5/69/79/f56979d828bafea2667980296f65dee0.jpg',
    to: '/owner/offers',
  },
  {
    title: 'الآراء والشكاوى',
    subtitle: 'متابعة التقييمات، التحكم بإظهار الآراء والرد على الشكاوى',
    icon: '⭐',
    badge: 'الآراء والشكاوى',
    imageUrl: 'https://i.pinimg.com/736x/b9/62/c8/b962c836b28e57716218e1d664f7db5b.jpg',
    to: '/owner/reviews',
  },
  // {
  //   title: 'شاشة المحاسبة (POS)',
  //   subtitle: 'إتمام الفواتير ومحاسبة العملاء ونقاط البيع السريعة',
  //   icon: '🖥️',
  //   badge: 'كاشير',
  //   imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67d55febc4?auto=format&fit=crop&q=80&w=800',
  //   to: '/cashier',
  // },
]

export default function OwnerDashboardPage() {
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
      {/* ── العنوان التعريفي للشبكة ── */}
      <div className="owner-section-title-bar">
        <div className="owner-section-indicator" />
        <h2 className="owner-section-heading">بوابات الإدارة الموحدة</h2>
      </div>

      {/* ── شبكة الكروت التفاعلية ── */}
      <div className="owner-cards-grid">
        {OWNER_OPTIONS.map((option) => (
          <Link
            key={option.title}
            to={option.to}
            className="owner-grid-card"
          >
            {/* الصورة الخلفية */}
            <img
              src={option.imageUrl}
              alt={option.title}
              className="owner-grid-card__image"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />

            {/* التدرج اللوني الفاخر المزدوج لحماية وضوح النصوص */}
            <div className="owner-grid-card__gradient" />

            {/* محتوى الكارد الداخلي */}
            <div className="owner-grid-card__content">
              {/* السطر العلوي: أيقونة القسم والشارة */}
              <div className="owner-grid-card__top">
                <div className="owner-grid-card__icon-box">
                  {option.icon}
                </div>
                <div className="owner-grid-card__badge">
                  {option.badge}
                </div>
              </div>

              {/* السطر السفلي: العنوان والنبذة المختصرة */}
              <div className="owner-grid-card__bottom">
                <h3 className="owner-grid-card__title">
                  {option.title}
                </h3>
                <p className="owner-grid-card__subtitle">
                  {option.subtitle}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
