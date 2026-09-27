import { supabase } from '../lib/supabase'

/**
 * صوت تنبيه ناعم وفاخر باستخدام Web Audio API عند وصول مهمة جديدة
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    // نغمات متتالية رقيقة (Chime)
    playTone(587.33, 0.0, 0.4) // D5
    playTone(880.00, 0.15, 0.5) // A5
    playTone(1174.66, 0.3, 0.8) // D6
  } catch (err) {
    console.warn('Audio alert not supported or blocked:', err)
  }
}

/**
 * تسجيل دخول الكوافيرة / الحلاق
 * يدعم:
 * 1) Supabase Auth (بالإيميل المباشر أو برقم الهاتف: phone@app.com)
 * 2) RPC barber_web_login (إذا كان معرف في Postgres)
 * 3) البحث المباشر في جداول barbers أو salon_staff
 */
export async function loginBarber(identifier, password) {
  const cleanId = (identifier || '').trim()
  if (!cleanId) throw new Error('الرجاء إدخال الإيميل أو رقم الهاتف')
  if (!password) throw new Error('الرجاء إدخال كلمة المرور')

  let userEmail = cleanId
  const isPhoneOnly = /^[0-9+\s]+$/.test(cleanId)
  if (isPhoneOnly) {
    const rawDigits = cleanId.replace(/\D/g, '')
    userEmail = `${rawDigits}@app.com`
  }

  // 1. محاولة تسجيل الدخول عبر Supabase Auth
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    })

    if (!authError && authData?.user) {
      const userId = authData.user.id

      // جلب بيانات الكوافيرة من جدول barbers
      const { data: barberData } = await supabase
        .from('barbers')
        .select('*, reviews:barber_reviews(*)')
        .eq('id', userId)
        .maybeSingle()

      if (barberData) {
        return normalizeBarberData(barberData, authData.user.email)
      }

      // لو لم توجد في barbers نفحص salon_staff
      const { data: staffData } = await supabase
        .from('salon_staff')
        .select('*')
        .or(`id.eq.${userId},phone.eq.${cleanId},email.eq.${cleanId}`)
        .maybeSingle()

      if (staffData) {
        return normalizeStaffData(staffData, authData.user.email)
      }

      // حساب مصادق أساسي
      return {
        id: userId,
        name: authData.user.user_metadata?.name || 'كوافيرة الصالون',
        email: authData.user.email,
        phone: cleanId,
        imageUrl: '',
        rating: 5.0,
        totalReviews: 0,
      }
    }
  } catch (err) {
    console.warn('Supabase Auth error, trying alternative login:', err.message)
  }

  // 2. محاولة استدعاء RPC barber_web_login
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('barber_web_login', {
      p_email: cleanId.toLowerCase(),
      p_password: password,
    })

    if (!rpcErr && rpcData && !rpcData.error && rpcData.id) {
      // جلب بيانات إضافية إن وجدت
      const { data: bData } = await supabase
        .from('barbers')
        .select('*, reviews:barber_reviews(*)')
        .eq('id', rpcData.id)
        .maybeSingle()

      if (bData) return normalizeBarberData(bData, rpcData.email)
      return {
        id: rpcData.id,
        name: rpcData.name || 'كوافيرة',
        email: rpcData.email,
        phone: rpcData.phone || cleanId,
        imageUrl: rpcData.image_url || '',
        rating: rpcData.rating || 5.0,
        totalReviews: rpcData.total_reviews || 0,
      }
    }
  } catch (_) {}

  // 3. فحص مباشر بالهاتف أو الاسم من barbers أو salon_staff
  try {
    const { data: bList } = await supabase
      .from('barbers')
      .select('*, reviews:barber_reviews(*)')
      .or(`phone.eq.${cleanId},email.eq.${cleanId},email.eq.${userEmail}`)
      .limit(1)

    if (bList && bList.length > 0) {
      return normalizeBarberData(bList[0], userEmail)
    }

    const { data: sList } = await supabase
      .from('salon_staff')
      .select('*')
      .or(`phone.eq.${cleanId},name.ilike.%${cleanId}%`)
      .limit(1)

    if (sList && sList.length > 0) {
      return normalizeStaffData(sList[0], userEmail)
    }
  } catch (_) {}

  throw new Error('بيانات تسجيل الدخول غير صحيحة، يرجى التأكد من الإيميل وكلمة المرور')
}

