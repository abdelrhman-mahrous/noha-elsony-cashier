import { useState } from 'react'
import DemoNavHeader from '../DemoNavHeader'
import '../demo.css'
import {
  DEMO_SALON_INFO,
  DEMO_SERVICES,
  DEMO_STYLISTS,
  DEMO_MARKETING_OFFERS,
  DEMO_PRODUCTS,
} from '../demoData'

export default function DemoClientApp() {
  const [activeTab, setActiveTab] = useState('services') // services, offers, store, booking
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedService, setSelectedService] = useState(null)
  const [selectedStylist, setSelectedStylist] = useState(DEMO_STYLISTS[0])
  const [bookingDate, setBookingDate] = useState('2026-10-08')
  const [bookingTime, setBookingTime] = useState('02:00 م')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [showBookingSuccess, setShowBookingSuccess] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const filteredServices = DEMO_SERVICES.filter((s) => {
    if (selectedCategory === 'all') return true
    return s.category === selectedCategory
  })

  const categories = ['all', ...new Set(DEMO_SERVICES.map(s => s.category))]

  const handleStartBooking = (service) => {
    setSelectedService(service)
    setActiveTab('booking')
  }

  const handleConfirmBooking = (e) => {
    e.preventDefault()
    if (!clientName.trim() || !clientPhone.trim()) {
      showToast('يرجى كتابة الاسم ورقم الهاتف لتأكيد الحجز')
      return
    }
    setShowBookingSuccess(true)
  }

  return (
    <div>
      <DemoNavHeader currentRole="client" />

      <div className="demo-page-container">
        <div className="demo-wrapper">
          {/* ── إشعار توست ── */}
          {toastMessage && (
            <div style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#2D1420',
              color: '#F3E5AB',
              border: '1px solid #D4AF37',
              padding: '12px 24px',
              borderRadius: '30px',
              fontWeight: '700',
              zIndex: 9999,
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}>
              ✅ {toastMessage}
            </div>
          )}

          {/* ── هيدر منصة العميلات ── */}
          <div className="demo-role-banner" style={{ background: 'linear-gradient(135deg, #FFF 0%, #FDF3F6 100%)' }}>
            <div className="demo-role-user">
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8E3A59 0%, #D4AF37 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: '0 4px 12px rgba(142, 58, 89, 0.3)',
              }}>
                🌸
              </div>
              <div>
                <h1 className="demo-role-name" style={{ margin: 0 }}>
                  منصة العميلات الملكية — {DEMO_SALON_INFO.name}
                </h1>
                <div className="demo-role-desc">
                  حجز المواعيد الفورية، استكشاف العروض والخدمات وتجربة الجمال الفاخرة
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{
                background: '#FFF',
                border: '1px solid #F0DEE7',
                padding: '8px 16px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#7E6B74' }}>تقييم الصالون</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#D4AF37' }}>⭐ 4.9 (348 تقييم)</div>
              </div>
            </div>
          </div>

          {/* ── التبويبات ── */}
          <div className="demo-tabs-bar">
            <button
              className={`demo-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              <span>💇‍♀️ قائمة الخدمات والحجز</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'offers' ? 'active' : ''}`}
              onClick={() => setActiveTab('offers')}
            >
              <span>🎁 العروض والباقات الحصرية</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'store' ? 'active' : ''}`}
              onClick={() => setActiveTab('store')}
            >
              <span>🛍️ متجر مستحضرات العناية</span>
            </button>
          </div>

          {/* ── التبويب 1: الخدمات ── */}
          {activeTab === 'services' && (
            <div>
              {/* تصفية الأقسام */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', overflowX: 'auto', paddingBottom: '4px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '1px solid #F0DEE7',
                      background: selectedCategory === cat ? '#8E3A59' : '#FFF',
                      color: selectedCategory === cat ? '#FFF' : '#2C1820',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat === 'all' ? 'جميع الخدمات ✨' : cat}
                  </button>
                ))}
              </div>

              {/* بطاقات الخدمات */}
              <div className="demo-items-grid">
                {filteredServices.map((srv) => (
                  <div key={srv.id} className="demo-item-card">
                    <img src={srv.image} alt={srv.name} className="demo-item-img" />
                    <div className="demo-item-body">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#7E6B74' }}>{srv.category}</span>
                          <span style={{ fontSize: '11px', color: '#8E3A59', fontWeight: '700' }}>⏳ {srv.duration}</span>
                        </div>
                        <div className="demo-item-name">{srv.name}</div>
                      </div>

                      <div className="demo-item-footer">
                        <div className="demo-item-price">{srv.price} ج.م</div>
                        <button
                          className="demo-btn demo-btn-primary"
                          onClick={() => handleStartBooking(srv)}
                        >
                          📅 حجز الآن
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── التبويب 2: العروض ── */}
          {activeTab === 'offers' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {DEMO_MARKETING_OFFERS.map((off) => (
                <div key={off.id} style={{
                  background: '#FFF',
                  borderRadius: '16px',
                  border: '1px solid #F0DEE7',
                  padding: '22px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <span style={{ background: '#FBEFF4', color: '#8E3A59', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
                      {off.badge}
                    </span>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '10px 0 8px' }}>{off.title}</h3>
                    <p style={{ fontSize: '13px', color: '#7E6B74', lineHeight: '1.6' }}>{off.description}</p>
                  </div>

                  <div style={{ borderTop: '1px solid #FAF5F8', paddingTop: '14px', marginTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '13px', marginLeft: '8px' }}>{off.originalPrice} ج.م</span>
                        <strong style={{ fontSize: '20px', color: '#8E3A59' }}>{off.offerPrice} ج.م</strong>
                      </div>
                      <span style={{ background: '#E8F8F0', color: '#1E824C', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                        وفرتِ {off.originalPrice - off.offerPrice} ج.م
                      </span>
                    </div>

                    <button
                      className="demo-btn demo-btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => handleStartBooking({ name: off.title, price: off.offerPrice, duration: '120 دقيقة' })}
                    >
                      🎁 حجز العرض الآن
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── التبويب 3: المتجر ── */}
          {activeTab === 'store' && (
            <div className="demo-items-grid">
              {DEMO_PRODUCTS.map((prod) => (
                <div key={prod.id} className="demo-item-card">
                  <img src={prod.image} alt={prod.name} className="demo-item-img" />
                  <div className="demo-item-body">
                    <div>
                      <div style={{ fontSize: '11px', color: '#7E6B74', marginBottom: '4px' }}>{prod.category}</div>
                      <div className="demo-item-name">{prod.name}</div>
                    </div>
                    <div className="demo-item-footer">
                      <div className="demo-item-price">{prod.sellPrice} ج.م</div>
                      <button
                        className="demo-btn demo-btn-outline"
                        onClick={() => showToast(`تمت إضافة ${prod.name} لحقيبة المشتريات`)}
                      >
                        🛍️ إضافة للحقيبة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── واجهة الحجز التفاعلية ── */}
          {activeTab === 'booking' && selectedService && (
            <div style={{ maxWidth: '640px', margin: '0 auto', background: '#FFF', borderRadius: '20px', border: '1px solid #F0DEE7', padding: '28px', boxShadow: 'var(--demo-shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F0DEE7', paddingBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>تأكيد موعد الحجز</h3>
                <button
                  onClick={() => setActiveTab('services')}
                  style={{ background: 'none', border: 'none', color: '#8E3A59', fontWeight: '700', cursor: 'pointer' }}
                >
                  ← رجوع للخدمات
                </button>
              </div>

              <div style={{ background: '#FAF5F8', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#2C1820' }}>{selectedService.name}</div>
                  <div style={{ fontSize: '12px', color: '#7E6B74' }}>المدة المتوقعة: {selectedService.duration || '60 دقيقة'}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#8E3A59' }}>{selectedService.price} ج.م</div>
              </div>

              <form onSubmit={handleConfirmBooking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>اختيار خبيرة التجميل / الكوافيرة المفضلة:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {DEMO_STYLISTS.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => setSelectedStylist(st)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: `2px solid ${selectedStylist.id === st.id ? '#8E3A59' : '#F0DEE7'}`,
                          background: selectedStylist.id === st.id ? '#FDF5F8' : '#FFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <img src={st.avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800' }}>{st.name}</div>
                          <div style={{ fontSize: '11px', color: '#D4AF37' }}>⭐ {st.rating}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>تاريخ الموعد:</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>التوقيت المناسب:</label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                    >
                      <option value="11:00 ص">11:00 صباحاً</option>
                      <option value="01:00 م">01:00 ظهراً</option>
                      <option value="02:00 م">02:00 مساءً</option>
                      <option value="04:30 م">04:30 مساءً</option>
                      <option value="06:00 م">06:00 مساءً</option>
                      <option value="08:00 م">08:00 مساءً</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>اسم العميلة الكريمة:</label>
                    <input
                      type="text"
                      placeholder="مثال: ياسمين أحمد..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>رقم هاتف الواتساب:</label>
                    <input
                      type="tel"
                      placeholder="010XXXXXXXX..."
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                <button type="submit" className="demo-btn demo-btn-primary" style={{ padding: '14px', justifyContent: 'center', fontSize: '15px', marginTop: '10px' }}>
                  🌸 تأكيد وإرسال حجز الموعد
                </button>
              </form>
            </div>
          )}

          {/* ── مودال نجاح الحجز ── */}
          {showBookingSuccess && (
            <div className="demo-receipt-modal-backdrop" onClick={() => setShowBookingSuccess(false)}>
              <div className="demo-receipt-paper" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', fontFamily: 'Cairo, sans-serif', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1E824C', margin: '0 0 8px' }}>تم تأكيد حجز موعدكِ بنجاح!</h3>
                <p style={{ fontSize: '13px', color: '#7E6B74', margin: '0 0 16px' }}>
                  سعداء بخدمتكِ يا {clientName}! تم إشعار خبيرة التجميل {selectedStylist.name} وإدراج الموعد في جدول اليوم.
                </p>

                <div style={{ background: '#FAF5F8', borderRadius: '12px', padding: '14px', textAlign: 'right', fontSize: '13px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>الخدمة:</strong> {selectedService?.name}</div>
                  <div><strong>خبيرة التجميل:</strong> {selectedStylist.name}</div>
                  <div><strong>الموعد:</strong> {bookingDate} الساعة {bookingTime}</div>
                  <div><strong>الموقع:</strong> {DEMO_SALON_INFO.branch}</div>
                </div>

                <button
                  className="demo-btn demo-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setShowBookingSuccess(false)
                    setActiveTab('services')
                    setClientName('')
                    setClientPhone('')
                  }}
                >
                  العودة لتصفح الخدمات
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
