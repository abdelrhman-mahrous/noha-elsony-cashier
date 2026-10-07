import { useState, useEffect, useMemo } from 'react'
import {
  getActiveStaff,
  getAppointmentsWithServicesForDate,
  assignStaffToTask,
  assignStaffToAllAppointmentTasks,
  toggleStaffAbsent
} from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatPrice, formatTime12 } from '../../lib/formatters'

export default function TasksPage() {
  const showToast = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [staffList, setStaffList] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningTaskId, setAssigningTaskId] = useState(null)
  const [assigningApptId, setAssigningApptId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | unassigned | partial | completed

  useEffect(() => {
    loadData()
  }, [selectedDate])

  async function loadData() {
    setLoading(true)
    try {
      const [staffData, apptsData] = await Promise.allSettled([
        getActiveStaff(),
        getAppointmentsWithServicesForDate(selectedDate),
      ])

      setStaffList(staffData.status === 'fulfilled' ? staffData.value : [])
      setAppointments(apptsData.status === 'fulfilled' ? apptsData.value : [])
    } catch (e) {
      showToast('خطأ في تحميل البيانات: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAbsent(staff) {
    try {
      await toggleStaffAbsent(staff.id, staff.is_absent)
      showToast(`تم تعديل حالة ${staff.name}`, 'info')
      setStaffList(prev =>
        prev.map(s => (s.id === staff.id ? { ...s, is_absent: !s.is_absent } : s))
      )
    } catch (e) {
      showToast('خطأ في تعديل الحالة: ' + e.message, 'error')
    }
  }

  // توزيع مهمة/خدمة منفردة
  async function handleAssignTask(taskId, staffId) {
    setAssigningTaskId(taskId)
    try {
      await assignStaffToTask(taskId, staffId)
      showToast(staffId ? 'تم إسناد المهمة للكوافيرة بنجاح' : 'تم إلغاء إسناد المهمة', 'success')
      await loadData()
    } catch (e) {
      showToast('خطأ في تعيين الكوافيرة: ' + e.message, 'error')
    } finally {
      setAssigningTaskId(null)
    }
  }

  // توزيع الموعد كاملاً بكل خدماته على كوافيرة واحدة
  async function handleAssignAllAppointment(appointmentId, staffId) {
    if (!staffId) return
    setAssigningApptId(appointmentId)
    try {
      await assignStaffToAllAppointmentTasks(appointmentId, staffId)
      const staffName = staffList.find(s => s.id === staffId)?.name || 'الكوافيرة'
      showToast(`تم إسناد جميع خدمات الموعد إلى ${staffName} بنجاح 💇‍♀️`, 'success')
      await loadData()
    } catch (e) {
      showToast('خطأ في توزيع الموعد: ' + e.message, 'error')
    } finally {
      setAssigningApptId(null)
    }
  }

  const availableStaff = staffList.filter(s => !s.is_absent)

  // حساب الإحصائيات السريعة
  const stats = useMemo(() => {
    let totalServices = 0
    let assignedServices = 0
    let completedServices = 0

    appointments.forEach(appt => {
      const services = appt.appointment_services || []
      services.forEach(srv => {
        totalServices++
        if (srv.assigned_to) assignedServices++
        if (srv.status === 'completed') completedServices++
      })
    })

    return {
      totalAppointments: appointments.length,
      totalServices,
      assignedServices,
      unassignedServices: totalServices - assignedServices,
      completedServices,
    }
  }, [appointments])

  // فلترة وبحث المواعيد
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      // بحث بالنص
      const query = searchQuery.trim().toLowerCase()
      if (query) {
        const nameMatch = (appt.user_name || '').toLowerCase().includes(query)
        const phoneMatch = (appt.user_phone || '').includes(query)
        const codeMatch = String(appt.appointment_code || '').includes(query)
        if (!nameMatch && !phoneMatch && !codeMatch) return false
      }

      // فلتر الحالة
      const services = appt.appointment_services || []
      if (services.length === 0) return statusFilter === 'all'

      const allAssigned = services.every(s => s.assigned_to)
      const noneAssigned = services.every(s => !s.assigned_to)
      const allCompleted = services.every(s => s.status === 'completed')

      if (statusFilter === 'unassigned') {
        return noneAssigned || services.some(s => !s.assigned_to)
      }
      if (statusFilter === 'partial') {
        return !noneAssigned && !allAssigned
      }
      if (statusFilter === 'assigned') {
        return allAssigned && !allCompleted
      }
      if (statusFilter === 'completed') {
        return allCompleted || appt.status === 'completed'
      }

      return true
    })
  }, [appointments, searchQuery, statusFilter])

  function getStaffPreferences(appt) {
    const prefIds = Array.isArray(appt.preferred_staff_ids) ? appt.preferred_staff_ids : []
    const avoidIds = Array.isArray(appt.avoided_staff_ids) ? appt.avoided_staff_ids : []

    const preferred = staffList.filter(s => prefIds.includes(s.id))
    const avoided = staffList.filter(s => avoidIds.includes(s.id))

    return { preferred, avoided, prefIds, avoidIds }
  }

  function renderStatusBadge(status) {
    switch (status) {
      case 'completed':
        return <span className="badge badge--success">✅ مكتمل</span>
      case 'confirmed':
        return <span className="badge badge--info">مؤكد</span>
      case 'pending':
        return <span className="badge badge--warning">معلق</span>
      case 'cancelled':
        return <span className="badge badge--danger">ملغي</span>
      default:
        return <span className="badge badge--secondary">{status || 'غير محدد'}</span>
    }
  }

  function setQuickDate(offsetDays) {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  return (
    <div className="owner-container">
      {/* ── رأس الصفحة والفلاتر ── */}
      <div className="owner-page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="owner-page-title">📋 توزيع المواعيد والمهام</h1>
          <p className="owner-page-subtitle">
            عرض المواعيد حسب العميل، رغبات وتفضيلات الكوافيرة، وإسناد الخدمات كلياً أو فردياً
          </p>
        </div>

        {/* اختيار التاريخ مع أزرار سريعة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="tasks-quick-dates">
            <button
              type="button"
              className={`tasks-date-btn ${selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'active' : ''}`}
              onClick={() => setQuickDate(-1)}
            >
              أمس
            </button>
            <button
              type="button"
              className={`tasks-date-btn ${selectedDate === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
              onClick={() => setQuickDate(0)}
            >
              اليوم
            </button>
            <button
              type="button"
              className={`tasks-date-btn ${selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'active' : ''}`}
              onClick={() => setQuickDate(1)}
            >
              غداً
            </button>
          </div>

          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', fontWeight: 'bold' }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* ── كروت الإحصائيات السريعة ── */}
      <div className="tasks-stats-grid">
        <div className="tasks-stat-card">
          <div className="tasks-stat-card__icon">📅</div>
          <div>
            <div className="tasks-stat-card__val">{stats.totalAppointments}</div>
            <div className="tasks-stat-card__lbl">إجمالي المواعيد</div>
          </div>
        </div>

        <div className="tasks-stat-card">
          <div className="tasks-stat-card__icon">✂️</div>
          <div>
            <div className="tasks-stat-card__val">{stats.totalServices}</div>
            <div className="tasks-stat-card__lbl">إجمالي الخدمات</div>
          </div>
        </div>

        <div className="tasks-stat-card tasks-stat-card--warning">
          <div className="tasks-stat-card__icon">🟡</div>
          <div>
            <div className="tasks-stat-card__val">{stats.unassignedServices}</div>
            <div className="tasks-stat-card__lbl">بانتظار التوزيع</div>
          </div>
        </div>

        <div className="tasks-stat-card tasks-stat-card--success">
          <div className="tasks-stat-card__icon">✅</div>
          <div>
            <div className="tasks-stat-card__val">{stats.assignedServices}</div>
            <div className="tasks-stat-card__lbl">تم توزيعها</div>
          </div>
        </div>
      </div>

      {/* ── شريط تواجد الموظفات ── */}
      <div className="owner-card" style={{ marginBottom: '1.25rem' }}>
        <div className="owner-card__header" style={{ paddingBottom: '0.6rem' }}>
          <h3 className="owner-card__title" style={{ fontSize: '1.05rem' }}>
            👥 طاقم العمل وتواجد اليوم ({availableStaff.length} حاضرة من {staffList.length})
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--staff-muted)' }}>
            اضغطي على اسم الكوافيرة لتبديل حالة الحضور / الغياب
          </span>
        </div>
        <div className="owner-staff-chips">
          {staffList.map((staff) => (
            <div
              key={staff.id}
              className={`owner-staff-chip${staff.is_absent ? ' owner-staff-chip--absent' : ' owner-staff-chip--present'}`}
              onClick={() => handleToggleAbsent(staff)}
              title="اضغطي لتبديل حالة الحضور / الغياب"
            >
              <span className="owner-staff-chip__status-dot" />
              <span className="owner-staff-chip__name">{staff.name}</span>
              <span className="owner-staff-chip__role">{staff.role || 'كوافيرة'}</span>
              <span className="owner-staff-chip__tag">
                {staff.is_absent ? 'غائبة' : 'حاضرة'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── شريط البحث والفلترة ── */}
      <div className="tasks-filter-bar">
        <div className="tasks-search-box">
          <span className="tasks-search-icon">🔍</span>
          <input
            type="text"
            className="tasks-search-input"
            placeholder="ابحثي باسم العميلة، رقم الهاتف، أو كود الموعد..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="tasks-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="tasks-filter-tabs">
          <button
            type="button"
            className={`tasks-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            الكل ({appointments.length})
          </button>
          <button
            type="button"
            className={`tasks-filter-tab ${statusFilter === 'unassigned' ? 'active' : ''}`}
            onClick={() => setStatusFilter('unassigned')}
          >
            🟡 بانتظار التوزيع
          </button>
          <button
            type="button"
            className={`tasks-filter-tab ${statusFilter === 'assigned' ? 'active' : ''}`}
            onClick={() => setStatusFilter('assigned')}
          >
            🟢 موزع بالكامل
          </button>
          <button
            type="button"
            className={`tasks-filter-tab ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            ✅ مكتمل
          </button>
        </div>
      </div>

      {/* ── المحتوى الرئيسي: قائمة المواعيد والخدمات ── */}
      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ تحميل المواعيد والمهام...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="owner-card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--staff-ink)' }}>لا توجد حجوزات مطابقة</h3>
          <p style={{ margin: 0, color: 'var(--staff-muted)', fontSize: '0.9rem' }}>
            {searchQuery || statusFilter !== 'all'
              ? 'جربي تغيير كلمات البحث أو تغيير الفلتر المختار'
              : 'لا توجد حجوزات مسجلة لهذا التاريخ'}
          </p>
        </div>
      ) : (
        <div className="tasks-appointments-grid">
          {filteredAppointments.map((appt) => {
            const services = appt.appointment_services || []
            const { preferred, avoided, prefIds, avoidIds } = getStaffPreferences(appt)
            const allServicesAssigned = services.length > 0 && services.every(s => s.assigned_to)
            const isCompleted = appt.status === 'completed'

            return (
              <div
                key={appt.id}
                className={`task-appt-card ${isCompleted ? 'task-appt-card--completed' : (allServicesAssigned ? 'task-appt-card--assigned' : '')}`}
              >
                {/* 1. رأس كارت الموعد */}
                <div className="task-appt-card__header">
                  <div className="task-appt-card__client-info">
                    <div className="task-appt-card__avatar">
                      👤
                    </div>
                    <div>
                      <div className="task-appt-card__client-name-row">
                        <span className="task-appt-card__client-name">
                          {appt.user_name || 'عميلة بدون اسم'}
                        </span>
                        {appt.appointment_code && (
                          <span className="task-appt-card__code">
                            #{appt.appointment_code}
                          </span>
                        )}
                        {renderStatusBadge(appt.status)}
                      </div>

                      <div className="task-appt-card__meta-row">
                        <span className="task-appt-card__phone">
                          📞 {appt.user_phone || '—'}
                        </span>
                        {appt.user_phone && (
                          <a
                            href={`https://wa.me/2${appt.user_phone.replace(/^0+/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="task-appt-card__wa-link"
                            title="مراسلة واتساب"
                          >
                            💬 واتساب
                          </a>
                        )}
                        <span className="task-appt-card__time">
                          ⏰ {formatTime12(appt.appointment_time)}
                        </span>
                        <span className="task-appt-card__price">
                          💰 {formatPrice(appt.price)} ج.م
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* إجراء التوزيع الجماعي للموعد كاملاً */}
                  {!isCompleted && services.length > 0 && (
                    <div className="task-appt-card__bulk-assign">
                      <span className="task-bulk-label">توزيع كل الموعد:</span>
                      <select
                        className="form-input form-select task-bulk-select"
                        disabled={assigningApptId === appt.id}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignAllAppointment(appt.id, e.target.value)
                            e.target.value = ''
                          }
                        }}
                      >
                        <option value="" disabled>
                          {assigningApptId === appt.id ? 'جارٍ التوزيع...' : '⚡ إسناد الكل لكوافيرة'}
                        </option>
                        {availableStaff.map((staff) => {
                          const isPref = prefIds.includes(staff.id)
                          const isAvoid = avoidIds.includes(staff.id)
                          return (
                            <option
                              key={staff.id}
                              value={staff.id}
                              style={{
                                fontWeight: isPref ? 'bold' : 'normal',
                                color: isPref ? '#1b5e20' : (isAvoid ? '#c62828' : 'inherit')
                              }}
                            >
                              {isPref ? '⭐ ' : isAvoid ? '⚠️ ' : ''}
                              {staff.name} ({staff.role || 'كوافيرة'})
                              {isPref ? ' [مفضلة للعميلة]' : isAvoid ? ' [تتجنبها العميلة]' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* 2. شريط تفضيلات العميلة (المفضلة / المتجنبة) */}
                {(preferred.length > 0 || avoided.length > 0) && (
                  <div className="task-appt-preferences">
                    {preferred.length > 0 && (
                      <div className="task-pref-group task-pref-group--fav">
                        <span className="task-pref-icon">⭐</span>
                        <span className="task-pref-label">المفضلة للعميلة:</span>
                        <div className="task-pref-tags">
                          {preferred.map(st => (
                            <span key={st.id} className="task-pref-tag task-pref-tag--fav">
                              {st.name} ({st.role || 'كوافيرة'})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {avoided.length > 0 && (
                      <div className="task-pref-group task-pref-group--avoid">
                        <span className="task-pref-icon">🚫</span>
                        <span className="task-pref-label">تتجنب التعامل مع:</span>
                        <div className="task-pref-tags">
                          {avoided.map(st => (
                            <span key={st.id} className="task-pref-tag task-pref-tag--avoid">
                              {st.name} ({st.role || 'كوافيرة'})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. قائمة الخدمات التابعة لهذا الموعد */}
                <div className="task-appt-services-list">
                  <div className="task-services-header">
                    <span>✂️ الخدمات المطلوبة في الموعد ({services.length}):</span>
                  </div>

                  {services.length === 0 ? (
                    <div className="task-service-empty">لا توجد خدمات مسجلة لهذا الموعد</div>
                  ) : (
                    services.map((service, idx) => {
                      const isSrvCompleted = service.status === 'completed' || isCompleted
                      const assignedStaff = service.salon_staff || staffList.find(s => s.id === service.assigned_to)
                      const isAssignedToPref = assignedStaff && prefIds.includes(assignedStaff.id)
                      const isAssignedToAvoid = assignedStaff && avoidIds.includes(assignedStaff.id)

                      return (
                        <div
                          key={service.id || idx}
                          className={`task-service-row ${isSrvCompleted ? 'task-service-row--completed' : (service.assigned_to ? 'task-service-row--assigned' : 'task-service-row--pending')}`}
                        >
                          {/* تفاصيل الخدمة */}
                          <div className="task-service-info">
                            <span className="task-service-index">{idx + 1}</span>
                            <div>
                              <div className="task-service-name">
                                {service.service_name || 'خدمة'}
                              </div>
                              <div className="task-service-meta">
                                <span>💵 {formatPrice(service.price)} ج.م</span>
                                {service.duration_minutes && (
                                  <span>• ⏱️ {service.duration_minutes} دقيقة</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* اختيار الكوافيرة للخدمة */}
                          <div className="task-service-assignment">
                            {isSrvCompleted ? (
                              <div className="badge badge--success" style={{ padding: '6px 12px' }}>
                                ✅ تم الإنجاز {assignedStaff ? `بواسطة ${assignedStaff.name}` : ''}
                              </div>
                            ) : (
                              <div className="task-service-select-wrapper">
                                <select
                                  className={`form-input form-select task-service-select ${isAssignedToPref ? 'task-select--pref' : (isAssignedToAvoid ? 'task-select--avoid' : '')}`}
                                  value={service.assigned_to || ''}
                                  disabled={assigningTaskId === service.id}
                                  onChange={(e) => handleAssignTask(service.id, e.target.value)}
                                >
                                  <option value="">-- اختاري الكوافيرة --</option>
                                  {availableStaff.map((staff) => {
                                    const isPref = prefIds.includes(staff.id)
                                    const isAvoid = avoidIds.includes(staff.id)
                                    return (
                                      <option
                                        key={staff.id}
                                        value={staff.id}
                                        style={{
                                          fontWeight: isPref ? 'bold' : 'normal',
                                          color: isPref ? '#1b5e20' : (isAvoid ? '#c62828' : 'inherit')
                                        }}
                                      >
                                        {isPref ? '⭐ ' : isAvoid ? '⚠️ ' : ''}
                                        {staff.name} ({staff.role || 'كوافيرة'})
                                        {isPref ? ' [مفضلة]' : isAvoid ? ' [متجنبة]' : ''}
                                      </option>
                                    )
                                  })}
                                </select>

                                {service.assigned_to && (
                                  <button
                                    type="button"
                                    className="task-unassign-btn"
                                    title="إلغاء التعيين"
                                    disabled={assigningTaskId === service.id}
                                    onClick={() => handleAssignTask(service.id, '')}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
