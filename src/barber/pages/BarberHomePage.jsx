import { useState, useEffect, useCallback, useRef } from 'react'
import { useBarberAuth } from '../../context/BarberAuthContext'
import { useToast } from '../../context/ToastContext'
import {
  getBarberAppointments,
  getBarberStats,
  completeAppointment,
  sendClientReminder,
  subscribeToBarberUpdates,
  formatTime12,
  playNotificationSound,
} from '../../services/barberService'
import { formatPrice } from '../../lib/formatters'

export default function BarberHomePage({ setTopBarRefreshFn }) {
  const { barber, soundEnabled } = useBarberAuth()
  const showToast = useToast()

  const [appointments, setAppointments] = useState([])
  const [stats, setStats] = useState({
    todayCount: 0,
    completedCount: 0,
    totalCount: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('upcoming') // 'upcoming' | 'completed' | 'all'

  // التنبيهات المباشرة الواردة من صفحة الأونر
  const [newAssignmentAlert, setNewAssignmentAlert] = useState(null)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)

  // النوافذ المنبثقة
  const [completingApt, setCompletingApt] = useState(null)
  const [completingLoading, setCompletingLoading] = useState(false)
  const [remindingApt, setRemindingApt] = useState(null)
  const [previewImageUrl, setPreviewImageUrl] = useState(null)

  const barberId = barber?.id

  // تحميل المواعيد والإحصائيات
  const loadData = useCallback(async (isSilent = false) => {
    if (!barberId) return
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const appts = await getBarberAppointments(barberId)
      const st = await getBarberStats(barberId, appts)
      setAppointments(appts)
      setStats(st)
    } catch (err) {
      showToast('خطأ في تحميل المواعيد: ' + err.message, 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [barberId, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // الاشتراك في التحديثات اللحظية (Real-time updates)
  useEffect(() => {
    if (!barberId) return

    const unsubscribe = subscribeToBarberUpdates(barberId, (payload) => {
      if (soundEnabled) {
        playNotificationSound()
      }

      // إشعار فوري في الصفحة
      const alertInfo = {
        title: '🎉 تم إسناد مهمة / حجز جديد لكِ!',
        details: payload.type === 'task_service'
          ? 'تم توزيع خدمة جديدة عليكِ من قِبَل الأونر'
          : 'وصل حجز موعد جديد مسند إليكِ',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        record: payload.record,
      }

      setNewAssignmentAlert(alertInfo)
      setShowNewTaskModal(true)
      showToast('🔔 إشعار جديد: تم توزيع مهمة جديدة عليكِ الآن!', 'info')

      // إعادة تحميل القائمة والإحصائيات تلقائياً
      loadData(true)
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [barberId, soundEnabled, loadData, showToast])

  // حساب ما إذا كان وقت الموعد قد مضى
  function isAppointmentTimePassed(apt) {
    if (!apt.appointmentDate || !apt.appointmentTime) return true
    try {
      const parts = (apt.appointmentTime || '').trim().replace(/[APMapm\s]/g, '').split(':')
      const isPM = (apt.appointmentTime || '').toUpperCase().includes('PM')
      let h = parseInt(parts[0], 10) || 0
      const m = parseInt(parts[1], 10) || 0
      if (isPM && h !== 12) h += 12
      if (!isPM && h === 12) h = 0

      const aptDate = new Date(apt.appointmentDate)
      aptDate.setHours(h, m, 0, 0)
      return aptDate <= new Date()
    } catch (_) {
      return true
    }
  }

  // حساب الوقت المتبقي
  function getTimeRemaining(apt) {
    if (!apt.appointmentDate || !apt.appointmentTime) return '—'
    try {
      const parts = (apt.appointmentTime || '').trim().replace(/[APMapm\s]/g, '').split(':')
      const isPM = (apt.appointmentTime || '').toUpperCase().includes('PM')
      let h = parseInt(parts[0], 10) || 0
      const m = parseInt(parts[1], 10) || 0
      if (isPM && h !== 12) h += 12
      if (!isPM && h === 12) h = 0

      const aptDate = new Date(apt.appointmentDate)
      aptDate.setHours(h, m, 0, 0)

      const diffMs = aptDate - new Date()
      const diffMin = Math.round(diffMs / 60000)

      if (diffMin > 1440) return `باقي ${Math.floor(diffMin / 1440)} يوم`
      if (diffMin > 60) return `باقي ${Math.floor(diffMin / 60)} ساعة`
      if (diffMin > 0) return `باقي ${diffMin} دقيقة`
      if (diffMin >= -30) return 'الآن'
      return 'انتهى وقته'
    } catch (_) {
      return '—'
    }
  }

  // تنسيق التاريخ بالعربي
  function formatDateArabic(dateStr) {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    } catch (_) {
      return dateStr
    }
  }

  // فلترة المواعيد بحسب التبويب النشط
  const todayStr = new Date().toISOString().split('T')[0]

  const filteredAppointments = appointments.filter((apt) => {
    if (apt.status === 'cancelled') return filter === 'all'

    if (filter === 'upcoming') {
      return apt.status !== 'completed' && (apt.appointmentDate === todayStr || apt.appointmentDate >= todayStr)
    }
    if (filter === 'completed') {
      return apt.status === 'completed'
    }
    return true
  })

  // إرسال تذكير للعميلة
  async function handleSendReminder() {
    if (!remindingApt) return
    try {
      await sendClientReminder(remindingApt, barber?.name || 'الكوافيرة')
      showToast('تم إرسال إشعار التذكير للعميلة بنجاح ✅', 'success')
      setRemindingApt(null)
    } catch (err) {
      showToast('فشل إرسال التذكير: ' + err.message, 'error')
    }
  }

  // تأكيد إنهاء الموعد
  async function handleConfirmComplete() {
    if (!completingApt) return
    setCompletingLoading(true)
    try {
      await completeAppointment(
        completingApt.id,
        barberId,
        completingApt.packagePrice,
        completingApt.taskId
      )
      showToast('تم إنهاء الموعد وتأكيد الخدمة بنجاح 🌸', 'success')
      setCompletingApt(null)
      loadData(true)
    } catch (err) {
      showToast('خطأ في إنهاء الموعد: ' + err.message, 'error')
    } finally {
      setCompletingLoading(false)
    }
  }

  return (
    <div className="barber-container">
      {/* ── شريط التنبيه اللحظي عند إسناد مهمة جديدة من الأونر ── */}
      {newAssignmentAlert && (
        <div className="barber-alert-banner">
          <div className="barber-alert-banner__content">
            <span className="barber-alert-banner__icon">🔔</span>
            <div>
              <div className="barber-alert-banner__title">
                {newAssignmentAlert.title}
              </div>
              <div className="barber-alert-banner__sub">
                {newAssignmentAlert.details} • الساعة {newAssignmentAlert.time}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="barber-alert-banner__btn"
              onClick={() => {
                setFilter('upcoming')
                setNewAssignmentAlert(null)
              }}
            >
              عرض المهام
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
              onClick={() => setNewAssignmentAlert(null)}
              title="إغلاق التنبيه"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── بطاقة الإحصائيات الملكية ── */}
      <div className="barber-stats-card">
        <div className="barber-stats-grid">
          {/* مواعيد اليوم */}
          <div className="barber-stat-item">
            <span className="barber-stat-item__icon">📅</span>
            <span className="barber-stat-item__val">
              {stats.todayCount}
            </span>
            <span className="barber-stat-item__label">مواعيد اليوم</span>
          </div>

          {/* المكتملة */}
          <div className="barber-stat-item">
            <span className="barber-stat-item__icon">✅</span>
            <span className="barber-stat-item__val">
              {stats.completedCount}
            </span>
            <span className="barber-stat-item__label">المكتملة</span>
          </div>

          {/* إجمالي الحجوزات */}
          <div className="barber-stat-item">
            <span className="barber-stat-item__icon">📋</span>
            <span className="barber-stat-item__val">
              {stats.totalCount}
            </span>
            <span className="barber-stat-item__label">إجمالي المهام</span>
          </div>

          {/* الإيرادات */}
          <div className="barber-stat-item">
            <span className="barber-stat-item__icon">💰</span>
            <span className="barber-stat-item__val barber-stat-item__val--gold">
              {formatPrice(stats.totalRevenue)} ج
            </span>
            <span className="barber-stat-item__label">الإيرادات المنجزة</span>
          </div>
        </div>
      </div>

      {/* ── تبويبات الفلترة ── */}
      <div className="barber-filter-tabs">
        <button
          type="button"
          className={`barber-filter-tab ${filter === 'upcoming' ? 'barber-filter-tab--active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          <span>📅 مواعيد اليوم والمهام القادمة</span>
          <span className="barber-filter-tab__count">
            {appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length}
          </span>
        </button>

        <button
          type="button"
          className={`barber-filter-tab ${filter === 'completed' ? 'barber-filter-tab--active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <span>✅ المكتملة</span>
          <span className="barber-filter-tab__count">
            {stats.completedCount}
          </span>
        </button>

        <button
          type="button"
          className={`barber-filter-tab ${filter === 'all' ? 'barber-filter-tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <span>📋 كل المواعيد</span>
          <span className="barber-filter-tab__count">
            {appointments.length}
          </span>
        </button>
      </div>

      {/* ── قائمة المواعيد والمهام ── */}
      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span style={{ marginTop: '1rem', color: '#94a3b8' }}>جارٍ تحميل المهام والمواعيد...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="barber-empty-state">
          <div className="barber-empty-icon">✂️</div>
          <div className="barber-empty-text">لا توجد مواعيد أو مهام في هذا التبويب</div>
          <div className="barber-empty-sub">
            {filter === 'upcoming'
              ? 'أي مهمة جديدة يتم توزيعها عليكِ من صفحة الأونر ستظهر هنا مباشرة مع تنبيه صوتي'
              : 'يمكنك التبديل بين التبويبات بالأعلى لعرض كافة المواعيد'}
          </div>
        </div>
      ) : (
        <div className="barber-appointments-list">
          {filteredAppointments.map((apt) => {
            const isCompleted = apt.status === 'completed'
            const isToday = apt.appointmentDate === todayStr
            const timeRemaining = getTimeRemaining(apt)
            const canComplete = !isCompleted

            return (
              <div
                key={`${apt.id}_${apt.taskId || ''}`}
                className={`barber-appointment-card ${isCompleted ? 'barber-appointment-card--completed' : ''} ${isToday ? 'barber-appointment-card--today' : ''}`}
              >
                {/* الرأس: بيانات العميلة والسعر والحالة */}
                <div className="barber-card-header">
                  <div className="barber-client-info">
                    {/* صورة العميلة أو قصة الشعر */}
                    <div
                      className="barber-client-avatar"
                      onClick={() => {
                        if (apt.haircutImageUrl || apt.userImage) {
                          setPreviewImageUrl(apt.haircutImageUrl || apt.userImage)
                        }
                      }}
                      title={apt.haircutImageUrl ? 'اضغطي لتكبير صورة القصة / الخدمة' : 'صورة العميلة'}
                    >
                      {apt.haircutImageUrl ? (
                        <img src={apt.haircutImageUrl} alt="قصة الشعر" />
                      ) : apt.userImage ? (
                        <img src={apt.userImage} alt={apt.userName} />
                      ) : (
                        <span style={{ fontSize: '1.4rem' }}>👤</span>
                      )}
                    </div>

                    <div className="barber-client-details">
                      <div className="barber-client-name">
                        {apt.userName}
                      </div>
                      <div className="barber-package-name">
                        <span>✂️ {apt.packageName}</span>
                      </div>
                      {apt.userPhone && (
                        <a
                          href={`tel:${apt.userPhone}`}
                          className="barber-client-phone"
                          title="اضغطي للاتصال بالعميلة مباشرة"
                        >
                          <span>📞 {apt.userPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="barber-card-meta">
                    {/* شارة الحالة */}
                    <span className={`barber-status-badge ${isCompleted ? 'barber-status-badge--completed' : 'barber-status-badge--upcoming'}`}>
                      {isCompleted ? '✅ مكتمل' : '⏰ قادم ومؤكد'}
                    </span>

                    {/* السعر */}
                    <div className="barber-price-tag">
                      <span>{formatPrice(apt.packagePrice)}</span>
                      <span style={{ fontSize: '0.85rem' }}>ج.م</span>
                    </div>
                  </div>
                </div>

                {/* تفاصيل الموعد والوقت والملاحظات */}
                <div className="barber-info-row">
                  <div className="barber-info-item">
                    <span>📅</span>
                    <span>{formatDateArabic(apt.appointmentDate)}</span>
                  </div>

                  <div className="barber-info-item">
                    <span>⏰</span>
                    <span style={{ fontWeight: 700, color: '#fef08a' }}>
                      {formatTime12(apt.appointmentTime)}
                    </span>
                  </div>

                  {!isCompleted && (
                    <div className="barber-time-countdown">
                      {timeRemaining}
                    </div>
                  )}
                </div>

                {/* ملاحظات الحجز إن وجدت */}
                {apt.notes && (
                  <div className="barber-notes-box">
                    <strong>📝 ملاحظات:</strong> {apt.notes}
                  </div>
                )}

                {/* أزرار الإجراءات */}
                {!isCompleted && (
                  <div className="barber-card-actions">
                    {/* زر التذكير */}
                    <button
                      type="button"
                      className="barber-btn-reminder"
                      onClick={() => setRemindingApt(apt)}
                      title="إرسال إشعار تذكير للعميلة بموعدها"
                    >
                      <span>🔔</span>
                      <span>إرسال تذكير</span>
                    </button>

                    {/* زر إنهاء الموعد وتأكيد الإنجاز */}
                    <button
                      type="button"
                      className="barber-btn-complete"
                      onClick={() => setCompletingApt(apt)}
                      title="تأكيد إتمام الخدمة وتأكيد الموعد"
                    >
                      <span>✨</span>
                      <span>تمت الحلاقة / إنهاء الموعد</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── نافذة تأكيد إتمام الموعد (Complete Dialog) ── */}
      {completingApt && (
        <div className="barber-modal-overlay">
          <div className="barber-modal-box">
            <div className="barber-modal-header">
              <h3 className="barber-modal-title">
                <span>✨ تأكيد إنهاء الموعد</span>
              </h3>
              <button
                type="button"
                className="barber-modal-close"
                onClick={() => setCompletingApt(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#e2e8f0', margin: '0.75rem 0' }}>
              هل أتممتِ تقديم خدمة <strong>{completingApt.packageName}</strong> للعميلة <strong>{completingApt.userName}</strong>؟
            </p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              سيتم تسجيل إتمام الموعد وإرسال إشعار للعميلة لتقييم خدمتك المميزة ⭐
            </p>

            <div className="barber-modal-actions">
              <button
                type="button"
                className="barber-btn-secondary"
                onClick={() => setCompletingApt(null)}
                disabled={completingLoading}
              >
                رجوع
              </button>
              <button
                type="button"
                className="barber-btn-primary"
                onClick={handleConfirmComplete}
                disabled={completingLoading}
              >
                {completingLoading ? 'جارٍ الحفظ...' : 'تأكيد الإنهاء ✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة تأكيد إرسال التذكير (Reminder Dialog) ── */}
      {remindingApt && (
        <div className="barber-modal-overlay">
          <div className="barber-modal-box">
            <div className="barber-modal-header">
              <h3 className="barber-modal-title">
                <span>🔔 إرسال تذكير للعميلة</span>
              </h3>
              <button
                type="button"
                className="barber-modal-close"
                onClick={() => setRemindingApt(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#e2e8f0', margin: '0.75rem 0' }}>
              هل ترغبين بإرسال إشعار تذكير للعميلة <strong>{remindingApt.userName}</strong> بموعدها في تمام الساعة <strong>{formatTime12(remindingApt.appointmentTime)}</strong>؟
            </p>

            <div className="barber-modal-actions">
              <button
                type="button"
                className="barber-btn-secondary"
                onClick={() => setRemindingApt(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="barber-btn-primary"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}
                onClick={handleSendReminder}
              >
                إرسال التذكير 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة معاينة صورة القصة / الخدمة ── */}
      {previewImageUrl && (
        <div className="barber-modal-overlay" onClick={() => setPreviewImageUrl(null)}>
          <div className="barber-modal-box" style={{ maxWidth: '600px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="barber-modal-header">
              <h3 className="barber-modal-title">
                <span>🖼️ معاينة الصورة</span>
              </h3>
              <button
                type="button"
                className="barber-modal-close"
                onClick={() => setPreviewImageUrl(null)}
              >
                ✕
              </button>
            </div>

            <img
              src={previewImageUrl}
              alt="صورة الخدمة"
              className="barber-image-preview-img"
            />

            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="barber-btn-secondary"
                onClick={() => setPreviewImageUrl(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة منبثقة عند استلام مهمة جديدة من الأونر ── */}
      {showNewTaskModal && newAssignmentAlert && (
        <div className="barber-modal-overlay">
          <div className="barber-modal-box" style={{ border: '2px solid #2dd4bf' }}>
            <div className="barber-modal-header">
              <h3 className="barber-modal-title" style={{ color: '#2dd4bf' }}>
                <span>🎉 حجز ومهمة جديدة!</span>
              </h3>
              <button
                type="button"
                className="barber-modal-close"
                onClick={() => setShowNewTaskModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '0.75rem 0', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✂️</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                تم توزيع مهمة / موعد جديد عليكِ الآن!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                تم تحديث قائمة المواعيد اليومية تلقائياً لتتمكني من متابعة العميلة.
              </p>
            </div>

            <div className="barber-modal-actions">
              <button
                type="button"
                className="barber-btn-primary"
                onClick={() => {
                  setShowNewTaskModal(false)
                  setFilter('upcoming')
                }}
              >
                رائع، حسناً 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
