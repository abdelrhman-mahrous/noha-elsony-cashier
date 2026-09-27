import { supabase } from '../lib/supabase'

/**
 * البحث عن موعد بكود الموعد أو رقم الهاتف
 */
export async function getPosAppointmentByCode(code) {
  const cleanCode = code.trim()

  // جلب بيانات الموعد
  const { data: appt, error } = await supabase
    .from('appointments')
    .select(`
      *,
      barbers(name),
      packages(arabic_name, price)
    `)
    .eq('appointment_code', cleanCode)
    .maybeSingle()

  if (error) throw new Error('فشل البحث: ' + error.message)
  if (!appt) return null

  return buildPosDetails(appt)
}

/**
 * البحث برقم الهاتف — يرجع أول موعد مفتوح
 */
export async function searchByPhone(phone) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      barbers(name),
      packages(arabic_name, price)
    `)
    .eq('user_phone', phone.trim())
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: false })
    .limit(10)

  if (error) throw new Error('فشل البحث: ' + error.message)
  return data || []
}

/**
 * بناء تفاصيل الموعد الكاملة مع الخدمات والمنتجات والعروض
 */
export async function buildPosDetails(appt) {
  const apptId = appt.id
  const items = []

  // 1. جلب الخدمات
  let hasServicesFromTable = false
  try {
    const { data: services } = await supabase
      .from('appointment_services')
      .select('*')
      .eq('appointment_id', apptId)

    if (services && services.length > 0) {
      hasServicesFromTable = true
      for (const row of services) {
        const srvPrice = (row.price || 0)
        const serviceType = row.service_type || 'service'
        let itemType = 'service'
        if (serviceType === 'package') itemType = 'package'
        if (serviceType === 'addon') itemType = 'addon'

        items.push({
          id: row.id || '',
          serviceId: row.service_id || row.id || apptId,
          title: row.service_name || 'خدمة إضافية',
          subtitle: srvPrice === 0 ? 'يتطلب تحديد السعر في الصالون' : (serviceType || 'خدمة'),
          itemType,
          unitPrice: srvPrice,
          originalUnitPrice: row.original_price || srvPrice,
          quantity: 1,
          status: row.status === 'cancelled' ? 'cancelled' : 'delivered',
          cancelReason: row.cancel_reason || '',
          isCustomPrice: row.is_custom_price === true || srvPrice === 0,
          isCoveredByOffer: false,
          offerDiscountNote: null,
          offerDiscountRate: null,
          targetDiscountType: null,
          targetDiscountAmount: null,
        })
      }
    }
  } catch (_) {}

  // 2. Fallback — مواعيد قديمة بدون appointment_services
  if (!hasServicesFromTable) {
    const pkg = appt.packages
    if (pkg) {
      items.push({
        id: apptId,
        serviceId: apptId,
        title: pkg.arabic_name || 'باقة الصالون',
        subtitle: 'الباقة الأساسية للموعد',
        itemType: 'package',
        unitPrice: pkg.price || 0,
        originalUnitPrice: pkg.price || 0,
        quantity: 1,
        status: 'delivered',
        cancelReason: '',
        isCustomPrice: false,
        isCoveredByOffer: false,
        offerDiscountNote: null,
        offerDiscountRate: null,
        targetDiscountType: null,
        targetDiscountAmount: null,
      })
    }
  }

  // 3. المنتجات
  try {
    const { data: products } = await supabase
      .from('appointment_products')
      .select('*')
      .eq('appointment_id', apptId)

    if (products) {
      for (const row of products) {
        items.push({
          id: row.id || '',
          serviceId: null,
          title: row.product_name || 'منتج',
          subtitle: row.color_name || 'منتج صالون',
          itemType: 'product',
          unitPrice: row.final_unit_price || row.unit_price || row.price || row.total_price || 0,
          originalUnitPrice: row.original_price || row.unit_price || row.price || 0,
          quantity: row.quantity || 1,
          status: row.status === 'cancelled' ? 'cancelled' : 'delivered',
          cancelReason: row.cancel_reason || '',
          isCustomPrice: row.is_custom_price === true,
          isCoveredByOffer: false,
          offerDiscountNote: null,
          offerDiscountRate: null,
          targetDiscountType: null,
          targetDiscountAmount: null,
        })
      }
    }
  } catch (_) {}

  // 4. Fallback نهائي
  if (items.length === 0) {
    const priceVal = appt.price || appt.original_price || 0
    items.push({
      id: apptId,
      serviceId: appt.service_id || apptId,
      title: 'حجز موعد صالون',
      subtitle: priceVal === 0 ? 'يتطلب تحديد السعر في الصالون' : 'خدمة الموعد الأساسية',
      itemType: 'service',
      unitPrice: priceVal,
      originalUnitPrice: priceVal,
      quantity: 1,
      status: 'delivered',
      cancelReason: '',
      isCustomPrice: priceVal === 0,
      isCoveredByOffer: false,
      offerDiscountNote: null,
      offerDiscountRate: null,
      targetDiscountType: null,
      targetDiscountAmount: null,
    })
  }

  // 5. تطبيق العروض
  const taggedItems = await applyOffers(appt, items)

  // 6. بيانات العميل
  let customerName = (appt.user_name || '').trim()
  let customerPhone = (appt.user_phone || '').trim()
  let customerNickname = ''

  if (appt.user_id) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('name, phone, nickname')
        .eq('id', appt.user_id)
        .maybeSingle()
      if (user) {
        if (!customerName) customerName = (user.name || '').trim()
        if (!customerPhone) customerPhone = (user.phone || '').trim()
        customerNickname = (user.nickname || '').trim()
      }
    } catch (_) {}
  }
  if (!customerName) customerName = 'عميلة'

  return {
    appointmentId: apptId,
    appointmentCode: appt.appointment_code || '',
    customerName,
    customerNickname,
    customerPhone,
    barberName: appt.barbers?.name || 'كوافيرة',
    appointmentTime: appt.appointment_time || '',
    appointmentDate: appt.appointment_date || '',
    depositPaid: appt.deposit_amount || 0,
    status: appt.status || 'pending',
    paidAmount: appt.paid_amount || 0,
    cashierNotes: appt.cashier_notes || '',
    tipAmount: appt.tip_amount || 0,
    offerId: appt.offer_id || null,
    offerTitleAr: appt.offer_title_ar || null,
    discountType: null,
    discountValue: null,
    items: taggedItems,
  }
}

async function applyOffers(appt, items) {
  const offerId = appt.offer_id
  if (!offerId || offerId === 'null') return items

  try {
    const { data: offerResp } = await supabase
      .from('service_offers')
      .select('*, service_offer_targets(target_type, target_id, discount_type, discount_value)')
      .eq('id', offerId)
      .maybeSingle()

    if (!offerResp) return items

    const discountType = offerResp.discount_type
    const discountValue = offerResp.discount_value || 0
    const offerLabel = offerResp.title_ar || appt.offer_title_ar || 'عرض الصالون'
    const targets = offerResp.service_offer_targets || []

    const targetItemDiscounts = {}
    const targetItemIds = []

    for (const t of targets) {
      if (t.target_type === 'item' && t.target_id) {
        targetItemIds.push(t.target_id)
        if (t.discount_type && t.discount_value) {
          targetItemDiscounts[t.target_id] = { type: t.discount_type, value: t.discount_value }
        }
      }
    }

    return items.map(item => {
      const itemId = item.serviceId || item.id
      const isTargetSpecific = Object.keys(targetItemDiscounts).length > 0
      const isCovered = isTargetSpecific
        ? (targetItemDiscounts[itemId] != null || targetItemIds.includes(itemId))
        : (item.itemType === 'service' || item.itemType === 'package')

      if (!isCovered) return item

      let note = `ضمن عرض: ${offerLabel}`
      let discountedUnit = null
      let discountRate = null
      let itemTargetDiscountType = null
      let itemTargetDiscountAmount = null

      const spec = targetItemDiscounts[itemId]
      if (spec) {
        itemTargetDiscountType = spec.type
        itemTargetDiscountAmount = spec.value
        if (spec.type === 'percentage') {
          const rate = Math.min(spec.value / 100, 1)
          note = `خصم ${spec.value}% ضمن عرض: ${offerLabel}`
          discountRate = rate
          if (item.unitPrice > 0) discountedUnit = item.unitPrice * (1 - rate)
        } else {
          note = `خصم ${spec.value} جنيه ضمن عرض: ${offerLabel}`
          if (item.unitPrice > 0) discountedUnit = Math.max(item.unitPrice - spec.value, 0)
        }
      } else if (discountType === 'percentage' && discountValue > 0) {
        const rate = Math.min(discountValue / 100, 1)
        note = `خصم ${discountValue}% ضمن عرض: ${offerLabel}`
        discountRate = rate
        if (item.unitPrice > 0) discountedUnit = item.unitPrice * (1 - rate)
      }

      const isCompleted = appt.status === 'completed'
      return {
        ...item,
        isCoveredByOffer: true,
        offerDiscountNote: note,
        offerDiscountRate: discountRate,
        unitPrice: isCompleted ? item.unitPrice : (discountedUnit ?? item.unitPrice),
        originalUnitPrice: item.originalUnitPrice ?? (item.unitPrice > 0 ? item.unitPrice : null),
        targetDiscountType: itemTargetDiscountType,
        targetDiscountAmount: itemTargetDiscountAmount,
      }
    })
  } catch (_) {
    return items
  }
}

/**
 * حفظ المحاسبة النهائية للموعد
 */
export async function savePosCheckout({ details, paidAmount, tipAmount, notes }) {
  const itemsJson = details.items.map(e => ({
    id: e.id,
    service_id: e.serviceId || e.id,
    item_type: e.itemType,
    status: e.status,
    cancel_reason: e.cancelReason,
    unit_price: e.unitPrice,
    original_price: e.originalUnitPrice ?? e.unitPrice,
    is_custom_price: e.isCustomPrice,
    quantity: e.quantity,
  }))

  const deliveredSubtotal = details.items
    .filter(i => i.status === 'delivered')
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  const totalOriginal = details.items
    .filter(i => i.status === 'delivered')
    .reduce((sum, i) => sum + (i.originalUnitPrice ?? i.unitPrice) * i.quantity, 0)

  const discountAmount = Math.max(totalOriginal - deliveredSubtotal, 0)

  const { error } = await supabase.rpc('checkout_appointment_pos', {
    p_appointment_id: details.appointmentId,
    p_paid_amount: paidAmount,
    p_tip_amount: tipAmount,
    p_notes: notes || '',
    p_price: deliveredSubtotal,
    p_original_price: totalOriginal,
    p_discount_amount: discountAmount,
    p_offer_id: details.offerId,
    p_offer_title_ar: details.offerTitleAr,
    p_items: itemsJson,
  })

  if (error) throw new Error('تعذر حفظ المحاسبة: ' + error.message)
  return true
}

/**
 * إلغاء موعد كامل
 */
export async function cancelAppointment(appointmentId, cancelReason) {
  const { data, error } = await supabase.rpc('cashier_cancel_appointment_rpc', {
    p_appointment_id: appointmentId,
    p_cancel_reason: cancelReason,
  })

  if (error) throw new Error('حدث خطأ أثناء الإلغاء: ' + error.message)
  if (data?.status === 'error') throw new Error(data.message)
  return data?.message || 'تم إلغاء الموعد بنجاح'
}

/**
 * سجل المواعيد المحاسبة (History) — مع pagination
 */
export async function getPosHistory({ limit = 20, offset = 0, query = '' }) {
  let builder = supabase
    .from('appointments')
    .select('id, appointment_code, price, paid_amount, tip_amount, cashier_notes, status, completed_at, appointment_date, user_name, user_phone, barbers(name), offer_title_ar, original_price, discount_amount')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (query.trim()) {
    const q = query.trim()
    builder = builder.or(`user_name.ilike.%${q}%,user_phone.ilike.%${q}%,appointment_code.ilike.%${q}%`)
  }

  builder = builder.range(offset, offset + limit - 1)

  const { data, error } = await builder
  if (error) throw new Error('فشل تحميل السجل: ' + error.message)
  return data || []
}

// ══════════════════════════════════════════════════════════════
// ✂️ دوال الـ Walk-in (حجز مباشر ومحاسبة فورية في الصالون)
// ══════════════════════════════════════════════════════════════

export async function getWalkInServicesTree() {
  try {
    const { data, error } = await supabase.rpc('get_services_tree')
    if (!error && Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch (e) {
    console.warn('get_services_tree RPC failed, trying fallback:', e.message)
  }

  // Fallback 1: استعلام الجداول المنفصلة
  try {
    const { data: categories } = await supabase
      .from('service_categories')
      .select('id, name_ar, icon_name, sort_order')
      .order('sort_order')

    if (categories && categories.length > 0) {
      const { data: groups } = await supabase
        .from('service_groups')
        .select('id, name_ar, category_id, sort_order')
        .order('sort_order')

      const { data: items } = await supabase
        .from('service_items')
        .select('id, name_ar, group_id, price, min_price, max_price, has_price_range, duration_minutes, sort_order, note_ar')
        .order('sort_order')

      const groupsMap = {}
      ;(groups || []).forEach(g => {
        groupsMap[g.id] = { ...g, items: [] }
      })

      ;(items || []).forEach(it => {
        if (groupsMap[it.group_id]) {
          groupsMap[it.group_id].items.push(it)
        }
      })

      const catMap = categories.map(c => ({
        ...c,
        groups: (groups || []).filter(g => g.category_id === c.id).map(g => groupsMap[g.id] || { ...g, items: [] })
      }))

      return catMap
    }
  } catch (_) {}

  // Fallback 2: جدول services البسيط
  try {
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (services && services.length > 0) {
      const cats = {}
      services.forEach(s => {
        const catKey = s.category || 'عام'
        if (!cats[catKey]) {
          cats[catKey] = {
            id: catKey,
            name_ar: s.category_ar || catKey,
            icon_name: 'cut',
            groups: [{
              id: catKey + '-grp',
              name_ar: s.category_ar || catKey,
              items: []
            }]
          }
        }
        cats[catKey].groups[0].items.push({
          id: s.id,
          name_ar: s.arabic_name || s.name,
          price: s.base_price || s.price || 0,
          duration_minutes: s.duration_minutes || 30,
          note_ar: s.description,
        })
      })
      return Object.values(cats)
    }
  } catch (_) {}

  return []
}

export async function getWalkInOffers() {
  try {
    const { data, error } = await supabase
      .from('service_offers')
      .select('*, service_offer_targets(target_type, target_id, discount_type, discount_value)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (!error && data) return data
  } catch (e) {
    console.warn('Failed to load active offers:', e.message)
  }
  return []
}

export async function getWalkInBarbers() {
  try {
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name, phone, rating, avatar_url, is_active')
      .eq('is_active', true)
      .order('name')

    if (!error && data && data.length > 0) return data
  } catch (_) {}

  try {
    const { data: staffData } = await supabase
      .from('salon_staff')
      .select('id, name, role, phone, is_active')
      .eq('is_active', true)
    if (staffData && staffData.length > 0) return staffData
  } catch (_) {}

  return [
    { id: '1', name: 'نهي السني', role: 'خبير التجميل والميك أب الرئيسي' },
    { id: '2', name: 'مروة أحمد', role: 'أخصائية تسريحات وعلاج الشعر' },
    { id: '3', name: 'سارة خالد', role: 'أخصائية عناية بالبشرة وهيدرافيشل' },
  ]
}

export async function getWalkInProducts() {
  try {
    const { data, error } = await supabase
      .from('cashier_products')
      .select('*')
      .order('name')

    if (!error && data && data.length > 0) return data
  } catch (_) {}

  try {
    const { data } = await supabase.from('products').select('*')
    if (data && data.length > 0) return data
  } catch (_) {}

  return []
}

export async function getWalkInAddons() {
  try {
    const { data, error } = await supabase
      .from('addons')
      .select('*')
      .order('arabic_name')

    if (!error && data) return data
  } catch (e) {
    console.warn('Failed to load addons:', e.message)
  }
  return []
}

export async function createWalkInAppointment({
  customerName,
  customerPhone,
  barberId,
  selectedServices = [],
  selectedProducts = [],
  selectedAddons = [],
  selectedOffer = null,
  originalPrice = 0,
  discountAmount = 0,
  finalPrice = 0,
  notes = '',
}) {
  const randomCode = Math.floor(10000 + Math.random() * 90000).toString()
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`

  // البحث عن user_id صالح لتفادي خطأ NOT NULL constraint في قاعدة البيانات
  let userId = null
  try {
    const authRes = await supabase.auth.getUser()
    if (authRes?.data?.user?.id) {
      userId = authRes.data.user.id
    }
  } catch (_) {}

  if (!userId) {
    try {
      const stored = localStorage.getItem('cashier_web_session')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.id && typeof parsed.id === 'string' && parsed.id.includes('-')) {
          userId = parsed.id
        }
      }
    } catch (_) {}
  }

  if (!userId) {
    try {
      const { data: u } = await supabase.from('users').select('id').limit(1).maybeSingle()
      if (u?.id) userId = u.id
    } catch (_) {}
  }

  if (!userId) {
    try {
      const { data: sample } = await supabase
        .from('appointments')
        .select('user_id')
        .not('user_id', 'is', null)
        .limit(1)
        .maybeSingle()
      if (sample?.user_id) userId = sample.user_id
    } catch (_) {}
  }

  if (!userId && barberId && typeof barberId === 'string' && barberId.includes('-')) {
    userId = barberId
  }

  const fullNotes = `(Walk-in) ${notes || ''}`.trim()

  // 1. إدراج الموعد الرئيسي
  const { data: appt, error: apptError } = await supabase
    .from('appointments')
    .insert({
      appointment_code: randomCode,
      user_name: (customerName || 'عميل مباشر').trim(),
      user_phone: (customerPhone || '').trim(),
      barber_id: barberId || null,
      user_id: userId,
      appointment_date: dateStr,
      appointment_time: timeStr,
      booking_type: 'cashier_walkin',
      status: 'pending',
      price: finalPrice,
      original_price: originalPrice,
      discount_amount: discountAmount,
      offer_id: selectedOffer?.id || null,
      offer_title_ar: selectedOffer?.title_ar || selectedOffer?.title || null,
      notes: fullNotes,
      paid_amount: 0,
      tip_amount: 0,
    })
    .select()
    .single()

  if (apptError) throw new Error('فشل إنشاء الموعد: ' + apptError.message)

  const appointmentId = appt.id

  // 2. إدراج الخدمات في appointment_services
  if (selectedServices.length > 0) {
    const serviceRows = selectedServices.map(s => ({
      appointment_id: appointmentId,
      service_id: s.id,
      service_name: s.name_ar || s.arabic_name || s.name || 'خدمة صالون',
      price: s.unitPrice !== undefined ? s.unitPrice : (s.price || 0),
      original_price: s.originalUnitPrice !== undefined ? s.originalUnitPrice : (s.price || 0),
      service_type: s.service_type || 'service',
      status: 'delivered',
      is_custom_price: (s.unitPrice === 0 || s.isCustomPrice === true),
    }))

    const { error: srvErr } = await supabase.from('appointment_services').insert(serviceRows)
    if (srvErr) console.warn('Error inserting appointment_services:', srvErr.message)
  }

  // 3. إدراج المنتجات والبوفيه في appointment_products
  const allProductItems = [
    ...selectedProducts.map(p => ({
      appointment_id: appointmentId,
      product_id: p.id,
      product_name: p.name || p.title || 'منتج',
      unit_price: p.price || p.unitPrice || 0,
      original_price: p.original_price || p.price || 0,
      final_unit_price: p.price || p.unitPrice || 0,
      quantity: p.quantity || 1,
      total_price: (p.price || 0) * (p.quantity || 1),
      status: 'delivered',
      color_name: 'منتجات العناية',
    })),
    ...selectedAddons.map(a => ({
      appointment_id: appointmentId,
      product_id: a.id,
      product_name: a.arabic_name || a.name || 'بوفيه / إضافة',
      unit_price: a.price || 0,
      original_price: a.price || 0,
      final_unit_price: a.price || 0,
      quantity: a.quantity || 1,
      total_price: (a.price || 0) * (a.quantity || 1),
      status: 'delivered',
      color_name: 'بوفيه وضيافة',
    })),
  ]

  if (allProductItems.length > 0) {
    const { error: prodErr } = await supabase.from('appointment_products').insert(allProductItems)
    if (prodErr) console.warn('Error inserting appointment_products:', prodErr.message)
  }

  return {
    appointmentId,
    appointmentCode: randomCode,
    appointment: appt,
  }
}