function normalizeBarberData(raw, defaultEmail) {
  const reviews = Array.isArray(raw.reviews) ? raw.reviews : []
  return {
    id: raw.id,
    name: raw.name || 'أخصائية التجميل',
    phone: raw.phone || '',
    email: raw.email || defaultEmail || '',
    imageUrl: raw.image_url || '',
    rating: typeof raw.rating === 'number' ? raw.rating : 5.0,
    totalReviews: raw.total_reviews || reviews.length || 0,
    specialties: raw.specialties || [],
    experienceYears: raw.experience_years || 1,
    workingDays: raw.working_days || [1, 2, 3, 4, 5, 6, 7],
    workStartTime: raw.work_start_time || '10:00',
    workEndTime: raw.work_end_time || '22:00',
    sessionDuration: raw.session_duration || 30,
    reviews: reviews,
  }
}

function normalizeStaffData(raw, defaultEmail) {
  return {
    id: raw.id,
    name: raw.name || 'أخصائية التجميل',
    phone: raw.phone || '',
    email: raw.email || defaultEmail || '',
    imageUrl: raw.avatar_url || '',
    rating: 5.0,
    totalReviews: 0,
    role: raw.role || 'كوافيرة',
    isAbsent: raw.is_absent || false,
    specialties: raw.specialty ? [raw.specialty] : [],
    workingDays: [1, 2, 3, 4, 5, 6, 7],
    workStartTime: '10:00',
    workEndTime: '22:00',
    sessionDuration: 30,
    reviews: [],
  }
}

/**
 * جلب جميع المواعيد والمهام الموزعة على الكوافيرة
 */
