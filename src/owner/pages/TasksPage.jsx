import { useState, useEffect } from 'react'
import { getActiveStaff, getTodayUnassignedAppointments, getTasksForDate, assignStaffToTask, toggleStaffAbsent } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatPrice, formatTime12 } from '../../lib/formatters'

export default function TasksPage() {
  const showToast = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [staffList, setStaffList] = useState([])
  const [tasks, setTasks] = useState([])
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState(null)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  async function loadData() {
    setLoading(true)
    try {
      const [staffData, tasksData, apptsData] = await Promise.allSettled([
        getActiveStaff(),
        getTasksForDate(selectedDate),
        getTodayUnassignedAppointments(selectedDate),
      ])

      setStaffList(staffData.status === 'fulfilled' ? staffData.value : [])
      setTasks(tasksData.status === 'fulfilled' ? tasksData.value : [])
      setAppts(apptsData.status === 'fulfilled' ? apptsData.value : [])
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

  async function handleAssign(taskId, staffId) {
    if (!staffId) return
    setAssigningId(taskId)
    try {
      await assignStaffToTask(taskId, staffId)
      showToast('تم تعيين الكوافيرة بنجاح', 'success')
      loadData()
    } catch (e) {
      showToast('خطأ في تعيين الكوافيرة: ' + e.message, 'error')
    } finally {
      setAssigningId(null)
    }
  }

  const availableStaff = staffList.filter(s => !s.is_absent)

  function renderStatusBadge(status) {
    switch (status) {
      case 'completed':
        return <span className="badge badge--success">✅ مكتمل ومنجز</span>
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

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">📋 توزيع المهام والحجوزات</h1>
          <p className="owner-page-subtitle">متابعة الحجوزات، حالة إنجاز الخدمات، وإسناد المهام لطاقم العمل</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label className="form-label" style={{ margin: 0, fontWeight: 'bold' }}>التاريخ:</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* ── شريط تواجد الموظفات ── */}
      <div className="owner-card" style={{ marginBottom: '1.5rem' }}>
        <div className="owner-card__header">
          <h3 className="owner-card__title">👥 طاقم العمل وتواجد اليوم ({availableStaff.length} حاضرة من {staffList.length})</h3>
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

      {loading ? (
        <div className="loading-center" style={{ minHeight: '250px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ تحميل المواعيد والمهام...</span>
        </div>
      ) : (
        <div className="owner-two-col">
          {/* 1. حجوزات التاريخ المحدد */}
          <div className="owner-card">
            <div className="owner-card__header">
              <h3 className="owner-card__title">📅 حجوزات التاريخ ({appts.length})</h3>
            </div>
            {appts.length === 0 ? (
              <div className="owner-empty-state">
                <span>لا توجد حجوزات مسجلة لهذا التاريخ</span>
              </div>
            ) : (
              <div className="owner-tasks-list">
                {appts.map((appt) => (
                  <div key={appt.id} className="owner-task-item">
                    <div className="owner-task-item__header">
                      <div>
                        <div className="owner-task-item__client" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>👤 {appt.user_name || 'عميلة بدون اسم'}</span>
                          {renderStatusBadge(appt.status)}
                        </div>
                        <div className="owner-task-item__phone">
                          📞 {appt.user_phone || '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span className="badge badge--gold">
                          ⏰ {formatTime12(appt.appointment_time)}
                        </span>
                        <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold', marginTop: 4 }}>
                          {formatPrice(appt.price)} ج.م
                        </div>
                      </div>
                    </div>

                    {/* الخدمات المطلوبة في الموعد */}
                    <div className="owner-task-item__services">
                      {(appt.appointment_services || []).map((srv, idx) => (
                        <span key={idx} className="owner-task-service-tag">
                          {srv.service_name} ({formatPrice(srv.price)} ج.م) {srv.status === 'completed' ? '• ✅ منجزة' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. المهام والتوزيع */}
          <div className="owner-card">
            <div className="owner-card__header">
              <h3 className="owner-card__title">✂️ المهام اليومية والتوزيع ({tasks.length})</h3>
            </div>
            {tasks.length === 0 ? (
              <div className="owner-empty-state">
                <span>لا توجد مهام مسجلة لهذا التاريخ</span>
              </div>
            ) : (
              <div className="owner-tasks-list">
                {tasks.map((task) => {
                  const isCompleted = task.status === 'completed' || task.appointments?.status === 'completed'
                  const assignedStaffName = task.salon_staff?.name || staffList.find(s => s.id === (task.assigned_to || task.assigned_staff_id))?.name

                  return (
                    <div key={task.id} className={`owner-task-item${isCompleted ? ' owner-task-item--completed' : ''}`}>
                      <div className="owner-task-item__header">
                        <div>
                          <div className="owner-task-item__client">
                            ✂️ {task.service_name || task.task_name || 'خدمة'} ({formatPrice(task.price)} ج.م)
                          </div>
                          <div className="owner-task-item__phone">
                            👤 {task.appointments?.user_name || 'عميلة'} {task.appointments?.appointment_time ? `• ⏰ ${formatTime12(task.appointments.appointment_time)}` : ''}
                          </div>
                        </div>

                        <div>
                          {isCompleted ? (
                            <div className="badge badge--success" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                              ✅ تم الإنجاز {assignedStaffName ? `(${assignedStaffName})` : ''}
                            </div>
                          ) : (
                            <select
                              className="form-input form-select"
                              value={task.assigned_to || task.assigned_staff_id || ''}
                              disabled={assigningId === task.id}
                              onChange={e => handleAssign(task.id, e.target.value)}
                            >
                              <option value="">-- بانتظار التوزيع (اختاري) --</option>
                              {availableStaff.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.role || 'كوافيرة'})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
