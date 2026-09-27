import { useState, useEffect } from 'react'
import { getAllStaff, toggleStaffAbsent, deactivateStaff, reactivateStaff } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'

export default function TeamPage() {
  const showToast = useToast()
  const [staffList, setStaffList] = useState([])
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'inactive'
  const [loading, setLoading] = useState(true)
  const [actionStaff, setActionStaff] = useState(null) // Staff to deactivate
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadStaff()
  }, [])

  async function loadStaff() {
    setLoading(true)
    try {
      const data = await getAllStaff()
      setStaffList(data)
    } catch (e) {
      showToast('خطأ في تحميل بيانات الفريق: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAbsent(staff) {
    try {
      await toggleStaffAbsent(staff.id, staff.is_absent)
      showToast(`تم تغيير حالة تواجد ${staff.name}`, 'info')
      setStaffList(prev =>
        prev.map(s => (s.id === staff.id ? { ...s, is_absent: !s.is_absent } : s))
      )
    } catch (e) {
      showToast('خطأ في تغيير الحالة: ' + e.message, 'error')
    }
  }

  async function handleConfirmDeactivate() {
    if (!actionStaff) return
    setProcessing(true)
    try {
      await deactivateStaff(actionStaff.id)
      showToast(`تم إنهاء عمل وفصل ${actionStaff.name} من الصالون بنجاح`, 'success')
      setActionStaff(null)
      loadStaff()
    } catch (e) {
      showToast('خطأ في إنهاء العمل: ' + e.message, 'error')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReactivate(staff) {
    try {
      await reactivateStaff(staff.id)
      showToast(`تمت إعادة وتفعيل حساب ${staff.name} بنجاح`, 'success')
      loadStaff()
    } catch (e) {
      showToast('خطأ في تفعيل الحساب: ' + e.message, 'error')
    }
  }

  const activeStaff = staffList.filter(s => s.is_active !== false)
  const inactiveStaff = staffList.filter(s => s.is_active === false)
  const presentCount = activeStaff.filter(s => !s.is_absent).length
  const displayedList = activeTab === 'active' ? activeStaff : inactiveStaff

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">👥 إدارة طاقم العمل</h1>
          <p className="owner-page-subtitle">متابعة الكوافيرات، حالات الحضور والغياب، وفصل أو إعادة تعيين الموظفات</p>
        </div>
        <div className="badge badge--success" style={{ fontSize: '1rem', padding: '8px 16px' }}>
          {presentCount} متواجدة اليوم من {activeStaff.length} بالخدمة
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div className="owner-filters-card">
        <div className="owner-period-tabs">
          <button
            className={`owner-period-tab${activeTab === 'active' ? ' owner-period-tab--active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            ✂️ الكوافيرات بالخدمة ({activeStaff.length})
          </button>
          <button
            className={`owner-period-tab${activeTab === 'inactive' ? ' owner-period-tab--active' : ''}`}
            onClick={() => setActiveTab('inactive')}
          >
            🚫 المفصولات والسابريات ({inactiveStaff.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ تحميل طاقم العمل...</span>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="owner-card">
          <div className="owner-empty-state">
            <span>{activeTab === 'active' ? 'لا توجد كوافيرات نشطات حالياً' : 'لا توجد كوافيرات مفصولات'}</span>
          </div>
        </div>
      ) : (
        <div className="owner-team-grid">
          {displayedList.map((member) => {
            const isActive = member.is_active !== false

            return (
              <div
                key={member.id}
                className={`owner-team-card${!isActive ? ' owner-team-card--disabled' : member.is_absent ? ' owner-team-card--absent' : ''}`}
                style={!isActive ? { opacity: 0.85, borderStyle: 'dashed' } : {}}
              >
                <div className="owner-team-card__avatar" style={!isActive ? { background: '#94a3b8' } : {}}>
                  {member.name ? member.name.slice(0, 2) : '✂️'}
                </div>

                <div className="owner-team-card__body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div className="owner-team-card__name">{member.name}</div>
                    {!isActive && (
                      <span className="badge badge--danger" style={{ fontSize: '0.75rem' }}>🚫 مفصولة</span>
                    )}
                  </div>
                  <div className="owner-team-card__role">{member.role || 'أخصائية تجميل'}</div>
                  {member.phone && (
                    <div className="owner-team-card__phone">📞 {member.phone}</div>
                  )}
                  {member.specialty && (
                    <div className="owner-team-card__specialty">✨ {member.specialty}</div>
                  )}
                </div>

                <div className="owner-team-card__footer" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                  {isActive ? (
                    <>
                      <button
                        className={`btn btn--sm ${member.is_absent ? 'btn--secondary' : 'btn--primary'}`}
                        style={!member.is_absent ? { background: 'var(--rose-gradient)' } : {}}
                        onClick={() => handleToggleAbsent(member)}
                      >
                        {member.is_absent ? '🔴 غائبة (اضغطي لتسجيل الحضور)' : '🟢 حاضرة (اضغطي لتسجيل الغياب)'}
                      </button>

                      <button
                        className="btn btn--sm btn--secondary"
                        style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        onClick={() => setActionStaff(member)}
                      >
                        ⚠️ فصل من الصالون
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn--sm btn--primary"
                      style={{ background: '#10b981' }}
                      onClick={() => handleReactivate(member)}
                    >
                      🔄 إعادة للعمل وتفعيل الحساب
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── نافذة تأكيد الفصل ── */}
      {actionStaff && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>⚠️ تأكيد فصل كوافيرة من الصالون</h3>
              <button className="modal-close-btn" onClick={() => setActionStaff(null)}>✕</button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <p style={{ fontSize: '1rem', lineHeight: '1.7', marginBottom: '1rem' }}>
                هل أنتِ متأكدة من إنهاء عمل <strong>{actionStaff.name}</strong> وفصلها من الصالون؟
              </p>
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '12px 16px', color: '#9f1239', fontSize: '0.9rem' }}>
                📌 <strong>ملاحظة هامة:</strong> سيتم تلقائياً إلغاء إسناد كافة المهام المستقبلية المعينة لها وإرجاعها لحالة "بدون توزيع" لتتمكني من توزيعها على كوافيرة أخرى.
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setActionStaff(null)}
                disabled={processing}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ background: '#ef4444' }}
                onClick={handleConfirmDeactivate}
                disabled={processing}
              >
                {processing ? 'جارٍ الفصل...' : 'تأكيد الفصل وإنهاء العمل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