export async function getBarberAppointments(barberId) {
  if (!barberId) return []

  try {
    // 1) جلب المواعيد المباشرة من appointments
    const { data: directAppts, error: apptErr } = await supabase
      .from('appointments')
      .select(`
        *,
        user:users(name, phone, image_url),
        package:packages(arabic_name, price),
        appointment_services(id, service_name, price, status, assigned_to)
      `)
      .eq('barber_id', barberId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (apptErr) throw apptErr

    const directList = (directAppts || []).map(a => formatAppointmentRow(a, barberId))

    // 2) جلب المهام المسندة من جدول appointment_services الموزعة من صفحة الأونر
    const { data: assignedTasks } = await supabase
      .from('appointment_services')
      .select(`
        id, service_name, price, status, assigned_to,
        appointments(
          id, appointment_code, user_name, user_phone, user_id,
          appointment_date, appointment_time, status, price, notes, haircut_image_url
        )
      `)
      .eq('assigned_to', barberId)

    const additionalFromTasks = []
    if (assignedTasks && assignedTasks.length > 0) {
      for (const t of assignedTasks) {
        if (!t.appointments) continue
        const aptId = t.appointments.id
        // إذا لم يكن موجوداً بالفعل في القائمة المباشرة
        const exists = directList.some(d => d.id === aptId)
        if (!exists) {
          additionalFromTasks.push({
            id: aptId,
            taskId: t.id,
            userId: t.appointments.user_id,
            userName: t.appointments.user_name || 'عميلة الصالون',
            userPhone: t.appointments.user_phone || '',
            packageName: t.service_name || 'خدمة مسندة',
            packagePrice: t.price || 0,
            appointmentDate: t.appointments.appointment_date,
            appointmentTime: t.appointments.appointment_time || '10:00',
            status: t.status === 'completed' || t.appointments.status === 'completed' ? 'completed' : (t.appointments.status || 'confirmed'),
            notes: t.appointments.notes || '',
            haircutImageUrl: t.appointments.haircut_image_url || '',
            isTaskAssigned: true,
          })
        }
      }
    }

    const merged = [...directList, ...additionalFromTasks]
    // ترتيب بحسب التاريخ والوقت
    merged.sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${normalizeTimeString(a.appointmentTime)}`)
      const dateB = new Date(`${b.appointmentDate}T${normalizeTimeString(b.appointmentTime)}`)
      return dateA - dateB
    })

    return merged
  } catch (err) {
    console.error('Error in getBarberAppointments:', err)
    throw new Error('فشل في تحميل المواعيد: ' + err.message)
  }
}

function normalizeTimeString(t) {
  if (!t) return '00:00:00'
  const trimmed = t.trim()
  if (trimmed.toUpperCase().includes('AM') || trimmed.toUpperCase().includes('PM')) {
    const isPM = trimmed.toUpperCase().includes('PM')
    const clean = trimmed.replace(/[APMapm\s]/g, '')
    const parts = clean.split(':')
    let h = parseInt(parts[0], 10)
    const m = parts[1] || '00'
    if (isPM && h !== 12) h += 12
    if (!isPM && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}:00`
  }
  const parts = trimmed.split(':')
  const h = String(parts[0] || '00').padStart(2, '0')
  const m = String(parts[1] || '00').padStart(2, '0')
  return `${h}:${m}:00`
}

function formatAppointmentRow(json, barberId) {
  return {
    id: json.id,
    userId: json.user_id,
    userName: json.user?.name || json.user_name || 'عميلة الصالون',
    userPhone: json.user?.phone || json.user_phone || '',
    userImage: json.user?.image_url || '',
    packageName: json.package?.arabic_name || json.package_name || (json.appointment_services?.[0]?.service_name) || 'خدمة صالون',
    packagePrice: json.package?.price || json.price || (json.appointment_services?.[0]?.price) || 0,
    appointmentDate: json.appointment_date,
    appointmentTime: json.appointment_time || '10:00',
    status: json.status || 'confirmed',
    notes: json.notes || '',
    haircutImageUrl: json.haircut_image_url || '',
    barberId: json.barber_id || barberId,
    services: json.appointment_services || [],
    created_at: json.created_at,
  }
}

/**
 * حساب إحصائيات الكوافيرة
 */
export async function getBarberStats(barberId, appointmentsList = []) {
  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    let appts = appointmentsList
    if (!appts || appts.length === 0) {
      appts = await getBarberAppointments(barberId)
    }

    const todayCount = appts.filter(a => {
      return a.appointmentDate === todayStr && a.status !== 'cancelled'
    }).length

    const completedAppts = appts.filter(a => a.status === 'completed')
    const completedCount = completedAppts.length

    const totalRevenue = completedAppts.reduce((sum, a) => sum + (Number(a.packagePrice) || 0), 0)

    return {
      todayCount,
      completedCount,
      totalCount: appts.filter(a => a.status !== 'cancelled').length,
      totalRevenue,
    }
  } catch (err) {
    console.warn('Error computing stats:', err)
    return {
      todayCount: 0,
      completedCount: 0,
      totalCount: 0,
      totalRevenue: 0,
    }
  }
}

/**
 * إنهاء الموعد / المهمة وتأكيد إتمام الخدمة
 */
export async function completeAppointment(appointmentId, barberId, price = 0, taskId = null) {
  try {
    const nowIso = new Date().toISOString()

    // 1. تحديث حالة الموعد الرئيسي
    const { error: apptErr } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: nowIso,
      })
      .eq('id', appointmentId)

    if (apptErr) console.warn('Appointment update error:', apptErr.message)

    // 2. تحديث المهام المرتبطة في appointment_services
    try {
      await supabase
        .from('appointment_services')
        .update({ status: 'completed' })
        .eq('appointment_id', appointmentId)
    } catch (_) {}

    if (taskId) {
      try {
        await supabase
          .from('appointment_services')
          .update({ status: 'completed' })
          .eq('id', taskId)
      } catch (_) {}
    }

    // 3. استدعاء RPCs زيادة الإيرادات والمهام المكتملة إن وجدت
    try {
      if (barberId) {
        await supabase.rpc('increment_barber_completed_appointments', {
          barber_id_param: barberId,
        })
      }
    } catch (_) {}

    // 4. طلب تقييم من العميلة
    try {
      const { data: aptData } = await supabase
        .from('appointments')
        .select('user_id')
        .eq('id', appointmentId)
        .maybeSingle()

      if (aptData?.user_id) {
        await supabase
          .from('users')
          .update({
            pending_barber_rating: barberId,
            pending_appointment_id: appointmentId,
          })
          .eq('id', aptData.user_id)

        await supabase.from('notifications').insert({
          user_id: aptData.user_id,
          type: 'rating_request',
          title: '🌸 تقييم تجربتك الملكية',
          body: 'نرجو منكِ تقييم جودة الخدمة ومهارة الأخصائية لمساعدتنا في التطوير المستمر.',
          data: { appointment_id: appointmentId },
          is_read: false,
        })
      }
    } catch (_) {}

    return true
  } catch (err) {
    console.error('Error completing appointment:', err)
    throw new Error('فشل في إنهاء الموعد: ' + err.message)
  }
}

