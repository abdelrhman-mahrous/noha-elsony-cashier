import { useState, useEffect } from 'react'
import { getWalkInServicesTree } from '../services/posService'
import { formatPrice } from '../lib/formatters'

export default function AddServiceItemModal({ onAdd, onClose }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState('')

  useEffect(() => {
    async function loadTree() {
      try {
        const tree = await getWalkInServicesTree()
        setCategories(tree || [])
        if (tree && tree.length > 0) {
          setSelectedCatId(tree[0].id)
        }
      } catch (err) {
        console.warn('Error loading services for POS modal:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTree()
  }, [])

  const currentCategory = categories.find(c => c.id === selectedCatId) || categories[0]

  // تجميع كل عناصر التصنيف الحالي
  const currentCategoryItems = []
  if (currentCategory?.groups) {
    currentCategory.groups.forEach(g => {
      if (g.items) {
        g.items.forEach(it => {
          currentCategoryItems.push({
            ...it,
            groupName: g.name_ar,
          })
        })
      }
    })
  }

  function handleSelectItem(item) {
    setSelectedItem(item)
    setCustomPrice((item.price || item.min_price || 0).toString())
  }

  function handleConfirm(e) {
    e.preventDefault()
    if (!selectedItem) return

    const priceNum = parseFloat(customPrice) || 0
    onAdd({
      id: 'new_srv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      serviceId: selectedItem.id,
      title: selectedItem.name_ar || selectedItem.name || 'خدمة صالون إضافية',
      subtitle: selectedItem.groupName || currentCategory?.name_ar || 'خدمة مضافة في الصالون',
      itemType: 'service',
      unitPrice: priceNum,
      originalUnitPrice: selectedItem.price || priceNum,
      quantity: Math.max(1, quantity),
      status: 'delivered',
      cancelReason: '',
      isCustomPrice: priceNum !== selectedItem.price,
      isNewlyAdded: true,
      isCoveredByOffer: false,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <span>💇‍♀️</span>
            <span>إضافة خدمة صالون للموعد</span>
          </h3>
          <button className="modal-close-btn" type="button" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: '30px 0', color: '#CBD5E1' }}>
            <span className="spinner" />
            <span>جارٍ تحميل قائمة الخدمات...</span>
          </div>
        ) : (
          <form onSubmit={handleConfirm}>
            {/* تبويبات الأقسام */}
            <div className="form-group">
              <label className="form-label">اختر قسم الخدمات:</label>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                {categories.map(cat => {
                  const isSelected = (currentCategory?.id === cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCatId(cat.id)
                        setSelectedItem(null)
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #E0829D' : '1px solid rgba(255, 255, 255, 0.15)',
                        background: isSelected ? 'linear-gradient(135deg, rgba(224, 130, 157, 0.35) 0%, rgba(183, 110, 121, 0.2) 100%)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#FFFFFF' : '#94A3B8',
                        boxShadow: isSelected ? '0 4px 12px rgba(224, 130, 157, 0.25)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat.name_ar || cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* قائمة الخدمات في القسم */}
            <div className="form-group">
              <label className="form-label">اختر الخدمة المطلوبة:</label>
              {currentCategoryItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: '0.86rem' }}>
                  لا توجد خدمات مسجلة في هذا القسم
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                  {currentCategoryItems.map(it => {
                    const isSelected = selectedItem?.id === it.id
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handleSelectItem(it)}
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
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF' }}>
                          💇‍♀️ {it.name_ar}
                        </div>
                        {it.groupName && (
                          <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 2 }}>
                            {it.groupName}
                          </div>
                        )}
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#34D399', marginTop: 4 }}>
                          {formatPrice(it.price || it.min_price || 0)} ج.م
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* الكمية وسعر الوحدة */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الكمية (العدد):</label>
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
                <label className="form-label">سعر الخدمة (ج.م):</label>
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
                  placeholder="أدخل السعر..."
                  required
                />
              </div>
            </div>

            {/* ملخص الإجمالي */}
            {selectedItem && (
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
                  إجمالي الخدمة المضافة: ({selectedItem.name_ar})
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34D399' }}>
                  {((parseFloat(customPrice) || 0) * quantity).toFixed(0)} جنيه
                </span>
              </div>
            )}

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
                ➕ إضافة الخدمة للموعد
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
