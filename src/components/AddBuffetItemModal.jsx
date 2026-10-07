import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/formatters'

export default function AddBuffetItemModal({ onAdd, onClose }) {
  const [addonsList, setAddonsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAddon, setSelectedAddon] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState('')

  useEffect(() => {
    async function loadAddons() {
      try {
        const { data, error } = await supabase
          .from('addons')
          .select('*')
          .eq('is_active', true)
          .order('arabic_name', { ascending: true })

        if (!error && data) {
          setAddonsList(data)
          if (data.length > 0) {
            setSelectedAddon(data[0])
            setCustomPrice(data[0].price?.toString() || '0')
          }
        }
      } catch (err) {
        console.warn('Error fetching addons for POS modal:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAddons()
  }, [])

  function handleSelect(addon) {
    setSelectedAddon(addon)
    setCustomPrice(addon.price?.toString() || '0')
  }

  function handleConfirm(e) {
    e.preventDefault()
    if (!selectedAddon) return

    const priceNum = parseFloat(customPrice) || 0
    onAdd({
      id: 'new_addon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      serviceId: selectedAddon.id,
      title: selectedAddon.arabic_name || selectedAddon.name || 'طلب بوفيه',
      subtitle: 'مضاف في الصالون',
      itemType: 'addon',
      unitPrice: priceNum,
      originalUnitPrice: selectedAddon.price || priceNum,
      quantity: Math.max(1, quantity),
      status: 'delivered',
      cancelReason: '',
      isCustomPrice: priceNum !== selectedAddon.price,
      isNewlyAdded: true,
      isCoveredByOffer: false,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <span>☕</span>
            <span>إضافة مشروب / طلب بوفيه للموعد</span>
          </h3>
          <button className="modal-close-btn" type="button" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: '30px 0', color: '#CBD5E1' }}>
            <span className="spinner" />
            <span>جارٍ تحميل قائمة البوفيه...</span>
          </div>
        ) : (
          <form onSubmit={handleConfirm}>
            {/* اختيار المشروب */}
            <div className="form-group">
              <label className="form-label">اختر من قائمة البوفيه والمشروبات:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 220, overflowY: 'auto', padding: 4 }}>
                {addonsList.map(a => {
                  const isSelected = selectedAddon?.id === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleSelect(a)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        textAlign: 'right',
                        border: isSelected ? '2px solid #F59E0B' : '1.5px solid rgba(255, 255, 255, 0.12)',
                        background: isSelected ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        color: '#FFFFFF',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(245, 158, 11, 0.3)' : 'none',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#FDE68A' : '#FFFFFF' }}>
                        ☕ {a.arabic_name || a.name}
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#34D399', marginTop: 4 }}>
                        {formatPrice(a.price)} ج.م
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

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

            {/* ملخص الإجمالي */}
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(16, 185, 129, 0.12) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#E2E8F0' }}>
                الإجمالي المضاف للبوفيه:
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FBBF24' }}>
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
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)',
                  color: '#FFFFFF',
                }}
                disabled={!selectedAddon}
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
