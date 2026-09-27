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
