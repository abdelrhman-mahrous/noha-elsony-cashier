import { useState } from 'react'
import { createClientAppointment } from '../../services/clientService'
import { useToast } from '../../context/ToastContext'

const TIME_SLOTS = [
  '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM',
  '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
  '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM',
]

export default function BookingWizardModal({ isOpen, onClose, services = [], barbers = [], initialService = null }) {
  const showToast = useToast()
  const [step, setStep] = useState(1) // 1: services, 2: staff, 3: datetime, 4: info, 5: success
  const [selectedServices, setSelectedServices] = useState(initialService ? [initialService] : [])
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
  const [bookingTime, setBookingTime] = useState('02:00 PM')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmedData, setConfirmedData] = useState(null)

  if (!isOpen) return null

  function toggleService(srv) {
    if (selectedServices.some(s => s.id === srv.id)) {
      setSelectedServices(prev => prev.filter(s => s.id !== srv.id))
    } else {
      setSelectedServices(prev => [...prev, srv])
    }
  }

  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.base_price || s.price || 0), 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 30), 0)

  async function handleFinalSubmit(e) {
    e.preventDefault()
    if (!clientName.trim() || !clientPhone.trim()) {
      showToast('يرجى إدخال الاسم ورقم الهاتف', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await createClientAppointment({
        userName: clientName,
        userPhone: clientPhone,
        appointmentDate: bookingDate,
        appointmentTime: bookingTime,
        barberId: selectedBarber?.id || null,
        selectedServices,
        notes,
      })

      setConfirmedData(res)
      setStep(5)
      showToast('تم تأكيد حجزك بنجاح! 👑', 'success')
    } catch (err) {
      showToast('تعذر إتمام الحجز: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="client-modal-backdrop">
      <div className="client-modal-card">
        <button className="client-modal-close" onClick={onClose}>✕</button>

        {/* ── Steps Progress ── */}
        {step < 5 && (
          <div className="client-steps">
            <div className={`client-step${step === 1 ? ' client-step--active' : step > 1 ? ' client-step--done' : ''}`}>
              <div className="client-step__circle">{step > 1 ? '✓' : '1'}</div>
              <span className="client-step__label">الخدمات</span>
            </div>
            <div className={`client-step${step === 2 ? ' client-step--active' : step > 2 ? ' client-step--done' : ''}`}>
              <div className="client-step__circle">{step > 2 ? '✓' : '2'}</div>
              <span className="client-step__label">المتخصصة</span>
            </div>
            <div className={`client-step${step === 3 ? ' client-step--active' : step > 3 ? ' client-step--done' : ''}`}>
              <div className="client-step__circle">{step > 3 ? '✓' : '3'}</div>
              <span className="client-step__label">الموعد</span>
            </div>
            <div className={`client-step${step === 4 ? ' client-step--active' : ''}`}>
              <div className="client-step__circle">4</div>
              <span className="client-step__label">البيانات</span>
            </div>
          </div>
        )}

        {/* ── الخطوة 1: اختيار الخدمات ── */}
        {step === 1 && (
          <div>
            <h2 className="client-section-title" style={{ fontSize: '1.6rem', textAlign: 'center' }}>
              اختاري الخدمات المطلوبة
            </h2>
            <p className="client-section-desc" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              يمكنكِ اختيار أكثر من خدمة في نفس الموعد
            </p>

            <div className="client-wizard-services">
              {services.map((srv) => {
                const isSelected = selectedServices.some(s => s.id === srv.id)
                return (
                  <div
                    key={srv.id}
                    className={`client-wizard-service-item${isSelected ? ' client-wizard-service-item--selected' : ''}`}
                    onClick={() => toggleService(srv)}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>
                        {srv.arabic_name || srv.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--c-text-muted)' }}>
                        ⏳ {srv.duration_minutes || 30} دقيقة
                      </div>
                    </div>
                    <div style={{ fontWeight: '900', color: '#10b981', fontSize: '1.1rem' }}>
                      {srv.base_price || srv.price} ج.م
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedServices.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--c-text-muted)', fontSize: '0.9rem' }}>الإجمالي التقديري: </span>
                  <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.2rem' }}>{totalPrice} ج.م</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--c-gold)', marginRight: '10px' }}>({totalDuration} دقيقة تقريباً)</span>
                </div>
                <button
                  className="client-btn-book"
                  onClick={() => setStep(2)}
                >
                  التالي (اختيار المتخصصة) ←
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── الخطوة 2: اختيار المتخصصة ── */}
        {step === 2 && (
          <div>
            <h2 className="client-section-title" style={{ fontSize: '1.6rem', textAlign: 'center' }}>
              اختاري المتخصصة المفضلة
            </h2>
            <div className="client-staff-grid">
              <div
                className={`client-staff-card${!selectedBarber ? ' client-staff-card--selected' : ''}`}
                onClick={() => setSelectedBarber(null)}
              >
                <div className="client-staff-card__avatar">✨</div>
                <div className="client-staff-card__name">أي متخصصة متاحة</div>
                <div className="client-staff-card__role">أسرع موعد</div>
              </div>

              {barbers.map((b) => (
                <div
                  key={b.id}
                  className={`client-staff-card${selectedBarber?.id === b.id ? ' client-staff-card--selected' : ''}`}
                  onClick={() => setSelectedBarber(b)}
                >
                  <div className="client-staff-card__avatar">
                    {b.name ? b.name.slice(0, 2) : '💇‍♀️'}
                  </div>
                  <div className="client-staff-card__name">{b.name}</div>
                  <div className="client-staff-card__role">{b.role || 'خبير تجميل'}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn--secondary" onClick={() => setStep(1)}>→ رجوع</button>
              <button className="client-btn-book" onClick={() => setStep(3)}>التالي (تحديد الموعد) ←</button>
            </div>
          </div>
        )}

        {/* ── الخطوة 3: تحديد التاريخ والوقت ── */}
        {step === 3 && (
          <div>
            <h2 className="client-section-title" style={{ fontSize: '1.6rem', textAlign: 'center' }}>
              حددي اليوم والوقت المناسب
            </h2>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">تاريخ الموعد *</label>
              <input
                type="date"
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">الأوقات المتاحة *</label>
              <div className="client-time-slots">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`client-slot-btn${bookingTime === t ? ' client-slot-btn--selected' : ''}`}
                    onClick={() => setBookingTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn--secondary" onClick={() => setStep(2)}>→ رجوع</button>
              <button className="client-btn-book" onClick={() => setStep(4)}>التالي (بيانات التواصل) ←</button>
            </div>
          </div>
        )}

        {/* ── الخطوة 4: بيانات العميل والتأكيد ── */}
        {step === 4 && (
          <form onSubmit={handleFinalSubmit}>
            <h2 className="client-section-title" style={{ fontSize: '1.6rem', textAlign: 'center' }}>
              تأكيد بيانات الحجز
            </h2>

            <div className="form-group">
              <label className="form-label">الاسم بالكامل *</label>
              <input
                type="text"
                className="form-input"
                placeholder="مثال: ياسمين محمد"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">رقم الموبايل / الواتساب *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="مثال: 01012345678"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات أو طلبات خاصة (اختياري)</label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="مثال: موعد مناسبة خاصة، شعر طويل..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* ملخص الحجز */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 12, margin: '1.25rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--c-text-muted)' }}>التاريخ والوقت:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--c-gold)' }}>{bookingDate} ({bookingTime})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>إجمالي المبلغ:</span>
                <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>{totalPrice} ج.م</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setStep(3)}>→ رجوع</button>
              <button type="submit" className="client-btn-book" disabled={loading}>
                {loading ? 'جارٍ تسجيل حجزك...' : '✨ تأكيد الحجز النهائي'}
              </button>
            </div>
          </form>
        )}

        {/* ── الخطوة 5: شاشة النجاح وكود الحجز ── */}
        {step === 5 && confirmedData && (
          <div className="client-success-box">
            <div className="client-success-icon">✓</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
              تم تأكيد حجزك الملكي بنجاح! 👑
            </h2>
            <p style={{ color: 'var(--c-text-secondary)', marginTop: '0.5rem' }}>
              ننتظرك بكل حب في صالون نهي السني. احتفظي بكود الحجز الخاص بكِ:
            </p>

            <div className="client-code-badge">
              {confirmedData.code || confirmedData.appointment_code}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: 16, textAlign: 'right', margin: '1.5rem 0' }}>
              <div style={{ margin: '6px 0' }}>👤 <strong>الاسم:</strong> {clientName}</div>
              <div style={{ margin: '6px 0' }}>📅 <strong>الموعد:</strong> {bookingDate} الساعة {bookingTime}</div>
              <div style={{ margin: '6px 0' }}>💰 <strong>إجمالي التكلفة:</strong> {totalPrice} ج.م</div>
              {selectedBarber && (
                <div style={{ margin: '6px 0' }}>✂️ <strong>المتخصصة:</strong> {selectedBarber.name}</div>
              )}
            </div>

            <button className="client-btn-book" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
              تم، شكراً لكم ✨
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
