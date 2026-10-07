import { useState, useEffect } from 'react'
import {
  getBuffetAddons,
  createBuffetAddon,
  updateBuffetAddon,
  toggleBuffetAddonActive,
  deleteBuffetAddon,
} from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { formatPrice } from '../../lib/formatters'

const QUICK_DRINKS = [
  { name: 'شاي أحمر', price: 15, icon: '🫖' },
  { name: 'شاي أخضر بالنعناع', price: 20, icon: '🍵' },
  { name: 'قهوة تركي', price: 25, icon: '☕' },
  { name: 'قهوة فرنسي بالحليب', price: 35, icon: '☕' },
  { name: 'إسبريسو سينجل', price: 30, icon: '☕' },
  { name: 'إسبريسو دبل', price: 40, icon: '☕' },
  { name: 'كابتشينو', price: 45, icon: '☕' },
  { name: 'لاتيه', price: 45, icon: '☕' },
  { name: 'مياه معدنية صغيرة', price: 10, icon: '💧' },
  { name: 'عصير برتقال فريش', price: 40, icon: '🍊' },
  { name: 'عصير ليمون بالنعناع', price: 35, icon: '🍋' },
  { name: 'مشروب غازي', price: 20, icon: '🥤' },
]

const ICON_OPTIONS = [
  { id: 'local_cafe', label: 'قهوة ساخنة', emoji: '☕' },
  { id: 'emoji_food_beverage', label: 'شاي / أعشاب', emoji: '🫖' },
  { id: 'local_bar', label: 'عصائر فريش', emoji: '🍹' },
  { id: 'local_drink', label: 'مشروب غازي / كانز', emoji: '🥤' },
  { id: 'water_drop', label: 'مياه معدنية', emoji: '💧' },
  { id: 'cookie', label: 'سناك / بسكوت', emoji: '🍪' },
]

function getIconNameFromArabic(name = '') {
  const n = name.toLowerCase()
  if (n.includes('ماء') || n.includes('مياه') || n.includes('water')) return 'water_drop'
  if (n.includes('عصير') || n.includes('برتقال') || n.includes('ليمون') || n.includes('مانجو') || n.includes('فراولة')) return 'local_bar'
  if (n.includes('كولا') || n.includes('بيبسي') || n.includes('سبرايت') || n.includes('صودا') || n.includes('غازي')) return 'local_drink'
  if (n.includes('شاي') || n.includes('نعناع') || n.includes('يانسون') || n.includes('كركديه') || n.includes('أعشاب')) return 'emoji_food_beverage'
  if (n.includes('بسكوت') || n.includes('شوكولاتة') || n.includes('كوكيز') || n.includes('كرواسون')) return 'cookie'
  return 'local_cafe'
}

