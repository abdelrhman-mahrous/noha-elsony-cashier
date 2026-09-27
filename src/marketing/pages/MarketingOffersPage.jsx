import { useState, useEffect, useRef } from 'react'
import {
  getAllOffers,
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

function OfferFormModal({ offer, onSave, onClose, saving }) {
  const fileInputRef = useRef(null)
  const [localFile, setLocalFile] = useState(null)
  const [localPreview, setLocalPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

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

  async function handleSubmit(e) {
    e.preventDefault()

    if (localFile) {
      setUploading(true)
      try {
        const publicUrl = await uploadOfferImage(localFile)
        await onSave({
          ...form,
          image_url: publicUrl,
          discount_value: form.discount_value !== '' ? Number(form.discount_value) : 0,
          sort_order: Number(form.sort_order) || 0,
          start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
          valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        })
      } finally {
        setUploading(false)
      }
    } else {
      await onSave({
        ...form,
        discount_value: form.discount_value !== '' ? Number(form.discount_value) : 0,
        sort_order: Number(form.sort_order) || 0,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      })
    }
  }

  const isBusy = saving || uploading
  const displayImage = localPreview || form.image_url

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{offer ? '✏️ تعديل العرض' : '🏷️ إضافة عرض ترويجي جديد'}</h2>
          <button className="modal-close-btn" onClick={onClose} disabled={isBusy}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                عنوان العرض <span style={{ color: 'var(--mkt-danger)' }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                value={form.title_ar}
                onChange={(e) => set('title_ar', e.target.value)}
                placeholder="مثال: باقة العناية الشاملة الملكية"
                required
                disabled={isBusy}
              />
            </div>

            <div className="form-group">
              <label className="form-label">وصف العرض وتفاصيله</label>
              <textarea
                className="input"
                rows={3}
                value={form.description_ar}
                onChange={(e) => set('description_ar', e.target.value)}
                placeholder="تفاصيل الخدمات المشمولة والشروط إن وجدت..."
                disabled={isBusy}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">نوع الخصم</label>
                <select
                  className="input"
                  value={form.discount_type}
                  onChange={(e) => set('discount_type', e.target.value)}
                  disabled={isBusy}
                >
                  <option value="percentage">نسبة مئوية (%)</option>
                  <option value="fixed">خصم مبلغ ثابت (جنيه)</option>
                  <option value="fixed_package">سعر شامل للباقة (جنيه)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  قيمة الخصم / السعر <span style={{ color: 'var(--mkt-danger)' }}>*</span>
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

            <div className="form-group">
              <label className="form-label">صورة العرض الترويجي</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isBusy}
              />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    حذف الصورة
                  </button>
                )}
              </div>

              {displayImage && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img
                    src={displayImage}
                    alt="معاينة"
                    style={{
                      maxHeight: '140px',
                      maxWidth: '100%',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid var(--mkt-border)',
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">تاريخ البداية (اختياري)</label>
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
            </div>

            <div className="form-group">
              <label className="form-label">ترتيب الظهور في التطبيق</label>
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

          <div className="modal-footer" style={{ marginTop: '16px' }}>
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
    </div>
  )
}

export default function MarketingOffersPage() {
  const showToast = useToast()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'inactive' | 'expired'
  const [modalOffer, setModalOffer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadOffers()
  }, [])

  async function loadOffers() {
    setLoading(true)
    try {
      const data = await getAllOffers()
      setOffers(data)
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
        showToast('تم تعديل العرض بنجاح ✨', 'success')
      } else {
        await createOffer(formData)
        showToast('تمت إضافة العرض بنجاح 🏷️', 'success')
      }
      setIsModalOpen(false)
      loadOffers()
    } catch (e) {
      showToast('خطأ أثناء الحفظ: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(offer) {
    const nextState = !offer.is_active
    try {
      await updateOfferStatusAndDuration({ id: offer.id, is_active: nextState })
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
          <p className="mkt-subtitle">إنشاء الحملات الترويجية، الخصومات المئوية، وباقات الخدمات في التطبيق</p>
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
            اضغطي على زر "إضافة عرض جديد" لبدء إنشاء حملة ترويجية جديدة
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredOffers.map((offer) => {
            const exp = isExpired(offer)
            const active = offer.is_active && !exp

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
