import { useState, useEffect, useRef } from 'react'
import {
  getAllOffers,
  getOfferSelectionData,
  createOffer,
  updateOffer,
  updateOfferStatusAndDuration,
  deleteOffer,
  uploadOfferImage,
} from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'

function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function isExpired(offer) {
  if (!offer.valid_until) return false
  return new Date(offer.valid_until) < new Date()
}

function discountLabel(offer) {
  const val = offer.discount_value || 0
  const type = offer.discount_type || 'percentage'
  if (type === 'fixed_package') return `سعر شامل ${Math.round(val)} جنيه`
  if (type === 'fixed') return `خصم ${Math.round(val)} جنيه`
  return `خصم ${Math.round(val)}%`
}

const EMPTY_FORM = {
  title_ar: '',
  description_ar: '',
  image_url: '',
  discount_type: 'percentage',
  discount_value: '',
  start_date: '',
  valid_until: '',
  sort_order: '0',
}

function OfferFormModal({ offer, selectionData, onSave, onClose, saving }) {
  const fileInputRef = useRef(null)
  const [localFile, setLocalFile] = useState(null)
  const [localPreview, setLocalPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    services: true,
    products: true,
    bundles: false,
  })
  const [openCats, setOpenCats] = useState({})
  const [openGroups, setOpenGroups] = useState({})
  const [customDiscountDialog, setCustomDiscountDialog] = useState(null)

  const [form, setForm] = useState(() => {
    if (!offer) return EMPTY_FORM
    const toInput = (iso) => (iso ? new Date(iso).toISOString().split('T')[0] : '')
    return {
      title_ar: offer.title_ar || '',
      description_ar: offer.description_ar || '',
      image_url: offer.image_url || '',
      discount_type: offer.discount_type || 'percentage',
      discount_value: offer.discount_value != null ? String(offer.discount_value) : '',
      start_date: toInput(offer.start_date),
      valid_until: toInput(offer.valid_until),
      sort_order: String(offer.sort_order ?? 0),
    }
  })

  // Map of targets: key = `${target_type}:${target_id}` => { target_type, target_id, discount_type, discount_value }
  const [customTargets, setCustomTargets] = useState(() => {
    const map = {}
    if (offer && Array.isArray(offer.service_offer_targets)) {
      for (const t of offer.service_offer_targets) {
        map[`${t.target_type}:${t.target_id}`] = { ...t }
      }
    }
    return map
  })

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  function set(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalFile(file)
    setLocalPreview(URL.createObjectURL(file))
    set('image_url', '')
  }

  function clearImage() {
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalFile(null)
    setLocalPreview(null)
    set('image_url', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleTarget(targetType, targetId) {
    const key = `${targetType}:${targetId}`
    setCustomTargets((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = { target_type: targetType, target_id: targetId, discount_type: null, discount_value: null }
      }
      return next
    })
  }

  function toggleSelectAllInGroup(grp) {
    const items = grp.items || []
    if (items.length === 0) return
    const allSelected = items.every((it) => !!customTargets[`item:${it.id}`])
    setCustomTargets((prev) => {
      const next = { ...prev }
      items.forEach((it) => {
        const k = `item:${it.id}`
        if (allSelected) {
          delete next[k]
        } else {
          next[k] = { target_type: 'item', target_id: it.id, discount_type: null, discount_value: null }
        }
      })
      return next
    })
  }

  function toggleSelectAllInCategory(cat) {
    const allItems = []
    ;(cat.groups || []).forEach((g) => {
      ;(g.items || []).forEach((it) => allItems.push(it))
    })
    if (allItems.length === 0) {
      toggleTarget('category', cat.id)
      return
    }
    const allSelected = allItems.every((it) => !!customTargets[`item:${it.id}`])
    setCustomTargets((prev) => {
      const next = { ...prev }
      allItems.forEach((it) => {
        const k = `item:${it.id}`
        if (allSelected) {
          delete next[k]
        } else {
          next[k] = { target_type: 'item', target_id: it.id, discount_type: null, discount_value: null }
        }
      })
      return next
    })
  }

  function expandAll() {
    const cats = {}
    const grps = {}
    tree.forEach((c) => {
      cats[c.id] = true
      ;(c.groups || []).forEach((g) => {
        grps[g.id] = true
      })
    })
    setOpenCats(cats)
    setOpenGroups(grps)
    setExpandedSections({ services: true, products: true, bundles: true })
  }

  function collapseAll() {
    setOpenCats({})
    setOpenGroups({})
  }

  function saveCustomDiscount(targetKey, discountType, discountValue) {
    setCustomTargets((prev) => {
      const current = prev[targetKey]
      if (!current) return prev
      const val = discountValue !== '' && Number(discountValue) > 0 ? Number(discountValue) : null
      return {
        ...prev,
        [targetKey]: {
          ...current,
          discount_type: val ? discountType : null,
          discount_value: val,
        },
      }
    })
    setCustomDiscountDialog(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const targetsArray = Object.values(customTargets)

    let finalImageUrl = form.image_url
    if (localFile) {
      setUploading(true)
      try {
        finalImageUrl = await uploadOfferImage(localFile)
      } finally {
        setUploading(false)
      }
    }

    await onSave({
      ...form,
      image_url: finalImageUrl,
      discount_value: form.discount_value !== '' ? Number(form.discount_value) : 0,
      sort_order: Number(form.sort_order) || 0,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      targets: targetsArray,
    })
  }

  const isBusy = saving || uploading
  const displayImage = localPreview || form.image_url
  const { tree = [], products = [], bundles = [] } = selectionData || {}

  // Filtered lists based on search
  const q = searchTerm.trim().toLowerCase()

  const filteredProducts = products.filter((p) => !q || (p.name && p.name.toLowerCase().includes(q)))
  const filteredBundles = bundles.filter((b) => !q || (b.name && b.name.toLowerCase().includes(q)))

  const filteredTree = tree
    .map((cat) => {
      const catMatches = !q || (cat.name_ar && cat.name_ar.toLowerCase().includes(q))
      const matchedGroups = (cat.groups || [])
        .map((grp) => {
          const grpMatches = !q || (grp.name_ar && grp.name_ar.toLowerCase().includes(q))
          const matchedItems = (grp.items || []).filter(
            (item) => !q || catMatches || grpMatches || (item.name_ar && item.name_ar.toLowerCase().includes(q))
          )
          if (grpMatches || matchedItems.length > 0 || catMatches) {
            return { ...grp, items: matchedItems }
          }
          return null
        })
        .filter(Boolean)

      if (catMatches || matchedGroups.length > 0) {
        return { ...cat, groups: matchedGroups }
      }
      return null
    })
    .filter(Boolean)

  const selectedCount = Object.keys(customTargets).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{
          maxWidth: '860px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '20px 24px 16px', margin: 0, borderBottom: '1px solid var(--mkt-border)' }}>
          <h2 className="modal-title">{offer ? '✏️ تعديل العرض الترويجي' : '🏷️ إضافة عرض ترويجي جديد'}</h2>
          <button className="modal-close-btn" onClick={onClose} disabled={isBusy}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. البيانات الأساسية */}
            <div style={{ background: '#FAF5F8', padding: '16px', borderRadius: '12px', border: '1px solid var(--mkt-border)' }}>
              <div style={{ fontWeight: '800', color: 'var(--mkt-ink)', marginBottom: '12px', fontSize: '15px' }}>
                1. البيانات الأساسية للعرض وصورته
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">
                  عنوان العرض (عربي) <span style={{ color: 'var(--mkt-danger)' }}>*</span>
                </label>
                <input
                  className="input"
                  type="text"
                  value={form.title_ar}
                  onChange={(e) => set('title_ar', e.target.value)}
                  placeholder="مثال: باقة العناية الشاملة الملكية أو خصم على منتجات الشعر"
                  required
                  disabled={isBusy}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">وصف العرض وتفاصيله</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description_ar}
                  onChange={(e) => set('description_ar', e.target.value)}
                  placeholder="تفاصيل العرض والمميزات والشروط إن وجدت..."
                  disabled={isBusy}
                />
              </div>

              <div className="form-group">
                <label className="form-label">صورة العرض</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isBusy}
                />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="mkt-btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                  >
                    📁 اختيار صورة من الجهاز
                  </button>
                  {displayImage && (
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={clearImage}
                      disabled={isBusy}
                    >
                      إزالة الصورة
                    </button>
                  )}
                </div>

                {displayImage && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img
                      src={displayImage}
                      alt="معاينة"
                      style={{
                        maxHeight: '130px',
                        maxWidth: '100%',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid var(--mkt-border)',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 2. نوع وقيمة الخصم العام */}
            <div style={{ background: '#FAF5F8', padding: '16px', borderRadius: '12px', border: '1px solid var(--mkt-border)' }}>
              <div style={{ fontWeight: '800', color: 'var(--mkt-ink)', marginBottom: '4px', fontSize: '15px' }}>
                2. نوع وقيمة الخصم العام
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--mkt-muted)', margin: '0 0 12px' }}>
                يتم تطبيق هذا الخصم على أي منتج أو خدمة مستهدفة لم يُحدد لها خصم مخصص.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">نوع العرض / الخصم</label>
                  <select
                    className="input"
                    value={form.discount_type}
                    onChange={(e) => set('discount_type', e.target.value)}
                    disabled={isBusy}
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">خصم مبلغ ثابت (جنيه)</option>
                    <option value="fixed_package">سعر شامل ثابت للباقة (جنيه)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {form.discount_type === 'fixed_package' ? 'السعر الشامل للباقة *' : 'قيمة الخصم العام *'}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={form.discount_value}
                    onChange={(e) => set('discount_value', e.target.value)}
                    placeholder={form.discount_type === 'percentage' ? 'مثال: 20' : 'مثال: 150'}
                    required
                    disabled={isBusy}
                  />
                </div>
              </div>

              {form.discount_type === 'fixed_package' && (
                <div style={{ marginTop: '10px', background: '#F5E6EC', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--mkt-primary)', fontWeight: 'bold' }}>
                  ℹ️ عند اختيار باقة بسعر شامل، ستباع جميع الخدمات والمنتجات المختارة أدناه معاً بهذا السعر الثابت.
                </div>
              )}
            </div>

            {/* 3. فترة الصلاحية والترتيب */}
            <div style={{ background: '#FAF5F8', padding: '16px', borderRadius: '12px', border: '1px solid var(--mkt-border)' }}>
              <div style={{ fontWeight: '800', color: 'var(--mkt-ink)', marginBottom: '12px', fontSize: '15px' }}>
                3. فترة الصلاحية والترتيب
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">تاريخ البدء (اختياري)</label>
                  <input
                    className="input"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => set('start_date', e.target.value)}
                    disabled={isBusy}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ الانتهاء (اختياري)</label>
                  <input
                    className="input"
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => set('valid_until', e.target.value)}
                    disabled={isBusy}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الترتيب في التطبيق</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={(e) => set('sort_order', e.target.value)}
                    placeholder="0"
                    disabled={isBusy}
                  />
                </div>
              </div>
            </div>

            {/* 4. المنتجات والخدمات المستهدفة بالعرض */}
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1.5px solid var(--mkt-border)', boxShadow: '0 2px 8px rgba(142, 58, 89, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <div style={{ fontWeight: '800', color: 'var(--mkt-ink)', fontSize: '15.5px' }}>
                  4. المنتجات والخدمات المستهدفة بالعرض
                </div>
                <div style={{ background: selectedCount > 0 ? 'var(--mkt-primary)' : '#eee', color: selectedCount > 0 ? '#fff' : '#666', padding: '4px 12px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 'bold' }}>
                  {selectedCount > 0 ? `✨ تم تحديد ${selectedCount} عنصر` : 'لم يتم تحديد أي عنصر بعد'}
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--mkt-muted)', margin: '0 0 14px' }}>
                حددي المنتجات أو الخدمات المشمولة بالعرض. يمكنك الضغط على أيقونة القلم ✏️ لتحديد خصم مخصص لأي منتج أو خدمة بعينها.
              </p>

              {/* شريط البحث السريع والتحكم */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                  <input
                    type="text"
                    className="input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 ابحث في الخدمات، الأقسام، أو المنتجات..."
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--mkt-muted)',
                        fontWeight: 'bold',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="mkt-btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '12px' }}
                    onClick={expandAll}
                  >
                    توسيع الكل ▾
                  </button>
                  <button
                    type="button"
                    className="mkt-btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '12px' }}
                    onClick={collapseAll}
                  >
                    طي الكل ▴
                  </button>
                </div>
              </div>

              <div className="offer-target-tree-container">
                {/* ── أ) قسم الخدمات والأقسام ── */}
                <div style={{ border: '1px solid var(--mkt-border)', borderRadius: '12px', marginBottom: '14px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedSections((prev) => ({ ...prev, services: !prev.services }))}
                    style={{
                      background: 'linear-gradient(135deg, #FAF3F7 0%, #F5E8F0 100%)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      borderBottom: expandedSections.services ? '1px solid var(--mkt-border)' : 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✂️ أقسام وخدمات الصالون</span>
                      <span style={{ fontSize: '12px', background: '#fff', padding: '2px 8px', borderRadius: '12px', color: 'var(--mkt-primary)', fontWeight: '700' }}>
                        {filteredTree.length} قسم
                      </span>
                    </span>
                    <span>{expandedSections.services ? '▲' : '▼'}</span>
                  </div>

                  {expandedSections.services && (
                    <div style={{ padding: '12px' }}>
                      {filteredTree.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--mkt-muted)', fontSize: '13px' }}>
                          {searchTerm ? 'لا توجد خدمات مطابقة لبحثك' : 'لا توجد أقسام خدمات مسجلة'}
                        </div>
                      ) : (
                        filteredTree.map((cat) => {
                          const catKey = `category:${cat.id}`
                          const isCatSelected = !!customTargets[catKey]
                          const isCatOpen = q ? true : !!openCats[cat.id]

                          const totalCatItems = (cat.groups || []).reduce((acc, g) => acc + (g.items?.length || 0), 0)
                          const selectedInCat = (cat.groups || []).reduce(
                            (acc, g) => acc + (g.items || []).filter((it) => !!customTargets[`item:${it.id}`]).length,
                            0
                          )

                          return (
                            <div key={cat.id} className="offer-target-category-card">
                              <div className="offer-target-category-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={isCatSelected}
                                      onChange={() => toggleTarget('category', cat.id)}
                                      style={{ width: '16px', height: '16px', accentColor: 'var(--mkt-primary)' }}
                                    />
                                    <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--mkt-ink)' }}>
                                      {cat.name_ar}
                                    </span>
                                  </label>

                                  <span style={{ fontSize: '11.5px', color: 'var(--mkt-muted)', background: '#fff', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--mkt-border)' }}>
                                    {cat.groups?.length || 0} مجموعات · {totalCatItems} خدمة
                                  </span>

                                  {selectedInCat > 0 && (
                                    <span style={{ fontSize: '11px', background: 'var(--mkt-primary)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                      تم تحديد {selectedInCat} خدمة
                                    </span>
                                  )}

                                  {isCatSelected && (
                                    <span style={{ fontSize: '11px', background: 'var(--mkt-success)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                      القسم بالكامل محدد
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectAllInCategory(cat)}
                                    style={{
                                      background: 'none',
                                      border: '1px solid var(--mkt-border)',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      color: 'var(--mkt-primary)',
                                      fontWeight: '600',
                                    }}
                                  >
                                    {selectedInCat === totalCatItems && totalCatItems > 0 ? 'إلغاء تحديد القسم' : 'تحديد كل خدمات القسم'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setOpenCats((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                    style={{
                                      background: '#fff',
                                      border: '1px solid var(--mkt-border)',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      cursor: 'pointer',
                                      fontSize: '11.5px',
                                      fontWeight: '700',
                                      color: 'var(--mkt-ink)',
                                    }}
                                  >
                                    {isCatOpen ? 'إخفاء ▲' : `عرض الخدمات (${totalCatItems}) ▼`}
                                  </button>
                                </div>
                              </div>

                              {isCatOpen && (
                                <div style={{ padding: '8px 12px', background: '#fff' }}>
                                  {(cat.groups || []).map((grp) => {
                                    const grpKey = `group:${grp.id}`
                                    const isGrpSelected = !!customTargets[grpKey]
                                    const isGrpOpen = q ? true : (openGroups[grp.id] ?? true)

                                    const grpItemCount = grp.items?.length || 0
                                    const selectedInGrp = (grp.items || []).filter((it) => !!customTargets[`item:${it.id}`]).length

                                    return (
                                      <div key={grp.id} className="offer-target-group-card">
                                        <div className="offer-target-group-header">
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                                              <input
                                                type="checkbox"
                                                checked={isGrpSelected}
                                                onChange={() => toggleTarget('group', grp.id)}
                                                style={{ width: '15px', height: '15px', accentColor: 'var(--mkt-primary)' }}
                                              />
                                              <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--mkt-ink)' }}>
                                                مجموعة: {grp.name_ar}
                                              </span>
                                            </label>

                                            <span style={{ fontSize: '11px', color: 'var(--mkt-muted)' }}>
                                              ({grpItemCount} خدمة)
                                            </span>

                                            {selectedInGrp > 0 && (
                                              <span style={{ fontSize: '10.5px', background: 'var(--mkt-primary-light)', color: 'var(--mkt-primary)', padding: '1px 7px', borderRadius: '10px', fontWeight: 'bold', border: '1px solid var(--mkt-border)' }}>
                                                {selectedInGrp} من {grpItemCount} محددة
                                              </span>
                                            )}
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                              type="button"
                                              onClick={() => toggleSelectAllInGroup(grp)}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                color: 'var(--mkt-primary)',
                                                fontWeight: '600',
                                              }}
                                            >
                                              {selectedInGrp === grpItemCount && grpItemCount > 0 ? 'إلغاء الكل' : 'تحديد الكل'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setOpenGroups((prev) => ({ ...prev, [grp.id]: !isGrpOpen }))}
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--mkt-muted)', padding: '2px 6px' }}
                                            >
                                              {isGrpOpen ? '▲' : '▼'}
                                            </button>
                                          </div>
                                        </div>

                                        {isGrpOpen && (
                                          <div className="offer-target-items-grid">
                                            {(grp.items || []).map((item) => {
                                              const itemKey = `item:${item.id}`
                                              const isItemSelected = !!customTargets[itemKey]
                                              const itemCustom = customTargets[itemKey]
                                              const hasCustom = itemCustom && itemCustom.discount_value > 0

                                              return (
                                                <div
                                                  key={item.id}
                                                  className={`offer-target-item-card ${isItemSelected ? 'offer-target-item-card--selected' : ''}`}
                                                >
                                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, margin: 0, minWidth: 0 }}>
                                                    <input
                                                      type="checkbox"
                                                      checked={isItemSelected}
                                                      onChange={() => toggleTarget('item', item.id)}
                                                      style={{ width: '15px', height: '15px', accentColor: 'var(--mkt-primary)', flexShrink: 0 }}
                                                    />
                                                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--mkt-ink)', wordBreak: 'break-word' }}>
                                                        {item.name_ar}
                                                      </span>
                                                      <span style={{ fontSize: '11.5px', color: 'var(--mkt-muted)', marginTop: '2px' }}>
                                                        {(Number(item.price) || Number(item.min_price) || 0) > 0 ? (
                                                          <>السعر: <strong style={{ color: 'var(--mkt-primary-dark)' }}>{item.price || item.min_price} ج</strong></>
                                                        ) : (
                                                          <span style={{ color: 'var(--mkt-warning, #C2671A)', fontWeight: '600' }}>يتم تحديدها بواسطة الصالون</span>
                                                        )}
                                                      </span>
                                                    </div>
                                                  </label>

                                                  {isItemSelected && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                      <span
                                                        style={{
                                                          fontSize: '10.5px',
                                                          padding: '2px 6px',
                                                          borderRadius: '6px',
                                                          background: hasCustom ? 'var(--mkt-primary)' : '#FAF5F8',
                                                          color: hasCustom ? '#fff' : 'var(--mkt-muted)',
                                                          fontWeight: hasCustom ? 'bold' : 'normal',
                                                          border: hasCustom ? 'none' : '1px solid var(--mkt-border)',
                                                        }}
                                                      >
                                                        {hasCustom ? `${itemCustom.discount_value} ${itemCustom.discount_type === 'fixed' ? 'ج' : '%'}` : 'عام'}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        className="btn btn--sm btn--secondary"
                                                        style={{ padding: '2px 6px', fontSize: '10px' }}
                                                        title="تخصيص الخصم لهذه الخدمة"
                                                        onClick={() => setCustomDiscountDialog({ key: itemKey, name: item.name_ar, current: itemCustom })}
                                                      >
                                                        ✏️
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* ── ب) قسم المنتجات ── */}
                <div style={{ border: '1px solid var(--mkt-border)', borderRadius: '12px', marginBottom: '14px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedSections((prev) => ({ ...prev, products: !prev.products }))}
                    style={{
                      background: 'linear-gradient(135deg, #FAF3F7 0%, #F5E8F0 100%)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      borderBottom: expandedSections.products ? '1px solid var(--mkt-border)' : 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🛍️ منتجات الصالون</span>
                      <span style={{ fontSize: '12px', background: '#fff', padding: '2px 8px', borderRadius: '12px', color: 'var(--mkt-primary)', fontWeight: '700' }}>
                        {filteredProducts.length} منتج
                      </span>
                    </span>
                    <span>{expandedSections.products ? '▲' : '▼'}</span>
                  </div>

                  {expandedSections.products && (
                    <div style={{ padding: '12px' }}>
                      {filteredProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--mkt-muted)', fontSize: '13px' }}>
                          {searchTerm ? 'لا توجد منتجات مطابقة لبحثك' : 'لا توجد منتجات مسجلة'}
                        </div>
                      ) : (
                        <div className="offer-target-items-grid">
                          {filteredProducts.map((p) => {
                            const key = `product:${p.id}`
                            const isSelected = !!customTargets[key]
                            const custom = customTargets[key]
                            const hasCustom = custom && custom.discount_value > 0

                            return (
                              <div
                                key={p.id}
                                className={`offer-target-item-card ${isSelected ? 'offer-target-item-card--selected' : ''}`}
                              >
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, margin: 0, minWidth: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleTarget('product', p.id)}
                                    style={{ width: '15px', height: '15px', accentColor: 'var(--mkt-primary)', flexShrink: 0 }}
                                  />
                                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--mkt-ink)', wordBreak: 'break-word' }}>
                                      {p.name}
                                    </span>
                                    {p.price != null && (
                                      <span style={{ fontSize: '11.5px', color: 'var(--mkt-muted)', marginTop: '2px' }}>
                                        {Number(p.price) > 0 ? (
                                          <>السعر: <strong style={{ color: 'var(--mkt-primary-dark)' }}>{p.price} ج</strong></>
                                        ) : (
                                          <span style={{ color: 'var(--mkt-warning, #C2671A)', fontWeight: '600' }}>يتم تحديدها بواسطة الصالون</span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </label>

                                {isSelected && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        background: hasCustom ? 'var(--mkt-primary)' : '#FAF5F8',
                                        color: hasCustom ? '#fff' : 'var(--mkt-muted)',
                                        fontWeight: hasCustom ? 'bold' : 'normal',
                                        border: hasCustom ? 'none' : '1px solid var(--mkt-border)',
                                      }}
                                    >
                                      {hasCustom ? `${custom.discount_value} ${custom.discount_type === 'fixed' ? 'ج' : '%'}` : 'عام'}
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn--sm btn--secondary"
                                      style={{ padding: '2px 6px', fontSize: '10px' }}
                                      title="تخصيص الخصم لهذا المنتج"
                                      onClick={() => setCustomDiscountDialog({ key, name: p.name, current: custom })}
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── ج) قسم الباقات (Bundles) ── */}
                {bundles.length > 0 && (
                  <div style={{ border: '1px solid var(--mkt-border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div
                      onClick={() => setExpandedSections((prev) => ({ ...prev, bundles: !prev.bundles }))}
                      style={{
                        background: 'linear-gradient(135deg, #FAF3F7 0%, #F5E8F0 100%)',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderBottom: expandedSections.bundles ? '1px solid var(--mkt-border)' : 'none',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🎁 باقات الصالون الجاهزة</span>
                        <span style={{ fontSize: '12px', background: '#fff', padding: '2px 8px', borderRadius: '12px', color: 'var(--mkt-primary)', fontWeight: '700' }}>
                          {filteredBundles.length} باقة
                        </span>
                      </span>
                      <span>{expandedSections.bundles ? '▲' : '▼'}</span>
                    </div>

                    {expandedSections.bundles && (
                      <div style={{ padding: '12px' }}>
                        {filteredBundles.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--mkt-muted)', fontSize: '13px' }}>
                            {searchTerm ? 'لا توجد باقات مطابقة لبحثك' : 'لا توجد باقات مسجلة'}
                          </div>
                        ) : (
                          <div className="offer-target-items-grid">
                            {filteredBundles.map((b) => {
                              const key = `bundle:${b.id}`
                              const isSelected = !!customTargets[key]
                              return (
                                <div
                                  key={b.id}
                                  className={`offer-target-item-card ${isSelected ? 'offer-target-item-card--selected' : ''}`}
                                >
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, flex: 1, minWidth: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleTarget('bundle', b.id)}
                                      style={{ width: '15px', height: '15px', accentColor: 'var(--mkt-primary)', flexShrink: 0 }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--mkt-ink)', wordBreak: 'break-word' }}>
                                      {b.name}
                                    </span>
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--mkt-border)', background: '#FAF5F8', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isBusy}>
              إلغاء
            </button>
            <button type="submit" className="mkt-btn-primary" disabled={isBusy}>
              {isBusy ? (
                <>
                  <span className="spinner spinner--sm" />
                  <span>{uploading ? 'جارٍ رفع الصورة...' : 'جارٍ الحفظ...'}</span>
                </>
              ) : offer ? (
                '💾 حفظ التعديلات'
              ) : (
                '➕ إضافة العرض'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Dialog تخصيص الخصم للبند ── */}
      {customDiscountDialog && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setCustomDiscountDialog(null)}>
          <div className="modal" style={{ maxWidth: '400px', padding: '20px', borderRadius: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '15px' }}>خصم مخصص لـ {customDiscountDialog.name}</h3>
              <button className="modal-close-btn" onClick={() => setCustomDiscountDialog(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '10px 0' }}>
              <p style={{ fontSize: '12px', color: 'var(--mkt-muted)', margin: '0 0 12px' }}>
                اترك القيمة فارغة للعودة إلى استخدام الخصم العام المطبق على العرض.
              </p>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label">نوع الخصم المخصص</label>
                <select id="custom_disc_type" className="input" defaultValue={customDiscountDialog.current?.discount_type || 'fixed'}>
                  <option value="fixed">خصم مبلغ ثابت (جنيه)</option>
                  <option value="percentage">نسبة مئوية (%)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">قيمة الخصم المخصص</label>
                <input
                  id="custom_disc_val"
                  type="number"
                  min="0"
                  className="input"
                  defaultValue={customDiscountDialog.current?.discount_value || ''}
                  placeholder="مثال: 50 أو 15"
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => saveCustomDiscount(customDiscountDialog.key, 'percentage', '')}
              >
                إلغاء المخصص (عام)
              </button>
              <button
                type="button"
                className="mkt-btn-primary"
                onClick={() => {
                  const type = document.getElementById('custom_disc_type').value
                  const val = document.getElementById('custom_disc_val').value
                  saveCustomDiscount(customDiscountDialog.key, type, val)
                }}
              >
                حفظ الخصم المخصص
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MarketingOffersPage() {
  const showToast = useToast()
  const [offers, setOffers] = useState([])
  const [selectionData, setSelectionData] = useState({ tree: [], products: [], bundles: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modalOffer, setModalOffer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [offersData, selData] = await Promise.all([
        getAllOffers(),
        getOfferSelectionData().catch(() => ({ tree: [], products: [], bundles: [] })),
      ])
      setOffers(offersData)
      setSelectionData(selData)
    } catch (e) {
      showToast('خطأ في تحميل العروض: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setModalOffer(null)
    setIsModalOpen(true)
  }

  function openEdit(offer) {
    setModalOffer(offer)
    setIsModalOpen(true)
  }

  async function handleSave(formData) {
    setSaving(true)
    try {
      if (modalOffer) {
        await updateOffer({ id: modalOffer.id, ...formData })
        showToast('تم تعديل العرض والمنتجات المستهدفة بنجاح ✨', 'success')
      } else {
        await createOffer(formData)
        showToast('تمت إضافة العرض والمنتجات بنجاح 🏷️', 'success')
      }
      setIsModalOpen(false)
      const freshOffers = await getAllOffers()
      setOffers(freshOffers)
    } catch (e) {
      showToast('خطأ أثناء الحفظ: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(offer) {
    const nextState = !offer.is_active
    try {
      await updateOfferStatusAndDuration({ offerId: offer.id, isActive: nextState })
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, is_active: nextState } : o))
      )
      showToast(nextState ? 'تم تفعيل العرض' : 'تم إيقاف العرض', 'info')
    } catch (e) {
      showToast('خطأ في تغيير الحالة: ' + e.message, 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteOffer(deleteTarget.id)
      setOffers((prev) => prev.filter((o) => o.id !== deleteTarget.id))
      showToast('تم حذف العرض', 'success')
      setDeleteTarget(null)
    } catch (e) {
      showToast('خطأ في حذف العرض: ' + e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filteredOffers = offers.filter((o) => {
    const exp = isExpired(o)
    if (filter === 'active') return o.is_active && !exp
    if (filter === 'inactive') return !o.is_active
    if (filter === 'expired') return exp
    return true
  })

  return (
    <div className="mkt-container">
      {/* ── الرأس ── */}
      <div className="mkt-header">
        <div>
          <h1 className="mkt-title">🏷️ إدارة العروض والخصومات</h1>
          <p className="mkt-subtitle">إنشاء الحملات الترويجية، اختيار المنتجات والخدمات المستهدفة، وتحديد الخصومات</p>
        </div>
        <button className="mkt-btn-primary" onClick={openCreate}>
          ➕ إضافة عرض جديد
        </button>
      </div>

      {/* ── الفلاتر ── */}
      <div className="mkt-tabs">
        <button
          className={`mkt-tab${filter === 'all' ? ' mkt-tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          الكل ({offers.length})
        </button>
        <button
          className={`mkt-tab${filter === 'active' ? ' mkt-tab--active' : ''}`}
          onClick={() => setFilter('active')}
        >
          النشطة ({offers.filter((o) => o.is_active && !isExpired(o)).length})
        </button>
        <button
          className={`mkt-tab${filter === 'inactive' ? ' mkt-tab--active' : ''}`}
          onClick={() => setFilter('inactive')}
        >
          المعطلة ({offers.filter((o) => !o.is_active).length})
        </button>
        <button
          className={`mkt-tab${filter === 'expired' ? ' mkt-tab--active' : ''}`}
          onClick={() => setFilter('expired')}
        >
          المنتهية ({offers.filter(isExpired).length})
        </button>
      </div>

      {/* ── قائمة العروض ── */}
      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ التحميل...</span>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="mkt-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏷️</div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--mkt-ink)' }}>لا توجد عروض في هذا القسم</h3>
          <p style={{ margin: 0, color: 'var(--mkt-muted)', fontSize: '14px' }}>
            اضغطي على زر "إضافة عرض جديد" لبدء إنشاء حملة ترويجية واختيار المنتجات
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredOffers.map((offer) => {
            const exp = isExpired(offer)
            const active = offer.is_active && !exp
            const targetCount = Array.isArray(offer.service_offer_targets) ? offer.service_offer_targets.length : 0

            return (
              <div
                key={offer.id}
                className="mkt-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '18px',
                  opacity: !offer.is_active ? 0.75 : 1,
                  position: 'relative',
                  border: active ? '1.5px solid var(--mkt-primary)' : '1px solid var(--mkt-border)',
                }}
              >
                {/* صورة العرض */}
                {offer.image_url ? (
                  <img
                    src={offer.image_url}
                    alt={offer.title_ar}
                    style={{
                      width: '100%',
                      height: '160px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      marginBottom: '14px',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      borderRadius: '12px',
                      background: 'var(--mkt-primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      marginBottom: '14px',
                    }}
                  >
                    💎
                  </div>
                )}

                {/* التفاصيل */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: 'var(--mkt-ink)' }}>
                    {offer.title_ar}
                  </h3>
                  <span className={`mkt-badge ${active ? 'mkt-badge--success' : exp ? 'mkt-badge--danger' : 'mkt-badge--warning'}`}>
                    {active ? 'نشط' : exp ? 'منتهي' : 'معطل'}
                  </span>
                </div>

                <div style={{ margin: '6px 0', fontSize: '15px', fontWeight: '800', color: 'var(--mkt-primary)' }}>
                  {discountLabel(offer)}
                </div>

                {targetCount > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--mkt-primary)', fontWeight: 'bold', marginBottom: '6px' }}>
                    🎯 يشمل {targetCount} منتج / خدمة محددة
                  </div>
                )}

                {offer.description_ar && (
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--mkt-muted)', flex: 1 }}>
                    {offer.description_ar}
                  </p>
                )}

                <div style={{ fontSize: '12px', color: 'var(--mkt-muted)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {offer.start_date && <span>📅 يبدأ: {fmtDate(offer.start_date)}</span>}
                  {offer.valid_until && <span>⏳ ينتهي: {fmtDate(offer.valid_until)}</span>}
                  <span>🔢 الترتيب: {offer.sort_order || 0}</span>
                </div>

                {/* الإجراءات */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--mkt-border)' }}>
                  <button
                    className={`btn btn--sm ${offer.is_active ? 'btn--secondary' : 'btn--primary'}`}
                    onClick={() => handleToggleActive(offer)}
                    style={{ flex: 1 }}
                  >
                    {offer.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>

                  <button className="mkt-btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => openEdit(offer)}>
                    ✏️ تعديل
                  </button>

                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => setDeleteTarget(offer)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── مودال الإضافة والتعديل ── */}
      {isModalOpen && (
        <OfferFormModal
          offer={modalOffer}
          selectionData={selectionData}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          saving={saving}
        />
      )}

      {/* ── تأكيد الحذف ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: '420px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px' }}>حذف العرض نهائياً؟</h3>
            <p style={{ color: 'var(--mkt-muted)', fontSize: '14px', margin: '0 0 20px' }}>
              هل أنتِ متأكدة من حذف "{deleteTarget.title_ar}"؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn--secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                إلغاء
              </button>
              <button className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
