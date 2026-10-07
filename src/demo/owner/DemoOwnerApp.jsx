import { useState } from 'react'
import DemoNavHeader from '../DemoNavHeader'
import '../demo.css'
import {
  DEMO_OWNER,
  DEMO_STYLISTS,
  DEMO_SERVICES,
  DEMO_PRODUCTS,
  DEMO_BUFFET_ITEMS,
  DEMO_MARKETING_OFFERS,
  DEMO_REVIEWS,
  DEMO_STYLIST_APPOINTMENTS,
} from '../demoData'

export default function DemoOwnerApp() {
  const [activeTab, setActiveTab] = useState('overview') // overview, financials, products, team, tasks, buffet, offers, reviews
  const [products, setProducts] = useState(DEMO_PRODUCTS)
  const [buffet, setBuffet] = useState(DEMO_BUFFET_ITEMS)
  const [team, setTeam] = useState(DEMO_STYLISTS)
  const [toastMessage, setToastMessage] = useState('')

  // New product form state
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdCost, setNewProdCost] = useState('')
  const [newProdStock, setNewProdStock] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleAddProduct = (e) => {
    e.preventDefault()
    if (!newProdName.trim()) return
    const newP = {
      id: `prod-${Date.now()}`,
      name: newProdName,
      category: 'عناية بالصالون',
      costPrice: Number(newProdCost) || 100,
      sellPrice: Number(newProdPrice) || 150,
      stock: Number(newProdStock) || 10,
      minStock: 3,
      salesCount: 0,
      image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=300',
    }
    setProducts([newP, ...products])
    setShowAddProductModal(false)
    setNewProdName('')
    setNewProdPrice('')
    setNewProdCost('')
    setNewProdStock('')
    showToast('تمت إضافة المنتج للمخزن بنجاح!')
  }

  const maxRevenue = Math.max(...DEMO_OWNER.revenueChart.map(d => d.revenue))

  return (
    <div>
      <DemoNavHeader currentRole="owner" />

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

          {/* ── بروفايل الأونر ── */}
          <div className="demo-role-banner">
            <div className="demo-role-user">
              <img
                src={DEMO_OWNER.avatar}
                alt={DEMO_OWNER.name}
                className="demo-role-avatar"
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 className="demo-role-name" style={{ margin: 0 }}>
                    {DEMO_OWNER.name}
                  </h1>
                  <span style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #F3E5AB 100%)',
                    color: '#2D1420',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '800',
                  }}>
                    👑 الإدارة العليا
                  </span>
                </div>
                <div className="demo-role-desc">{DEMO_OWNER.role}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                background: '#FFF',
                border: '1px solid #F0DEE7',
                padding: '8px 16px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#7E6B74' }}>إيراد اليوم الإجمالي</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#1E824C' }}>
                  {DEMO_OWNER.stats.todayRevenue.toLocaleString()} ج.م
                </div>
              </div>

              <div style={{
                background: '#FFF',
                border: '1px solid #F0DEE7',
                padding: '8px 16px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#7E6B74' }}>صافي أرباح اليوم</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#8E3A59' }}>
                  {DEMO_OWNER.stats.netProfitToday.toLocaleString()} ج.م
                </div>
              </div>
            </div>
          </div>

          {/* ── كروت إحصائيات الأونر ── */}
          <div className="demo-stats-grid">
            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap primary">💰</div>
              <div>
                <div className="demo-stat-label">مبيعات الشهر الحالي</div>
                <div className="demo-stat-val">{DEMO_OWNER.stats.monthRevenue.toLocaleString()} ج.م</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap gold">☕</div>
              <div>
                <div className="demo-stat-label">دخل البوفيه اليوم</div>
                <div className="demo-stat-val">{DEMO_OWNER.stats.buffetRevenueToday.toLocaleString()} ج.م</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap success">👥</div>
              <div>
                <div className="demo-stat-label">طاقم العمل المناوب</div>
                <div className="demo-stat-val">{DEMO_OWNER.stats.activeStaff} خبيرات</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap blue">✨</div>
              <div>
                <div className="demo-stat-label">الخدمات المنجزة اليوم</div>
                <div className="demo-stat-val">{DEMO_OWNER.stats.completedToday} خدمة</div>
              </div>
            </div>
          </div>

          {/* ── التبويبات ── */}
          <div className="demo-tabs-bar">
            <button
              className={`demo-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span>📊 لوحة القيادة ومخطط الأرباح</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <span>📋 توزيع المهام والحجوزات</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <span>🛍️ المخزن والمنتجات ({products.length})</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <span>👥 طاقم العمل والعمولات</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'buffet' ? 'active' : ''}`}
              onClick={() => setActiveTab('buffet')}
            >
              <span>☕ البوفيه والضيافة</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'offers' ? 'active' : ''}`}
              onClick={() => setActiveTab('offers')}
            >
              <span>🏷️ العروض والخصومات</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <span>⭐ تقييمات الصالون</span>
            </button>
          </div>

          {/* ── التبويب 1: لوحة القيادة والمخطط ── */}
          {activeTab === 'overview' && (
            <div>
              {/* مخطط الإيرادات الأسبوعية التفاعلي */}
              <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px' }}>تحليل مبيعات الأسبوع المنصرم</h3>
                    <p style={{ fontSize: '13px', color: '#7E6B74', margin: 0 }}>مقارنة يومية بين إجمالي الدخل وعدد الخدمات ودخل البوفيه</p>
                  </div>
                  <span style={{ background: '#FAF5F8', padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#8E3A59' }}>
                    الأعلى: الجمعة (31,200 ج.م)
                  </span>
                </div>

                {/* رسم بياني عمودي CSS فاخر */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', height: '220px', padding: '20px 10px 10px', borderBottom: '2px solid #F0DEE7' }}>
                  {DEMO_OWNER.revenueChart.map((item) => {
                    const heightPercent = Math.round((item.revenue / maxRevenue) * 100)
                    return (
                      <div key={item.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#8E3A59', marginBottom: '6px' }}>
                          {(item.revenue / 1000).toFixed(1)}k
                        </div>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '45px',
                            height: `${heightPercent}%`,
                            background: 'linear-gradient(180deg, #8E3A59 0%, #5E203B 100%)',
                            borderRadius: '8px 8px 0 0',
                            transition: 'height 0.4s ease',
                            position: 'relative',
                          }}
                          title={`${item.day}: ${item.revenue.toLocaleString()} ج.م (${item.services} خدمة)`}
                        />
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#4A3B43', marginTop: '8px' }}>
                          {item.day}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* بطاقات وصول سريع */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#FFF', borderRadius: '14px', border: '1px solid #F0DEE7', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>⚠️ تنبيهات نقص المخزون</h4>
                    <span style={{ background: '#FDE8E6', color: '#C0392B', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                      عاجل
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#4A3B43', lineHeight: '1.6' }}>
                    • ماسك الكولاجين والذهب: متبقي <strong>3 قطع فقط</strong> بالمخزن (الحد الأدنى 5)<br />
                    • صبغة لوريال 7.1: تم طلبها من قبل الكوافيرة مروة الجوهري
                  </div>
                </div>

                <div style={{ background: '#FFF', borderRadius: '14px', border: '1px solid #F0DEE7', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>👑 نجمة الأسبوع</h4>
                    <span style={{ background: '#E8F8F0', color: '#1E824C', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                      الأعلى تقييماً
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={DEMO_STYLISTS[2].avatar} alt="" style={{ width: '45px', height: '45px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>{DEMO_STYLISTS[2].name}</div>
                      <div style={{ fontSize: '12px', color: '#7E6B74' }}>{DEMO_STYLISTS[2].specialty} • ⭐ 5.0 (165 تقييم)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── التبويب 2: توزيع المهام ── */}
          {activeTab === 'tasks' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>جدول الحجوزات وتوزيع الكوافيرات</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {DEMO_STYLIST_APPOINTMENTS.map((apt) => (
                  <div key={apt.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: '#FAF5F8',
                    borderRadius: '12px',
                    border: '1px solid #F0DEE7',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '15px' }}>{apt.clientName} ({apt.clientPhone})</div>
                      <div style={{ fontSize: '13px', color: '#8E3A59' }}>{apt.service} • {apt.time}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#4A3B43' }}>الكوافيرة: مروة الجوهري</span>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: apt.status === 'completed' ? '#E8F8F0' : apt.status === 'in_progress' ? '#FEF3EB' : '#EBF5FB',
                        color: apt.status === 'completed' ? '#1E824C' : apt.status === 'in_progress' ? '#C2671A' : '#2980B9',
                      }}>
                        {apt.statusText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── التبويب 3: المخزن والمنتجات ── */}
          {activeTab === 'products' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px' }}>المخزون والمنتجات المتاحة للبيع والاستخدام</h3>
                  <p style={{ fontSize: '13px', color: '#7E6B74', margin: 0 }}>متابعة كميات المستحضرات، سعر التكلفة وسعر البيع والأرباح</p>
                </div>
                <button
                  className="demo-btn demo-btn-primary"
                  onClick={() => setShowAddProductModal(true)}
                >
                  + إضافة منتج جديد للمخزن
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {products.map((p) => {
                  const isLow = p.stock <= p.minStock
                  return (
                    <div key={p.id} style={{
                      border: `1px solid ${isLow ? '#F5B7B1' : '#F0DEE7'}`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#FFF',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}>
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      <div style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#7E6B74' }}>{p.category}</span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isLow ? '#FDE8E6' : '#E8F8F0',
                            color: isLow ? '#C0392B' : '#1E824C',
                          }}>
                            المخزون: {p.stock} قطعة {isLow && '⚠️'}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '800' }}>{p.name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid #FAF5F8', paddingTop: '8px' }}>
                          <span>سعر البيع: <strong style={{ color: '#8E3A59' }}>{p.sellPrice} ج.م</strong></span>
                          <span>سعر التكلفة: <strong>{p.costPrice} ج.م</strong></span>
                          <span>الربح: <strong style={{ color: '#1E824C' }}>+{p.sellPrice - p.costPrice} ج.م</strong></span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── التبويب 4: طاقم العمل ── */}
          {activeTab === 'team' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>قائمة الكوافيرات وإحصائيات الأداء</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {team.map((st) => (
                  <div key={st.id} style={{
                    border: '1px solid #F0DEE7',
                    borderRadius: '14px',
                    padding: '18px',
                    background: '#FAF5F8',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                      <img src={st.avatar} alt={st.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '15px' }}>{st.name}</div>
                        <div style={{ fontSize: '12px', color: '#7E6B74' }}>{st.title}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>نسبة العمولة:</span>
                        <strong>{st.commissionRate}%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>مبيعات خدمات اليوم:</span>
                        <strong style={{ color: '#8E3A59' }}>{st.todayEarnings} ج.م</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>إكراميات اليوم:</span>
                        <strong style={{ color: '#D4AF37' }}>{st.todayTips} ج.م</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>التقييم العام:</span>
                        <strong>⭐ {st.rating} ({st.reviewsCount} تقييم)</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── التبويب 5: البوفيه ── */}
          {activeTab === 'buffet' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>قائمة البوفيه والمشروبات</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {buffet.map((b) => (
                  <div key={b.id} style={{
                    border: '1px solid #F0DEE7',
                    borderRadius: '12px',
                    padding: '16px',
                    background: '#FAF5F8',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '6px' }}>{b.icon}</div>
                    <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>{b.name}</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#8E3A59' }}>{b.price} ج.م</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── التبويب 6: العروض ── */}
          {activeTab === 'offers' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>عروض الصالون النشطة</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {DEMO_MARKETING_OFFERS.map((off) => (
                  <div key={off.id} style={{
                    border: '1px solid #F0DEE7',
                    borderRadius: '14px',
                    padding: '18px',
                    background: '#FFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ background: '#FBEFF4', color: '#8E3A59', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                        {off.badge}
                      </span>
                      <span style={{ color: '#1E824C', fontWeight: '800', fontSize: '13px' }}>خصم {off.discountPercent}%</span>
                    </div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '800' }}>{off.title}</h4>
                    <p style={{ fontSize: '13px', color: '#7E6B74', margin: '0 0 12px' }}>{off.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '13px', marginLeft: '8px' }}>{off.originalPrice} ج.م</span>
                        <strong style={{ fontSize: '18px', color: '#8E3A59' }}>{off.offerPrice} ج.م</strong>
                      </div>
                      <span style={{ fontSize: '12px', color: '#7E6B74' }}>تم الحجز: {off.claimedCount} مرة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── التبويب 7: التقييمات ── */}
          {activeTab === 'reviews' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>تقييمات وآراء العميلات</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {DEMO_REVIEWS.map((rev) => (
                  <div key={rev.id} style={{
                    padding: '16px',
                    background: '#FAF5F8',
                    borderRadius: '12px',
                    border: '1px solid #F0DEE7',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '800' }}>{rev.clientName} (الكوافيرة: {rev.stylistName})</span>
                      <span style={{ color: '#D4AF37' }}>{'⭐'.repeat(rev.rating)}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4A3B43', margin: 0 }}>"{rev.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── مودال إضافة منتج جديد ── */}
          {showAddProductModal && (
            <div className="demo-receipt-modal-backdrop" onClick={() => setShowAddProductModal(false)}>
              <div className="demo-receipt-paper" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', fontFamily: 'Cairo, sans-serif' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800' }}>إضافة منتج جديد للمخزن</h3>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="اسم المنتج..."
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    required
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                      type="number"
                      placeholder="سعر التكلفة..."
                      value={newProdCost}
                      onChange={(e) => setNewProdCost(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                    />
                    <input
                      type="number"
                      placeholder="سعر البيع..."
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      required
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                    />
                  </div>
                  <input
                    type="number"
                    placeholder="الكمية المتوفرة..."
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    required
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                  />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" className="demo-btn demo-btn-primary" style={{ flex: 1 }}>حفظ المنتج</button>
                    <button type="button" className="demo-btn demo-btn-outline" onClick={() => setShowAddProductModal(false)}>إلغاء</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