export default function BuffetPage() {
  const showToast = useToast()
  const { owner } = useOwnerAuth()

  const [addons, setAddons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    arabicName: '',
    name: '',
    price: '',
    iconName: 'local_cafe',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadBuffet()
  }, [search])

  async function loadBuffet() {
    setLoading(true)
    try {
      const data = await getBuffetAddons({ query: search })
      setAddons(data)
    } catch (e) {
      showToast('خطأ في تحميل عناصر البوفيه: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenAddModal(initialData = null) {
    if (initialData) {
      setEditingItem(initialData)
      setFormData({
        arabicName: initialData.arabic_name || initialData.name || '',
        name: initialData.name || '',
        price: initialData.price != null ? initialData.price.toString() : '',
        iconName: initialData.icon_name || getIconNameFromArabic(initialData.arabic_name || initialData.name),
        isActive: initialData.is_active !== false,
      })
    } else {
      setEditingItem(null)
      setFormData({
        arabicName: '',
        name: '',
        price: '',
        iconName: 'local_cafe',
        isActive: true,
      })
    }
    setModalOpen(true)
  }

  function handleQuickFill(quick) {
    const icon = getIconNameFromArabic(quick.name)
    setFormData(prev => ({
      ...prev,
      arabicName: quick.name,
      name: quick.name,
      price: quick.price.toString(),
      iconName: icon,
    }))
  }

  async function handleSubmitForm(e) {
    e.preventDefault()
    if (!formData.arabicName.trim()) {
      showToast('يرجى إدخال اسم المشروب بالعربية', 'warning')
      return
    }
    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('يرجى إدخال سعر صحيح (0 أو أكثر)', 'warning')
      return
    }

    const resolvedIcon = formData.iconName || getIconNameFromArabic(formData.arabicName)

    setSaving(true)
    try {
      if (editingItem) {
        await updateBuffetAddon(editingItem.id, {
          arabicName: formData.arabicName,
          name: formData.name || formData.arabicName,
          price: priceNum,
          iconName: resolvedIcon,
          isActive: formData.isActive,
        })
        showToast(`تم تعديل "${formData.arabicName}" بنجاح ✨`, 'success')
      } else {
        await createBuffetAddon({
          arabicName: formData.arabicName,
          name: formData.name || formData.arabicName,
          price: priceNum,
          iconName: resolvedIcon,
          isActive: formData.isActive,
          ownerUsername: owner?.username || null,
        })
        showToast(`تمت إضافة "${formData.arabicName}" إلى البوفيه بنجاح ☕`, 'success')
      }
      setModalOpen(false)
      loadBuffet()
    } catch (err) {
      showToast('حدث خطأ أثناء الحفظ: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(item) {
    try {
      await toggleBuffetAddonActive(item.id, item.is_active)
      setAddons(prev =>
        prev.map(a => (a.id === item.id ? { ...a, is_active: !a.is_active } : a))
      )
      showToast(
        `تم ${!item.is_active ? 'تفعيل وإتاحة' : 'تعطيل وإخفاء'} "${item.arabic_name || item.name}"`,
        'info'
      )
    } catch (err) {
      showToast('خطأ في تعديل الحالة: ' + err.message, 'error')
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteBuffetAddon(deleteTarget.id)
      showToast(`تم حذف "${deleteTarget.arabic_name || deleteTarget.name}" من البوفيه`, 'success')
      setDeleteTarget(null)
      loadBuffet()
    } catch (err) {
      showToast('خطأ في الحذف: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const activeCount = addons.filter(a => a.is_active !== false).length
  const inactiveCount = addons.filter(a => a.is_active === false).length

  const filteredAddons = addons.filter(a => {
    if (statusFilter === 'active') return a.is_active !== false
    if (statusFilter === 'inactive') return a.is_active === false
    return true
  })

  function getDrinkIcon(name = '') {
    const n = name.toLowerCase()
    if (n.includes('شاي')) return '🫖'
    if (n.includes('قهوة') || n.includes('كوفي') || n.includes('إسبريسو') || n.includes('لاتيه') || n.includes('كابتشينو')) return '☕'
    if (n.includes('عصير') || n.includes('برتقال') || n.includes('ليمون') || n.includes('مانجو') || n.includes('فراولة')) return '🍹'
    if (n.includes('مياه') || n.includes('ماء') || n.includes('water')) return '💧'
    if (n.includes('كولا') || n.includes('بيبسي') || n.includes('سبرايت') || n.includes('مشروب غازي') || n.includes('صودا')) return '🥤'
    if (n.includes('بسكوت') || n.includes('شوكولاتة') || n.includes('كوكيز') || n.includes('كرواسون')) return '🍪'
    return '☕'
  }

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">☕ إدارة البوفيه والمشروبات</h1>
          <p className="owner-page-subtitle">
            إضافة وتعديل أسعار المشروبات والضيافة المتاحة لعميلات الصالون في التطبيق والكاشير
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn--primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '700',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(183, 110, 121, 0.3)',
            }}
            onClick={() => handleOpenAddModal()}
          >
            <span>➕</span>
            <span>إضافة مشروب جديد</span>
          </button>
        </div>
      </div>

      {/* ── الفلاتر والبحث ── */}
      <div className="owner-filters-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 ابحثي عن اسم المشروب..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="owner-period-tabs">
          <button
            className={`owner-period-tab${statusFilter === 'all' ? ' owner-period-tab--active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            الكل ({addons.length})
          </button>
          <button
            className={`owner-period-tab${statusFilter === 'active' ? ' owner-period-tab--active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            ✅ المتاح بالصالون ({activeCount})
          </button>
          <button
            className={`owner-period-tab${statusFilter === 'inactive' ? ' owner-period-tab--active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            🚫 غير متوفر ({inactiveCount})
          </button>
        </div>
      </div>

      {/* ── المحتوى ── */}
      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ تحميل قائمة البوفيه...</span>
        </div>
      ) : filteredAddons.length === 0 ? (
        <div className="owner-card">
          <div className="owner-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>☕</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--staff-ink)', marginBottom: '8px' }}>
              لا توجد مشروبات مسجلة
            </h3>
            <p style={{ color: 'var(--staff-muted)', fontSize: '14px', marginBottom: '20px' }}>
              {search ? 'لم نجد أي مشروب يطابق كلمة البحث' : 'ابدئي بإضافة المشروبات وعناصر الضيافة للبوفيه الآن'}
            </p>
            <button
              className="btn btn--primary"
              onClick={() => handleOpenAddModal()}
              style={{ borderRadius: '10px', padding: '10px 24px' }}
            >
              ➕ إضافة أول مشروب
            </button>
          </div>
        </div>
      ) : (
        <div className="owner-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                  <th>اسم المشروب / العنصر</th>
                  <th>الاسم الثانوي</th>
                  <th>السعر للعميل</th>
                  <th>حالة التوفر</th>
                  <th style={{ textAlign: 'center', width: '160px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAddons.map((item, idx) => {
                  const isAvail = item.is_active !== false
                  const icon = getDrinkIcon(item.arabic_name || item.name)
                  return (
                    <tr key={item.id} style={{ opacity: isAvail ? 1 : 0.65 }}>
                      <td style={{ textAlign: 'center', fontSize: '20px' }}>
                        {icon}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--staff-ink)', fontSize: '15px' }}>
                        {item.arabic_name || item.name}
                      </td>
                      <td style={{ color: 'var(--staff-muted)', fontSize: '13px' }}>
                        {item.name || '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--staff-rose-dark)' }}>
                          {formatPrice(item.price)} ج.م
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          style={{
                            border: 'none',
                            cursor: 'pointer',
                            background: isAvail ? 'rgba(76, 122, 107, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isAvail ? '#2d6a4f' : '#dc2626',
                            fontWeight: '700',
                            fontSize: '12.5px',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          title="اضغطي لتبديل حالة التوفر"
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isAvail ? '#2d6a4f' : '#dc2626' }} />
                          {isAvail ? 'متاح للطلب ✅' : 'غير متوفر 🚫'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn--sm btn--outline"
                            onClick={() => handleOpenAddModal(item)}
                            title="تعديل المشروب والسعر"
                            style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
                          >
                            ✏️ تعديل
                          </button>
                          <button
                            className="btn btn--sm btn--danger"
                            onClick={() => setDeleteTarget(item)}
                            title="حذف من البوفيه"
                            style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
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

      {/* ── Modal: إضافة / تعديل مشروب ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <div
            className="modal"
            style={{ maxWidth: '520px', borderRadius: '20px', padding: '0', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--staff-border)',
                background: 'var(--staff-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 className="modal-title" style={{ fontSize: '17px', fontWeight: '800', margin: 0 }}>
                {editingItem ? '✏️ تعديل بيانات المشروب' : '☕ إضافة مشروب جديد للبوفيه'}
              </h2>
              <button
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--staff-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* اقتراحات سريعة عند الإضافة الجديدة */}
                {!editingItem && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--staff-muted)', marginBottom: '6px', display: 'block' }}>
                      ⚡ اقتراحات سريعة للمشروبات:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {QUICK_DRINKS.slice(0, 6).map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleQuickFill(q)}
                          style={{
                            border: '1px solid var(--staff-border)',
                            background: 'var(--staff-bg)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            color: 'var(--staff-ink)',
                          }}
                        >
                          {q.icon} {q.name} ({q.price} ج.م)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* اسم المشروب بالعربي */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '6px', display: 'block' }}>
                    اسم المشروب / العنصر (بالعربية) <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: قهوة تركي مظبوط، شاي بالنعناع، عصير برتقال فريش"
                    required
                    value={formData.arabicName}
                    onChange={e => setFormData({ ...formData, arabicName: e.target.value })}
                    style={{ fontSize: '14px', padding: '10px 14px' }}
                  />
                </div>

                {/* السعر بالجنيه */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '6px', display: 'block' }}>
                    السعر بالجنيه المصري (ج.م) <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="form-input"
                    placeholder="مثال: 25"
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    style={{ fontSize: '15px', fontWeight: 'bold', padding: '10px 14px' }}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--staff-muted)', marginTop: '4px', display: 'block' }}>
                    💡 ملاحظة: أسعار البوفيه ثابتة ومحمية من الخصومات والعروض التلقائية
                  </span>
                </div>

                {/* اختيار أيقونة المشروب */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block', color: 'var(--staff-muted)' }}>
                    نوع / أيقونة المشروب:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ICON_OPTIONS.map(opt => {
                      const isSelected = formData.iconName === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, iconName: opt.id })}
                          style={{
                            border: isSelected ? '2px solid var(--staff-rose-dark)' : '1px solid var(--staff-border)',
                            background: isSelected ? 'rgba(183, 110, 121, 0.12)' : 'var(--staff-surface)',
                            borderRadius: '10px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: isSelected ? 'bold' : 'normal',
                            color: isSelected ? 'var(--staff-rose-dark)' : 'var(--staff-ink)',
                            transition: 'all 0.2s',
                          }}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* التوفر */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="is_active_check"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--staff-rose-dark)' }}
                  />
                  <label htmlFor="is_active_check" style={{ fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>
                    متاح للطلب حالياً بالصالون والتطبيق
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--staff-border)',
                  background: 'var(--staff-bg)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  style={{ borderRadius: '10px', padding: '8px 18px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={saving}
                  style={{ borderRadius: '10px', padding: '8px 24px', fontWeight: '700' }}
                >
                  {saving ? 'جارٍ الحفظ...' : editingItem ? '💾 حفظ التعديلات' : '➕ إضافة المشروب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: تأكيد الحذف ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="modal"
            style={{ maxWidth: '420px', borderRadius: '18px', padding: '24px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '8px', color: 'var(--staff-ink)' }}>
              حذف المشروب من البوفيه؟
            </h3>
            <p style={{ color: 'var(--staff-muted)', fontSize: '13.5px', marginBottom: '20px' }}>
              هل أنتِ متأكدة من حذف "{deleteTarget.arabic_name || deleteTarget.name}" نهائياً من قائمة البوفيه؟
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                className="btn btn--outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ borderRadius: '10px', padding: '8px 20px' }}
              >
                تراجع
              </button>
              <button
                className="btn btn--danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ borderRadius: '10px', padding: '8px 20px', fontWeight: '700' }}
              >
                {deleting ? 'جارٍ الحذف...' : '🗑️ نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
