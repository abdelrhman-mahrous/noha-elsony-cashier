import { useState } from 'react'
import DemoNavHeader from '../DemoNavHeader'
import '../demo.css'
import {
  DEMO_STYLISTS,
  DEMO_STYLIST_APPOINTMENTS,
  DEMO_REVIEWS,
} from '../demoData'

export default function DemoStylistApp() {
  const [activeTab, setActiveTab] = useState('schedule') // schedule, wallet, supplies, reviews
  const [stylist, setStylist] = useState(DEMO_STYLISTS[0]) // مروة الجوهري
  const [appointments, setAppointments] = useState(DEMO_STYLIST_APPOINTMENTS)
  const [selectedApt, setSelectedApt] = useState(null)
  const [supplyRequests, setSupplyRequests] = useState([
    { id: 1, item: 'شامبو لوريال إكسبرت 500 مل', qty: 2, status: 'تم الصرف', time: '10:15 ص' },
    { id: 2, item: 'صبغة لوريال أشقر رمادي 7.1', qty: 3, status: 'قيد المراجعة', time: '12:30 م' },
  ])
  const [newSupplyItem, setNewSupplyItem] = useState('')
  const [newSupplyQty, setNewSupplyQty] = useState(1)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // تغيير حالة موعد
  const updateAptStatus = (id, newStatus, newStatusText) => {
    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id === id) {
          return { ...apt, status: newStatus, statusText: newStatusText }
        }
        return apt
      })
    )
    showToast(`تم تحديث حالة الموعد: ${newStatusText}`)
  }

  // إضافة طلب مستلزمات
  const handleAddSupply = (e) => {
    e.preventDefault()
    if (!newSupplyItem.trim()) return
    const newReq = {
      id: Date.now(),
      item: newSupplyItem,
      qty: newSupplyQty,
      status: 'قيد المراجعة في المخزن',
      time: 'الآن',
    }
    setSupplyRequests([newReq, ...supplyRequests])
    setNewSupplyItem('')
    setNewSupplyQty(1)
    showToast('تم إرسال طلب المستلزمات لمسؤول المخزن والأونر!')
  }

  return (
    <div>
      <DemoNavHeader currentRole="stylist" />

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

          {/* ── بروفايل الكوافيرة ── */}
          <div className="demo-role-banner">
            <div className="demo-role-user">
              <img
                src={stylist.avatar}
                alt={stylist.name}
                className="demo-role-avatar"
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 className="demo-role-name" style={{ margin: 0 }}>
                    {stylist.name}
                  </h1>
                  <span style={{
                    background: '#E8F8F0',
                    color: '#1E824C',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}>
                    ● {stylist.currentStatus}
                  </span>
                </div>
                <div className="demo-role-desc">
                  {stylist.title} • {stylist.specialty}
                </div>
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
                <div style={{ fontSize: '11px', color: '#7E6B74' }}>نسبة العمولة</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#8E3A59' }}>{stylist.commissionRate}%</div>
              </div>

              <div style={{
                background: '#FFF',
                border: '1px solid #F0DEE7',
                padding: '8px 16px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: '#7E6B74' }}>التقييم العام</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#D4AF37' }}>⭐ {stylist.rating} / 5</div>
              </div>
            </div>
          </div>

          {/* ── أرقام وإحصائيات الكوافيرة اليومية ── */}
          <div className="demo-stats-grid">
            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap primary">💰</div>
              <div>
                <div className="demo-stat-label">عمولة اليوم المستحقة</div>
                <div className="demo-stat-val">{stylist.todayEarnings} ج.م</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap gold">🎁</div>
              <div>
                <div className="demo-stat-label">إكراميات وتيبس اليوم</div>
                <div className="demo-stat-val">{stylist.todayTips} ج.م</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap success">✂️</div>
              <div>
                <div className="demo-stat-label">حجوزات وخدمات اليوم</div>
                <div className="demo-stat-val">{appointments.length} مواعيد</div>
              </div>
            </div>

            <div className="demo-stat-card">
              <div className="demo-stat-icon-wrap blue">📈</div>
              <div>
                <div className="demo-stat-label">أرباح الشهر الحالي</div>
                <div className="demo-stat-val">{stylist.monthEarnings.toLocaleString()} ج.م</div>
              </div>
            </div>
          </div>

          {/* ── أشرطة التبويب ── */}
          <div className="demo-tabs-bar">
            <button
              className={`demo-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              <span>📅 جدول مواعيد اليوم ({appointments.length})</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              <span>💰 محفظة العمولات والأرباح</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'supplies' ? 'active' : ''}`}
              onClick={() => setActiveTab('supplies')}
            >
              <span>🧴 طلب مستلزمات من المخزن ({supplyRequests.length})</span>
            </button>
            <button
              className={`demo-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <span>⭐ تقييمات ورسائل العميلات</span>
            </button>
          </div>

          {/* ── محتوى التبويب 1: جدول مواعيد اليوم ── */}
          {activeTab === 'schedule' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>قائمة عميلات اليوم لـ {stylist.name}</h3>
                <span style={{ fontSize: '13px', color: '#7E6B74' }}>اضغط على الموعد لتحديث حالته أو مشاهدة التفاصيل</span>
              </div>

              {appointments.map((apt) => (
                <div key={apt.id} className="demo-apt-card">
                  <div className="demo-apt-time-box">
                    <div className="demo-apt-time">{apt.time}</div>
                    <div className="demo-apt-duration">⏳ {apt.duration}</div>
                  </div>

                  <div className="demo-apt-info">
                    <div className="demo-apt-client">{apt.clientName}</div>
                    <div className="demo-apt-service">✨ {apt.service}</div>
                    <div className="demo-apt-notes">📝 ملاحظة: {apt.notes}</div>
                  </div>

                  <div style={{ textAlign: 'left', minWidth: '120px' }}>
                    <div style={{ fontSize: '12px', color: '#7E6B74' }}>سعر الخدمة</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#8E3A59' }}>{apt.price} ج.م</div>
                    <div style={{ fontSize: '12px', color: '#1E824C', fontWeight: '700' }}>عمولتك: +{apt.commission} ج.م</div>
                  </div>

                  <div className="demo-apt-actions">
                    {apt.status === 'in_progress' ? (
                      <button
                        className="demo-btn demo-btn-success"
                        onClick={() => updateAptStatus(apt.id, 'completed', 'تم إنهاء الجلسة بنجاح')}
                      >
                        ✓ إنهاء الخدمة
                      </button>
                    ) : apt.status === 'upcoming' ? (
                      <button
                        className="demo-btn demo-btn-primary"
                        onClick={() => updateAptStatus(apt.id, 'in_progress', 'قيد التنفيذ الآن ⏳')}
                      >
                        ▶ بدء الخدمة
                      </button>
                    ) : (
                      <span style={{
                        background: '#E8F8F0',
                        color: '#1E824C',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                      }}>
                        ✓ مكتمل
                      </span>
                    )}

                    <button
                      className="demo-btn demo-btn-outline"
                      onClick={() => setSelectedApt(apt)}
                    >
                      👁️ تفاصيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── محتوى التبويب 2: محفظة العمولات ── */}
          {activeTab === 'wallet' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>تفاصيل حساب وعمولات {stylist.name}</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#FAF5F8', padding: '16px', borderRadius: '12px', border: '1px solid #F0DEE7' }}>
                  <div style={{ fontSize: '12px', color: '#7E6B74' }}>إجمالي مبيعات خدمات اليوم</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#8E3A59' }}>
                    {appointments.reduce((sum, a) => sum + a.price, 0)} ج.م
                  </div>
                </div>

                <div style={{ background: '#FAF5F8', padding: '16px', borderRadius: '12px', border: '1px solid #F0DEE7' }}>
                  <div style={{ fontSize: '12px', color: '#7E6B74' }}>صافي عمولاتك (15%)</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E824C' }}>
                    {appointments.reduce((sum, a) => sum + a.commission, 0)} ج.م
                  </div>
                </div>

                <div style={{ background: '#FAF5F8', padding: '16px', borderRadius: '12px', border: '1px solid #F0DEE7' }}>
                  <div style={{ fontSize: '12px', color: '#7E6B74' }}>الإكراميات المباشرة (Tips)</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#D4AF37' }}>
                    {stylist.todayTips} ج.م
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px' }}>سجل الخدمات المنفذة اليوم:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF5F8', borderBottom: '2px solid #F0DEE7' }}>
                    <th style={{ padding: '10px 14px' }}>العميلة</th>
                    <th style={{ padding: '10px 14px' }}>الخدمة</th>
                    <th style={{ padding: '10px 14px' }}>سعر الخدمة</th>
                    <th style={{ padding: '10px 14px' }}>النسبة</th>
                    <th style={{ padding: '10px 14px' }}>عمولتك</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #F0DEE7' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700' }}>{a.clientName}</td>
                      <td style={{ padding: '12px 14px' }}>{a.service}</td>
                      <td style={{ padding: '12px 14px' }}>{a.price} ج.م</td>
                      <td style={{ padding: '12px 14px' }}>15%</td>
                      <td style={{ padding: '12px 14px', color: '#1E824C', fontWeight: '800' }}>+{a.commission} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── محتوى التبويب 3: طلب مستلزمات من المخزن ── */}
          {activeTab === 'supplies' && (
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>طلب خامات ومستحضرات من المخزن</h3>
              <p style={{ fontSize: '13px', color: '#7E6B74', marginBottom: '20px' }}>
                يمكنك طلب أي مستلزمات تحتاجينها لجلسات اليوم وسيتم إشعار مسؤول المخزن فوراً.
              </p>

              <form onSubmit={handleAddSupply} style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="اسم الصبغة أو الشامبو أو الخامة المطلوبة..."
                  value={newSupplyItem}
                  onChange={(e) => setNewSupplyItem(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #F0DEE7',
                    fontFamily: 'inherit',
                  }}
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newSupplyQty}
                  onChange={(e) => setNewSupplyQty(e.target.value)}
                  style={{
                    width: '80px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #F0DEE7',
                    textAlign: 'center',
                    fontFamily: 'inherit',
                  }}
                />
                <button type="submit" className="demo-btn demo-btn-primary" style={{ padding: '12px 24px' }}>
                  + إرسال الطلب للمخزن
                </button>
              </form>

              <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px' }}>سجل طلباتك السابقة:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {supplyRequests.map((req) => (
                  <div key={req.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 18px',
                    background: '#FAF5F8',
                    borderRadius: '10px',
                    border: '1px solid #F0DEE7',
                  }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '14px' }}>{req.item}</span>
                      <span style={{ fontSize: '12px', color: '#7E6B74', marginRight: '12px' }}>الكمية: {req.qty}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#7E6B74' }}>{req.time}</span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: req.status === 'تم الصرف' ? '#E8F8F0' : '#FEF3EB',
                        color: req.status === 'تم الصرف' ? '#1E824C' : '#C2671A',
                      }}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── محتوى التبويب 4: تقييمات العميلات ── */}
          {activeTab === 'reviews' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>آراء العميلات وتقييمات خبيرة التجميل {stylist.name}</h3>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#D4AF37' }}>⭐ 4.9 من 5 (142 تقييم)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {DEMO_REVIEWS.map((rev) => (
                  <div key={rev.id} style={{
                    background: '#FFF',
                    borderRadius: '14px',
                    border: '1px solid #F0DEE7',
                    padding: '18px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: '800', fontSize: '15px', color: '#2C1820' }}>{rev.clientName}</span>
                        <span style={{ fontSize: '12px', color: '#8E3A59', marginRight: '10px' }}>({rev.service})</span>
                      </div>
                      <div style={{ color: '#D4AF37', fontWeight: '800' }}>
                        {'⭐'.repeat(rev.rating)}
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4A3B43', lineHeight: '1.6', margin: '0 0 8px' }}>
                      "{rev.comment}"
                    </p>
                    <div style={{ fontSize: '11px', color: '#7E6B74' }}>
                      {rev.date} • عميلة موثقة ✅
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── مودال تفاصيل الموعد ── */}
          {selectedApt && (
            <div className="demo-receipt-modal-backdrop" onClick={() => setSelectedApt(null)}>
              <div className="demo-receipt-paper" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', fontFamily: 'Cairo, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F0DEE7', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>بطاقة حجز العميلة</h3>
                  <button onClick={() => setSelectedApt(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '18px' }}>
                  <div><strong>اسم العميلة:</strong> {selectedApt.clientName}</div>
                  <div><strong>رقم الهاتف:</strong> {selectedApt.clientPhone}</div>
                  <div><strong>الخدمة المطلوبة:</strong> {selectedApt.service}</div>
                  <div><strong>موعد الحجز:</strong> {selectedApt.time} (المدة: {selectedApt.duration})</div>
                  <div><strong>سعر الخدمة:</strong> {selectedApt.price} ج.م</div>
                  <div><strong>عمولة المصففة:</strong> {selectedApt.commission} ج.م</div>
                  <div style={{ background: '#FAF5F8', padding: '10px', borderRadius: '8px' }}>
                    <strong>تعليمات وملاحظات:</strong><br />
                    {selectedApt.notes}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="demo-btn demo-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      updateAptStatus(selectedApt.id, 'in_progress', 'قيد التنفيذ الآن ⏳')
                      setSelectedApt(null)
                    }}
                  >
                    ▶ بدء تنفيذ الجلسة
                  </button>
                  <button
                    className="demo-btn demo-btn-outline"
                    onClick={() => setSelectedApt(null)}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
