import { useState } from 'react'
import DemoNavHeader from '../DemoNavHeader'
import '../demo.css'
import {
  DEMO_SALON_INFO,
  DEMO_SERVICES,
  DEMO_PRODUCTS,
  DEMO_BUFFET_ITEMS,
  DEMO_STYLISTS,
  DEMO_INVOICES,
} from '../demoData'

export default function DemoCashierApp() {
  const [selectedCategory, setSelectedCategory] = useState('all') // all, hair, skin, nails, buffet, products
  const [cart, setCart] = useState([])
  const [clientName, setClientName] = useState('عميلة صالون (Walk-in)')
  const [clientPhone, setClientPhone] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('كاش (نقدي)')
  const [invoices, setInvoices] = useState(DEMO_INVOICES)
  const [activeTab, setActiveTab] = useState('pos') // pos, history
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [latestInvoice, setLatestInvoice] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Combine items for POS
  const allPosItems = [
    ...DEMO_SERVICES.map(s => ({ ...s, type: 'service' })),
    ...DEMO_BUFFET_ITEMS.map(b => ({ ...b, type: 'buffet' })),
    ...DEMO_PRODUCTS.map(p => ({ ...p, type: 'product', price: p.sellPrice })),
  ]

  const filteredItems = allPosItems.filter(item => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'buffet') return item.type === 'buffet'
    if (selectedCategory === 'products') return item.type === 'product'
    if (selectedCategory === 'hair') return item.category && item.category.includes('شعر')
    if (selectedCategory === 'skin') return item.category && item.category.includes('بشرة')
    if (selectedCategory === 'nails') return item.category && item.category.includes('أظافر')
    return true
  })

  const addToCart = (item) => {
    const existingIndex = cart.findIndex(c => c.id === item.id)
    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].qty += 1
      setCart(updated)
    } else {
      setCart([...cart, {
        ...item,
        qty: 1,
        assignedStylist: DEMO_STYLISTS[0].name, // Default stylist
      }])
    }
    showToast(`تمت إضافة ${item.name} إلى الفاتورة`)
  }

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta
        return newQty > 0 ? { ...item, qty: newQty } : null
      }
      return item
    }).filter(Boolean))
  }

  const updateStylist = (id, stylistName) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, assignedStylist: stylistName } : item))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const total = Math.max(0, subtotal - discountAmount)

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('الرجاء إضافة خدمات أو منتجات للسلة أولاً')
      return
    }

    const newInv = {
      id: `INV-2026-${String(invoices.length + 85).padStart(3, '0')}`,
      clientName: clientName.trim() || 'عميلة صالون',
      clientPhone: clientPhone.trim() || '—',
      date: new Date().toLocaleString('ar-EG'),
      items: [...cart],
      subtotal,
      discount: discountAmount,
      total,
      paymentMethod,
      cashierName: 'أحمد سعيد (كاشير)',
    }

    setInvoices([newInv, ...invoices])
    setLatestInvoice(newInv)
    setShowReceiptModal(true)
    setCart([])
    setDiscountAmount(0)
    setClientName('عميلة صالون (Walk-in)')
    setClientPhone('')
  }

  return (
    <div>
      <DemoNavHeader currentRole="cashier" />

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

          {/* ── هيدر الكاشير ── */}
          <div className="demo-role-banner">
            <div className="demo-role-user">
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #196F3D 0%, #27AE60 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
              }}>
                🖥️
              </div>
              <div>
                <h1 className="demo-role-name" style={{ margin: 0 }}>
                  شاشة الكاشير ونقاط البيع السريعة (POS)
                </h1>
                <div className="demo-role-desc">
                  إصدار الفواتير، تحديد عمولة الكوافيرة، ومحاكاة الطباعة الفورية
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`demo-btn ${activeTab === 'pos' ? 'demo-btn-primary' : 'demo-btn-outline'}`}
                onClick={() => setActiveTab('pos')}
              >
                🛒 شاشة المحاسبة المباشرة
              </button>
              <button
                className={`demo-btn ${activeTab === 'history' ? 'demo-btn-primary' : 'demo-btn-outline'}`}
                onClick={() => setActiveTab('history')}
              >
                📋 سجل فواتير اليوم ({invoices.length})
              </button>
            </div>
          </div>

          {activeTab === 'pos' ? (
            <div className="demo-pos-layout">
              {/* ── الجانب الأيمن: كتالوج الخدمات والمنتجات والبوفيه ── */}
              <div>
                {/* شريط التصنيفات */}
                <div className="demo-tabs-bar" style={{ marginBottom: '16px' }}>
                  <button className={`demo-tab-btn ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>
                    الكل ✨
                  </button>
                  <button className={`demo-tab-btn ${selectedCategory === 'hair' ? 'active' : ''}`} onClick={() => setSelectedCategory('hair')}>
                    💇‍♀️ خدمات الشعر
                  </button>
                  <button className={`demo-tab-btn ${selectedCategory === 'skin' ? 'active' : ''}`} onClick={() => setSelectedCategory('skin')}>
                    💆‍♀️ عناية بالبشرة
                  </button>
                  <button className={`demo-tab-btn ${selectedCategory === 'nails' ? 'active' : ''}`} onClick={() => setSelectedCategory('nails')}>
                    💅 أظافر وباديكير
                  </button>
                  <button className={`demo-tab-btn ${selectedCategory === 'buffet' ? 'active' : ''}`} onClick={() => setSelectedCategory('buffet')}>
                    ☕ مشروبات البوفيه
                  </button>
                  <button className={`demo-tab-btn ${selectedCategory === 'products' ? 'active' : ''}`} onClick={() => setSelectedCategory('products')}>
                    🛍️ منتجات المخزن
                  </button>
                </div>

                {/* شبكة العناصر */}
                <div className="demo-items-grid">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="demo-item-card">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="demo-item-img" />
                      ) : (
                        <div style={{ height: '100px', background: '#FDF7E7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                          {item.icon || '☕'}
                        </div>
                      )}
                      <div className="demo-item-body">
                        <div>
                          <div style={{ fontSize: '11px', color: '#7E6B74', marginBottom: '2px' }}>
                            {item.type === 'buffet' ? 'مشروب بوفيه' : item.type === 'product' ? 'منتج للبيع' : item.category}
                          </div>
                          <div className="demo-item-name">{item.name}</div>
                        </div>
                        <div className="demo-item-footer">
                          <div className="demo-item-price">{item.price} ج.م</div>
                          <button
                            className="demo-btn demo-btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => addToCart(item)}
                          >
                            + إضافة
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── الجانب الأيسر: سلة الفاتورة والحساب ── */}
              <div className="demo-pos-cart">
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 14px', borderBottom: '1px solid #F0DEE7', paddingBottom: '10px' }}>
                  🧾 الفاتورة الحالية ({cart.length} أصناف)
                </h3>

                {/* بيانات العميلة */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    placeholder="اسم العميلة..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit', fontSize: '13px' }}
                  />
                  <input
                    type="text"
                    placeholder="رقم هاتف العميلة..."
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit', fontSize: '13px' }}
                  />
                </div>

                {/* عناصر السلة */}
                <div style={{ flex: 1, maxHeight: '280px', overflowY: 'auto', marginBottom: '14px' }}>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#999', fontSize: '13px' }}>
                      السلة فارغة.. اضغط على أي خدمة أو منتج لإضافته
                    </div>
                  ) : (
                    cart.map((c) => (
                      <div key={c.id} className="demo-cart-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700' }}>{c.name}</div>
                          <div style={{ fontSize: '12px', color: '#8E3A59' }}>{c.price} ج.م × {c.qty}</div>
                          {c.type === 'service' && (
                            <select
                              value={c.assignedStylist}
                              onChange={(e) => updateStylist(c.id, e.target.value)}
                              style={{ fontSize: '11px', marginTop: '4px', padding: '2px 6px', borderRadius: '6px', border: '1px solid #F0DEE7', fontFamily: 'inherit' }}
                            >
                              {DEMO_STYLISTS.map(st => (
                                <option key={st.id} value={st.name}>الكوافيرة: {st.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => updateQty(c.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #DDD', cursor: 'pointer' }}>-</button>
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{c.qty}</span>
                          <button onClick={() => updateQty(c.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #DDD', cursor: 'pointer' }}>+</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* الخصم والدفع */}
                <div style={{ borderTop: '1px solid #F0DEE7', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>المجموع الفرعي:</span>
                    <strong>{subtotal} ج.م</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>الخصم (ج.م):</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                      style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #F0DEE7', textAlign: 'center' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', color: '#8E3A59', borderTop: '1px dashed #F0DEE7', paddingTop: '8px' }}>
                    <span>الإجمالي النهائي:</span>
                    <span>{total} ج.م</span>
                  </div>

                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #F0DEE7', fontFamily: 'inherit', fontSize: '13px', marginTop: '6px' }}
                  >
                    <option value="كاش (نقدي)">💵 كاش (نقدي)</option>
                    <option value="فيزا / بطاقة بنكية">💳 فيزا / بطاقة بنكية</option>
                    <option value="محفظة إلكترونية (فودافون كاش / إنستاباي)">📱 إنستاباي / فودافون كاش</option>
                  </select>

                  <button
                    className="demo-btn demo-btn-primary"
                    style={{ padding: '14px', justifyContent: 'center', marginTop: '10px', fontSize: '15px' }}
                    onClick={handleCheckout}
                  >
                    🧾 إتمام الدفع وطباعة الفاتورة ({total} ج.م)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── سجل الفواتير ── */
            <div style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #F0DEE7', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>سجل الفواتير الصادرة اليوم</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invoices.map((inv) => (
                  <div key={inv.id} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #F0DEE7',
                    background: '#FAF5F8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '15px' }}>{inv.id} — {inv.clientName}</div>
                      <div style={{ fontSize: '12px', color: '#7E6B74' }}>{inv.date} • {inv.paymentMethod}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <strong style={{ fontSize: '16px', color: '#8E3A59' }}>{inv.total} ج.م</strong>
                      <button
                        className="demo-btn demo-btn-outline"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => {
                          setLatestInvoice(inv)
                          setShowReceiptModal(true)
                        }}
                      >
                        🖨️ معاينة الإيصال
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── مودال محاكي الإيصال الحراري ── */}
          {showReceiptModal && latestInvoice && (
            <div className="demo-receipt-modal-backdrop" onClick={() => setShowReceiptModal(false)}>
              <div className="demo-receipt-paper" onClick={(e) => e.stopPropagation()}>
                <div className="demo-receipt-header">
                  <div className="demo-receipt-title">{DEMO_SALON_INFO.name}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{DEMO_SALON_INFO.address}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>هاتف: {DEMO_SALON_INFO.phone}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>الرقم الضريبي: {DEMO_SALON_INFO.taxNumber}</div>
                </div>

                <div style={{ fontSize: '12px', borderBottom: '1px dashed #777', paddingBottom: '8px', marginBottom: '10px' }}>
                  <div className="demo-receipt-line"><span>رقم الفاتورة:</span><strong>{latestInvoice.id}</strong></div>
                  <div className="demo-receipt-line"><span>التاريخ:</span><span>{latestInvoice.date}</span></div>
                  <div className="demo-receipt-line"><span>العميلة:</span><span>{latestInvoice.clientName}</span></div>
                  <div className="demo-receipt-line"><span>الكاشير:</span><span>{latestInvoice.cashierName}</span></div>
                </div>

                <div style={{ borderBottom: '1px dashed #777', paddingBottom: '8px', marginBottom: '10px' }}>
                  {latestInvoice.items.map((item, idx) => (
                    <div key={idx} className="demo-receipt-line">
                      <span>{item.qty}x {item.name}</span>
                      <span>{item.price * item.qty} ج.م</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderBottom: '2px dashed #333', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div className="demo-receipt-line"><span>المجموع:</span><span>{latestInvoice.subtotal} ج.م</span></div>
                  {latestInvoice.discount > 0 && (
                    <div className="demo-receipt-line" style={{ color: '#C0392B' }}><span>الخصم:</span><span>-{latestInvoice.discount} ج.م</span></div>
                  )}
                  <div className="demo-receipt-line" style={{ fontSize: '16px', fontWeight: '900', marginTop: '4px' }}>
                    <span>المدفوع ({latestInvoice.paymentMethod}):</span>
                    <span>{latestInvoice.total} ج.م</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px', color: '#555', marginBottom: '14px' }}>
                  شكراً لزيارتكِ صالون وسبا العرابي بيوتي 🌸<br />
                  نتطلع لرؤيتكِ قريباً!
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="demo-btn demo-btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => {
                      showToast('تم إرسال أمر الطباعة للطابعة الحرارية 🖨️')
                      setShowReceiptModal(false)
                    }}
                  >
                    🖨️ طباعة الإيصال
                  </button>
                  <button
                    className="demo-btn demo-btn-outline"
                    onClick={() => setShowReceiptModal(false)}
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
