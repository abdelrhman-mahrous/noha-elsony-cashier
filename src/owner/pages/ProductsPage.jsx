import { useState, useEffect } from 'react'
import { getProducts } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatPrice } from '../../lib/formatters'

export default function ProductsPage() {
  const showToast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadProducts()
  }, [search])

  async function loadProducts() {
    setLoading(true)
    try {
      const data = await getProducts({ query: search })
      setProducts(data)
    } catch (e) {
      showToast('خطأ في تحميل المنتجات: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">🛍️ المخزن والمنتجات</h1>
          <p className="owner-page-subtitle">متابعة المستحضرات ومخزون المنتجات والكميات المتبقية وأسعار البيع</p>
        </div>
      </div>

      {/* ── شريط البحث ── */}
      <div className="owner-filters-card">
        <input
          type="text"
          className="form-input"
          placeholder="🔍 ابحثي عن اسم المنتج أو المستحضر..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ تحميل المنتجات والمخزن...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="owner-card">
          <div className="owner-empty-state">
            <span>لا توجد منتجات مسجلة في المخزن</span>
          </div>
        </div>
      ) : (
        <div className="owner-card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>اسم المنتج</th>
                  <th>الفئة</th>
                  <th>الباركود</th>
                  <th>سعر البيع</th>
                  <th>الكمية المتوفرة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = p.stock_quantity ?? p.quantity ?? 0
                  const isLow = stock <= 3
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>{p.name}</td>
                      <td>{p.category || 'عام'}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {p.barcode || '—'}
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                        {formatPrice(p.price)} ج.م
                      </td>
                      <td>
                        <span
                          className={`badge ${isLow ? 'badge--danger' : 'badge--success'}`}
                        >
                          {stock} قطعة
                        </span>
                      </td>
                      <td>
                        {stock === 0 ? (
                          <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>نفد من المخزن</span>
                        ) : isLow ? (
                          <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>كمية منخفضة ⚠️</span>
                        ) : (
                          <span style={{ color: '#10b981', fontSize: '0.85rem' }}>متوفر ✅</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
