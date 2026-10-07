import { useState } from 'react'
import DemoNavHeader from '../DemoNavHeader'
import '../demo.css'
import {
  DEMO_MARKETING_OFFERS,
  DEMO_COUPONS,
  DEMO_REVIEWS,
} from '../demoData'

export default function DemoMarketingApp() {
  const [activeTab, setActiveTab] = useState('offers') // offers, coupons, campaigns, reviews
  const [offers, setOffers] = useState(DEMO_MARKETING_OFFERS)
  const [coupons, setCoupons] = useState(DEMO_COUPONS)
  const [reviews, setReviews] = useState(DEMO_REVIEWS)
  const [toastMessage, setToastMessage] = useState('')

  // New coupon state
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState('')
  const [newMinSpend, setNewMinSpend] = useState('')

  // SMS campaign state
  const [smsMessage, setSmsMessage] = useState('عميلتنا العزيزة 🌸 استمتعي بخصم 20% على جميع خدمات الصالون بمناسبة الويك إند بكود: BEAUTY20')
  const [targetAudience, setTargetAudience] = useState('all')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleAddCoupon = (e) => {
    e.preventDefault()
    if (!newCode.trim()) return
    const newC = {
      code: newCode.toUpperCase(),
      discount: Number(newDiscount) || 15,
      type: 'percent',
      minSpend: Number(newMinSpend) || 300,
      uses: 0,
      active: true,
    }
    setCoupons([newC, ...coupons])
    setNewCode('')
    setNewDiscount('')
    setNewMinSpend('')
    showToast(`تم تفعيل كوبون الخصم: ${newC.code}`)
  }

  const handleSendCampaign = (e) => {
    e.preventDefault()
    showToast('🚀 تم جدولة وإرسال الحملة الترويجية لـ 1,450 عميلة بنجاح!')
  }

  return (
    <div>
      <DemoNavHeader currentRole="marketing" />

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

          {/* ── بروفايل الماركتينج ── */}
          <div className="demo-role-banner">
            <div className="demo-role-user">
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6C3483 0%, #884EA0 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: '0 4px 12px rgba(108, 52, 131, 0.3)',
              }}>
                🏷️
              </div>
              <div>
                <h1 className="demo-role-name" style={{ margin: 0 }}>
                  لوحة إدارة التسويق والعروض (Marketing Hub)
                </h1>
                <div className="demo-role-desc">
                  إدارة العروض الترويجية، كوبونات الخصم، الحملات الدعائية ورضا العميلات
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
                <div style={{ fontSize: '11px', color: '#7E6B74' }}>العروض النشطة</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#8E3A59' }}>{offers.length} عروض</div>
              </div>

              <div style={{
                background: '#FFF',
                border: '1px solid #F0DEE7',
                padding: '8px 16px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#7E6B74' }}>استخدام الكوبونات</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E824C' }}>499 استخدام</div>
              </div>
            </div>
          </div>

          {/* ── كروت إحصائيات التسويق ── */}
          <div className="demo-stats-grid">
            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap primary">🎁</div>
              <div>
                <div className="demo-stat-label">حجوزات باقات العروض</div>
                <div className="demo-stat-val">186 حجزاً</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap gold">🎟️</div>
              <div>
                <div className="demo-stat-label">كوبونات الخصم الفعالة</div>
                <div className="demo-stat-val">{coupons.length} أكواد</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap success">📱</div>
              <div>
                <div className="demo-stat-label">نسبة التحويل من الرسائل</div>
                <div className="demo-stat-val">28.4%</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap blue">⭐</div>
              <div>
                <div className="demo-stat-label">مؤشر رضا العميلات (CSAT)</div>
                <div className="demo-stat-val">98.2%</div>
              </div>
            </div>
          </div>

          {/* ── التبويبات ── */}
          <div className="demo-tabs-bar">
            <button
              className={`demo-tab-btn ${activeTab === 'offers' ? 'active' : ''}`}
              onClick={() => setActiveTab('offers')}
            >
              <span>🎁 باقات العروض الترويجية ({offers.length})</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
              onClick={() => setActiveTab('coupons')}
            >
              <span>🎟️ كوبونات الخصم ({coupons.length})</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
              onClick={() => setActiveTab('campaigns')}
            >
              <span>📱 حملات الرسائل والإشعارات</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <span>⭐ إدارة تقييمات العميلات</span>
            </button>
          </div>

          {/* ── التبويب 1: باقات العروض ── */}
          {activeTab === 'offers' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {offers.map((off) => (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ background: '#FBEFF4', color: '#8E3A59', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
                        {off.badge}
                      </span>
                      <span style={{ background: '#E8F8F0', color: '#1E824C', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }}>
                        خصم {off.discountPercent}%
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 8px', color: '#2C1820' }}>{off.title}</h3>
                    <p style={{ fontSize: '13px', color: '#7E6B74', lineHeight: '1.6', margin: '0 0 16px' }}>{off.description}</p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #FAF5F8', paddingTop: '12px', marginBottom: '14px' }}>
                      <div>
                        <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '13px', marginLeft: '8px' }}>{off.originalPrice} ج.م</span>
                        <strong style={{ fontSize: '20px', color: '#8E3A59' }}>{off.offerPrice} ج.م</strong>
                      </div>
                      <span style={{ fontSize: '12px', color: '#1E824C', fontWeight: '700' }}>
                        🔥 {off.claimedCount} عميلة حجزت
                      </span>
                    </div>

                    <button
                      className="demo-btn demo-btn-outline"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => showToast(`تم نسخ رابط العرض: ${off.title}`)}
                    >
                      🔗 نسخ رابط العرض للنشر على السوشيال ميديا
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── التبويب 2: الكوبونات ── */}
          {activeTab === 'coupons' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>مولد كوبونات الخصم الترويجية</h3>
              <p style={{ fontSize: '13px', color: '#7E6B74', marginBottom: '20px' }}>
                أنشئ أكواد خصم حصرية لنجمات السوشيال ميديا أو لحملات الـ SMS.
              </p>

              <form onSubmit={handleAddCoupon} style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="كود الخصم (مثال: SUMMER30)..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                  style={{ flex: 1, minWidth: '180px', padding: '12px 16px', borderRadius: '10px', border: '1px solid #F0DEE7', fontFamily: 'inherit', textTransform: 'uppercase' }}
                />
                <input
                  type="number"
                  placeholder="نسبة الخصم %..."
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  required
                  style={{ width: '120px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                />
                <input
                  type="number"
                  placeholder="الحد الأدنى للطلب (ج.م)..."
                  value={newMinSpend}
                  onChange={(e) => setNewMinSpend(e.target.value)}
                  style={{ width: '150px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                />
                <button type="submit" className="demo-btn demo-btn-primary" style={{ padding: '12px 24px' }}>
                  + إنشاء وتفعيل الكود
                </button>
              </form>

              <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px' }}>الكوبونات النشطة:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {coupons.map((c) => (
                  <div key={c.code} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px dashed #8E3A59',
                    background: '#FAF5F8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#8E3A59', letterSpacing: '1px' }}>{c.code}</div>
                      <div style={{ fontSize: '12px', color: '#7E6B74' }}>خصم {c.discount}% • حد أدنى {c.minSpend} ج.م</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E824C' }}>{c.uses} استخدام</div>
                      <span style={{ fontSize: '11px', color: '#7E6B74' }}>فعال ومتاح ✅</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── التبويب 3: حملات الرسائل ── */}
          {activeTab === 'campaigns' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>إرسال رسائل وحملات SMS للعميلات</h3>
              <p style={{ fontSize: '13px', color: '#7E6B74', marginBottom: '20px' }}>
                محاكي إطلاق الحملات الترويجية الموجهة لقاعدة بيانات الصالون.
              </p>

              <form onSubmit={handleSendCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>شريحة الجمهور المستهدف:</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                  >
                    <option value="all">جميع العميلات المسجلات (1,450 عميلة)</option>
                    <option value="vip">العميلات المميزات VIP (180 عميلة)</option>
                    <option value="inactive">العميلات الغائبات منذ أكثر من 30 يوماً (320 عميلة)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block' }}>نص الرسالة الترويجية:</label>
                  <textarea
                    rows={4}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #F0DEE7', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div style={{ background: '#FAF5F8', border: '1px solid #F0DEE7', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#7E6B74', marginBottom: '4px' }}>📱 معاينة شكل الرسالة في هاتف العميلة:</div>
                  <div style={{ fontSize: '13px', color: '#2C1820', fontWeight: '600' }}>
                    [صالون العرابي بيوتي]: {smsMessage}
                  </div>
                </div>

                <button type="submit" className="demo-btn demo-btn-primary" style={{ padding: '14px', justifyContent: 'center' }}>
                  🚀 إطلاق الحملة وإرسال الـ SMS الآن
                </button>
              </form>
            </div>
          )}

          {/* ── التبويب 4: آراء العميلات ── */}
          {activeTab === 'reviews' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>مراجعة ونشر آراء العميلات والرد عليها</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #F0DEE7',
                    background: '#FAF5F8',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '15px' }}>{r.clientName}</strong>
                        <span style={{ fontSize: '12px', color: '#8E3A59', marginRight: '8px' }}>({r.service})</span>
                      </div>
                      <span style={{ color: '#D4AF37' }}>{'⭐'.repeat(r.rating)}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4A3B43', margin: '0 0 12px' }}>"{r.comment}"</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="demo-btn demo-btn-outline"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => showToast(`تم الرد على تقييم العميلة: ${r.clientName}`)}
                      >
                        💬 إرسال رد شكر للعميلة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
