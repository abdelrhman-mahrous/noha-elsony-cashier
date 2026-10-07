import { useState, useEffect } from 'react'
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  getBundles,
  createOrUpdateBundle,
  deleteBundle,
  toggleBundleActive,
  restockProductStock,
  recordProductDamagedStock,
  recordProductReturnStock,
  getProductStockLogs,
  getInventoryAuditReport,
  uploadProductImage,
} from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatPrice, formatDateTime12 } from '../../lib/formatters'

export default function ProductsPage() {
  const showToast = useToast()
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'bundles' | 'logs' | 'audit'

  // ── 1. قائمة المنتجات ──
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [stockStatusFilter, setStockStatusFilter] = useState('all') // 'all' | 'in_stock' | 'low' | 'out_of_stock' | 'active' | 'inactive'

  // ── 2. قائمة الباقات ──
  const [bundles, setBundles] = useState([])
  const [bundlesLoading, setBundlesLoading] = useState(false)
  const [bundleSearch, setBundleSearch] = useState('')

  // ── 3. سجل الحركات ──
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logActionFilter, setLogActionFilter] = useState('all') // 'all' | 'restock' | 'damaged' | 'return' | 'sale'
  const [logSearch, setLogSearch] = useState('')

  // ── 4. الجرد والتقارير ──
  const [auditReport, setAuditReport] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  // ── المودالات (Modals) ──
  // Product Add/Edit Modal
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    purchasePrice: '',
    discountType: 'none', // 'none' | 'percentage' | 'fixed'
    discountValue: '',
    offerEndsAt: '',
    stockQuantity: '',
    isActive: true,
    imageUrl: '',
    images: [],
    colors: [],
  })
  const [savingProduct, setSavingProduct] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Bundle Add/Edit Modal
  const [bundleModalOpen, setBundleModalOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState(null)
  const [bundleForm, setBundleForm] = useState({
    name: '',
    description: '',
    bundlePrice: '',
    purchasePrice: '',
    discountPercentage: '',
    isActive: true,
    imageUrl: '',
    images: [],
    items: [], // [{ product_id, color_id, quantity }]
  })
  const [savingBundle, setSavingBundle] = useState(false)

  // Quick Action Modals (Restock / Damaged / Return)
  const [quickActionModal, setQuickActionModal] = useState(null) // { type: 'restock' | 'damaged' | 'return', product: {...} }
  const [quickActionForm, setQuickActionForm] = useState({
    colorId: '',
    quantity: 1,
    reason: '',
    newPurchasePrice: '',
    newSellingPrice: '',
    refundAmount: '',
  })
  const [submittingQuickAction, setSubmittingQuickAction] = useState(false)

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null) // { type: 'product' | 'bundle', id: '...', name: '...' }
  const [deleting, setDeleting] = useState(false)

  // ── Loaders ──
  useEffect(() => {
    if (activeTab === 'products') {
      loadProductsList()
    } else if (activeTab === 'bundles') {
      loadBundlesList()
    } else if (activeTab === 'logs') {
      loadLogsList()
    } else if (activeTab === 'audit') {
      loadAuditData()
    }
  }, [activeTab, productSearch, bundleSearch, logActionFilter, logSearch])

  async function loadProductsList() {
    setProductsLoading(true)
    try {
      const data = await getProducts({ query: productSearch })
      setProducts(data || [])
    } catch (e) {
      showToast('خطأ في تحميل المنتجات: ' + e.message, 'error')
    } finally {
      setProductsLoading(false)
    }
  }

  async function loadBundlesList() {
    setBundlesLoading(true)
    try {
      const data = await getBundles({ query: bundleSearch })
      setBundles(data || [])
    } catch (e) {
      showToast('خطأ في تحميل باقات العروض: ' + e.message, 'error')
    } finally {
      setBundlesLoading(false)
    }
  }

  async function loadLogsList() {
    setLogsLoading(true)
    try {
      const data = await getProductStockLogs({ actionType: logActionFilter, query: logSearch })
      setLogs(data || [])
    } catch (e) {
      showToast('خطأ في تحميل سجل الحركات: ' + e.message, 'error')
    } finally {
      setLogsLoading(false)
    }
  }

  async function loadAuditData() {
    setAuditLoading(true)
    try {
      const rep = await getInventoryAuditReport()
      setAuditReport(rep)
    } catch (e) {
      showToast('خطأ في إعداد تقرير الجرد: ' + e.message, 'error')
    } finally {
      setAuditLoading(false)
    }
  }

  function refreshCurrentTab() {
    if (activeTab === 'products') loadProductsList()
    if (activeTab === 'bundles') loadBundlesList()
    if (activeTab === 'logs') loadLogsList()
    if (activeTab === 'audit') loadAuditData()
  }

  // ── Product Form Handling ──
  function handleOpenProductModal(prod = null) {
    if (prod) {
      setEditingProduct(prod)
      let dType = 'none'
      let dVal = ''
      if (prod.discount_percentage && prod.discount_percentage > 0) {
        dType = 'percentage'
        dVal = prod.discount_percentage.toString()
      } else if (prod.discount_amount && prod.discount_amount > 0) {
        dType = 'fixed'
        dVal = prod.discount_amount.toString()
      }

      setProductForm({
        name: prod.name || '',
        description: prod.description || '',
        price: prod.price != null ? prod.price.toString() : '',
        purchasePrice: prod.purchase_price != null ? prod.purchase_price.toString() : '',
        discountType: dType,
        discountValue: dVal,
        offerEndsAt: prod.offer_ends_at ? prod.offer_ends_at.slice(0, 10) : '',
        stockQuantity: (prod.stock_quantity ?? 0).toString(),
        isActive: prod.is_active !== false,
        imageUrl: prod.image_url || '',
        images: Array.isArray(prod.images) ? prod.images : [],
        colors: Array.isArray(prod.colors) ? prod.colors.map(c => ({
          color_name: c.color_name || '',
          color_hex: c.color_hex || '#000000',
          stock_quantity: c.stock_quantity ?? 10,
          price: c.price ?? prod.price,
          purchase_price: c.purchase_price ?? prod.purchase_price,
        })) : [],
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        name: '',
        description: '',
        price: '',
        purchasePrice: '',
        discountType: 'none',
        discountValue: '',
        offerEndsAt: '',
        stockQuantity: '0',
        isActive: true,
        imageUrl: '',
        images: [],
        colors: [],
      })
    }
    setProductModalOpen(true)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadProductImage(file)
      setProductForm(prev => ({
        ...prev,
        imageUrl: url,
        images: [url, ...prev.images.filter(x => x !== url)],
      }))
      showToast('تم رفع صورة المنتج بنجاح 📸', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  function handleAddColorRow() {
    setProductForm(prev => ({
      ...prev,
      colors: [
        ...prev.colors,
        {
          color_name: '',
          color_hex: '#B76E79',
          stock_quantity: 10,
          price: parseFloat(prev.price) || 0,
          purchase_price: parseFloat(prev.purchasePrice) || 0,
        }
      ]
    }))
  }

  function handleRemoveColorRow(idx) {
    setProductForm(prev => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== idx)
    }))
  }

  function handleColorChange(idx, field, val) {
    setProductForm(prev => {
      const newColors = [...prev.colors]
      newColors[idx] = { ...newColors[idx], [field]: val }
      return { ...prev, colors: newColors }
    })
  }

  async function handleSaveProduct(e) {
    e.preventDefault()
    if (!productForm.name.trim()) {
      showToast('يرجى إدخال اسم المنتج', 'warning')
      return
    }
    const priceNum = parseFloat(productForm.price)
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('يرجى إدخال سعر بيع صحيح', 'warning')
      return
    }

    const purchaseNum = parseFloat(productForm.purchasePrice) || 0
    const stockNum = parseInt(productForm.stockQuantity) || 0
    let discPct = 0
    let discAmt = 0

    if (productForm.discountType === 'percentage') {
      discPct = parseFloat(productForm.discountValue) || 0
    } else if (productForm.discountType === 'fixed') {
      discAmt = parseFloat(productForm.discountValue) || 0
    }

    setSavingProduct(true)
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: productForm.name,
          description: productForm.description,
          price: priceNum,
          purchasePrice: purchaseNum,
          discountPercentage: discPct,
          discountAmount: discAmt,
          offerEndsAt: productForm.offerEndsAt || null,
          stockQuantity: stockNum,
          isActive: productForm.isActive,
          imageUrl: productForm.imageUrl || null,
          images: productForm.images,
          colors: productForm.colors,
        })
        showToast(`تم تعديل المنتج "${productForm.name}" بنجاح ✨`, 'success')
      } else {
        await addProduct({
          name: productForm.name,
          description: productForm.description,
          price: priceNum,
          purchasePrice: purchaseNum,
          discountPercentage: discPct,
          discountAmount: discAmt,
          offerEndsAt: productForm.offerEndsAt || null,
          stockQuantity: stockNum,
          isActive: productForm.isActive,
          imageUrl: productForm.imageUrl || null,
          images: productForm.images,
          colors: productForm.colors,
        })
        showToast(`تمت إضافة المنتج "${productForm.name}" بنجاح إلى المخزن 🛍️`, 'success')
      }
      setProductModalOpen(false)
      loadProductsList()
    } catch (err) {
      showToast('خطأ في حفظ المنتج: ' + err.message, 'error')
    } finally {
      setSavingProduct(false)
    }
  }

  // ── Bundle Form Handling ──
  function handleOpenBundleModal(bundle = null) {
    if (bundle) {
      setEditingBundle(bundle)
      setBundleForm({
        name: bundle.name || '',
        description: bundle.description || '',
        bundlePrice: bundle.bundle_price != null ? bundle.bundle_price.toString() : '',
        purchasePrice: bundle.purchase_price != null ? bundle.purchase_price.toString() : '',
        discountPercentage: bundle.discount_percentage != null ? bundle.discount_percentage.toString() : '',
        isActive: bundle.is_active !== false,
        imageUrl: bundle.image_url || '',
        images: Array.isArray(bundle.images) ? bundle.images : [],
        items: Array.isArray(bundle.items) ? bundle.items.map(it => ({
          product_id: it.product_id,
          color_id: it.color_id || '',
          quantity: it.quantity || 1,
        })) : [],
      })
    } else {
      setEditingBundle(null)
      setBundleForm({
        name: '',
        description: '',
        bundlePrice: '',
        purchasePrice: '',
        discountPercentage: '',
        isActive: true,
        imageUrl: '',
        images: [],
        items: [],
      })
    }
    setBundleModalOpen(true)
  }

  function handleAddBundleItem(prodId) {
    if (!prodId) return
    setBundleForm(prev => {
      const existing = prev.items.find(i => i.product_id === prodId)
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i => i.product_id === prodId ? { ...i, quantity: i.quantity + 1 } : i)
        }
      }
      return {
        ...prev,
        items: [...prev.items, { product_id: prodId, color_id: '', quantity: 1 }]
      }
    })
  }

  function handleRemoveBundleItem(idx) {
    setBundleForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }))
  }

  function handleBundleItemQtyChange(idx, qty) {
    setBundleForm(prev => {
      const newItems = [...prev.items]
      newItems[idx] = { ...newItems[idx], quantity: Math.max(1, qty) }
      return { ...prev, items: newItems }
    })
  }

  async function handleSaveBundle(e) {
    e.preventDefault()
    if (!bundleForm.name.trim()) {
      showToast('يرجى إدخال اسم باقة المنتجات', 'warning')
      return
    }
    const bPrice = parseFloat(bundleForm.bundlePrice)
    if (isNaN(bPrice) || bPrice <= 0) {
      showToast('يرجى إدخال سعر بيع صحيح للباقة', 'warning')
      return
    }
    if (bundleForm.items.length === 0) {
      showToast('يرجى إضافة منتج واحد على الأقل داخل المجموعة', 'warning')
      return
    }

    setSavingBundle(true)
    try {
      await createOrUpdateBundle({
        id: editingBundle?.id || null,
        name: bundleForm.name,
        description: bundleForm.description,
        bundlePrice: bPrice,
        purchasePrice: parseFloat(bundleForm.purchasePrice) || 0,
        discountPercentage: parseFloat(bundleForm.discountPercentage) || 0,
        isActive: bundleForm.isActive,
        imageUrl: bundleForm.imageUrl || null,
        images: bundleForm.images,
        items: bundleForm.items,
      })
      showToast(editingBundle ? 'تم تعديل الباقة بنجاح ✨' : 'تمت إضافة باقة المنتجات بنجاح 🎁', 'success')
      setBundleModalOpen(false)
      loadBundlesList()
    } catch (err) {
      showToast('خطأ في حفظ الباقة: ' + err.message, 'error')
    } finally {
      setSavingBundle(false)
    }
  }

  // ── Quick Actions (Restock / Damaged / Return) ──
  function handleOpenQuickAction(type, product) {
    setQuickActionModal({ type, product })
    setQuickActionForm({
      colorId: product.colors && product.colors.length > 0 ? product.colors[0].id : '',
      quantity: 1,
      reason: '',
      newPurchasePrice: product.purchase_price?.toString() || '',
      newSellingPrice: product.price?.toString() || '',
      refundAmount: '',
    })
  }

  async function handleSubmitQuickAction(e) {
    e.preventDefault()
    if (!quickActionModal) return
    const { type, product } = quickActionModal
    const qty = parseInt(quickActionForm.quantity) || 1
    if (qty <= 0) {
      showToast('يرجى إدخال كمية صحيحة أكبر من صفر', 'warning')
      return
    }

    setSubmittingQuickAction(true)
    try {
      if (type === 'restock') {
        await restockProductStock({
          productId: product.id,
          colorId: quickActionForm.colorId || null,
          quantityAdded: qty,
          newPurchasePrice: parseFloat(quickActionForm.newPurchasePrice) || 0,
          newSellingPrice: parseFloat(quickActionForm.newSellingPrice) || null,
        })
        showToast(`تم تزويد المخزن بـ ${qty} قطعة من "${product.name}" بنجاح 📥`, 'success')
      } else if (type === 'damaged') {
        await recordProductDamagedStock({
          productId: product.id,
          colorId: quickActionForm.colorId || null,
          quantity: qty,
          reason: quickActionForm.reason,
        })
        showToast(`تم تسجيل ${qty} قطعة تالفة لـ "${product.name}" وخصمها من المخزن ⚠️`, 'warning')
      } else if (type === 'return') {
        await recordProductReturnStock({
          productId: product.id,
          colorId: quickActionForm.colorId || null,
          quantity: qty,
          reason: quickActionForm.reason,
          refundAmount: parseFloat(quickActionForm.refundAmount) || null,
        })
        showToast(`تم تسجيل استرجاع ${qty} قطعة لـ "${product.name}" وإعادتها للمخزن 🔄`, 'success')
      }
      setQuickActionModal(null)
      loadProductsList()
    } catch (err) {
      showToast('فشلت العملية: ' + err.message, 'error')
    } finally {
      setSubmittingQuickAction(false)
    }
  }

  // ── Delete Actions ──
  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'product') {
        await deleteProduct(deleteTarget.id)
        showToast(`تم حذف المنتج "${deleteTarget.name}" بنجاح 🗑️`, 'success')
        loadProductsList()
      } else if (deleteTarget.type === 'bundle') {
        await deleteBundle(deleteTarget.id)
        showToast(`تم حذف الباقة "${deleteTarget.name}" بنجاح 🗑️`, 'success')
        loadBundlesList()
      }
      setDeleteTarget(null)
    } catch (err) {
      showToast('خطأ في الحذف: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Toggle Active ──
  async function handleToggleActive(item, type = 'product') {
    try {
      if (type === 'product') {
        await toggleProductActive(item.id, item.is_active)
        showToast(`تم ${item.is_active ? 'إيقاف' : 'تفعيل'} المنتج "${item.name}"`, 'info')
        loadProductsList()
      } else {
        await toggleBundleActive(item.id, item.is_active)
        showToast(`تم ${item.is_active ? 'إيقاف' : 'تفعيل'} الباقة "${item.name}"`, 'info')
        loadBundlesList()
      }
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error')
    }
  }

  // ── Filtered Products ──
  const filteredProducts = products.filter(p => {
    const stock = p.stock_quantity ?? 0
    if (stockStatusFilter === 'in_stock' && stock === 0) return false
    if (stockStatusFilter === 'low' && (stock === 0 || stock > 5)) return false
    if (stockStatusFilter === 'out_of_stock' && stock > 0) return false
    if (stockStatusFilter === 'active' && p.is_active === false) return false
    if (stockStatusFilter === 'inactive' && p.is_active !== false) return false
    return true
  })

  // Quick stats
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0)
  const lowStockCount = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5).length
  const outOfStockCount = products.filter(p => (p.stock_quantity || 0) === 0).length

  return (
    <div className="owner-container">
      {/* ── الرأس الرئيسي ── */}
      <div className="owner-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="owner-page-title">🛍️ إدارة المنتجات والمخزون والجرد</h1>
          <p className="owner-page-subtitle">
            التحكم الشامل في مستحضرات التجميل، باقات العروض، حركات المخزون، والتقارير المالية والأرباح
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn--secondary" onClick={refreshCurrentTab} title="تحديث">
            🔄 تحديث
          </button>
          {activeTab === 'products' && (
            <button className="btn btn--primary" onClick={() => handleOpenProductModal(null)}>
              ➕ إضافة منتج جديد
            </button>
          )}
          {activeTab === 'bundles' && (
            <button className="btn btn--primary" onClick={() => handleOpenBundleModal(null)}>
              🎁 إنشاء باقة جديدة
            </button>
          )}
        </div>
      </div>

      {/* ── شريط التبويبات الرئيسي (Tabs) ── */}
      <div className="owner-tabs" style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--staff-border)', marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          className={`owner-tab-btn ${activeTab === 'products' ? 'owner-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('products')}
          style={{
            padding: '10px 18px',
            fontWeight: 800,
            fontSize: '0.95rem',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'products' ? 'var(--staff-rose-dark)' : 'transparent',
            color: activeTab === 'products' ? '#FFFFFF' : 'var(--staff-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🛍️ المنتجات الفردية ({products.length})
        </button>

        <button
          className={`owner-tab-btn ${activeTab === 'bundles' ? 'owner-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bundles')}
          style={{
            padding: '10px 18px',
            fontWeight: 800,
            fontSize: '0.95rem',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'bundles' ? 'var(--staff-rose-dark)' : 'transparent',
            color: activeTab === 'bundles' ? '#FFFFFF' : 'var(--staff-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🎁 باقات ومجموعات العروض ({bundles.length})
        </button>

        <button
          className={`owner-tab-btn ${activeTab === 'logs' ? 'owner-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 18px',
            fontWeight: 800,
            fontSize: '0.95rem',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'logs' ? 'var(--staff-rose-dark)' : 'transparent',
            color: activeTab === 'logs' ? '#FFFFFF' : 'var(--staff-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📜 سجل حركات المخزون ({logs.length})
        </button>

        <button
          className={`owner-tab-btn ${activeTab === 'audit' ? 'owner-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '10px 18px',
            fontWeight: 800,
            fontSize: '0.95rem',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'audit' ? 'var(--staff-rose-dark)' : 'transparent',
            color: activeTab === 'audit' ? '#FFFFFF' : 'var(--staff-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📊 الجرد والتقارير والأرباح
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB 1: المنتجات الفردية
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div>
          {/* بطاقات الإحصائيات السريعة */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div className="owner-card" style={{ padding: '16px 20px', borderRight: '4px solid var(--staff-rose-dark)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--staff-muted)', fontWeight: 600 }}>إجمالي الأصناف</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--staff-ink)', marginTop: 4 }}>{products.length} منتج</div>
            </div>
            <div className="owner-card" style={{ padding: '16px 20px', borderRight: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--staff-muted)', fontWeight: 600 }}>إجمالي القطع المتوفرة</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: 4 }}>{totalStockUnits} قطعة</div>
            </div>
            <div className="owner-card" style={{ padding: '16px 20px', borderRight: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--staff-muted)', fontWeight: 600 }}>منتجات كميتها منخفضة</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', marginTop: 4 }}>{lowStockCount} منتج</div>
            </div>
            <div className="owner-card" style={{ padding: '16px 20px', borderRight: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--staff-muted)', fontWeight: 600 }}>منتجات نفدت من المخزن</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ef4444', marginTop: 4 }}>{outOfStockCount} منتج</div>
            </div>
          </div>

          {/* فلاتر وبحث المنتجات */}
          <div className="owner-filters-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 ابحث عن اسم المنتج أو الوصف..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'in_stock', label: 'متوفر' },
                { id: 'low', label: 'منخفض ⚠️' },
                { id: 'out_of_stock', label: 'نفد ❌' },
                { id: 'active', label: 'نشط ✅' },
                { id: 'inactive', label: 'متوقف ⏸️' },
              ].map(f => (
                <button
                  key={f.id}
                  className={`btn btn--sm ${stockStatusFilter === f.id ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setStockStatusFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* جدول وبطاقات المنتجات */}
          {productsLoading ? (
            <div className="loading-center" style={{ minHeight: '300px' }}>
              <span className="spinner spinner--lg" />
              <span>جارٍ تحميل المنتجات والمخزن...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="owner-card">
              <div className="owner-empty-state">
                <span style={{ fontSize: '2rem' }}>🛍️</span>
                <p>لا توجد منتجات مسجلة تطابق البحث</p>
                <button className="btn btn--primary" onClick={() => handleOpenProductModal(null)} style={{ marginTop: 12 }}>
                  ➕ إضافة أول منتج
                </button>
              </div>
            </div>
          ) : (
            <div className="owner-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>سعر البيع</th>
                      <th>سعر التكلفة</th>
                      <th>الخصم / العرض</th>
                      <th>المخزون الحالي</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>إجراءات المخزون والتحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const stock = p.stock_quantity ?? 0
                      const isLow = stock > 0 && stock <= 5
                      const isOut = stock === 0
                      const hasDiscount = (p.discount_percentage > 0) || (p.discount_amount > 0)
                      let discountedPrice = p.price || 0
                      if (p.discount_percentage > 0) {
                        discountedPrice = Math.max(0, p.price * (1 - p.discount_percentage / 100))
                      } else if (p.discount_amount > 0) {
                        discountedPrice = Math.max(0, p.price - p.discount_amount)
                      }

                      return (
                        <tr key={p.id} style={{ opacity: p.is_active === false ? 0.6 : 1 }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--staff-border)' }}
                                />
                              ) : (
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#FAF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                  🛍️
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 800, color: 'var(--staff-ink)', fontSize: '0.96rem' }}>
                                  {p.name}
                                </div>
                                {p.description && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--staff-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.description}
                                  </div>
                                )}
                                {p.colors && p.colors.length > 0 && (
                                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    {p.colors.map((c, i) => (
                                      <span
                                        key={i}
                                        title={`${c.color_name} (${c.stock_quantity} قطعة)`}
                                        style={{
                                          width: 14,
                                          height: 14,
                                          borderRadius: '50%',
                                          background: c.color_hex || '#000',
                                          display: 'inline-block',
                                          border: '1px solid #fff',
                                          boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                                        }}
                                      />
                                    ))}
                                    <span style={{ fontSize: '0.7rem', color: 'var(--staff-muted)', marginRight: 4 }}>
                                      ({p.colors.length} درجات)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* سعر البيع */}
                          <td>
                            {hasDiscount ? (
                              <div>
                                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>
                                  {formatPrice(discountedPrice)} ج.م
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--staff-muted)', textDecoration: 'line-through' }}>
                                  {formatPrice(p.price)} ج.م
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontWeight: 800, color: 'var(--staff-ink)', fontSize: '0.96rem' }}>
                                {formatPrice(p.price)} ج.م
                              </div>
                            )}
                          </td>

                          {/* سعر التكلفة */}
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--staff-muted)', fontSize: '0.9rem' }}>
                              {formatPrice(p.purchase_price || 0)} ج.م
                            </span>
                          </td>

                          {/* الخصم */}
                          <td>
                            {hasDiscount ? (
                              <span className="badge badge--success" style={{ fontWeight: 800 }}>
                                {p.discount_percentage > 0 ? `خصم ${p.discount_percentage}%` : `خصم ${p.discount_amount} ج.م`}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--staff-muted)', fontSize: '0.85rem' }}>—</span>
                            )}
                          </td>

                          {/* المخزون */}
                          <td>
                            <span
                              className={`badge ${isOut ? 'badge--danger' : isLow ? 'badge--warning' : 'badge--success'}`}
                              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                            >
                              {stock} قطعة
                            </span>
                          </td>

                          {/* الحالة */}
                          <td>
                            {isOut ? (
                              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.82rem' }}>نفد ❌</span>
                            ) : isLow ? (
                              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem' }}>منخفض ⚠️</span>
                            ) : p.is_active === false ? (
                              <span style={{ color: 'var(--staff-muted)', fontSize: '0.82rem' }}>متوقف ⏸️</span>
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.82rem' }}>متوفر ✅</span>
                            )}
                          </td>

                          {/* الإجراءات */}
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn--sm btn--primary"
                                style={{ background: '#10b981', padding: '4px 8px', fontSize: '0.78rem' }}
                                title="تزويد كمية للمخزن"
                                onClick={() => handleOpenQuickAction('restock', p)}
                              >
                                📥 تزويد
                              </button>
                              <button
                                className="btn btn--sm btn--secondary"
                                style={{ color: '#f59e0b', padding: '4px 8px', fontSize: '0.78rem' }}
                                title="تسجيل تالف"
                                onClick={() => handleOpenQuickAction('damaged', p)}
                              >
                                ⚠️ تالف
                              </button>
                              <button
                                className="btn btn--sm btn--secondary"
                                style={{ color: '#3b82f6', padding: '4px 8px', fontSize: '0.78rem' }}
                                title="تسجيل مرتجع"
                                onClick={() => handleOpenQuickAction('return', p)}
                              >
                                🔄 مرتجع
                              </button>
                              <button
                                className="btn btn--sm btn--secondary"
                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                title="تعديل المنتج"
                                onClick={() => handleOpenProductModal(p)}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn--sm btn--secondary"
                                style={{ color: '#ef4444', padding: '4px 8px', fontSize: '0.78rem' }}
                                title="حذف المنتج"
                                onClick={() => setDeleteTarget({ type: 'product', id: p.id, name: p.name })}
                              >
                                🗑️
                              </button>
                            </div>
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
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 2: باقات ومجموعات العروض
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'bundles' && (
        <div>
          <div className="owner-filters-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <input
              type="text"
              className="form-input"
              style={{ maxWidth: 350 }}
              placeholder="🔍 ابحث عن باقة عروض..."
              value={bundleSearch}
              onChange={e => setBundleSearch(e.target.value)}
            />
            <button className="btn btn--primary" onClick={() => handleOpenBundleModal(null)}>
              🎁 إنشاء باقة جديدة
            </button>
          </div>

          {bundlesLoading ? (
            <div className="loading-center" style={{ minHeight: '300px' }}>
              <span className="spinner spinner--lg" />
              <span>جارٍ تحميل باقات العروض...</span>
            </div>
          ) : bundles.length === 0 ? (
            <div className="owner-card">
              <div className="owner-empty-state">
                <span style={{ fontSize: '2.5rem' }}>🎁</span>
                <p>لا توجد باقات أو مجموعات منتجات مسجلة حالياً</p>
                <button className="btn btn--primary" onClick={() => handleOpenBundleModal(null)} style={{ marginTop: 12 }}>
                  🎁 إنشاء أول باقة منتجات
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {bundles.map(b => {
                const itemsCount = b.items?.length || 0
                return (
                  <div key={b.id} className="owner-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {b.image_url ? (
                            <img
                              src={b.image_url}
                              alt={b.name}
                              style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--staff-border)' }}
                            />
                          ) : (
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #7D2E46 0%, #B76E79 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#fff' }}>
                              🎁
                            </div>
                          )}
                          <div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--staff-ink)', margin: 0 }}>
                              {b.name}
                            </h3>
                            <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>
                              تحتوي على {itemsCount} منتجات مجمعة
                            </span>
                          </div>
                        </div>
                        <span className={`badge ${b.is_active !== false ? 'badge--success' : 'badge--secondary'}`}>
                          {b.is_active !== false ? 'نشطة' : 'متوقفة'}
                        </span>
                      </div>

                      {b.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--staff-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                          {b.description}
                        </p>
                      )}

                      {/* عناصر الباقة */}
                      <div style={{ background: '#FAF5F8', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--staff-rose-dark)', marginBottom: 6 }}>
                          محتويات الباقة:
                        </div>
                        {b.items && b.items.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {b.items.map((it, idx) => (
                              <div key={idx} style={{ fontSize: '0.82rem', color: 'var(--staff-ink)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>• {it.products?.name || 'منتج صالون'}</span>
                                <span style={{ fontWeight: 700, color: 'var(--staff-rose-dark)' }}>× {it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--staff-muted)' }}>لا توجد بنود محددة</div>
                        )}
                      </div>
                    </div>

                    {/* الأسعار والأزرار */}
                    <div style={{ borderTop: '1px solid var(--staff-border)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--staff-muted)' }}>سعر الباقة للعميل</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>
                            {formatPrice(b.bundle_price)} ج.م
                          </div>
                        </div>
                        {b.discount_percentage > 0 && (
                          <span className="badge badge--success" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                            خصم {b.discount_percentage}%
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn--sm btn--secondary"
                          onClick={() => handleToggleActive(b, 'bundle')}
                          title={b.is_active ? 'إيقاف' : 'تفعيل'}
                        >
                          {b.is_active ? '⏸️ إيقاف' : '▶️ تفعيل'}
                        </button>
                        <button className="btn btn--sm btn--secondary" onClick={() => handleOpenBundleModal(b)}>
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn--sm btn--secondary"
                          style={{ color: '#ef4444' }}
                          onClick={() => setDeleteTarget({ type: 'bundle', id: b.id, name: b.name })}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 3: سجل حركات المخزون
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div>
          {/* فلاتر الحركات */}
          <div className="owner-filters-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 ابحث في السجلات باسم المنتج أو سبب الحركة..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'كافة الحركات' },
                { id: 'restock', label: '📥 تزويد مخزن' },
                { id: 'damaged', label: '⚠️ تالف' },
                { id: 'return', label: '🔄 استرجاع' },
                { id: 'sale', label: '🛍️ مبيعات' },
              ].map(f => (
                <button
                  key={f.id}
                  className={`btn btn--sm ${logActionFilter === f.id ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setLogActionFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {logsLoading ? (
            <div className="loading-center" style={{ minHeight: '300px' }}>
              <span className="spinner spinner--lg" />
              <span>جارٍ تحميل سجل الحركات...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="owner-card">
              <div className="owner-empty-state">
                <span>📜</span>
                <p>لا توجد حركات مخزون مسجلة</p>
              </div>
            </div>
          ) : (
            <div className="owner-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>التاريخ والوقت</th>
                      <th>نوع الحركة</th>
                      <th>المنتج</th>
                      <th>الكمية المعدلة</th>
                      <th>حركة المخزون</th>
                      <th>السبب / الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => {
                      const isPositive = (log.quantity_change || 0) > 0
                      let badgeBg = '#3b82f6'
                      let badgeText = 'حركة مخزون'

                      if (log.action_type === 'restock') {
                        badgeBg = '#10b981'
                        badgeText = '📥 تزويد مخزون'
                      } else if (log.action_type === 'damaged') {
                        badgeBg = '#ef4444'
                        badgeText = '⚠️ تسجيل تالف'
                      } else if (log.action_type === 'return') {
                        badgeBg = '#8b5cf6'
                        badgeText = '🔄 استرجاع'
                      } else if (log.action_type === 'sale') {
                        badgeBg = '#f59e0b'
                        badgeText = '🛍️ بيع بالموعد'
                      }

                      return (
                        <tr key={log.id}>
                          <td style={{ fontSize: '0.84rem', color: 'var(--staff-muted)', whiteSpace: 'nowrap' }}>
                            {formatDateTime12(log.created_at)}
                          </td>
                          <td>
                            <span style={{ background: badgeBg, color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800 }}>
                              {badgeText}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {log.product_name}
                            {log.color_name && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)', marginRight: 6 }}>
                                ({log.color_name})
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 900, color: isPositive ? '#10b981' : '#ef4444', fontSize: '0.96rem' }}>
                              {isPositive ? `+${log.quantity_change}` : log.quantity_change} قطعة
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--staff-muted)' }}>{log.old_stock}</span>
                            <span style={{ margin: '0 6px' }}>➔</span>
                            <span style={{ fontWeight: 800, color: 'var(--staff-ink)' }}>{log.new_stock} قطعة</span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--staff-muted)' }}>
                            {log.reason || '—'}
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
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 4: الجرد والتقارير المالية للمخزون
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div>
          {auditLoading ? (
            <div className="loading-center" style={{ minHeight: '300px' }}>
              <span className="spinner spinner--lg" />
              <span>جارٍ حساب الجرد والتقارير المالية...</span>
            </div>
          ) : !auditReport ? (
            <div className="owner-card">
              <div className="owner-empty-state">
                <p>تعذر جلب تقرير الجرد</p>
              </div>
            </div>
          ) : (
            <div>
              {/* بطاقات المؤشرات المالية الرئيسية (KPIs) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
                <div className="owner-card" style={{ padding: '20px', borderTop: '4px solid var(--staff-rose-dark)' }}>
                  <div style={{ fontSize: '0.86rem', color: 'var(--staff-muted)', fontWeight: 600 }}>إجمالي رأس المال المجمد بالمخزن</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--staff-rose-dark)', marginTop: 6 }}>
                    {formatPrice(auditReport.totalCapital)} ج.م
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--staff-muted)', marginTop: 4 }}>
                    قيمة الشراء للبضاعة المتوفرة حالياً
                  </div>
                </div>

                <div className="owner-card" style={{ padding: '20px', borderTop: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.86rem', color: 'var(--staff-muted)', fontWeight: 600 }}>إجمالي عدد القطع المتوفرة</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', marginTop: 6 }}>
                    {auditReport.totalUnits} قطعة
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--staff-muted)', marginTop: 4 }}>
                    موزعة على {auditReport.totalProductsCount} منتج و {auditReport.totalBundlesCount} باقة
                  </div>
                </div>

                <div className="owner-card" style={{ padding: '20px', borderTop: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.86rem', color: 'var(--staff-muted)', fontWeight: 600 }}>مبيعات المنتجات من المواعيد</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3b82f6', marginTop: 6 }}>
                    {formatPrice(auditReport.totalSalesRevenue)} ج.م
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--staff-muted)', marginTop: 4 }}>
                    إجمالي {auditReport.totalUnitsSold} قطعة مباعة
                  </div>
                </div>

                <div className="owner-card" style={{ padding: '20px', borderTop: '4px solid #ef4444' }}>
                  <div style={{ fontSize: '0.86rem', color: 'var(--staff-muted)', fontWeight: 600 }}>القطع التالفة والخسائر</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ef4444', marginTop: 6 }}>
                    {auditReport.damagedUnitsCount} قطعة
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--staff-muted)', marginTop: 4 }}>
                    خسائر تالفة: {formatPrice(auditReport.damagedLossValue)} ج.م
                  </div>
                </div>
              </div>

              {/* المنتجات والباقات الأكثر مبيعاً */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 24 }}>
                {/* الأكثر مبيعاً: منتجات */}
                <div className="owner-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--staff-ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🏆 المنتجات الأكثر مبيعاً
                  </h3>
                  {auditReport.topSellingProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--staff-muted)', fontSize: '0.88rem' }}>
                      لا توجد مبيعات منتجات مسجلة بعد
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {auditReport.topSellingProducts.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#FAF5F8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 24, height: 24, borderRadius: '50%', background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                              {idx + 1}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</span>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <span style={{ fontWeight: 800, color: '#10b981' }}>{p.count} قطعة</span>
                            <div style={{ fontSize: '0.74rem', color: 'var(--staff-muted)' }}>({formatPrice(p.revenue)} ج.م)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* الأكثر مبيعاً: باقات */}
                <div className="owner-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--staff-ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🎁 المجموعات والباقات الأكثر طلباً
                  </h3>
                  {auditReport.topSellingBundles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--staff-muted)', fontSize: '0.88rem' }}>
                      لا توجد مبيعات باقات مسجلة بعد
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {auditReport.topSellingBundles.map((b, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#FAF5F8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#7D2E46', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                              {idx + 1}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.name}</span>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <span style={{ fontWeight: 800, color: '#7D2E46' }}>{b.count} باقات</span>
                            <div style={{ fontSize: '0.74rem', color: 'var(--staff-muted)' }}>({formatPrice(b.revenue)} ج.م)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* جدول الجرد التفصيلي */}
              <div className="owner-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--staff-border)' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--staff-ink)', margin: 0 }}>
                    📋 كشف جرد الأصناف ورأس المال المتوفر
                  </h3>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>اسم الصنف</th>
                        <th>القطع بالمخزن</th>
                        <th>سعر الشراء (التكلفة)</th>
                        <th>سعر البيع</th>
                        <th>هامش الربح / القطعة</th>
                        <th>إجمالي رأس المال بالصنف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditReport.productAnalytics.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700 }}>{p.name}</td>
                          <td>
                            <span className={`badge ${p.stock_quantity === 0 ? 'badge--danger' : p.stock_quantity <= 5 ? 'badge--warning' : 'badge--success'}`}>
                              {p.stock_quantity} قطعة
                            </span>
                          </td>
                          <td>{formatPrice(p.purchase_price)} ج.م</td>
                          <td style={{ fontWeight: 700, color: '#10b981' }}>{formatPrice(p.price)} ج.م</td>
                          <td>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                              +{formatPrice(p.profit_per_unit)} ج.م ({p.margin_pct}%)
                            </span>
                          </td>
                          <td style={{ fontWeight: 900, color: 'var(--staff-rose-dark)' }}>
                            {formatPrice(p.capital)} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL: إضافة / تعديل منتج فردي
          ════════════════════════════════════════════════════════════ */}
      {productModalOpen && (
        <div className="modal-overlay" onClick={() => setProductModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? `✏️ تعديل المنتج: ${editingProduct.name}` : '🛍️ إضافة منتج جديد للمخزن'}
              </h3>
              <button className="modal-close-btn" onClick={() => setProductModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveProduct}>
              {/* البيانات الأساسية */}
              <div className="form-group">
                <label className="form-label">اسم المنتج *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="مثال: سيروم كيراتين معالج للشعر"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">وصف المنتج ومميزاته</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="وصف مختصر لمكونات وطريقة استخدام المنتج..."
                  value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              {/* الأسعار والمخزون */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">سعر البيع (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input"
                    placeholder="350"
                    value={productForm.price}
                    onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">سعر الشراء / التكلفة (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input"
                    placeholder="200"
                    value={productForm.purchasePrice}
                    onChange={e => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الكمية بالمخزن (قطعة)</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder="15"
                    value={productForm.stockQuantity}
                    onChange={e => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                  />
                </div>
              </div>

              {/* الخصومات والعروض */}
              <div style={{ background: '#FAF5F8', border: '1px solid var(--staff-border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <label className="form-label" style={{ color: 'var(--staff-rose-dark)', fontWeight: 800 }}>
                  🏷️ الخصم والعرض الخاص بالمنتج (اختياري)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>نوع الخصم</label>
                    <select
                      className="input"
                      value={productForm.discountType}
                      onChange={e => setProductForm({ ...productForm, discountType: e.target.value })}
                    >
                      <option value="none">بدون خصم</option>
                      <option value="percentage">نسبة مئوية (%)</option>
                      <option value="fixed">مبلغ ثابت (ج.م)</option>
                    </select>
                  </div>

                  {productForm.discountType !== 'none' && (
                    <>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>قيمة الخصم</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="input"
                          placeholder={productForm.discountType === 'percentage' ? '20' : '50'}
                          value={productForm.discountValue}
                          onChange={e => setProductForm({ ...productForm, discountValue: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>تاريخ انتهاء الخصم</label>
                        <input
                          type="date"
                          className="input"
                          value={productForm.offerEndsAt}
                          onChange={e => setProductForm({ ...productForm, offerEndsAt: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* صورة المنتج */}
              <div className="form-group">
                <label className="form-label">صورة المنتج</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    style={{ fontSize: '0.85rem' }}
                  />
                  {uploadingImage && <span className="spinner spinner--sm" />}
                </div>
                {productForm.imageUrl && (
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={productForm.imageUrl}
                      alt="Preview"
                      style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--staff-border)' }}
                    />
                  </div>
                )}
              </div>

              {/* ألوان وخيارات المنتج */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    🎨 ألوان ودرجات المنتج (اختياري):
                  </label>
                  <button type="button" className="btn btn--sm btn--secondary" onClick={handleAddColorRow}>
                    ➕ إضافة درجة / لون
                  </button>
                </div>

                {productForm.colors.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', padding: 4 }}>
                    {productForm.colors.map((c, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 30px', gap: 6, alignItems: 'center' }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="اسم اللون (مثال: أحمر ياقوتي)"
                          value={c.color_name}
                          onChange={e => handleColorChange(idx, 'color_name', e.target.value)}
                        />
                        <input
                          type="color"
                          value={c.color_hex}
                          style={{ height: 36, width: '100%', cursor: 'pointer', padding: 0, borderRadius: 6, border: '1px solid #ccc' }}
                          onChange={e => handleColorChange(idx, 'color_hex', e.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          className="input"
                          placeholder="الكمية"
                          value={c.stock_quantity}
                          onChange={e => handleColorChange(idx, 'stock_quantity', parseInt(e.target.value) || 0)}
                        />
                        <button
                          type="button"
                          className="btn btn--sm btn--secondary"
                          style={{ color: '#ef4444', padding: '4px' }}
                          onClick={() => handleRemoveColorRow(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* الحالة */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="prodActiveToggle"
                  checked={productForm.isActive}
                  onChange={e => setProductForm({ ...productForm, isActive: e.target.checked })}
                />
                <label htmlFor="prodActiveToggle" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                  المنتج نشط ومتاح للطلب والبيع في الصالون والكاشير
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--secondary" onClick={() => setProductModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn--primary" disabled={savingProduct}>
                  {savingProduct ? 'جارٍ الحفظ...' : editingProduct ? '💾 حفظ التعديلات' : '➕ إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL: إضافة / تعديل باقة منتجات (Bundle)
          ════════════════════════════════════════════════════════════ */}
      {bundleModalOpen && (
        <div className="modal-overlay" onClick={() => setBundleModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBundle ? `✏️ تعديل باقة: ${editingBundle.name}` : '🎁 إنشاء باقة ومجموعة منتجات جديدة'}
              </h3>
              <button className="modal-close-btn" onClick={() => setBundleModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveBundle}>
              <div className="form-group">
                <label className="form-label">اسم الباقة *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="مثال: بكج العناية الملكي بالشعر (شامبو + بلسم + سيروم)"
                  value={bundleForm.name}
                  onChange={e => setBundleForm({ ...bundleForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">وصف الباقة</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="وصف مميزات العرض والخصم..."
                  value={bundleForm.description}
                  onChange={e => setBundleForm({ ...bundleForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">سعر الباقة للعميل (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input"
                    placeholder="750"
                    value={bundleForm.bundlePrice}
                    onChange={e => setBundleForm({ ...bundleForm, bundlePrice: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">سعر التكلفة التقديري (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input"
                    placeholder="450"
                    value={bundleForm.purchasePrice}
                    onChange={e => setBundleForm({ ...bundleForm, purchasePrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">نسبة الخصم الترويجي (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    placeholder="25"
                    value={bundleForm.discountPercentage}
                    onChange={e => setBundleForm({ ...bundleForm, discountPercentage: e.target.value })}
                  />
                </div>
              </div>

              {/* اختيار المنتجات المشمولة في الباقة */}
              <div style={{ background: '#FAF5F8', border: '1px solid var(--staff-border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <label className="form-label" style={{ color: 'var(--staff-rose-dark)', fontWeight: 800 }}>
                  📦 المنتجات المشمولة داخل الباقة:
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select
                    className="input"
                    style={{ flex: 1 }}
                    onChange={e => {
                      if (e.target.value) {
                        handleAddBundleItem(e.target.value)
                        e.target.value = ''
                      }
                    }}
                  >
                    <option value="">➕ اختر منتج لإضافته للمجموعة...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.price)} ج.م)
                      </option>
                    ))}
                  </select>
                </div>

                {bundleForm.items.length === 0 ? (
                  <div style={{ fontSize: '0.84rem', color: 'var(--staff-muted)', textAlign: 'center', padding: '10px 0' }}>
                    لم يتم اختيار منتجات للباقة بعد
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {bundleForm.items.map((it, idx) => {
                      const prodObj = products.find(p => p.id === it.product_id)
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px 12px', borderRadius: 8, border: '1px solid #eee' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {prodObj?.name || 'منتج'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--staff-muted)' }}>الكمية:</span>
                            <input
                              type="number"
                              min="1"
                              style={{ width: 55, textAlign: 'center', padding: '2px 4px', borderRadius: 6, border: '1px solid #ccc' }}
                              value={it.quantity}
                              onChange={e => handleBundleItemQtyChange(idx, parseInt(e.target.value) || 1)}
                            />
                            <button
                              type="button"
                              className="btn btn--sm btn--secondary"
                              style={{ color: '#ef4444', padding: '2px 6px' }}
                              onClick={() => handleRemoveBundleItem(idx)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--secondary" onClick={() => setBundleModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn--primary" disabled={savingBundle}>
                  {savingBundle ? 'جارٍ الحفظ...' : editingBundle ? '💾 حفظ التعديلات' : '🎁 إنشاء الباقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL: الإجراء السريع (تزويد / تالف / استرجاع)
          ════════════════════════════════════════════════════════════ */}
      {quickActionModal && (
        <div className="modal-overlay" onClick={() => setQuickActionModal(null)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {quickActionModal.type === 'restock' && '📥 تزويد كمية جديدة للمخزن'}
                {quickActionModal.type === 'damaged' && '⚠️ تسجيل منتج تالف / منتهي'}
                {quickActionModal.type === 'return' && '🔄 تسجيل استرجاع منتج للمخزن'}
              </h3>
              <button className="modal-close-btn" onClick={() => setQuickActionModal(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmitQuickAction}>
              <div style={{ background: '#FAF5F8', padding: '10px 14px', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontWeight: 800, color: 'var(--staff-ink)' }}>{quickActionModal.product.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--staff-muted)', marginTop: 2 }}>
                  الرصيد الحالي بالمخزن: {quickActionModal.product.stock_quantity ?? 0} قطعة
                </div>
              </div>

              {/* اختيار اللون إن وجد */}
              {quickActionModal.product.colors && quickActionModal.product.colors.length > 0 && (
                <div className="form-group">
                  <label className="form-label">الدرجة / اللون:</label>
                  <select
                    className="input"
                    value={quickActionForm.colorId}
                    onChange={e => setQuickActionForm({ ...quickActionForm, colorId: e.target.value })}
                  >
                    {quickActionModal.product.colors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.color_name} (المتوفر: {c.stock_quantity} قطعة)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* الكمية */}
              <div className="form-group">
                <label className="form-label">الكمية (عدد القطع) *</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={quickActionForm.quantity}
                  onChange={e => setQuickActionForm({ ...quickActionForm, quantity: e.target.value })}
                  required
                />
              </div>

              {/* في حالة التزويد: إمكانية تحديث سعر الشراء أو البيع */}
              {quickActionModal.type === 'restock' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">سعر الشراء الجديد (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="input"
                      value={quickActionForm.newPurchasePrice}
                      onChange={e => setQuickActionForm({ ...quickActionForm, newPurchasePrice: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">سعر البيع الجديد (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="input"
                      value={quickActionForm.newSellingPrice}
                      onChange={e => setQuickActionForm({ ...quickActionForm, newSellingPrice: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* في حالة التالف أو الاسترجاع: السبب والمبلغ */}
              {(quickActionModal.type === 'damaged' || quickActionModal.type === 'return') && (
                <div className="form-group">
                  <label className="form-label">السبب / الملاحظات:</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={quickActionModal.type === 'damaged' ? 'مثال: كسر في العبوة / انتهاء صلاحية' : 'مثال: خطأ في اللون المطلوب'}
                    value={quickActionForm.reason}
                    onChange={e => setQuickActionForm({ ...quickActionForm, reason: e.target.value })}
                  />
                </div>
              )}

              {quickActionModal.type === 'return' && (
                <div className="form-group">
                  <label className="form-label">مبلغ الاسترجاع للعميل (ج.م):</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input"
                    placeholder="المبلغ المسترد"
                    value={quickActionForm.refundAmount}
                    onChange={e => setQuickActionForm({ ...quickActionForm, refundAmount: e.target.value })}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn--secondary" onClick={() => setQuickActionModal(null)}>
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{
                    background: quickActionModal.type === 'restock' ? '#10b981' : quickActionModal.type === 'damaged' ? '#ef4444' : '#3b82f6'
                  }}
                  disabled={submittingQuickAction}
                >
                  {submittingQuickAction ? 'جارٍ التنفيذ...' : 'تأكيد العملية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL: تأكيد الحذف
          ════════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>⚠️ تأكيد الحذف</h3>
              <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <p style={{ margin: '14px 0', fontSize: '0.94rem', lineHeight: 1.5 }}>
              هل أنتِ متأكدة من رغبتك في حذف {deleteTarget.type === 'product' ? 'المنتج' : 'الباقة'} "<strong>{deleteTarget.name}</strong>" نهائياً؟
            </p>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setDeleteTarget(null)}>
                إلغاء
              </button>
              <button
                className="btn btn--primary"
                style={{ background: '#ef4444' }}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'جارٍ الحذف...' : '🗑️ تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
