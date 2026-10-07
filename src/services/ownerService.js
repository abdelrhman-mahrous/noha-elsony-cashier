import { supabase } from '../lib/supabase'

// ── المالية ────────────────────────────────────────────────────

export function getDateRange(period, customStart, customEnd) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  switch (period) {
    case 'today':
      return { start: todayStart, end: todayEnd }
    case 'week': {
      const weekStart = new Date(todayStart)
      weekStart.setDate(todayStart.getDate() - 6)
      return { start: weekStart, end: todayEnd }
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: monthStart, end: todayEnd }
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return { start: yearStart, end: todayEnd }
    }
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: new Date(customStart + 'T00:00:00'),
          end: new Date(customEnd + 'T23:59:59'),
        }
      }
      return { start: todayStart, end: todayEnd }
    default:
      return { start: todayStart, end: todayEnd }
  }
}

export async function loadFinancialData(period, customStart, customEnd) {
  const { start, end } = getDateRange(period, customStart, customEnd)
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  // 1. جلب المواعيد المكتملة في الفترة المحددة مع بيانات الكوافيرة
  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .select(`
      *,
      barbers(name)
    `)
    .eq('status', 'completed')
    .gte('completed_at', startIso)
    .lte('completed_at', endIso)
    .order('completed_at', { ascending: false })

  if (apptErr) throw new Error(apptErr.message)

  const rawApptList = appts || []
  const apptIds = rawApptList.map(a => a.id)

  // 2. جلب جميع خدمات وبوفيه المواعيد
  let allServicesData = []
  if (apptIds.length > 0) {
    try {
      const { data: srvData } = await supabase
        .from('appointment_services')
        .select('*')
        .in('appointment_id', apptIds)
      allServicesData = srvData || []
    } catch (err) {
      console.warn('Error loading appointment_services:', err.message)
    }
  }

  // 3. جلب جميع منتجات المواعيد
  let allProductsData = []
  if (apptIds.length > 0) {
    try {
      const { data: prodData } = await supabase
        .from('appointment_products')
        .select('*')
        .in('appointment_id', apptIds)
      allProductsData = prodData || []
    } catch (err) {
      console.warn('Error loading appointment_products:', err.message)
    }
  }

  // 4. جلب جدول البوفيه (addons) لدعم المواعيد القديمة والحالية
  let allAddonsTable = []
  try {
    const { data: addonsTable } = await supabase
      .from('addons')
      .select('*')
    allAddonsTable = addonsTable || []
  } catch (_) { }

  // 5. جلب مبيعات البوفيه المباشرة المنفصلة إن وجدت
  let standaloneBuffetTransactions = []
  try {
    const { data: buffetData } = await supabase
      .from('cashier_transactions')
      .select('*')
      .eq('item_type', 'buffet')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
    standaloneBuffetTransactions = buffetData || []
  } catch (_) { }

  // 6. جلب المسحوبات في نفس الفترة
  let withdrawals = []
  let withdrawalsTotal = 0
  try {
    const { data: wData } = await supabase
      .from('salon_withdrawals')
      .select('*')
      .gte('withdrawal_date', startIso)
      .lte('withdrawal_date', endIso)
      .order('withdrawal_date', { ascending: false })
    withdrawals = wData || []
    for (const w of withdrawals) withdrawalsTotal += (w.amount || 0)
  } catch (_) { }

  // ══ ربط كل موعد ببنوده وبناء سجل التعديلات التفصيلي للكاشير ══
  let totalServicesShare = 0
  let totalBuffetShare = 0
  let totalProductsShare = 0
  let totalTips = 0
  let totalGross = 0

  const detailedApptList = rawApptList.map(appt => {
    const apptId = appt.id
    const apptServicesRaw = allServicesData.filter(s => s.appointment_id === apptId)
    const apptProductsRaw = allProductsData.filter(p => p.appointment_id === apptId)

    // تطبيع الخدمات والبوفيه والمنتجات وضبط الكميات وأسعار الوحدات
    const pureServices = apptServicesRaw
      .filter(s => s.service_type !== 'addon' && s.service_type !== 'buffet')
      .map(s => {
        const qty = s.quantity || 1
        const uPrice = s.unit_price != null ? s.unit_price : (s.price != null ? (s.price / qty) : 0)
        const tPrice = s.price != null ? s.price : (uPrice * qty)
        return {
          ...s,
          quantity: qty,
          unit_price: uPrice,
          price: tPrice,
        }
      })

    const buffetItems = apptServicesRaw
      .filter(s => s.service_type === 'addon' || s.service_type === 'buffet')
      .map(b => {
        const qty = b.quantity || 1
        const uPrice = b.unit_price != null ? b.unit_price : (b.price != null ? (b.price / qty) : 0)
        const tPrice = b.price != null ? b.price : (uPrice * qty)
        return {
          ...b,
          quantity: qty,
          unit_price: uPrice,
          price: tPrice,
        }
      })

    // فحص selected_addons لو لم تكن مضافة في appointment_services
    const existingBuffetTitles = new Set(buffetItems.map(b => (b.service_name || '').trim()))
    let rawAddons = appt.selected_addons
    let addonList = []
    if (Array.isArray(rawAddons)) {
      addonList = rawAddons.map(x => String(x).trim()).filter(Boolean)
    } else if (typeof rawAddons === 'string' && rawAddons.trim() && rawAddons.trim() !== '[]') {
      try {
        const parsed = JSON.parse(rawAddons)
        if (Array.isArray(parsed)) addonList = parsed.map(x => String(x).trim()).filter(Boolean)
      } catch (_) { }
    }

    if (addonList.length > 0 && allAddonsTable.length > 0) {
      for (const ref of addonList) {
        const match = allAddonsTable.find(
          a => a.id === ref ||
            (a.arabic_name && a.arabic_name.trim() === ref) ||
            (a.name && a.name.trim() === ref)
        )
        if (match) {
          const title = match.arabic_name || match.name || 'طلب بوفيه'
          if (!existingBuffetTitles.has(title)) {
            existingBuffetTitles.add(title)
            buffetItems.push({
              id: match.id,
              service_id: match.id,
              service_name: title,
              service_type: 'addon',
              quantity: 1,
              unit_price: match.price || 0,
              price: match.price || 0,
              original_price: match.price || 0,
              status: 'completed',
              cancel_reason: '',
            })
          }
        }
      }
    }

    const normalizedProducts = apptProductsRaw.map(p => {
      const qty = p.quantity || 1
      const uPrice = p.unit_price != null ? p.unit_price : (p.final_unit_price != null ? p.final_unit_price : (p.total_price != null ? (p.total_price / qty) : (p.price || 0)))
      const tPrice = p.total_price != null ? p.total_price : (uPrice * qty)
      return {
        ...p,
        quantity: qty,
        unit_price: uPrice,
        total_price: tPrice,
      }
    })

    // المبالغ المسلمة
    const apptServicesSum = pureServices
      .filter(s => s.status !== 'cancelled')
      .reduce((sum, s) => sum + (s.price || 0), 0)

    const apptBuffetSum = buffetItems
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.price || 0), 0)

    const apptProductsSum = normalizedProducts
      .filter(p => p.status !== 'cancelled')
      .reduce((sum, p) => sum + (p.total_price || 0), 0)

    const apptTip = appt.tip_amount || 0
    const apptDeposit = appt.deposit_amount || appt.deposit_paid || 0
    const apptPaid = appt.paid_amount || appt.price || (apptServicesSum + apptBuffetSum + apptProductsSum - apptDeposit)

    totalServicesShare += apptServicesSum
    totalBuffetShare += apptBuffetSum
    totalProductsShare += apptProductsSum
    totalTips += apptTip
    totalGross += apptPaid

    // رصد تغييرات وتعديلات الكاشير والكميات المكتوبة
    const cashierChanges = []

    // 1. خدمات ملغية أو معدلة
    pureServices.forEach(s => {
      if (s.status === 'cancelled') {
        cashierChanges.push({
          type: 'service_cancelled',
          label: 'إلغاء خدمة',
          title: s.service_name || 'خدمة',
          reason: s.cancel_reason || 'بدون ذكر سبب',
          badgeColor: '#ef4444',
        })
      } else if (s.is_custom_price || (s.original_price != null && s.original_price !== s.unit_price && s.original_price > 0)) {
        cashierChanges.push({
          type: 'price_modified',
          label: 'تعديل سعر خدمة',
          title: s.service_name || 'خدمة',
          fromPrice: s.original_price,
          toPrice: s.unit_price,
          reason: s.cancel_reason || null,
          badgeColor: '#f59e0b',
        })
      }
    })

    // 2. عناصر بوفيه ملغية، معدلة السعر، أو زيادة في الكمية
    buffetItems.forEach(b => {
      if (b.status === 'cancelled') {
        cashierChanges.push({
          type: 'buffet_cancelled',
          label: 'إلغاء طلب بوفيه',
          title: b.service_name || 'مشروب/بوفيه',
          reason: b.cancel_reason || 'بدون ذكر سبب',
          badgeColor: '#ef4444',
        })
      } else {
        if (b.quantity > 1) {
          cashierChanges.push({
            type: 'quantity_increment',
            label: 'كمية بوفيه مضاعفة',
            title: `${b.service_name || 'مشروب'} (${b.quantity} طلبات)`,
            detail: `${b.quantity} × ${b.unit_price} = ${b.price} ج.م`,
            badgeColor: '#3b82f6',
          })
        }
        if (b.is_custom_price || (b.original_price != null && b.original_price !== b.unit_price && b.original_price > 0)) {
          cashierChanges.push({
            type: 'price_modified',
            label: 'تعديل سعر بوفيه',
            title: b.service_name || 'بوفيه',
            fromPrice: b.original_price,
            toPrice: b.unit_price,
            badgeColor: '#f59e0b',
          })
        }
      }
    })

    // 3. منتجات ملغية، معدلة السعر، أو زيادة في الكمية
    normalizedProducts.forEach(p => {
      const pUnit = p.unit_price || 0
      const pOrig = p.original_price || pUnit
      if (p.status === 'cancelled') {
        cashierChanges.push({
          type: 'product_cancelled',
          label: 'إلغاء منتج',
          title: p.product_name || 'منتج',
          reason: p.cancel_reason || 'بدون ذكر سبب',
          badgeColor: '#ef4444',
        })
      } else {
        if (p.quantity > 1) {
          cashierChanges.push({
            type: 'quantity_increment',
            label: 'كمية منتجات إضافية',
            title: `${p.product_name || 'منتج'} (${p.quantity} قطع)`,
            detail: `${p.quantity} × ${pUnit} = ${p.total_price} ج.م`,
            badgeColor: '#8b5cf6',
          })
        }
        if (p.is_custom_price || (p.original_price != null && p.original_price !== pUnit && p.original_price > 0)) {
          cashierChanges.push({
            type: 'price_modified',
            label: 'تعديل سعر منتج',
            title: p.product_name || 'منتج',
            fromPrice: pOrig,
            toPrice: pUnit,
            badgeColor: '#f59e0b',
          })
        }
      }
    })

    // 4. خصومات عروض
    if (appt.discount_amount > 0 || appt.offer_title_ar) {
      cashierChanges.push({
        type: 'offer_discount',
        label: 'خصم عرض خاص',
        title: appt.offer_title_ar || 'خصم ترويجي',
        discount: appt.discount_amount || 0,
        badgeColor: '#10b981',
      })
    }

    return {
      ...appt,
      services: pureServices,
      buffetItems,
      products: normalizedProducts,
      servicesSum: apptServicesSum,
      buffetSum: apptBuffetSum,
      productsSum: apptProductsSum,
      hasCashierChanges: cashierChanges.length > 0,
      cashierChanges,
    }
  })

  // إضافة البوفيه المباشر إن وجد
  let standaloneBuffetTotal = 0
  for (const b of standaloneBuffetTransactions) {
    standaloneBuffetTotal += (b.total_amount || 0)
  }
  totalBuffetShare += standaloneBuffetTotal

  // إذا لم يكن هناك خدمات مفصلة ولكن هناك دخل إجمالي
  if (totalServicesShare === 0 && totalProductsShare === 0 && totalBuffetShare === 0 && totalGross > 0) {
    totalServicesShare = Math.max(0, totalGross - totalTips)
  }

  const netProfit = (totalGross + standaloneBuffetTotal) - withdrawalsTotal

  // ══ حساب إحصائيات الأيام للدايجرام (Daily Diagrams Dataset) ══
  const dailyMap = {}

  // تهيئة أيام الفترة
  const cur = new Date(start)
  while (cur <= end) {
    const dKey = cur.toISOString().split('T')[0]
    const dayLabel = cur.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })
    dailyMap[dKey] = {
      date: dKey,
      label: dayLabel,
      services: 0,
      buffet: 0,
      products: 0,
      tips: 0,
      gross: 0,
      withdrawals: 0,
      netProfit: 0,
      apptCount: 0,
    }
    cur.setDate(cur.getDate() + 1)
  }

  // توزيع المبيعات على الأيام
  detailedApptList.forEach(a => {
    const d = (a.completed_at || a.appointment_date || '').split('T')[0]
    if (!dailyMap[d]) {
      const dt = new Date(d || new Date())
      dailyMap[d] = {
        date: d,
        label: dt.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }),
        services: 0,
        buffet: 0,
        products: 0,
        tips: 0,
        gross: 0,
        withdrawals: 0,
        netProfit: 0,
        apptCount: 0,
      }
    }
    dailyMap[d].services += a.servicesSum
    dailyMap[d].buffet += a.buffetSum
    dailyMap[d].products += a.productsSum
    dailyMap[d].tips += (a.tip_amount || 0)
    dailyMap[d].gross += (a.paid_amount || a.price || (a.servicesSum + a.buffetSum + a.productsSum))
    dailyMap[d].apptCount += 1
  })

  // توزيع المسحوبات على الأيام
  withdrawals.forEach(w => {
    const d = (w.withdrawal_date || w.created_at || '').split('T')[0]
    if (dailyMap[d]) {
      dailyMap[d].withdrawals += (w.amount || 0)
    }
  })

  // حساب صافي ربح كل يوم
  const dailyStats = Object.values(dailyMap)
    .map(day => ({
      ...day,
      netProfit: day.gross - day.withdrawals,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // حساب إحصائيات المنتجات والباقات للفترة
  const periodProductsMap = {}
  const periodBundlesMap = {}
  detailedApptList.forEach(appt => {
    (appt.products || []).filter(p => p.status !== 'cancelled').forEach(p => {
      const name = p.product_name || 'منتج'
      const qty = p.quantity || 1
      const rev = p.total_price || 0
      const isBundle = name.includes('باقة') || name.includes('مجموعة') || p.color_name === 'باقة'
      if (isBundle) {
        if (!periodBundlesMap[name]) periodBundlesMap[name] = { name, count: 0, revenue: 0 }
        periodBundlesMap[name].count += qty
        periodBundlesMap[name].revenue += rev
      } else {
        if (!periodProductsMap[name]) periodProductsMap[name] = { name, count: 0, revenue: 0 }
        periodProductsMap[name].count += qty
        periodProductsMap[name].revenue += rev
      }
    })
  })
  const topPeriodProducts = Object.values(periodProductsMap).sort((a, b) => b.count - a.count)
  const topPeriodBundles = Object.values(periodBundlesMap).sort((a, b) => b.count - a.count)

  return {
    apptList: detailedApptList,
    servicesShare: totalServicesShare,
    productsShare: totalProductsShare,
    buffetTotal: totalBuffetShare,
    tipsTotal: totalTips,
    grossTotal: totalGross,
    withdrawals,
    withdrawalsTotal,
    netProfit,
    dailyStats,
    topProducts: topPeriodProducts,
    topBundles: topPeriodBundles,
  }
}

export async function addWithdrawal({ amount, reason, date }) {
  const { error } = await supabase.from('salon_withdrawals').insert({
    amount,
    reason,
    withdrawn_by: 'الأونر',
    withdrawal_date: date,
  })
  if (error) throw new Error(error.message)
}

// ── توزيع المهام ────────────────────────────────────────────────

export async function getActiveStaff() {
  const { data, error } = await supabase
    .from('salon_staff')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getTasksForDate(dateStr) {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id, service_type, service_name, price, duration_minutes, status, assigned_to,
        appointments!inner(
          id, appointment_code, user_name, user_phone, appointment_time,
          appointment_date, status, price
        ),
        salon_staff(id, name, avatar_url)
      `)
      .eq('appointments.appointment_date', dateStr)
      .neq('appointments.status', 'cancelled')
      .neq('status', 'cancelled')
      .order('appointment_time', { referencedTable: 'appointments', ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('getTasksForDate inner join fallback:', err.message)
    const { data, error } = await supabase
      .from('appointment_services')
      .select('*')
    if (error) throw new Error(error.message)
    return data || []
  }
}

export async function assignStaffToTask(appointmentServiceId, staffId) {
  const { error } = await supabase
    .from('appointment_services')
    .update({ assigned_to: staffId || null })
    .eq('id', appointmentServiceId)
  if (error) throw new Error(error.message)

  // إرسال إشعار لحظي للكوافيرة عبر الـ FCM وقاعدة البيانات
  if (staffId) {
    try {
      const { data: staff } = await supabase
        .from('salon_staff')
        .select('id, fcm_token, name, user_id, phone')
        .eq('id', staffId)
        .maybeSingle()

      let fcmToken = staff?.fcm_token
      const staffUserId = staff?.user_id

      // 1. Fallback: إذا كان التوكن فارغاً في جدول salon_staff، نجلبه من جدول users
      if (!fcmToken && staffUserId) {
        const { data: userData } = await supabase
          .from('users')
          .select('fcm_token')
          .eq('id', staffUserId)
          .maybeSingle()

        if (userData?.fcm_token) {
          fcmToken = userData.fcm_token
          // مزامنة التوكن في salon_staff للمرات القادمة
          await supabase
            .from('salon_staff')
            .update({ fcm_token: fcmToken })
            .eq('id', staffId)
        }
      }

      if (!fcmToken && staff?.phone) {
        const cleanPhone = staff.phone.replace(/[^0-9]/g, '')
        const phoneWithZero = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone
        const { data: userByPhone } = await supabase
          .from('users')
          .select('id, fcm_token')
          .eq('phone', phoneWithZero)
          .maybeSingle()

        if (userByPhone?.fcm_token) {
          fcmToken = userByPhone.fcm_token
          await supabase
            .from('salon_staff')
            .update({
              fcm_token: fcmToken,
              ...(userByPhone.id && !staffUserId ? { user_id: userByPhone.id } : {})
            })
            .eq('id', staffId)
        }
      }

      // 2. جلب تفاصيل الخدمة والموعد
      const { data: srvData } = await supabase
        .from('appointment_services')
        .select('service_name, appointment_id, appointments(id, user_name, appointment_time)')
        .eq('id', appointmentServiceId)
        .maybeSingle()

      const appt = Array.isArray(srvData?.appointments)
        ? srvData.appointments[0]
        : srvData?.appointments

      const serviceName = srvData?.service_name || 'خدمة جديدة'
      const clientName = appt?.user_name || 'عميلة'
      const time = appt?.appointment_time || ''
      const notifTitle = 'تم إسناد مهمة جديدة لكِ 💇‍♀️'
      const notifBody = `تم إسناد خدمة (${serviceName}) للعميلة ${clientName}${time ? ' الساعة ' + time : ''}`

      // 3. حفظ الإشعار في جدول notifications الداخلي
      // const targetUserId = staffUserId || staff?.user_id
      // if (targetUserId) {
      //   try {
      //     await supabase.from('notifications').insert({
      //       user_id: targetUserId,
      //       title: notifTitle,
      //       body: notifBody,
      //       type: 'staff_task',
      //       appointment_id: srvData?.appointment_id || appt?.id || null,
      //     })
      //   } catch (dbNotifErr) {
      //     console.warn('DB notification insert warning:', dbNotifErr)
      //   }
      // }
      
      // 4. إرسال Push Notification عبر Edge Function
      if (fcmToken) {
        const { data: resData, error: funcError } = await supabase.functions.invoke('send-notifications', {
          body: {
            token: fcmToken,
            title: notifTitle,
            body: notifBody,
            data: {
              title: notifTitle,
              body: notifBody,
              type: 'staff_task',
              appointment_service_id: String(appointmentServiceId),
              appointment_id: String(srvData?.appointment_id || appt?.id || ''),
            }
          }
        })
        if (funcError) {
          console.error('FCM staff notification invoke error:', funcError)
        } else {
          console.log('FCM staff notification sent successfully:', resData)
        }
      } else {
        console.warn('Staff FCM token is missing for staffId:', staffId)
      }
    } catch (notifErr) {
      console.warn('FCM send notification warning:', notifErr)
    }
  }
}

export async function toggleStaffAbsent(staffId, isCurrentlyAbsent) {
  const { error } = await supabase
    .from('salon_staff')
    .update({ is_absent: !isCurrentlyAbsent })
    .eq('id', staffId)
  if (error) throw new Error(error.message)
}

// ── مواعيد التاريخ المحدد مع الخدمات والكوافيرات المفضلة/المتجنبة ──

export async function getAppointmentsWithServicesForDate(dateStr) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, appointment_code, user_name, user_phone, appointment_time,
        appointment_date, status, price, preferred_staff_ids, avoided_staff_ids,
        barbers(id, name),
        appointment_services(
          id, service_type, service_name, price, duration_minutes, status, assigned_to,
          salon_staff(id, name, avatar_url, role)
        )
      `)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled')
      .order('appointment_time', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('getAppointmentsWithServicesForDate error, fallback:', err.message)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, appointment_code, user_name, user_phone, appointment_time,
        appointment_date, status, price, preferred_staff_ids, avoided_staff_ids,
        appointment_services(id, service_name, price, status, assigned_to)
      `)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled')
      .order('appointment_time', { ascending: true })
    if (error) throw new Error(error.message)
    return data || []
  }
}

export async function assignStaffToAllAppointmentTasks(appointmentId, staffId) {
  const { error: updateErr } = await supabase
    .from('appointment_services')
    .update({ assigned_to: staffId || null })
    .eq('appointment_id', appointmentId)
    .neq('status', 'cancelled')

  if (updateErr) throw new Error(updateErr.message)

  // إرسال إشعار لحظي للكوافيرة عند إسناد الموعد كاملاً
  if (staffId) {
    try {
      const { data: staff } = await supabase
        .from('salon_staff')
        .select('id, fcm_token, name, user_id, phone')
        .eq('id', staffId)
        .maybeSingle()

      let fcmToken = staff?.fcm_token
      const staffUserId = staff?.user_id

      if (!fcmToken && staffUserId) {
        const { data: userData } = await supabase
          .from('users')
          .select('fcm_token')
          .eq('id', staffUserId)
          .maybeSingle()
        if (userData?.fcm_token) fcmToken = userData.fcm_token
      }

      if (!fcmToken && staff?.phone) {
        const cleanPhone = staff.phone.replace(/[^0-9]/g, '')
        const phoneWithZero = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone
        const { data: userByPhone } = await supabase
          .from('users')
          .select('id, fcm_token')
          .eq('phone', phoneWithZero)
          .maybeSingle()
        if (userByPhone?.fcm_token) fcmToken = userByPhone.fcm_token
      }

      const { data: appt } = await supabase
        .from('appointments')
        .select('id, user_name, appointment_time, appointment_services(service_name)')
        .eq('id', appointmentId)
        .maybeSingle()

      const clientName = appt?.user_name || 'عميلة'
      const time = appt?.appointment_time || ''
      const count = (appt?.appointment_services || []).length
      const notifTitle = 'تم إسناد موعد كامل لكِ 💇‍♀️'
      const notifBody = `تم إسناد موعد للعميلة ${clientName} (${count > 1 ? count + ' خدمات' : 'خدمة'})${time ? ' الساعة ' + time : ''}`

      if (fcmToken) {
        await supabase.functions.invoke('send-notifications', {
          body: {
            token: fcmToken,
            title: notifTitle,
            body: notifBody,
            data: {
              title: notifTitle,
              body: notifBody,
              type: 'staff_task',
              appointment_id: String(appointmentId),
            }
          }
        })
      }
    } catch (notifErr) {
      console.warn('FCM bulk notification warning:', notifErr)
    }
  }
}

export async function getTodayUnassignedAppointments(dateStr) {
  return getAppointmentsWithServicesForDate(dateStr)
}

// ── إدارة طاقم العمل ─────────────────────────────────────────────

export async function getAllStaff() {
  const { data, error } = await supabase
    .from('salon_staff')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function deactivateStaff(staffId) {
  // 1. إعادة المهام المستقبلية الموزعة على الكوافيرة إلى بدون توزيع
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: tasks } = await supabase
      .from('appointment_services')
      .select('id, appointments!inner(appointment_date, status)')
      .eq('assigned_to', staffId)
      .neq('status', 'completed')
      .gte('appointments.appointment_date', today)
      .neq('appointments.status', 'cancelled')

    if (tasks && tasks.length > 0) {
      const ids = tasks.map(t => t.id)
      await supabase
        .from('appointment_services')
        .update({ assigned_to: null, status: 'pending' })
        .in('id', ids)
    }
  } catch (err) {
    console.warn('Reassign tasks warning:', err.message)
  }

  // 2. إيقاف / فصل الكوافيرة
  const { error } = await supabase
    .from('salon_staff')
    .update({ is_active: false })
    .eq('id', staffId)
  if (error) throw new Error(error.message)
}

export async function reactivateStaff(staffId) {
  const { error } = await supabase
    .from('salon_staff')
    .update({ is_active: true, is_absent: false })
    .eq('id', staffId)
  if (error) throw new Error(error.message)
}

// ── الآراء والتقييمات ──────────────────────────────────────────────

export async function getReviews({ limit = 50, offset = 0, query = '', hiddenOnly = false }) {
  let allReviews = []

  // 1. آراء الصالون العامة
  try {
    const { data: sReviews, error: sErr } = await supabase
      .from('salon_reviews')
      .select('id, user_id, user_name, rating, comment, is_visible, created_at, appointment_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!sErr && sReviews) {
      allReviews.push(...sReviews.map(r => ({
        ...r,
        target_type: 'salon',
        target_label: '👑 الصالون العام',
      })))
    }
  } catch (e) {
    console.warn('Error fetching salon_reviews:', e.message)
  }

  // 2. آراء الكوافيرات والمتخصصات
  try {
    const { data: bReviews, error: bErr } = await supabase
      .from('barber_reviews')
      .select('id, barber_id, user_id, user_name, user_image, rating, comment, is_visible, created_at, appointment_id, barbers(name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!bErr && bReviews) {
      allReviews.push(...bReviews.map(r => ({
        ...r,
        target_type: 'barber',
        target_label: r.barbers?.name ? `✂️ الكوافيرة: ${r.barbers.name}` : '✂️ كوافيرة',
      })))
    }
  } catch (e) {
    console.warn('Error fetching barber_reviews:', e.message)
  }

  // فرز حسب الأحدث
  allReviews.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

  if (query.trim()) {
    const qLower = query.toLowerCase()
    allReviews = allReviews.filter(r =>
      (r.comment && r.comment.toLowerCase().includes(qLower)) ||
      (r.user_name && r.user_name.toLowerCase().includes(qLower)) ||
      (r.barbers?.name && r.barbers.name.toLowerCase().includes(qLower))
    )
  }

  if (hiddenOnly) {
    allReviews = allReviews.filter(r => r.is_visible === false)
  }

  return allReviews.slice(offset, offset + limit)
}

export async function toggleReviewVisibility(review) {
  const newVisibility = !(review.is_visible !== false)
  const targetTable = review.target_type === 'salon' ? 'salon_reviews' : 'barber_reviews'

  try {
    const { error } = await supabase
      .from(targetTable)
      .update({ is_visible: newVisibility })
      .eq('id', review.id)
    if (error) throw error
  } catch (err) {
    console.warn('toggleReviewVisibility fallback:', err.message)
  }
}

// ── الشكاوى ────────────────────────────────────────────────────────

export async function getComplaints({ limit = 50, offset = 0 }) {
  try {
    const { data, error } = await supabase
      .from('user_complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!error && data) return data
  } catch (e) {
    console.warn('user_complaints fetch fallback:', e.message)
  }

  try {
    const { data, error } = await supabase
      .from('customer_support')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (!error && data) return data
  } catch (_) { }

  return []
}

export async function updateComplaintStatus({ id, status, resolution_notes = null }) {
  try {
    const updateData = { status, updated_at: new Date().toISOString() }
    if (resolution_notes) updateData.resolution_notes = resolution_notes
    const { error } = await supabase
      .from('user_complaints')
      .update(updateData)
      .eq('id', id)
    if (error) throw error
  } catch (err) {
    try {
      const { error } = await supabase
        .from('customer_support')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    } catch (e2) {
      console.warn('updateComplaintStatus error:', e2.message)
      throw e2
    }
  }
}

// ── العروض والخدمات ────────────────────────────────────────────────

export async function getAllOffers() {
  const { data, error } = await supabase
    .from('service_offers')
    .select('*, service_offer_targets(target_type, target_id, discount_type, discount_value)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

// kept for backwards compat
export async function getServiceOffers() {
  return getAllOffers()
}

export async function uploadOfferImage(file) {
  // مطابق لـ Flutter StorageService.uploadFileWithRetry bucket: 'offers'
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `offer_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('offers')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadErr) throw new Error(uploadErr.message)

  const { data } = supabase.storage.from('offers').getPublicUrl(path)
  return data.publicUrl
}

export async function getOfferSelectionData() {
  // 1. شجرة الخدمات (Categories -> Groups -> Items)
  let tree = []
  try {
    const { data: categories } = await supabase
      .from('service_categories')
      .select('id, name_ar, icon_name, sort_order')
      .order('sort_order', { ascending: true })

    if (categories && categories.length > 0) {
      const { data: groups } = await supabase
        .from('service_groups')
        .select('id, name_ar, category_id, sort_order')
        .order('sort_order', { ascending: true })

      const { data: items } = await supabase
        .from('service_items')
        .select('id, name_ar, group_id, price, min_price, max_price, has_price_range, sort_order')
        .order('sort_order', { ascending: true })

      const groupsMap = {}
        ; (groups || []).forEach(g => {
          groupsMap[g.id] = { ...g, items: [] }
        })

        ; (items || []).forEach(it => {
          if (groupsMap[it.group_id]) {
            groupsMap[it.group_id].items.push(it)
          }
        })

      tree = categories.map(c => ({
        ...c,
        groups: (groups || []).filter(g => g.category_id === c.id).map(g => groupsMap[g.id] || { ...g, items: [] })
      }))
    }
  } catch (err) {
    console.warn('Error fetching service categories:', err.message)
  }

  // 2. المنتجات (Products)
  let products = []
  try {
    const { data: prodData } = await supabase
      .from('products_full')
      .select('id, name, price, is_active')
      .eq('is_active', true)
      .order('name')
    if (prodData) products = prodData
  } catch (_) {
    try {
      const { data: prodData2 } = await supabase
        .from('products')
        .select('id, name, price, is_active')
        .eq('is_active', true)
        .order('name')
      if (prodData2) products = prodData2
    } catch (_) { }
  }

  // 3. باقات المنتجات (Bundles)
  let bundles = []
  try {
    const { data: bundleData } = await supabase
      .from('bundles_full')
      .select('id, name, is_active')
      .eq('is_active', true)
    if (bundleData) bundles = bundleData
  } catch (_) {
    try {
      const { data: bundleData2 } = await supabase
        .from('product_bundles')
        .select('id, name, is_active')
        .eq('is_active', true)
      if (bundleData2) bundles = bundleData2
    } catch (_) { }
  }

  return { tree, products, bundles }
}

export async function createOffer(offer) {
  const offerData = {
    title_ar: offer.title_ar,
    description_ar: offer.description_ar || null,
    image_url: offer.image_url || null,
    discount_type: offer.discount_type || 'percentage',
    discount_value: offer.discount_value || 0,
    start_date: offer.start_date || null,
    valid_until: offer.valid_until || null,
    is_active: offer.is_active !== false,
    sort_order: offer.sort_order || 0,
  }
  const { data, error } = await supabase
    .from('service_offers')
    .insert(offerData)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const offerId = data.id

  // إضافة البنود المستهدفة (Targets)
  if (Array.isArray(offer.targets) && offer.targets.length > 0) {
    const targetRows = offer.targets.map(t => ({
      offer_id: offerId,
      target_type: t.target_type,
      target_id: t.target_id,
      discount_type: t.discount_type || null,
      discount_value: t.discount_value != null && Number(t.discount_value) > 0 ? Number(t.discount_value) : null,
    }))
    const { error: targetErr } = await supabase.from('service_offer_targets').insert(targetRows)
    if (targetErr) console.warn('Error inserting offer targets:', targetErr.message)
  }

  return offerId
}

export async function updateOffer(offer) {
  const offerData = {
    title_ar: offer.title_ar,
    description_ar: offer.description_ar || null,
    image_url: offer.image_url || null,
    discount_type: offer.discount_type || 'percentage',
    discount_value: offer.discount_value || 0,
    start_date: offer.start_date || null,
    valid_until: offer.valid_until || null,
    is_active: offer.is_active !== false,
    sort_order: offer.sort_order || 0,
  }
  const { error } = await supabase
    .from('service_offers')
    .update(offerData)
    .eq('id', offer.id)
  if (error) throw new Error(error.message)

  // حذف البنود القديمة وإعادة إضافة المحدثة
  try {
    await supabase.from('service_offer_targets').delete().eq('offer_id', offer.id)
    if (Array.isArray(offer.targets) && offer.targets.length > 0) {
      const targetRows = offer.targets.map(t => ({
        offer_id: offer.id,
        target_type: t.target_type,
        target_id: t.target_id,
        discount_type: t.discount_type || null,
        discount_value: t.discount_value != null && Number(t.discount_value) > 0 ? Number(t.discount_value) : null,
      }))
      await supabase.from('service_offer_targets').insert(targetRows)
    }
  } catch (err) {
    console.warn('Error updating offer targets:', err.message)
  }
}

export async function updateOfferStatusAndDuration({ offerId, isActive, validUntil }) {
  // Try the RPC first (same as Flutter), fallback to direct update
  try {
    const params = { p_offer_id: offerId }
    if (isActive !== undefined) params.p_is_active = isActive
    if (validUntil !== undefined) params.p_valid_until = validUntil
    const { error } = await supabase.rpc('update_offer_status_and_duration', params)
    if (!error) return
  } catch (_) { }

  // direct fallback
  const patch = {}
  if (isActive !== undefined) patch.is_active = isActive
  if (validUntil !== undefined) patch.valid_until = validUntil
  const { error } = await supabase
    .from('service_offers')
    .update(patch)
    .eq('id', offerId)
  if (error) throw new Error(error.message)
}

export async function deleteOffer(offerId) {
  const { error } = await supabase
    .from('service_offers')
    .delete()
    .eq('id', offerId)
  if (error) throw new Error(error.message)
}

export async function toggleOfferActive(offerId, current) {
  await updateOfferStatusAndDuration({ offerId, isActive: !current })
}

// ── المنتجات والمخزون (Products & Inventory) ──────────────────────────

export async function uploadProductImage(file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `prod_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const { error: uploadErr } = await supabase.storage
      .from('profiles')
      .upload(path, file, { upsert: false, contentType: file.type })

    if (!uploadErr) {
      const { data } = supabase.storage.from('profiles').getPublicUrl(path)
      return data.publicUrl
    }
  } catch (_) { }

  try {
    const { error: uploadErr2 } = await supabase.storage
      .from('offers')
      .upload(path, file, { upsert: false, contentType: file.type })

    if (uploadErr2) throw uploadErr2
    const { data } = supabase.storage.from('offers').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    throw new Error('فشل رفع صورة المنتج: ' + err.message)
  }
}

export async function getProducts({ limit = 50, offset = 0, query = '', isActive = null } = {}) {
  // 1. استعلام الفيو الشامل products_full أولاً
  try {
    let builder = supabase
      .from('products_full')
      .select('*')
      .order('created_at', { ascending: false })

    if (isActive !== null && isActive !== undefined) {
      builder = builder.eq('is_active', isActive)
    }
    if (query && query.trim()) {
      builder = builder.or(`name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
    }
    if (limit) {
      builder = builder.range(offset, offset + limit - 1)
    }

    const { data, error } = await builder
    if (!error && data) return data
  } catch (_) { }

  // 2. Fallback: استعلام جدول products مع product_colors
  try {
    let builder = supabase
      .from('products')
      .select('*, product_colors(*)')
      .order('created_at', { ascending: false })

    if (isActive !== null && isActive !== undefined) {
      builder = builder.eq('is_active', isActive)
    }
    if (query && query.trim()) {
      builder = builder.or(`name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
    }
    if (limit) {
      builder = builder.range(offset, offset + limit - 1)
    }

    const { data, error } = await builder
    if (!error && data) {
      return data.map(p => ({
        ...p,
        colors: p.product_colors || [],
      }))
    }
  } catch (_) { }

  return []
}

export async function addProduct({
  name,
  description = '',
  price = 0,
  purchasePrice = 0,
  discountPercentage = 0,
  discountAmount = 0,
  stockQuantity = 0,
  offerEndsAt = null,
  isActive = true,
  imageUrl = null,
  images = [],
  colors = [],
}) {
  const pPrice = Number(price) || 0
  const pPurchase = Number(purchasePrice) || 0
  const pDiscPct = Number(discountPercentage) || 0
  const pDiscAmount = Number(discountAmount) || 0
  const pStock = Number(stockQuantity) || 0

  // 1. Try RPC 'add_product_with_colors'
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('add_product_with_colors', {
      p_name: name.trim(),
      p_description: description?.trim() || null,
      p_price: pPrice,
      p_discount_percentage: pDiscPct,
      p_discount_amount: pDiscAmount,
      p_image_url: imageUrl || (images[0] || null),
      p_images: images || [],
      p_stock_quantity: pStock,
      p_purchase_price: pPurchase,
      p_is_active: isActive !== false,
      p_colors: colors || [],
    })

    if (!rpcErr && rpcRes) {
      return rpcRes
    }
  } catch (_) { }

  // 2. Fallback: Direct insert into products and product_colors
  let totalStock = pStock
  if (Array.isArray(colors) && colors.length > 0) {
    totalStock = colors.reduce((sum, c) => sum + (Number(c.stock_quantity) || 0), 0)
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('products')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      price: pPrice,
      purchase_price: pPurchase,
      discount_percentage: pDiscPct,
      discount_amount: pDiscAmount,
      offer_ends_at: offerEndsAt || null,
      stock_quantity: totalStock,
      is_active: isActive !== false,
      image_url: imageUrl || (images[0] || null),
      images: images || [],
    })
    .select('id')
    .single()

  if (insertErr) throw new Error(insertErr.message)
  const productId = inserted.id

  if (Array.isArray(colors) && colors.length > 0) {
    const colorRows = colors.map(c => ({
      product_id: productId,
      color_name: c.color_name || 'لون',
      color_hex: c.color_hex || '#000000',
      stock_quantity: Number(c.stock_quantity) || 0,
      price: c.price != null ? Number(c.price) : pPrice,
      purchase_price: c.purchase_price != null ? Number(c.purchase_price) : pPurchase,
      image_url: c.image_url || null,
      images: c.images || [],
    }))
    await supabase.from('product_colors').insert(colorRows)
  }

  // تسجيل أول حركة في المخزون
  try {
    if (totalStock > 0) {
      await supabase.from('product_stock_logs').insert({
        product_id: productId,
        action_type: 'restock',
        quantity_change: totalStock,
        old_stock: 0,
        new_stock: totalStock,
        reason: 'كمية رصيد افتتاحي عند إضافة المنتج',
        unit_purchase_price: pPurchase,
        unit_selling_price: pPrice,
      })
    }
  } catch (_) { }

  return productId
}

export async function updateProduct(productId, {
  name,
  description,
  price,
  purchasePrice,
  discountPercentage,
  discountAmount,
  offerEndsAt,
  stockQuantity,
  isActive,
  imageUrl,
  images,
  colors,
}) {
  const patch = {}
  if (name !== undefined) patch.name = name.trim()
  if (description !== undefined) patch.description = description ? description.trim() : null
  if (price !== undefined) patch.price = Number(price) || 0
  if (purchasePrice !== undefined) patch.purchase_price = Number(purchasePrice) || 0
  if (discountPercentage !== undefined) patch.discount_percentage = Number(discountPercentage) || 0
  if (discountAmount !== undefined) patch.discount_amount = Number(discountAmount) || 0
  if (offerEndsAt !== undefined) patch.offer_ends_at = offerEndsAt || null
  if (stockQuantity !== undefined) patch.stock_quantity = Number(stockQuantity) || 0
  if (isActive !== undefined) patch.is_active = isActive !== false
  if (imageUrl !== undefined) patch.image_url = imageUrl || null
  if (images !== undefined) patch.images = images || []

  if (Array.isArray(colors)) {
    if (colors.length > 0) {
      patch.stock_quantity = colors.reduce((sum, c) => sum + (Number(c.stock_quantity) || 0), 0)
    }
  }

  const { error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', productId)

  if (error) throw new Error(error.message)

  if (Array.isArray(colors)) {
    try {
      await supabase.from('product_colors').delete().eq('product_id', productId)
      if (colors.length > 0) {
        const colorRows = colors.map(c => ({
          product_id: productId,
          color_name: c.color_name || 'لون',
          color_hex: c.color_hex || '#000000',
          stock_quantity: Number(c.stock_quantity) || 0,
          price: c.price != null ? Number(c.price) : (patch.price || 0),
          purchase_price: c.purchase_price != null ? Number(c.purchase_price) : (patch.purchase_price || 0),
          image_url: c.image_url || null,
          images: c.images || [],
        }))
        await supabase.from('product_colors').insert(colorRows)
      }
    } catch (colErr) {
      console.warn('Error updating product colors:', colErr.message)
    }
  }
}

export async function deleteProduct(productId) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
  if (error) throw new Error(error.message)
}

export async function toggleProductActive(productId, currentActive) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: !currentActive })
    .eq('id', productId)
  if (error) throw new Error(error.message)
}

// ── باقات ومجموعات العروض (Product Bundles) ──────────────────────────

export async function getBundles({ query = '', isActive = null } = {}) {
  // 1. استعلام bundles_full
  try {
    let builder = supabase
      .from('bundles_full')
      .select('*')
      .order('created_at', { ascending: false })

    if (isActive !== null && isActive !== undefined) {
      builder = builder.eq('is_active', isActive)
    }
    if (query && query.trim()) {
      builder = builder.or(`name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
    }

    const { data, error } = await builder
    if (!error && data) return data
  } catch (_) { }

  // 2. Fallback: استعلام product_bundles مع product_bundle_items
  try {
    let builder = supabase
      .from('product_bundles')
      .select(`
        *,
        product_bundle_items (
          id,
          bundle_id,
          product_id,
          color_id,
          quantity,
          products (name, price, image_url)
        )
      `)
      .order('created_at', { ascending: false })

    if (isActive !== null && isActive !== undefined) {
      builder = builder.eq('is_active', isActive)
    }
    if (query && query.trim()) {
      builder = builder.or(`name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
    }

    const { data, error } = await builder
    if (!error && data) {
      return data.map(b => ({
        ...b,
        items: b.product_bundle_items || [],
      }))
    }
  } catch (_) { }

  return []
}

export async function createOrUpdateBundle({
  id = null,
  name,
  description = '',
  imageUrl = null,
  images = [],
  bundlePrice = 0,
  purchasePrice = 0,
  discountPercentage = 0,
  isActive = true,
  items = [],
}) {
  const bPrice = Number(bundlePrice) || 0
  const bPurchase = Number(purchasePrice) || 0
  const bDiscount = Number(discountPercentage) || 0

  // 1. Try RPC 'create_or_update_bundle'
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_or_update_bundle', {
      p_bundle_id: id || null,
      p_name: name.trim(),
      p_description: description ? description.trim() : '',
      p_image_url: imageUrl || (images[0] || null),
      p_images: images || [],
      p_bundle_price: bPrice,
      p_purchase_price: bPurchase,
      p_discount_percentage: bDiscount,
      p_is_active: isActive !== false,
      p_items: items.map(it => ({
        product_id: it.product_id,
        color_id: it.color_id || null,
        quantity: Number(it.quantity) || 1,
      })),
    })

    if (!rpcErr && rpcRes) {
      return rpcRes
    }
  } catch (_) { }

  // 2. Direct Fallback
  let bundleId = id
  if (!bundleId) {
    const { data: inserted, error: insertErr } = await supabase
      .from('product_bundles')
      .insert({
        name: name.trim(),
        description: description ? description.trim() : null,
        image_url: imageUrl || (images[0] || null),
        images: images || [],
        bundle_price: bPrice,
        purchase_price: bPurchase,
        discount_percentage: bDiscount,
        is_active: isActive !== false,
      })
      .select('id')
      .single()

    if (insertErr) throw new Error(insertErr.message)
    bundleId = inserted.id
  } else {
    const { error: updateErr } = await supabase
      .from('product_bundles')
      .update({
        name: name.trim(),
        description: description ? description.trim() : null,
        image_url: imageUrl || (images[0] || null),
        images: images || [],
        bundle_price: bPrice,
        purchase_price: bPurchase,
        discount_percentage: bDiscount,
        is_active: isActive !== false,
      })
      .eq('id', bundleId)

    if (updateErr) throw new Error(updateErr.message)
    await supabase.from('product_bundle_items').delete().eq('bundle_id', bundleId)
  }

  if (Array.isArray(items) && items.length > 0) {
    const itemRows = items.map(it => ({
      bundle_id: bundleId,
      product_id: it.product_id,
      color_id: it.color_id || null,
      quantity: Number(it.quantity) || 1,
    }))
    await supabase.from('product_bundle_items').insert(itemRows)
  }

  return bundleId
}

export async function deleteBundle(bundleId) {
  const { error } = await supabase
    .from('product_bundles')
    .delete()
    .eq('id', bundleId)
  if (error) throw new Error(error.message)
}

export async function toggleBundleActive(bundleId, currentActive) {
  const { error } = await supabase
    .from('product_bundles')
    .update({ is_active: !currentActive })
    .eq('id', bundleId)
  if (error) throw new Error(error.message)
}

// ── عمليات وإجراءات المخزون (Stock Operations) ──────────────────────────

export async function restockProductStock({
  productId,
  colorId = null,
  quantityAdded,
  newPurchasePrice = 0,
  newSellingPrice = null,
}) {
  const qty = Number(quantityAdded) || 0
  const nPurchase = Number(newPurchasePrice) || 0
  const nSelling = newSellingPrice != null && Number(newSellingPrice) > 0 ? Number(newSellingPrice) : null

  // 1. Try RPC 'restock_product'
  try {
    const { error: rpcErr } = await supabase.rpc('restock_product', {
      p_product_id: productId,
      p_color_id: colorId || null,
      p_quantity_added: qty,
      p_new_purchase_price: nPurchase,
      p_new_selling_price: nSelling,
    })
    if (!rpcErr) return true
  } catch (_) { }

  // 2. Direct Fallback
  let oldStock = 0
  let newStock = 0

  if (colorId) {
    const { data: colorRow } = await supabase
      .from('product_colors')
      .select('stock_quantity, price, purchase_price')
      .eq('id', colorId)
      .single()

    oldStock = colorRow?.stock_quantity || 0
    newStock = oldStock + qty

    const colorPatch = { stock_quantity: newStock }
    if (nPurchase > 0) colorPatch.purchase_price = nPurchase
    if (nSelling != null) colorPatch.price = nSelling
    await supabase.from('product_colors').update(colorPatch).eq('id', colorId)

    const { data: allColors } = await supabase
      .from('product_colors')
      .select('stock_quantity')
      .eq('product_id', productId)
    const sum = (allColors || []).reduce((s, c) => s + (c.stock_quantity || 0), 0)
    await supabase.from('products').update({ stock_quantity: sum }).eq('id', productId)
  } else {
    const { data: prodRow } = await supabase
      .from('products')
      .select('stock_quantity, price, purchase_price')
      .eq('id', productId)
      .single()

    oldStock = prodRow?.stock_quantity || 0
    newStock = oldStock + qty

    const prodPatch = { stock_quantity: newStock }
    if (nPurchase > 0) prodPatch.purchase_price = nPurchase
    if (nSelling != null) prodPatch.price = nSelling
    await supabase.from('products').update(prodPatch).eq('id', productId)
  }

  await supabase.from('product_stock_logs').insert({
    product_id: productId,
    color_id: colorId || null,
    action_type: 'restock',
    quantity_change: qty,
    old_stock: oldStock,
    new_stock: newStock,
    unit_purchase_price: nPurchase,
    unit_selling_price: nSelling,
    reason: 'تزويد شحنة جديدة للمخزن',
  })

  return true
}

export async function recordProductDamagedStock({
  productId,
  colorId = null,
  quantity = 1,
  reason = '',
}) {
  const qty = Number(quantity) || 1

  // 1. Try RPC
  try {
    const { error: rpcErr } = await supabase.rpc('record_product_damaged', {
      p_product_id: productId,
      p_color_id: colorId || null,
      p_quantity: qty,
      p_reason: reason?.trim() || null,
    })
    if (!rpcErr) return true
  } catch (_) { }

  // 2. Direct Fallback
  let oldStock = 0
  let newStock = 0

  if (colorId) {
    const { data: colorRow } = await supabase.from('product_colors').select('stock_quantity').eq('id', colorId).single()
    oldStock = colorRow?.stock_quantity || 0
    newStock = Math.max(0, oldStock - qty)
    await supabase.from('product_colors').update({ stock_quantity: newStock }).eq('id', colorId)

    const { data: allColors } = await supabase.from('product_colors').select('stock_quantity').eq('product_id', productId)
    const sum = (allColors || []).reduce((s, c) => s + (c.stock_quantity || 0), 0)
    await supabase.from('products').update({ stock_quantity: sum }).eq('id', productId)
  } else {
    const { data: prodRow } = await supabase.from('products').select('stock_quantity').eq('id', productId).single()
    oldStock = prodRow?.stock_quantity || 0
    newStock = Math.max(0, oldStock - qty)
    await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId)
  }

  await supabase.from('product_stock_logs').insert({
    product_id: productId,
    color_id: colorId || null,
    action_type: 'damaged',
    quantity_change: -qty,
    old_stock: oldStock,
    new_stock: newStock,
    reason: reason?.trim() || 'تسجيل منتج تالف/منتهي الصلاحية',
  })

  return true
}

export async function recordProductReturnStock({
  productId,
  colorId = null,
  quantity = 1,
  reason = '',
  refundAmount = null,
}) {
  const qty = Number(quantity) || 1
  const refund = refundAmount != null ? Number(refundAmount) : null

  // 1. Try RPC
  try {
    const { error: rpcErr } = await supabase.rpc('record_product_return', {
      p_product_id: productId,
      p_color_id: colorId || null,
      p_quantity: qty,
      p_reason: reason?.trim() || null,
      p_refund_amount: refund,
    })
    if (!rpcErr) return true
  } catch (_) { }

  // 2. Direct Fallback
  let oldStock = 0
  let newStock = 0

  if (colorId) {
    const { data: colorRow } = await supabase.from('product_colors').select('stock_quantity').eq('id', colorId).single()
    oldStock = colorRow?.stock_quantity || 0
    newStock = oldStock + qty
    await supabase.from('product_colors').update({ stock_quantity: newStock }).eq('id', colorId)

    const { data: allColors } = await supabase.from('product_colors').select('stock_quantity').eq('product_id', productId)
    const sum = (allColors || []).reduce((s, c) => s + (c.stock_quantity || 0), 0)
    await supabase.from('products').update({ stock_quantity: sum }).eq('id', productId)
  } else {
    const { data: prodRow } = await supabase.from('products').select('stock_quantity').eq('id', productId).single()
    oldStock = prodRow?.stock_quantity || 0
    newStock = oldStock + qty
    await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId)
  }

  await supabase.from('product_stock_logs').insert({
    product_id: productId,
    color_id: colorId || null,
    action_type: 'return',
    quantity_change: qty,
    old_stock: oldStock,
    new_stock: newStock,
    reason: reason?.trim() || 'استرجاع منتج للمخزن',
    refund_amount: refund,
  })

  return true
}

export async function getProductStockLogs({ limit = 60, offset = 0, actionType = 'all', query = '' } = {}) {
  try {
    let builder = supabase
      .from('product_stock_logs')
      .select(`
        *,
        products (name, price, purchase_price, image_url),
        product_colors (color_name, color_hex)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (actionType && actionType !== 'all') {
      builder = builder.eq('action_type', actionType)
    }

    const { data, error } = await builder
    if (error) throw error

    let logs = (data || []).map(l => ({
      ...l,
      product_name: l.products?.name || 'منتج صالون',
      product_price: l.products?.price || 0,
      product_image: l.products?.image_url || null,
      color_name: l.product_colors?.color_name || null,
      color_hex: l.product_colors?.color_hex || null,
    }))

    if (query && query.trim()) {
      const q = query.trim().toLowerCase()
      logs = logs.filter(l =>
        l.product_name.toLowerCase().includes(q) ||
        (l.reason && l.reason.toLowerCase().includes(q))
      )
    }

    return logs
  } catch (err) {
    console.warn('Error fetching stock logs:', err.message)
    return []
  }
}

export async function getInventoryAuditReport() {
  const products = await getProducts({ limit: 500 })
  const bundles = await getBundles()

  let totalCapital = 0
  let totalUnits = 0
  let totalProductsCount = products.length
  let totalBundlesCount = bundles.length

  const productAnalytics = products.map(p => {
    const stock = Number(p.stock_quantity) || 0
    const cost = Number(p.purchase_price) || 0
    const price = Number(p.price) || 0
    const prodCapital = stock * cost
    const profitPerUnit = Math.max(0, price - cost)
    const marginPct = price > 0 ? Math.round((profitPerUnit / price) * 100) : 0

    totalCapital += prodCapital
    totalUnits += stock

    return {
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      stock_quantity: stock,
      purchase_price: cost,
      price,
      capital: prodCapital,
      profit_per_unit: profitPerUnit,
      margin_pct: marginPct,
      is_active: p.is_active,
      colors_count: Array.isArray(p.colors) ? p.colors.length : 0,
    }
  })

  let damagedUnitsCount = 0
  let damagedLossValue = 0
  try {
    const { data: damagedLogs } = await supabase
      .from('product_stock_logs')
      .select('quantity_change, unit_purchase_price, products(purchase_price)')
      .eq('action_type', 'damaged')

    if (damagedLogs) {
      for (const d of damagedLogs) {
        const units = Math.abs(d.quantity_change || 0)
        const unitCost = d.unit_purchase_price || d.products?.purchase_price || 0
        damagedUnitsCount += units
        damagedLossValue += units * unitCost
      }
    }
  } catch (_) { }

  let totalSalesRevenue = 0
  let totalUnitsSold = 0
  let topSellingProductsMap = {}
  let topSellingBundlesMap = {}

  try {
    const { data: salesRows } = await supabase
      .from('appointment_products')
      .select('*')
      .neq('status', 'cancelled')

    if (salesRows && salesRows.length > 0) {
      salesRows.forEach(row => {
        const qty = row.quantity || 1
        const uPrice = row.final_unit_price || row.unit_price || row.price || 0
        const tPrice = row.total_price || (uPrice * qty)
        const name = row.product_name || 'منتج'
        const isBundle = name.includes('باقة') || name.includes('مجموعة') || row.color_name === 'باقة'

        totalSalesRevenue += tPrice
        totalUnitsSold += qty

        if (isBundle) {
          if (!topSellingBundlesMap[name]) {
            topSellingBundlesMap[name] = { name, count: 0, revenue: 0 }
          }
          topSellingBundlesMap[name].count += qty
          topSellingBundlesMap[name].revenue += tPrice
        } else {
          if (!topSellingProductsMap[name]) {
            topSellingProductsMap[name] = { name, count: 0, revenue: 0 }
          }
          topSellingProductsMap[name].count += qty
          topSellingProductsMap[name].revenue += tPrice
        }
      })
    }
  } catch (_) { }

  const topSellingProducts = Object.values(topSellingProductsMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const topSellingBundles = Object.values(topSellingBundlesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalCapital,
    totalUnits,
    totalProductsCount,
    totalBundlesCount,
    damagedUnitsCount,
    damagedLossValue,
    totalSalesRevenue,
    totalUnitsSold,
    topSellingProducts,
    topSellingBundles,
    productAnalytics,
  }
}



// ── البوفيه والمشروبات (Addons) ───────────────────────────────────

export async function getBuffetAddons({ query = '' } = {}) {
  let builder = supabase
    .from('addons')
    .select('*')
    .order('arabic_name', { ascending: true })

  if (query.trim()) {
    builder = builder.or(`arabic_name.ilike.%${query}%,name.ilike.%${query}%`)
  }

  const { data, error } = await builder
  if (error) throw new Error(error.message)
  return data || []
}

export async function createBuffetAddon({
  arabicName,
  price,
  name,
  iconName = 'local_cafe',
  isActive = true,
  durationMinutes = 0,
  colorHex = '#B76E79',
  ownerUsername,
}) {
  const insertPayload = {
    arabic_name: arabicName.trim(),
    name: (name && name.trim()) ? name.trim() : arabicName.trim(),
    price: Number(price) || 0,
    icon_name: iconName || 'local_cafe',
    is_active: isActive !== false,
    duration_minutes: Number(durationMinutes) || 0,
    color_hex: colorHex || '#B76E79',
    order_in_appointment: 'after',
  }
  if (ownerUsername) {
    insertPayload.owner_username = ownerUsername
  }

  const { data, error } = await supabase
    .from('addons')
    .insert([insertPayload])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateBuffetAddon(id, { arabicName, price, name, iconName, isActive, durationMinutes, colorHex }) {
  const patch = {}
  if (arabicName !== undefined) patch.arabic_name = arabicName.trim()
  if (name !== undefined) patch.name = name.trim()
  if (price !== undefined) patch.price = Number(price) || 0
  if (iconName !== undefined) patch.icon_name = iconName || 'local_cafe'
  if (isActive !== undefined) patch.is_active = isActive
  if (durationMinutes !== undefined) patch.duration_minutes = Number(durationMinutes) || 0
  if (colorHex !== undefined) patch.color_hex = colorHex

  const { data, error } = await supabase
    .from('addons')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function toggleBuffetAddonActive(id, currentActive) {
  const { error } = await supabase
    .from('addons')
    .update({ is_active: !currentActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteBuffetAddon(id) {
  const { error } = await supabase
    .from('addons')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