/**
 * إرسال إشعار تذكير للعميلة بموعدها
 */
export async function sendClientReminder(appointment, barberName = 'الكوافيرة') {
  if (!appointment.userId) {
    throw new Error('لا يوجد حساب مسجل للعميلة لإرسال التذكير')
  }

  try {
    const timeFormatted = formatTime12(appointment.appointmentTime)

    await supabase.from('notifications').insert({
      user_id: appointment.userId,
      appointment_id: appointment.id,
      title: '⏰ تذكير بموعدكِ الملكي',
      body: `${barberName} تذكرك بموعدك اليوم في صالون العربي الساعة ${timeFormatted}`,
      type: 'reminder_hour',
      is_read: false,
    })

    return true
  } catch (err) {
    console.error('Error sending reminder:', err)
    throw new Error('فشل إرسال التذكير: ' + err.message)
  }
}

/**
 * Realtime: الاستماع الفوري لأي حجوزات أو مهام جديدة يتم توزيعها من قِبَل الأونر
 */
export function subscribeToBarberUpdates(barberId, onNewTaskReceived) {
  if (!barberId) return () => {}

  const channelName = `barber_realtime_${barberId}_${Date.now()}`
  
  const channel = supabase
    .channel(channelName)
    // 1. الاستماع لحجز جديد مسند للكوافيرة في appointments
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `barber_id=eq.${barberId}`,
      },
      (payload) => {
        playNotificationSound()
        if (typeof onNewTaskReceived === 'function') {
          onNewTaskReceived({
            type: 'appointment',
            event: payload.eventType,
            record: payload.new || payload.old,
          })
        }
      }
    )
    // 2. الاستماع لمهمة تم إسنادها للكوافيرة من صفحة الأونر في appointment_services
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointment_services',
        filter: `assigned_to=eq.${barberId}`,
      },
      (payload) => {
        playNotificationSound()
        if (typeof onNewTaskReceived === 'function') {
          onNewTaskReceived({
            type: 'task_service',
            event: payload.eventType,
            record: payload.new || payload.old,
          })
        }
      }
    )
    .subscribe()

  // دالة إلغاء الاشتراك عند التدمير
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * تنسيق الوقت بنظام 12 ساعة عربي
 */
export function formatTime12(timeStr) {
  if (!timeStr) return '—'
  try {
    const raw = timeStr.trim()
    if (raw.toUpperCase().includes('AM') || raw.toUpperCase().includes('PM')) {
      const isPM = raw.toUpperCase().includes('PM')
      const clean = raw.replace(/[APMapm\s]/g, '')
      const parts = clean.split(':')
      let h = parseInt(parts[0], 10)
      const m = (parts[1] || '00').padStart(2, '0')
      const period = isPM ? 'مساءً' : 'صباحاً'
      return `${h}:${m} ${period}`
    }

    const parts = raw.split(':')
    if (parts.length < 2) return raw
    let hour = parseInt(parts[0], 10)
    const minute = (parts[1] || '00').padStart(2, '0')
    const period = hour >= 12 ? 'مساءً' : 'صباحاً'

    if (hour === 0) hour = 12
    else if (hour > 12) hour -= 12

    return `${hour}:${minute} ${period}`
  } catch (_) {
    return timeStr
  }
}
