import { useState, useEffect, useMemo } from 'react'
import {
  getWalkInServicesTree,
  getWalkInOffers,
  getWalkInBarbers,
  getWalkInProducts,
  getWalkInAddons,
  createWalkInAppointment,
} from '../services/posService'
import { useToast } from '../context/ToastContext'

export default function WalkInModal({ onClose, onSuccess }) {
  const showToast = useToast()

  // Steps: 1 = Services & Offers, 2 = Products & Buffet, 3 = Client & Staff
  const [currentStep, setCurrentStep] = useState(1)

  // Loading & Data states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categoriesTree, setCategoriesTree] = useState([])
  const [offers, setOffers] = useState([])
  const [barbers, setBarbers] = useState([])
  const [productsList, setProductsList] = useState([])
  const [addonsList, setAddonsList] = useState([])

  // Selection states
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [selectedServices, setSelectedServices] = useState({}) // { [itemId]: { ...item, quantity: 1 } }
  const [selectedProducts, setSelectedProducts] = useState({}) // { [prodId]: { ...prod, quantity: 1 } }
  const [selectedAddons, setSelectedAddons] = useState({}) // { [addonId]: { ...addon, quantity: 1 } }

  // Form states
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [notes, setNotes] = useState('')

  // UI Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState('all')
  const [productsTab, setProductsTab] = useState('products') // 'products' | 'addons'

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [tree, offersData, barbersData, prodsData, addonsData] = await Promise.all([
          getWalkInServicesTree(),
          getWalkInOffers(),
          getWalkInBarbers(),
          getWalkInProducts(),
          getWalkInAddons(),
        ])

        setCategoriesTree(tree || [])
        setOffers(offersData || [])
        setBarbers(barbersData || [])
        setProductsList(prodsData || [])
        setAddonsList(addonsData || [])

        if (barbersData && barbersData.length > 0) {
          setSelectedBarberId(barbersData[0].id)
        }
      } catch (err) {
        showToast('حدث خطأ أثناء تحميل بيانات الخدمات: ' + err.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ─── Target Map for Active Offer ───────────────────────────────────────────
  const offerTargetsMap = useMemo(() => {
    if (!selectedOffer) return { itemIds: new Set(), groupIds: new Set(), catIds: new Set() }
    const targets = selectedOffer.service_offer_targets || []
    const itemIds = new Set()
    const groupIds = new Set()
    const catIds = new Set()

    targets.forEach(t => {
      if (t.target_type === 'item') itemIds.add(t.target_id)
      if (t.target_type === 'group') groupIds.add(t.target_id)
      if (t.target_type === 'category') catIds.add(t.target_id)
    })
    return { itemIds, groupIds, catIds }
  }, [selectedOffer])

  // Helper: check if service item is covered by current offer
  function isItemCoveredByOffer(item, groupId, catId) {
    if (!selectedOffer) return false
    const { itemIds, groupIds, catIds } = offerTargetsMap
    if (itemIds.size === 0 && groupIds.size === 0 && catIds.size === 0) {
      // General offer on all services
      return true
    }
    return itemIds.has(item.id) || groupIds.has(groupId) || catIds.has(catId)
  }

  // Calculate discounted item price
  function getItemDiscountedPrice(item, groupId, catId) {
    const origPrice = item.price || 0
    if (!selectedOffer || origPrice === 0) return origPrice
    if (!isItemCoveredByOffer(item, groupId, catId)) return origPrice

    const val = Number(selectedOffer.discount_value) || 0
    const type = selectedOffer.discount_type || 'percentage'

    if (type === 'percentage') {
      return Math.max(0, origPrice - (origPrice * val / 100))
    }
    if (type === 'fixed') {
      return Math.max(0, origPrice - val)
    }
    if (type === 'fixed_package') {
      return Math.min(origPrice, val)
    }
    return origPrice
  }

  // ─── Selection Handlers ───────────────────────────────────────────────────

  function toggleService(item, groupId, catId) {
    setSelectedServices(prev => {
      const next = { ...prev }
      if (next[item.id]) {
        delete next[item.id]
      } else {
        const unitPrice = getItemDiscountedPrice(item, groupId, catId)
        next[item.id] = {
          ...item,
          groupId,
          catId,
          originalUnitPrice: item.price || 0,
          unitPrice,
          quantity: 1,
        }
      }
      return next
    })
  }

  function handleProductQuantity(prod, delta) {
    setSelectedProducts(prev => {
      const next = { ...prev }
      const curr = next[prod.id]?.quantity || 0
      const newQty = curr + delta
      if (newQty <= 0) {
        delete next[prod.id]
      } else {
        next[prod.id] = { ...prod, quantity: newQty }
      }
      return next
    })
  }

  function handleAddonQuantity(addon, delta) {
    setSelectedAddons(prev => {
      const next = { ...prev }
      const curr = next[addon.id]?.quantity || 0
      const newQty = curr + delta
      if (newQty <= 0) {
        delete next[addon.id]
      } else {
        next[addon.id] = { ...addon, quantity: newQty }
      }
      return next
    })
  }

  // Re-calculate prices and auto-select covered services when offer changes
  function handleSelectOffer(offer) {
    const isDeselecting = selectedOffer?.id === offer.id
    const newOffer = isDeselecting ? null : offer
    setSelectedOffer(newOffer)

    if (newOffer) {
      const targets = newOffer.service_offer_targets || []
      const itemIds = new Set(targets.filter(t => t.target_type === 'item').map(t => t.target_id))
      const groupIds = new Set(targets.filter(t => t.target_type === 'group').map(t => t.target_id))
      const catIds = new Set(targets.filter(t => t.target_type === 'category').map(t => t.target_id))
      const isGeneral = (itemIds.size === 0 && groupIds.size === 0 && catIds.size === 0)

      const autoSelected = {}
      let firstCatId = null

      categoriesTree.forEach(cat => {
        const catMatch = catIds.has(cat.id)
        ;(cat.groups || []).forEach(group => {
          const groupMatch = groupIds.has(group.id)
          ;(group.items || []).forEach(item => {
            const itemMatch = itemIds.has(item.id)
            const isCovered = isGeneral || catMatch || groupMatch || itemMatch

            if (!isGeneral && isCovered) {
              if (!firstCatId) firstCatId = cat.id
              let unitPrice = item.price || 0
              if (item.price > 0) {
                const val = Number(newOffer.discount_value) || 0
                const type = newOffer.discount_type || 'percentage'
                if (type === 'percentage') unitPrice = Math.max(0, item.price - (item.price * val / 100))
                else if (type === 'fixed') unitPrice = Math.max(0, item.price - val)
                else if (type === 'fixed_package') unitPrice = Math.min(item.price, val)
              }
              autoSelected[item.id] = {
                ...item,
                groupId: group.id,
                catId: cat.id,
                originalUnitPrice: item.price || 0,
                unitPrice,
                quantity: 1,
              }
            }
          })
        })
      })

      if (firstCatId) {
        setActiveCategoryId(firstCatId)
      }

      setSelectedServices(prev => {
        const next = { ...autoSelected, ...prev }
        for (const [id, item] of Object.entries(next)) {
          const isCovered = isGeneral || itemIds.has(item.id) || groupIds.has(item.groupId) || catIds.has(item.catId)
          let unitPrice = item.price || 0
          if (isCovered && item.price > 0) {
            const val = Number(newOffer.discount_value) || 0
            const type = newOffer.discount_type || 'percentage'
            if (type === 'percentage') unitPrice = Math.max(0, item.price - (item.price * val / 100))
            else if (type === 'fixed') unitPrice = Math.max(0, item.price - val)
            else if (type === 'fixed_package') unitPrice = Math.min(item.price, val)
          }
          next[id] = { ...item, unitPrice }
        }
        return next
      })

      showToast(`تم تفعيل العرض: ${newOffer.title_ar || newOffer.title}`, 'success')
    } else {
      setSelectedServices(prev => {
        const next = {}
        for (const [id, item] of Object.entries(prev)) {
          next[id] = { ...item, unitPrice: item.price || 0 }
        }
        return next
      })
      showToast('تم إلغاء تحديد العرض', 'info')
    }
  }

  // ─── Financial Calculations ───────────────────────────────────────────────
  const servicesList = Object.values(selectedServices)
  const productsSelectedList = Object.values(selectedProducts)
  const addonsSelectedList = Object.values(selectedAddons)

  const servicesOriginalTotal = servicesList.reduce((s, i) => s + (i.originalUnitPrice ?? i.price ?? 0), 0)
  const servicesDiscountedTotal = servicesList.reduce((s, i) => s + (i.unitPrice ?? i.price ?? 0), 0)

  const productsTotal = productsSelectedList.reduce((s, p) => s + (p.price || 0) * p.quantity, 0)
  const addonsTotal = addonsSelectedList.reduce((s, a) => s + (a.price || 0) * a.quantity, 0)

  const originalGrandTotal = servicesOriginalTotal + productsTotal + addonsTotal
  const finalGrandTotal = servicesDiscountedTotal + productsTotal + addonsTotal
  const totalDiscount = Math.max(0, originalGrandTotal - finalGrandTotal)

  const totalItemsCount = servicesList.length +
    productsSelectedList.reduce((s, p) => s + p.quantity, 0) +
    addonsSelectedList.reduce((s, a) => s + a.quantity, 0)

  // ─── Submit Walk-In ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (servicesList.length === 0 && productsSelectedList.length === 0 && addonsSelectedList.length === 0) {
      showToast('يرجى اختيار خدمة واحدة على الأقل أو منتج لإتمام الحجز', 'error')
      setCurrentStep(1)
      return
    }

    if (!customerName.trim()) {
      showToast('يرجى إدخال اسم العميل', 'error')
      setCurrentStep(3)
      return
    }

    setSubmitting(true)
    try {
      const result = await createWalkInAppointment({
        customerName,
        customerPhone,
        barberId: selectedBarberId || null,
        selectedServices: servicesList,
        selectedProducts: productsSelectedList,
        selectedAddons: addonsSelectedList,
        selectedOffer,
        originalPrice: originalGrandTotal,
        discountAmount: totalDiscount,
        finalPrice: finalGrandTotal,
        notes,
      })

      showToast(`تم تسجيل موعد مباشر بنجاح! كود الموعد #${result.appointmentCode} 🎉`, 'success')
      if (onSuccess) {
        onSuccess(result.appointmentCode)
      }
      onClose()
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء حفظ الموعد', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter Categories & Items
  const filteredCategories = useMemo(() => {
    return categoriesTree.map(cat => {
      const groups = (cat.groups || []).map(group => {
        const items = (group.items || []).filter(item => {
          if (activeCategoryId !== 'all' && cat.id !== activeCategoryId) return false
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            const matchName = (item.name_ar || '').toLowerCase().includes(q)
            const matchNote = (item.note_ar || '').toLowerCase().includes(q)
            return matchName || matchNote
          }
          return true
        })
        return { ...group, items }
      }).filter(g => g.items.length > 0)
      return { ...cat, groups }
    }).filter(c => c.groups.length > 0)
  }, [categoriesTree, activeCategoryId, searchQuery])

  return (
    <div className="walkin-overlay">
      <div className="walkin-modal">
        {/* Modal Header */}
        <div className="walkin-modal__header">
          <div className="walkin-modal__header-info">
            <span className="walkin-modal__badge">Walk-in ✂️</span>
            <h2>تسجيل موعد مباشر في الصالون</h2>
            <p>اختيار الخدمات والعروض وتحديد الموظف والانتقال الفوري للمحاسبة</p>
          </div>
          <button className="walkin-modal__close-btn" onClick={onClose} title="إغلاق">
            ✕
          </button>
        </div>

        {/* Wizard Steps Navigation */}
        <div className="walkin-steps">
          <button
            className={`walkin-step ${currentStep === 1 ? 'walkin-step--active' : ''} ${servicesList.length > 0 ? 'walkin-step--done' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className="walkin-step__num">1</span>
            <span className="walkin-step__label">الخدمات والعروض ({servicesList.length})</span>
          </button>

          <button
            className={`walkin-step ${currentStep === 2 ? 'walkin-step--active' : ''} ${(productsSelectedList.length + addonsSelectedList.length) > 0 ? 'walkin-step--done' : ''}`}
            onClick={() => setCurrentStep(2)}
          >
            <span className="walkin-step__num">2</span>
            <span className="walkin-step__label">المنتجات والبوفيه ({productsSelectedList.length + addonsSelectedList.length})</span>
          </button>

          <button
            className={`walkin-step ${currentStep === 3 ? 'walkin-step--active' : ''} ${customerName.trim() ? 'walkin-step--done' : ''}`}
            onClick={() => setCurrentStep(3)}
          >
            <span className="walkin-step__num">3</span>
            <span className="walkin-step__label">بيانات العميل والموظف</span>
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="loading-center" style={{ minHeight: '350px' }}>
            <span className="spinner spinner--lg" />
            <span>جارٍ تحميل قائمة الخدمات والعروض والمنتجات...</span>
          </div>
        ) : (
          <div className="walkin-modal__body">
            {/* ══════════ STEP 1: SERVICES & OFFERS ══════════ */}
            {currentStep === 1 && (
              <div className="walkin-step-content">
                {/* Active Offers Section */}
                {offers.length > 0 && (
                  <div className="walkin-offers-section">
                    <div className="walkin-section-title">
                      <span>🏷️ العروض والخصومات النشطة</span>
                      <small>(اضغطي على العرض لتطبيقه على الخدمات المختارة)</small>
                    </div>
                    <div className="walkin-offers-grid">
                      {offers.map(offer => {
                        const isSelected = selectedOffer?.id === offer.id
                        return (
                          <div
                            key={offer.id}
                            className={`walkin-offer-card ${isSelected ? 'walkin-offer-card--selected' : ''}`}
                            onClick={() => handleSelectOffer(offer)}
                          >
                            <div className="walkin-offer-card__header">
                              <span className="walkin-offer-card__title">{offer.title_ar || offer.title}</span>
                              <span className="walkin-offer-card__badge">
                                {offer.discount_type === 'percentage' && `خصم ${offer.discount_value}%`}
                                {offer.discount_type === 'fixed' && `خصم ${offer.discount_value} ج`}
                                {offer.discount_type === 'fixed_package' && `سعر ${offer.discount_value} ج`}
                              </span>
                            </div>
                            {offer.description_ar && (
                              <p className="walkin-offer-card__desc">{offer.description_ar}</p>
                            )}
                            <div className="walkin-offer-card__status">
                              {isSelected ? '✓ تم تفعيل العرض' : '+ اختيار العرض'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Filter and Search Bar */}
                <div className="walkin-filter-bar">
                  <div className="walkin-search">
                    <input
                      type="text"
                      className="input"
                      placeholder="ابحثي عن خدمة بالاسم أو التفاصيل..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="walkin-search__clear" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                  </div>

                  <div className="walkin-category-chips">
                    <button
                      className={`walkin-chip ${activeCategoryId === 'all' ? 'walkin-chip--active' : ''}`}
                      onClick={() => setActiveCategoryId('all')}
                    >
                      الكل
                    </button>
                    {categoriesTree.map(cat => (
                      <button
                        key={cat.id}
                        className={`walkin-chip ${activeCategoryId === cat.id ? 'walkin-chip--active' : ''}`}
                        onClick={() => setActiveCategoryId(cat.id)}
                      >
                        {cat.name_ar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Services Tree List */}
                <div className="walkin-services-container">
                  {filteredCategories.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state__icon">🔍</div>
                      <div className="empty-state__text">لا توجد خدمات مطابقة لبحثك</div>
                    </div>
                  ) : (
                    filteredCategories.map(cat => (
                      <div key={cat.id} className="walkin-cat-block">
                        <h3 className="walkin-cat-title">✨ {cat.name_ar}</h3>
                        {cat.groups.map(group => (
                          <div key={group.id} className="walkin-group-block">
                            <div className="walkin-group-title">{group.name_ar}</div>
                            <div className="walkin-items-grid">
                              {group.items.map(item => {
                                const isSelected = Boolean(selectedServices[item.id])
                                const isCovered = isItemCoveredByOffer(item, group.id, cat.id)
                                const discountedPrice = getItemDiscountedPrice(item, group.id, cat.id)
                                const hasDiscount = isCovered && (item.price || 0) > discountedPrice

                                return (
                                  <div
                                    key={item.id}
                                    className={`walkin-service-card ${isSelected ? 'walkin-service-card--selected' : ''}`}
                                    onClick={() => toggleService(item, group.id, cat.id)}
                                  >
                                    <div className="walkin-service-card__top">
                                      <span className="walkin-service-card__name">{item.name_ar}</span>
                                      <div className="walkin-service-card__checkbox">
                                        {isSelected ? '✓' : '+'}
                                      </div>
                                    </div>

                                    {item.note_ar && (
                                      <div className="walkin-service-card__note">{item.note_ar}</div>
                                    )}

                                    <div className="walkin-service-card__footer">
                                      <div className="walkin-service-card__price">
                                        {(item.price === null || item.price === 0) ? (
                                          <span className="walkin-price-variable">تحديد السعر بالصالون</span>
                                        ) : hasDiscount ? (
                                          <div className="walkin-price-discounted">
                                            <span className="walkin-price-old">{item.price} ج</span>
                                            <span className="walkin-price-new">{discountedPrice} ج</span>
                                          </div>
                                        ) : (
                                          <span className="walkin-price-normal">{item.price} جنيه</span>
                                        )}
                                      </div>

                                      {item.duration_minutes ? (
                                        <span className="walkin-service-card__duration">
                                          ⏱ {item.duration_minutes} د
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ══════════ STEP 2: PRODUCTS & BUFFET ══════════ */}
            {currentStep === 2 && (
              <div className="walkin-step-content">
                <div className="walkin-tabs-segmented">
                  <button
                    className={`walkin-tab-btn ${productsTab === 'products' ? 'walkin-tab-btn--active' : ''}`}
                    onClick={() => setProductsTab('products')}
                  >
                    🛍️ منتجات العناية بالصالون ({productsList.length})
                  </button>
                  <button
                    className={`walkin-tab-btn ${productsTab === 'addons' ? 'walkin-tab-btn--active' : ''}`}
                    onClick={() => setProductsTab('addons')}
                  >
                    ☕ بوفيه ومشروبات وضيافة ({addonsList.length})
                  </button>
                </div>

                {productsTab === 'products' ? (
                  <div className="walkin-products-grid">
                    {productsList.length === 0 ? (
                      <div className="empty-state" style={{ padding: '30px' }}>
                        <div className="empty-state__text">لا توجد منتجات مسجلة في المتجر حالياً</div>
                      </div>
                    ) : (
                      productsList.map(prod => {
                        const qty = selectedProducts[prod.id]?.quantity || 0
                        return (
                          <div key={prod.id} className={`walkin-prod-card ${qty > 0 ? 'walkin-prod-card--selected' : ''}`}>
                            <div className="walkin-prod-card__info">
                              <span className="walkin-prod-card__name">{prod.name || prod.title}</span>
                              <span className="walkin-prod-card__price">{prod.price || 0} جنيه</span>
                              {prod.description && (
                                <p className="walkin-prod-card__desc">{prod.description}</p>
                              )}
                            </div>
                            <div className="walkin-counter">
                              <button
                                className="walkin-counter__btn"
                                onClick={() => handleProductQuantity(prod, -1)}
                                disabled={qty === 0}
                              >
                                -
                              </button>
                              <span className="walkin-counter__val">{qty}</span>
                              <button
                                className="walkin-counter__btn"
                                onClick={() => handleProductQuantity(prod, 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : (
                  <div className="walkin-products-grid">
                    {addonsList.length === 0 ? (
                      <div className="empty-state" style={{ padding: '30px' }}>
                        <div className="empty-state__text">لا توجد عناصر بوفيه أو إضافات مسجلة</div>
                      </div>
                    ) : (
                      addonsList.map(addon => {
                        const qty = selectedAddons[addon.id]?.quantity || 0
                        return (
                          <div key={addon.id} className={`walkin-prod-card ${qty > 0 ? 'walkin-prod-card--selected' : ''}`}>
                            <div className="walkin-prod-card__info">
                              <span className="walkin-prod-card__name">{addon.arabic_name || addon.name}</span>
                              <span className="walkin-prod-card__price">{addon.price || 0} جنيه</span>
                              {addon.description && (
                                <p className="walkin-prod-card__desc">{addon.description}</p>
                              )}
                            </div>
                            <div className="walkin-counter">
                              <button
                                className="walkin-counter__btn"
                                onClick={() => handleAddonQuantity(addon, -1)}
                                disabled={qty === 0}
                              >
                                -
                              </button>
                              <span className="walkin-counter__val">{qty}</span>
                              <button
                                className="walkin-counter__btn"
                                onClick={() => handleAddonQuantity(addon, 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ STEP 3: CUSTOMER & STAFF ══════════ */}
            {currentStep === 3 && (
              <div className="walkin-step-content">
                <div className="walkin-form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      اسم العميل <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="أدخل اسم العميل / العميلة..."
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم الهاتف (اختياري)</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="01xxxxxxxxx"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label">المتخصص / الموظف المُنفذ للخدمة</label>
                  <div className="walkin-barbers-grid">
                    {barbers.map(b => {
                      const isSelected = selectedBarberId === b.id
                      return (
                        <div
                          key={b.id}
                          className={`walkin-barber-card ${isSelected ? 'walkin-barber-card--selected' : ''}`}
                          onClick={() => setSelectedBarberId(b.id)}
                        >
                          <div className="walkin-barber-avatar">
                            {b.avatar_url ? (
                              <img src={b.avatar_url} alt={b.name} />
                            ) : (
                              <span>✂️</span>
                            )}
                          </div>
                          <div className="walkin-barber-info">
                            <span className="walkin-barber-name">{b.name}</span>
                            <span className="walkin-barber-role">{b.role || 'أخصائي صالون'}</span>
                          </div>
                          <div className="walkin-barber-check">
                            {isSelected ? '✓' : ''}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label">ملاحظات الكاشير (اختياري)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="أي ملاحظات خاصة بالموعد أو الخدمات..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer / Sticky Summary Bar */}
        <div className="walkin-modal__footer">
          <div className="walkin-summary">
            <div className="walkin-summary__items-pill">
              <span>العناصر: {totalItemsCount}</span>
            </div>

            <div className="walkin-summary__prices">
              {totalDiscount > 0 && (
                <div className="walkin-summary__discount">
                  <span>خصم العرض:</span>
                  <strong>-{totalDiscount} ج</strong>
                </div>
              )}
              <div className="walkin-summary__total">
                <span>الإجمالي:</span>
                <strong>{finalGrandTotal} جنيه</strong>
              </div>
            </div>
          </div>

          <div className="walkin-actions">
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={submitting}
              >
                ← السابق
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setCurrentStep(prev => prev + 1)}
              >
                التالي ({currentStep === 1 ? 'المنتجات' : 'بيانات العميل'}) ➔
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary walkin-btn--submit"
                onClick={handleSubmit}
                disabled={submitting || (!customerName.trim() && totalItemsCount === 0)}
              >
                {submitting ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    <span>جارٍ إنشاء الموعد...</span>
                  </>
                ) : (
                  <span>إنشاء الموعد والمحاسبة ➔</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
