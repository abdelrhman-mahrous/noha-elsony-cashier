import { useState, useEffect } from 'react'
import { getWalkInProducts } from '../services/posService'
import { formatPrice } from '../lib/formatters'

export default function AddProductItemModal({ onAdd, onClose }) {
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'bundles'
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await getWalkInProducts()
        setAllItems(data || [])
        if (data && data.length > 0) {
          const first = data[0]
          setSelectedItem(first)
          setCustomPrice(first.price?.toString() || '0')
          if (first.colors && first.colors.length > 0) {
            setSelectedColor(first.colors[0])
          }
        }
      } catch (err) {
        console.warn('Error fetching products/bundles for POS modal:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  function handleSelect(item) {
    setSelectedItem(item)
    setCustomPrice(item.price?.toString() || '0')
    if (item.colors && item.colors.length > 0) {
      setSelectedColor(item.colors[0])
    } else {
      setSelectedColor(null)
    }
  }

  function handleColorSelect(c) {
    setSelectedColor(c)
    if (c.price != null && c.price > 0) {
      setCustomPrice(c.price.toString())
    }
  }

  function handleConfirm(e) {
    e.preventDefault()
    if (!selectedItem) return

    const priceNum = parseFloat(customPrice) || 0
    const origPrice = selectedItem.original_price || selectedItem.price || priceNum
    const subtitle = selectedItem.is_bundle
      ? 'باقة عروض منتجات'
      : (selectedColor?.color_name ? `اللون / الحجم: ${selectedColor.color_name}` : 'مضاف من المخزن بالصالون')

    onAdd({
      id: 'new_prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      serviceId: selectedItem.id,
      title: selectedItem.name || 'منتج',
      subtitle,
      color_id: selectedColor?.id || null,
      color_name: selectedColor?.color_name || null,
      itemType: 'product',
      unitPrice: priceNum,
      originalUnitPrice: origPrice,
      quantity: Math.max(1, quantity),
      status: 'delivered',
      cancelReason: '',
      isCustomPrice: priceNum !== origPrice,
      isNewlyAdded: true,
      isCoveredByOffer: selectedItem.discount_percentage > 0 || selectedItem.discount_amount > 0,
    })
    onClose()
  }

  const filteredItems = allItems.filter(item => {
    if (activeTab === 'bundles' && !item.is_bundle) return false
    if (activeTab === 'products' && item.is_bundle) return false
    if (search.trim()) {
      return item.name?.toLowerCase().includes(search.trim().toLowerCase())
    }
    return true
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <span>🛍️</span>
            <span>إضافة منتجات وباقات للموعد</span>
          </h3>
          <button className="modal-close-btn" type="button" onClick={onClose}>✕</button>
        </div>

        {/* التبديل بين المنتجات والباقات */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '0.92rem',
              fontWeight: 800,
              borderRadius: 12,
              cursor: 'pointer',
              border: activeTab === 'products' ? '2px solid #E0829D' : '1px solid rgba(255, 255, 255, 0.15)',
              background: activeTab === 'products' ? 'linear-gradient(135deg, rgba(224, 130, 157, 0.35) 0%, rgba(183, 110, 121, 0.2) 100%)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'products' ? '#FFFFFF' : '#94A3B8',
              boxShadow: activeTab === 'products' ? '0 4px 15px rgba(224, 130, 157, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setActiveTab('products')}
          >
            🛍️ منتجات فردية ({allItems.filter(i => !i.is_bundle).length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '0.92rem',
              fontWeight: 800,
              borderRadius: 12,
              cursor: 'pointer',
              border: activeTab === 'bundles' ? '2px solid #E0829D' : '1px solid rgba(255, 255, 255, 0.15)',
              background: activeTab === 'bundles' ? 'linear-gradient(135deg, rgba(224, 130, 157, 0.35) 0%, rgba(183, 110, 121, 0.2) 100%)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'bundles' ? '#FFFFFF' : '#94A3B8',
              boxShadow: activeTab === 'bundles' ? '0 4px 15px rgba(224, 130, 157, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setActiveTab('bundles')}
          >
            🎁 باقات ومجموعات ({allItems.filter(i => i.is_bundle).length})
          </button>
        </div>

        {/* البحث */}
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            className="input"
            style={{
              width: '100%',
              fontSize: '0.9rem',
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1.5px solid rgba(255, 255, 255, 0.18)',
              color: '#FFFFFF',
              borderRadius: 12,
            }}
            placeholder={`🔍 ابحث في ${activeTab === 'products' ? 'المنتجات' : 'الباقات'}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: '30px 0', color: '#CBD5E1' }}>
            <span className="spinner" />
            <span>جارٍ تحميل المنتجات والمخزن...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '0.9rem' }}>
            لا توجد {activeTab === 'products' ? 'منتجات' : 'باقات'} مطابقة
          </div>
        ) : (
          <form onSubmit={handleConfirm}>
            {/* شبكة الاختيار */}
            <div className="form-group">
              <label className="form-label">
                اختر {activeTab === 'products' ? 'المنتج' : 'المجموعة'}:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                {filteredItems.map(item => {
                  const isSelected = selectedItem?.id === item.id
                  const hasDiscount = item.discount_percentage > 0 || item.discount_amount > 0
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        textAlign: 'right',
                        border: isSelected ? '2px solid #E0829D' : '1.5px solid rgba(255, 255, 255, 0.12)',
                        background: isSelected ? 'rgba(224, 130, 157, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        color: '#FFFFFF',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(224, 130, 157, 0.3)' : 'none',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, color: '#FFFFFF' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.is_bundle ? '🎁' : '🛍️'} {item.name}
                        </span>
                        {hasDiscount && (
                          <span style={{ background: '#10B981', color: '#FFFFFF', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>
                            خصم
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, color: '#34D399', fontSize: '0.9rem' }}>{formatPrice(item.price)} ج.م</span>
                        {!item.is_bundle && item.stock_quantity != null && (
                          <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>
                            (مخزون: {item.stock_quantity})
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* خيارات الألوان إن وجدت */}
            {selectedItem && selectedItem.colors && selectedItem.colors.length > 0 && (
              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label" style={{ fontSize: '0.84rem' }}>اختر اللون / الدرجة:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedItem.colors.map(c => {
                    const isColorSelected = selectedColor?.id === c.id || (!selectedColor && selectedItem.colors[0]?.id === c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleColorSelect(c)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          border: isColorSelected ? '2px solid #E0829D' : '1px solid rgba(255, 255, 255, 0.18)',
                          background: isColorSelected ? 'rgba(224, 130, 157, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        {c.color_hex && (
                          <span style={{ width: 14, height: 14, borderRadius: '50%', background: c.color_hex, border: '1.5px solid #FFFFFF' }} />
                        )}
                        <span>{c.color_name}</span>
                        {c.stock_quantity != null && (
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>({c.stock_quantity})</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* الكمية والسعر */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الكمية:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                    }}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    style={{
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '1.1rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1.5px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                    }}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                    }}
                    onClick={() => setQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">سعر الوحدة (ج.م):</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="input"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '1rem',
                  }}
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* ملخص الإجمالي المضاف */}
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(224, 130, 157, 0.18) 0%, rgba(16, 185, 129, 0.12) 100%)',
                border: '1px solid rgba(224, 130, 157, 0.35)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#E2E8F0' }}>
                الإجمالي المضاف للموعد:
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34D399' }}>
                {((parseFloat(customPrice) || 0) * quantity).toFixed(0)} جنيه
              </span>
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn btn--secondary"
                style={{
                  padding: '10px 20px',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                }}
                onClick={onClose}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  fontWeight: 800,
                  fontSize: '0.96rem',
                  background: 'linear-gradient(135deg, #B76E79 0%, #7D2E46 100%)',
                  boxShadow: '0 4px 15px rgba(183, 110, 121, 0.4)',
                  color: '#FFFFFF',
                }}
                disabled={!selectedItem}
              >
                ➕ تأكيد الإضافة للموعد
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
