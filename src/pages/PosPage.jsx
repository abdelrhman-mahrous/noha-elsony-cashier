import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import {
  getPosAppointmentByCode,
  searchByPhone,
  buildPosDetails,
  savePosCheckout,
  cancelAppointment,
} from '../services/posService'
import ItemCard from '../components/ItemCard'
import GroupHeader from '../components/GroupHeader'
import AppointmentHeader from '../components/AppointmentHeader'
import OfferBanner from '../components/OfferBanner'
import Calculator from '../components/Calculator'
import PriceEditModal from '../components/PriceEditModal'
import CancelReasonModal from '../components/CancelReasonModal'
import WalkInModal from '../components/WalkInModal'

export default function PosPage() {
  const navigate = useNavigate()
  const showToast = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState(null)
  const [paidAmount, setPaidAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [countExtraAsTip, setCountExtraAsTip] = useState(true)

  // Modals
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [editModal, setEditModal] = useState(null) // { index, item }
  const [cancelItemModal, setCancelItemModal] = useState(null) // { index, item }
  const [cancelApptModal, setCancelApptModal] = useState(false)

  const searchRef = useRef(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  async function loadAppointmentByCode(code) {
    const cleanCode = (code || '').trim()
    if (!cleanCode) return

    setSearchInput(cleanCode)
    setLoading(true)
    setDetails(null)

    try {
      let found = await getPosAppointmentByCode(cleanCode)
      if (!found) {
        const list = await searchByPhone(cleanCode)
        if (list.length > 0) {
          found = await buildPosDetails(list[0])
        }
      }

      if (!found) {
        showToast('لم يتم العثور على موعد بهذا الكود أو رقم الهاتف', 'error')
        return
      }

      setDetails(found)
      const initialPaid = (found.status === 'completed' && found.paidAmount > 0)
        ? found.paidAmount
        : netCashDue(found)
      setPaidAmount(initialPaid)
      setNotes(found.cashierNotes || '')
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء البحث', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e) {
    e?.preventDefault()
    await loadAppointmentByCode(searchInput)
  }

  // ══ حسابات الإجمالي ══
  function deliveredSubtotal(det) {
    return (det?.items || [])
      .filter(i => i.status === 'delivered')
      .reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  }

  function netCashDue(det) {
    const due = deliveredSubtotal(det) - (det?.depositPaid || 0)
    return due < 0 ? 0 : due
  }

  const tip = (() => {
    if (!details) return 0
    const diff = paidAmount - netCashDue(details)
    return diff > 0 && countExtraAsTip ? diff : 0
  })()

  // ══ Toggle خدمة: delivered ↔ cancelled ══
  function handleToggleItem(index) {
    if (!details || details.status === 'completed') return
    const item = details.items[index]
    if (item.status === 'delivered') {
      setCancelItemModal({ index, item })
    } else {
      const updatedItems = [...details.items]
      updatedItems[index] = { ...item, status: 'delivered', cancelReason: '' }
      const updated = { ...details, items: updatedItems }
      setDetails(updated)
      setPaidAmount(netCashDue(updated))
    }
  }

  function confirmCancelItem(reason) {
    if (!cancelItemModal) return
    const { index, item } = cancelItemModal
    const updatedItems = [...details.items]
    updatedItems[index] = { ...item, status: 'cancelled', cancelReason: reason || '' }
    const updated = { ...details, items: updatedItems }
    setDetails(updated)
    setPaidAmount(netCashDue(updated))
    setCancelItemModal(null)
  }

  // ══ تحديث السعر ══
  function handlePriceUpdate(index, newPrice, originalPrice) {
    if (!details) return
    const updatedItems = [...details.items]
    updatedItems[index] = {
      ...updatedItems[index],
      unitPrice: newPrice,
      originalUnitPrice: originalPrice ?? updatedItems[index].originalUnitPrice,
      isCustomPrice: true,
    }
    const updated = { ...details, items: updatedItems }
    setDetails(updated)
    setPaidAmount(netCashDue(updated))
    setEditModal(null)
  }

  // ══ إتمام المحاسبة ══
  async function handleCheckout() {
    if (!details || details.status === 'completed') return

    const unpriced = details.items.filter(
      i => i.status !== 'cancelled' && i.unitPrice <= 0
    )
    if (unpriced.length > 0) {
      showToast(`يرجى تحديد السعر أولاً للبند: ${unpriced[0].title}`, 'error')
      return
    }

    setSaving(true)
    try {
      await savePosCheckout({
        details,
        paidAmount,
        tipAmount: tip,
        notes,
      })
      showToast('تم إقفال الموعد وتسجيل المحاسبة بنجاح 🎉', 'success')
      navigate('/history')
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء الحفظ', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ══ إلغاء الموعد ══
  async function handleCancelAppt(reason) {
    if (!details) return
    setCancelApptModal(false)
    setSaving(true)
    try {
      const msg = await cancelAppointment(details.appointmentId, reason)
      showToast(msg, 'success')
      await handleSearch()
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء الإلغاء', 'error')
    } finally {
      setSaving(false)
    }
  }

  // تقسيم العناصر لخدمات ومنتجات
  const serviceItems = details?.items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.itemType !== 'product') || []

  const productItems = details?.items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.itemType === 'product') || []

  const servicesTotalDelivered = serviceItems
    .filter(({ item }) => item.status === 'delivered')
    .reduce((s, { item }) => s + item.unitPrice * item.quantity, 0)

  const productsTotalDelivered = productItems
    .filter(({ item }) => item.status === 'delivered')
    .reduce((s, { item }) => s + item.unitPrice * item.quantity, 0)

  const isLocked = details?.status === 'completed' || details?.status === 'cancelled'

  return (
    <>
      <div className="page">
        {/* Walk-in banner */}
        <div
          className="walkin-banner"
          onClick={() => setWalkInOpen(true)}
        >
          <div className="walkin-banner__icon">✂️</div>
          <div className="walkin-banner__text">
            <div className="walkin-banner__title">محاسبة موعد بدون حجز مسبق (Walk-in)</div>
            <div className="walkin-banner__sub">تسجيل خدمات وعروض ومنتجات مباشرة للعميل الحاضر في الصالون</div>
          </div>
          <span className="walkin-banner__arrow">←</span>
        </div>

        {/* Search */}
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            ref={searchRef}
            id="search-input"
            className="input"
            placeholder="ابحثي بكود الموعد أو رقم الهاتف..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            dir="ltr"
          />
          <button
            id="search-btn"
            type="submit"
            className="btn btn--primary"
            disabled={loading}
          >
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : '🔍 بحث'
            }
          </button>
        </form>

        {/* Content */}
        {loading && (
          <div className="loading-center">
            <span className="spinner spinner--lg" />
            <span>جارٍ البحث عن الموعد...</span>
          </div>
        )}

        {!loading && !details && (
          <div className="empty-state">
            <div className="empty-state__icon">🔎</div>
            <div className="empty-state__text">ابحثي بكود الموعد لعرض الخدمات والمحاسبة</div>
          </div>
        )}

        {!loading && details && (
          <>
            <AppointmentHeader details={details} />

            {details.status === 'completed' && (
              <div className="completed-banner">
                <span>✅</span>
                <span>تم المحاسبة على هذا الموعد وإقفاله بالكامل</span>
              </div>
            )}

            {details.status === 'cancelled' && (
              <div className="alert alert--error mb-12">
                <span>🚫</span>
                <span>هذا الموعد ملغي</span>
              </div>
            )}

            {details.hasOffer && <OfferBanner details={details} />}

            {/* الخدمات */}
            <GroupHeader
              title="الخدمات والباقات"
              icon="💇‍♀️"
              count={serviceItems.length}
              deliveredTotal={servicesTotalDelivered}
            />

            {serviceItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-state__text">لا توجد خدمات مسجلة بهذا الموعد</div>
              </div>
            ) : (
              serviceItems.map(({ item, i }) => (
                <ItemCard
                  key={item.id + i}
                  item={item}
                  locked={isLocked}
                  onToggle={() => handleToggleItem(i)}
                  onEditPrice={() => setEditModal({ index: i, item })}
                />
              ))
            )}

            <div className="divider" />

            {/* المنتجات */}
            <GroupHeader
              title="المنتجات المرفقة"
              icon="🛍️"
              count={productItems.length}
              deliveredTotal={productsTotalDelivered}
              accentColor="#f97316"
            />

            {productItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-state__text">لا توجد منتجات مرفقة بهذا الموعد</div>
              </div>
            ) : (
              productItems.map(({ item, i }) => (
                <ItemCard
                  key={item.id + i}
                  item={item}
                  locked={isLocked}
                  onToggle={() => handleToggleItem(i)}
                  onEditPrice={() => setEditModal({ index: i, item })}
                />
              ))
            )}

            {/* Bottom spacer for calculator */}
            <div style={{ height: 220 }} />
          </>
        )}
      </div>

      {/* Sticky calculator */}
      {details && (
        <Calculator
          details={details}
          paidAmount={paidAmount}
          tip={tip}
          countExtraAsTip={countExtraAsTip}
          notes={notes}
          saving={saving}
          onPaidChange={setPaidAmount}
          onToggleTip={setCountExtraAsTip}
          onNotesChange={setNotes}
          onCheckout={handleCheckout}
          onCancelAppt={() => setCancelApptModal(true)}
        />
      )}

      {/* Edit price modal */}
      {editModal && (
        <PriceEditModal
          item={editModal.item}
          details={details}
          onConfirm={(newPrice, orig) => handlePriceUpdate(editModal.index, newPrice, orig)}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Cancel item modal */}
      {cancelItemModal && (
        <CancelReasonModal
          title={`إلغاء: ${cancelItemModal.item.title}`}
          onConfirm={confirmCancelItem}
          onClose={() => setCancelItemModal(null)}
        />
      )}

      {/* Cancel appointment modal */}
      {cancelApptModal && (
        <CancelReasonModal
          title="إلغاء الموعد بالكامل"
          onConfirm={handleCancelAppt}
          onClose={() => setCancelApptModal(false)}
        />
      )}

      {/* Walk-in modal */}
      {walkInOpen && (
        <WalkInModal
          onClose={() => setWalkInOpen(false)}
          onSuccess={(code) => loadAppointmentByCode(code)}
        />
      )}
    </>
  )
}
