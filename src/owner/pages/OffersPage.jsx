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

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── OfferFormModal ──────────────────────────────────────────────────────────

function OfferFormModal({ offer, onSave, onClose, saving }) {
  const fileInputRef = useRef(null)
  const [localFile, setLocalFile] = useState(null)      // File object اللي اختاره المستخدم
  const [localPreview, setLocalPreview] = useState(null) // ObjectURL للـ preview
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState(() => {
    if (!offer) return EMPTY_FORM
    const toInput = (iso) =>
      iso ? new Date(iso).toISOString().split('T')[0] : ''
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

  // تنظيف ObjectURL عند الغلق
  useEffect(() => {
    return () => { if (localPreview) URL.revokeObjectURL(localPreview) }
  }, [localPreview])

  function set(k, v) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalFile(file)
    setLocalPreview(URL.createObjectURL(file))
    // امسح رابط الـ URL لو اختار ملف
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

    // لو في ملف محلي، ارفعه أولاً وخد الـ URL
    if (localFile) {
      setUploading(true)
      try {
        const url = await uploadOfferImage(localFile)
        onSave({ ...form, image_url: url })
      } catch (err) {
        // أعد الـ error للـ parent عبر onSave مع علم الخطأ
        onSave({ ...form, _uploadError: err.message })
      } finally {
        setUploading(false)
      }
    } else {
      onSave(form)
    }
  }

  const isBusy = saving || uploading
  const previewSrc = localPreview || (form.image_url || null)

  return (
    <div className="owner-modal-overlay" onClick={onClose}>
      <div
        className="owner-modal owner-modal--wide"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        dir="rtl"
      >
        <div className="owner-modal__header">
          <h2 className="owner-modal__title">
            {offer ? 'تعديل العرض' : 'إنشاء عرض خصم جديد'}
          </h2>
          <button
            className="owner-modal__close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="owner-modal__body">
          {/* ─ Section 1: البيانات الأساسية ─ */}
          <div className="offer-form__section">
            <p className="offer-form__section-title">١. البيانات الأساسية للعرض</p>

            <div className="form-group">
              <label className="form-label">عنوان العرض (عربي) *</label>
              <input
                className="form-input"
                type="text"
                placeholder="مثال: عرض الصيف المميز"
                value={form.title_ar}
                onChange={e => set('title_ar', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">وصف العرض</label>
              <textarea
                className="form-input form-textarea"
                placeholder="تفاصيل العرض والمميزات"
                value={form.description_ar}
                onChange={e => set('description_ar', e.target.value)}
                rows={2}
              />
            </div>

            {/* ── صورة العرض ── */}
            <div className="form-group">
              <label className="form-label">صورة العرض</label>

              {/* زر الرفع من الجهاز */}
              <div className="offer-form__img-row">
                <button
                  type="button"
                  className="offer-form__upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                >
                  📁 {localFile ? 'تغيير الصورة' : 'رفع من الجهاز'}
                </button>

                {previewSrc && (
                  <button
                    type="button"
                    className="offer-form__clear-img-btn"
                    onClick={clearImage}
                    disabled={isBusy}
                    title="إزالة الصورة"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* أو رابط URL يدوي (لو مفيش ملف محلي) */}
              {!localFile && (
                <input
                  className="form-input"
                  type="url"
                  placeholder="أو أدخل رابط URL للصورة مباشرة"
                  value={form.image_url}
                  onChange={e => set('image_url', e.target.value)}
                  style={{ marginTop: '8px' }}
                />
              )}

              {/* preview */}
              {previewSrc && (
                <div className="offer-form__preview-wrap">
                  <img
                    src={previewSrc}
                    alt="preview"
                    className="offer-form__img-preview"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                  {localFile && (
                    <span className="offer-form__preview-name">
                      📎 {localFile.name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─ Section 2: الخصم ─ */}
          <div className="offer-form__section">
            <p className="offer-form__section-title">٢. قيمة ونوع الخصم</p>

            <div className="form-group">
              <label className="form-label">نوع الخصم</label>
              <select
                className="form-input"
                value={form.discount_type}
                onChange={e => set('discount_type', e.target.value)}
              >
                <option value="percentage">نسبة مئوية %</option>
                <option value="fixed">مبلغ ثابت (جنيه)</option>
                <option value="fixed_package">سعر شامل (جنيه)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">قيمة الخصم *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="مثال: 20 أو 15"
                value={form.discount_value}
                onChange={e => set('discount_value', e.target.value)}
                required
              />
            </div>
          </div>

          {/* ─ Section 3: المدة ─ */}
          <div className="offer-form__section">
            <p className="offer-form__section-title">٣. تاريخ البداية والانتهاء</p>

            <div className="offer-form__dates-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">تاريخ البداية</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">تاريخ الانتهاء</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.valid_until}
                  onChange={e => set('valid_until', e.target.value)}
                />
                {form.valid_until && (
                  <button
                    type="button"
                    className="offer-form__clear-date"
                    onClick={() => set('valid_until', '')}
                  >
                    ✕ إلغاء تاريخ الانتهاء (مفتوح)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─ Section 4: ترتيب ─ */}
          <div className="offer-form__section">
            <p className="offer-form__section-title">٤. ترتيب العرض</p>
            <div className="form-group">
              <label className="form-label">الترتيب (رقم أصغر = أول)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.sort_order}
                onChange={e => set('sort_order', e.target.value)}
              />
            </div>
          </div>

          <div className="owner-modal__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={isBusy}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isBusy}
            >
              {uploading ? '⏳ جارٍ رفع الصورة...' : saving ? 'جارٍ الحفظ...' : 'حفظ العرض'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── OfferCard ───────────────────────────────────────────────────────────────

function OfferCard({ offer, onToggle, onEdit, onExtendWeek, onExtendMonth, onEndNow, onDelete }) {
  const expired = isExpired(offer)
  const active = offer.is_active !== false && !expired

  return (
    <div className={`offer-card${!active ? ' offer-card--inactive' : ''}`}>
      {/* Header: image + name + switch */}
      <div className="offer-card__top">
        <div className="offer-card__icon-wrap">
          {offer.image_url ? (
            <img
              src={offer.image_url}
              alt={offer.title_ar}
              className="offer-card__img"
              onError={e => {
                e.currentTarget.style.display = 'none'
                const fallback = e.currentTarget.parentElement.querySelector('.offer-card__icon-fallback')
                if (fallback) fallback.style.display = 'flex'
              }}
            />
          ) : null}
          <span
            className="offer-card__icon-fallback"
            style={{ display: offer.image_url ? 'none' : 'flex' }}
          >
            🏷️
          </span>
        </div>

        <div className="offer-card__info">
          <span className="offer-card__name">{offer.title_ar || '—'}</span>
          <span className="offer-card__discount-label">{discountLabel(offer)}</span>
          {expired && <span className="offer-card__badge offer-card__badge--expired">منتهي</span>}
        </div>

        <label className="toggle-switch offer-card__toggle" aria-label="تفعيل/إيقاف العرض">
          <input
            type="checkbox"
            checked={active}
            onChange={() => onToggle(offer)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {/* Description */}
      {offer.description_ar && (
        <p className="offer-card__desc">{offer.description_ar}</p>
      )}

      {/* Dates */}
      <div className="offer-card__dates">
        <span style={{ color: expired ? 'var(--danger)' : 'var(--success)' }}>
          الانتهاء: {offer.valid_until ? fmtDate(offer.valid_until) : 'مفتوح'}
        </span>
      </div>

      <div className="offer-card__divider" />

      {/* Actions */}
      <div className="offer-card__actions">
        <button className="offer-card__btn offer-card__btn--edit" onClick={() => onEdit(offer)}>
          ✏️ تعديل
        </button>
        <button className="offer-card__btn offer-card__btn--week" onClick={() => onExtendWeek(offer)}>
          📅 +أسبوع
        </button>
        <button className="offer-card__btn offer-card__btn--month" onClick={() => onExtendMonth(offer)}>
          📅 +شهر
        </button>
        <button className="offer-card__btn offer-card__btn--end" onClick={() => onEndNow(offer)}>
          ⛔ إنهاء الآن
        </button>
        <button className="offer-card__btn offer-card__btn--delete" onClick={() => onDelete(offer)}>
          🗑️ حذف
        </button>
      </div>
    </div>
  )
}

// ─── OffersPage ──────────────────────────────────────────────────────────────

export default function OffersPage() {
  const showToast = useToast()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOffer, setModalOffer] = useState(undefined) // undefined=closed, null=new, obj=edit
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { loadOffers() }, [])

  async function loadOffers() {
    setLoading(true)
    try {
      setOffers(await getAllOffers())
    } catch (e) {
      showToast('خطأ في تحميل العروض: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(form) {
    // لو فيه خطأ رفع صورة من الـ modal، اعرضه وابقى
    if (form._uploadError) {
      return showToast('فشل رفع الصورة: ' + form._uploadError, 'error')
    }

    const title = form.title_ar.trim()
    if (!title) return showToast('يرجى إدخال عنوان العرض', 'error')
    const val = parseFloat(form.discount_value)
    if (!val || val <= 0) return showToast('يرجى إدخال قيمة خصم صحيحة', 'error')

    setSaving(true)
    try {
      const payload = {
        title_ar: title,
        description_ar: form.description_ar.trim() || null,
        image_url: (form.image_url || '').trim() || null,
        discount_type: form.discount_type,
        discount_value: val,
        start_date: form.start_date || null,
        valid_until: form.valid_until || null,
        is_active: true,
        sort_order: parseInt(form.sort_order) || 0,
      }
      if (modalOffer) {
        await updateOffer({ ...payload, id: modalOffer.id })
        showToast('تم تعديل العرض بنجاح 🎉', 'success')
      } else {
        await createOffer(payload)
        showToast('تم إنشاء العرض بنجاح 🎉', 'success')
      }
      setModalOffer(undefined)
      await loadOffers()
    } catch (e) {
      showToast('فشل حفظ العرض: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }


  async function handleToggle(offer) {
    try {
      await updateOfferStatusAndDuration({ offerId: offer.id, isActive: offer.is_active === false || isExpired(offer) })
      showToast(`تم ${offer.is_active !== false && !isExpired(offer) ? 'إيقاف' : 'تفعيل'} العرض`, 'success')
      await loadOffers()
    } catch (e) {
      showToast('خطأ في تعديل حالة العرض: ' + e.message, 'error')
    }
  }

  async function handleExtend(offer, days) {
    try {
      const base = offer.valid_until ? new Date(offer.valid_until) : new Date()
      const newDate = new Date(base)
      newDate.setDate(newDate.getDate() + days)
      await updateOfferStatusAndDuration({
        offerId: offer.id,
        isActive: true,
        validUntil: newDate.toISOString(),
      })
      showToast(`تم تمديد العرض ${days === 7 ? 'أسبوعاً' : 'شهراً'} بنجاح`, 'success')
      await loadOffers()
    } catch (e) {
      showToast('خطأ في تمديد العرض: ' + e.message, 'error')
    }
  }

  async function handleEndNow(offer) {
    try {
      await updateOfferStatusAndDuration({ offerId: offer.id, isActive: false })
      showToast('تم إيقاف العرض', 'success')
      await loadOffers()
    } catch (e) {
      showToast('خطأ في إيقاف العرض: ' + e.message, 'error')
    }
  }

  async function handleDelete(offer) {
    try {
      await deleteOffer(offer.id)
      showToast('تم حذف العرض بنجاح', 'success')
      setConfirmDelete(null)
      await loadOffers()
    } catch (e) {
      showToast('خطأ في حذف العرض: ' + e.message, 'error')
    }
  }

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">🏷️ العروض والتسويق</h1>
          <p className="owner-page-subtitle">
            متابعة الباقات الترويجية، الخصومات وتفعيل أو إيقاف العروض للعميلات
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setModalOffer(null)}>
          ＋ إنشاء عرض جديد
        </button>
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ تحميل العروض...</span>
        </div>
      ) : offers.length === 0 ? (
        <div className="owner-card">
          <div className="owner-empty-state">
            <span>لا توجد عروض ترويجية مسجلة حالياً</span>
            <button
              className="btn btn--primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setModalOffer(null)}
            >
              ＋ إنشاء أول عرض
            </button>
          </div>
        </div>
      ) : (
        <div className="owner-offers-grid">
          {offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onToggle={handleToggle}
              onEdit={o => setModalOffer(o)}
              onExtendWeek={o => handleExtend(o, 7)}
              onExtendMonth={o => handleExtend(o, 30)}
              onEndNow={handleEndNow}
              onDelete={o => setConfirmDelete(o)}
            />
          ))}
        </div>
      )}

      {/* ── Modal إضافة/تعديل ── */}
      {modalOffer !== undefined && (
        <OfferFormModal
          offer={modalOffer}
          onSave={handleSave}
          onClose={() => { if (!saving) setModalOffer(undefined) }}
          saving={saving}
        />
      )}

      {/* ── Confirm Delete ── */}
      {confirmDelete && (
        <div className="owner-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="owner-modal"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="owner-modal__header">
              <h2 className="owner-modal__title">تأكيد الحذف</h2>
            </div>
            <div className="owner-modal__body">
              <p>هل أنت متأكد من حذف العرض <strong>{confirmDelete.title_ar}</strong>؟</p>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ⚠️ لا يمكن التراجع عن هذا الإجراء
              </p>
            </div>
            <div className="owner-modal__footer">
              <button className="btn btn--ghost" onClick={() => setConfirmDelete(null)}>
                إلغاء
              </button>
              <button
                className="btn btn--danger"
                onClick={() => handleDelete(confirmDelete)}
              >
                حذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
