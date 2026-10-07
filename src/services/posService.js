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
        const origPrice = (row.original_price != null && row.original_price > 0) ? row.original_price : srvPrice
        const serviceType = row.service_type || 'service'
        let itemType = 'service'
        if (serviceType === 'package') itemType = 'package'
        if (serviceType === 'addon' || serviceType === 'buffet') itemType = 'addon'

        items.push({
          id: row.id || '',
          serviceId: row.service_id || row.id || apptId,
          title: row.service_name || 'خدمة صالون',
          subtitle: srvPrice === 0 ? 'يتطلب تحديد السعر في الصالون' : (serviceType || 'خدمة'),
          itemType,
          unitPrice: srvPrice,
          originalUnitPrice: origPrice,
          quantity: row.quantity || 1,
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

  // 2. جلب خدمات البوفيه والإضافات (Addons)
  try {
    const existingAddonTitles = new Set(
      items.filter(i => i.itemType === 'addon').map(i => i.title.trim())
    )
    const existingAddonIds = new Set(
      items.filter(i => i.itemType === 'addon').map(i => i.serviceId || i.id)
    )

    let rawAddons = appt.selected_addons
    let addonIdsOrNames = []
    if (Array.isArray(rawAddons)) {
      addonIdsOrNames = rawAddons.map(x => String(x).trim()).filter(Boolean)
    } else if (typeof rawAddons === 'string' && rawAddons.trim() && rawAddons.trim() !== '[]') {
      try {
        const parsed = JSON.parse(rawAddons)
        if (Array.isArray(parsed)) {
          addonIdsOrNames = parsed.map(x => String(x).trim()).filter(Boolean)
        } else {
          addonIdsOrNames = [rawAddons.trim()]
        }
      } catch (_) {
        addonIdsOrNames = [rawAddons.trim()]
      }
    }

    // fallback من notes لو selected_addons فاضي
    if (addonIdsOrNames.length === 0 && appt.notes && appt.notes.includes('الإضافات:')) {
      const lines = appt.notes.split('\n')
      for (const line of lines) {
        if (line.includes('الإضافات:')) {
          const parts = line.replace('الإضافات:', '').split(',')
          for (const p of parts) {
            const tr = p.trim()
            if (tr) addonIdsOrNames.push(tr)
          }
        }
      }
    }

    if (addonIdsOrNames.length > 0) {
      // Query addons table
      const { data: addonsTable } = await supabase
        .from('addons')
        .select('*')

      if (addonsTable && addonsTable.length > 0) {
        for (const itemRef of addonIdsOrNames) {
          const match = addonsTable.find(
            a => a.id === itemRef ||
                 (a.arabic_name && a.arabic_name.trim() === itemRef) ||
                 (a.name && a.name.trim() === itemRef)
          )

          if (!match) continue

          const title = match.arabic_name || match.name || 'إضافة'
          const addonId = match.id || itemRef
          const price = match.price || 0

          if (!existingAddonTitles.has(title) && !existingAddonIds.has(addonId)) {
            existingAddonTitles.add(title)
            existingAddonIds.add(addonId)

            items.push({
              id: addonId,
              serviceId: addonId,
              title,
              subtitle: 'خدمات البوفيه والإضافات',
              itemType: 'addon',
              unitPrice: price,
              originalUnitPrice: price,
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
      }
    }
  } catch (err) {
    console.error('Error loading addons for POS:', err)
  }

  // 3. Fallback — مواعيد قديمة بدون appointment_services
  if (!hasServicesFromTable && items.filter(i => i.itemType !== 'addon').length === 0) {
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

  // 4. المنتجات
  try {
    const { data: products } = await supabase
      .from('appointment_products')
      .select('*')
      .eq('appointment_id', apptId)

    if (products) {
      for (const row of products) {
        const qty = row.quantity || 1
        const uPrice = row.final_unit_price != null ? row.final_unit_price : (row.unit_price != null ? row.unit_price : (row.price != null ? row.price : (row.total_price != null ? (row.total_price / qty) : 0)))
        const origPrice = row.original_price != null ? row.original_price : uPrice

        items.push({
          id: row.id || '',
          serviceId: row.product_id || null,
          title: row.product_name || 'منتج',
          subtitle: row.color_name || 'منتجات العناية بالصالون',
          itemType: 'product',
          unitPrice: uPrice,
          originalUnitPrice: origPrice,
          quantity: qty,
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

  // 5. Fallback نهائي لو مفيش بنود خالص
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

  // 6. تطبيق العروض
  const taggedItems = await applyOffers(appt, items)

  // 7. بيانات العميل
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

  const hasOffer = !!(appt.offer_id || appt.offer_title_ar || (appt.discount_amount && appt.discount_amount > 0))

  return {
    appointmentId: apptId,
    appointmentCode: appt.appointment_code || '',
    customerName,
    customerNickname,
    customerPhone,
    barberName: appt.barbers?.name || 'كوافيرة',
    appointmentTime: appt.appointment_time || '',
    appointmentDate: appt.appointment_date || '',
    depositPaid: appt.deposit_amount || appt.deposit_paid || 0,
    status: appt.status || 'pending',
    paidAmount: appt.paid_amount || 0,
    cashierNotes: appt.cashier_notes || '',
    tipAmount: appt.tip_amount || 0,
    hasOffer,
    offerId: appt.offer_id || null,
    offerTitleAr: appt.offer_title_ar || (hasOffer ? 'عرض خاص' : null),
    originalPrice: appt.original_price || 0,
    discountAmount: appt.discount_amount || 0,
    price: appt.price || 0,
    discountType: null,
    discountValue: null,
    items: taggedItems,
  }
}

async function applyOffers(appt, items) {
  const offerId = appt.offer_id
  const apptDiscountAmount = appt.discount_amount || 0
  let offerTitle = appt.offer_title_ar || 'عرض الصالون'

  let offerResp = null
  let discountType = null
  let discountValue = null
  let targetItems = []
  let targetGroups = []
  let targetCategories = []
  let targetProducts = []
  const targetItemDiscounts = {}

  if (offerId && offerId !== 'null') {
    try {
      const { data: sOffer } = await supabase
        .from('service_offers')
        .select('*, service_offer_targets(target_type, target_id, discount_type, discount_value)')
        .eq('id', offerId)
        .maybeSingle()
      if (sOffer) {
        offerResp = sOffer
        offerTitle = sOffer.title_ar || offerTitle
        discountType = sOffer.discount_type
        discountValue = sOffer.discount_value
        const targets = sOffer.service_offer_targets || []
        for (const t of targets) {
          const tType = t.target_type
          const tId = t.target_id
          if (tId) {
            if (tType === 'item') {
              targetItems.push(tId)
              if (t.discount_type && t.discount_value) {
                targetItemDiscounts[tId] = { type: t.discount_type, value: t.discount_value }
              }
            } else if (tType === 'group') {
              targetGroups.push(tId)
            } else if (tType === 'category') {
              targetCategories.push(tId)
            } else if (tType === 'product') {
              targetProducts.push(tId)
            }
          }
        }
      } else {
        // فحص جدول offers
        const { data: bOffer } = await supabase
          .from('offers')
          .select('*')
          .eq('id', offerId)
          .maybeSingle()
        if (bOffer) {
          offerResp = bOffer
          offerTitle = bOffer.title || offerTitle
          discountType = bOffer.package_discount_type || 'fixed'
          discountValue = bOffer.package_discount_value || bOffer.offer_price || apptDiscountAmount
        }
      }
    } catch (_) {}
  }

  // حل المجموعات والتصنيفات للأصناف المستهدفة
  if (targetGroups.length > 0) {
    try {
      const { data: gItems } = await supabase
        .from('service_items')
        .select('id')
        .in('group_id', targetGroups)
      if (gItems) {
        gItems.forEach(r => { if (r.id) targetItems.push(r.id) })
      }
    } catch (_) {}
  }
  if (targetCategories.length > 0) {
    try {
      const { data: cGroups } = await supabase
        .from('service_groups')
        .select('id')
        .in('category_id', targetCategories)
      if (cGroups && cGroups.length > 0) {
        const groupIds = cGroups.map(g => g.id)
        const { data: cItems } = await supabase
          .from('service_items')
          .select('id')
          .in('group_id', groupIds)
        if (cItems) {
          cItems.forEach(r => { if (r.id) targetItems.push(r.id) })
        }
      }
    } catch (_) {}
  }

  // في حال عدم العثور على discountValue
  if ((discountValue == null || discountValue === 0) && Object.keys(targetItemDiscounts).length === 0) {
    if (apptDiscountAmount > 0) {
      discountValue = apptDiscountAmount
      if (!discountType) discountType = 'fixed'
    }
  }

  const isTargetSpecific = Object.keys(targetItemDiscounts).length > 0
  const hasTargets = targetItems.length > 0 || targetProducts.length > 0 || isTargetSpecific

  // 1. باقة بسعر ثابت (fixed_package / fixedPackage / package)
  if (discountType === 'fixed_package' || discountType === 'fixedPackage' || discountType === 'package') {
    const serviceItems = items.filter(i => i.itemType === 'service' || i.itemType === 'package')
    const origServicesSum = serviceItems.reduce((s, i) => s + (i.originalUnitPrice || i.unitPrice) * i.quantity, 0)
    const addonsSum = items.filter(i => i.itemType === 'addon').reduce((s, a) => s + a.unitPrice * a.quantity, 0)
    const productsSum = items.filter(i => i.itemType === 'product').reduce((s, p) => s + p.unitPrice * p.quantity, 0)
    const targetPackagePrice = (discountValue != null && discountValue > 0) ? discountValue : (appt.price ? Math.max(0, appt.price - addonsSum - productsSum) : origServicesSum)
    const calculatedDiscount = Math.max(origServicesSum - targetPackagePrice, 0)

    if (origServicesSum > 0 && calculatedDiscount > 0) {
      const discountRatio = calculatedDiscount / origServicesSum
      return items.map(item => {
        if (item.itemType !== 'service' && item.itemType !== 'package') return item
        const orig = item.originalUnitPrice || item.unitPrice
        const discounted = Math.max(orig * (1 - discountRatio), 0)
        return {
          ...item,
          isCoveredByOffer: true,
          offerDiscountNote: `ضمن باقة: ${offerTitle}`,
          offerDiscountRate: discountRatio,
          unitPrice: appt.status === 'completed' ? item.unitPrice : discounted,
          originalUnitPrice: orig,
        }
      })
    }
  }

  // 2. خصومات على بنود محددة أو خصومات عامة نسبة/مبلغ
  const serviceItems = items.filter(i => i.itemType === 'service' || i.itemType === 'package')
  const serviceItemsSum = serviceItems.reduce((s, i) => s + (i.originalUnitPrice || i.unitPrice) * i.quantity, 0)

  // لو مفيش offerId بس فيه discount_amount مسجل على الموعد
  if (!offerId && apptDiscountAmount > 0 && serviceItemsSum > 0) {
    const discountRatio = Math.min(apptDiscountAmount / serviceItemsSum, 1)
    return items.map(item => {
      if (item.itemType !== 'service' && item.itemType !== 'package') return item
      const orig = item.originalUnitPrice || item.unitPrice
      const discounted = Math.max(orig * (1 - discountRatio), 0)
      return {
        ...item,
        isCoveredByOffer: true,
        offerDiscountNote: `خصم عرض: ${offerTitle}`,
        offerDiscountRate: discountRatio,
        unitPrice: appt.status === 'completed' ? item.unitPrice : discounted,
        originalUnitPrice: orig,
      }
    })
  }

  return items.map(item => {
    const itemId = item.serviceId || item.id
    const isCovered = isTargetSpecific
      ? (targetItemDiscounts[itemId] != null || targetItems.includes(itemId))
      : (hasTargets
          ? (targetItems.includes(itemId) || targetProducts.includes(itemId) || (item.itemType === 'service' && targetItems.length === 0))
          : (item.itemType === 'service' || item.itemType === 'package'))

    if (!isCovered) return item

    let note = `ضمن عرض: ${offerTitle}`
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
        note = `خصم ${spec.value}% ضمن عرض: ${offerTitle}`
        discountRate = rate
        if (item.unitPrice > 0) discountedUnit = item.unitPrice * (1 - rate)
      } else {
        note = `خصم ${spec.value} جنيه ضمن عرض: ${offerTitle}`
        if (item.unitPrice > 0) discountedUnit = Math.max(item.unitPrice - spec.value, 0)
      }
    } else if (discountType === 'percentage' && discountValue > 0) {
      const rate = Math.min(discountValue / 100, 1)
      note = `خصم ${discountValue}% ضمن عرض: ${offerTitle}`
      discountRate = rate
      if (item.unitPrice > 0) discountedUnit = item.unitPrice * (1 - rate)
    } else if ((discountType === 'fixed' && discountValue > 0) || apptDiscountAmount > 0) {
      const totalDisc = discountValue > 0 ? discountValue : apptDiscountAmount
      if (serviceItemsSum > 0 && totalDisc > 0) {
        const rate = Math.min(totalDisc / serviceItemsSum, 1)
        note = `خصم عرض: ${offerTitle}`
        discountRate = rate
        if (item.unitPrice > 0) discountedUnit = item.unitPrice * (1 - rate)
      }
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
}

/**
 * حفظ المحاسبة النهائية للموعد
 */
export async function savePosCheckout({ details, paidAmount, tipAmount, notes }) {
  const itemsJson = details.items.map(e => ({
    id: e.id,
    service_id: e.serviceId || e.id,
    item_type: e.itemType,
    title: e.title,
    service_name: e.title,
    product_name: e.title,
    status: e.status,
    cancel_reason: e.cancelReason,
    unit_price: e.unitPrice,
    original_price: e.originalUnitPrice ?? e.unitPrice,
    is_custom_price: e.isCustomPrice,
    quantity: e.quantity || 1,
  }))

  const deliveredSubtotal = details.items
    .filter(i => i.status === 'delivered')
    .reduce((sum, i) => sum + i.unitPrice * (i.quantity || 1), 0)

  const totalOriginal = details.items
    .filter(i => i.status === 'delivered')
    .reduce((sum, i) => sum + (i.originalUnitPrice ?? i.unitPrice) * (i.quantity || 1), 0)

  const discountAmount = Math.max(totalOriginal - deliveredSubtotal, 0)

  // 1. استدعاء RPC الرئيسي
  let rpcData = null
  try {
    const res = await supabase.rpc('checkout_appointment_pos', {
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
    if (res.error) throw res.error
    rpcData = res.data
  } catch (rpcErr) {
    console.warn('RPC checkout_appointment_pos failed, running client fallback:', rpcErr.message)
    // تحديث مباشر لجدول appointments
    await supabase
      .from('appointments')
      .update({
        status: 'completed',
        paid_amount: paidAmount,
        tip_amount: tipAmount,
        cashier_notes: notes || '',
        price: deliveredSubtotal,
        original_price: totalOriginal,
        discount_amount: discountAmount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', details.appointmentId)
  }

  // 2. تحديث وإدراج الخدمات والبوفيه في appointment_services لضمان حفظ كل التعديلات والبنود الجديدة
  try {
    const serviceItems = details.items.filter(i => i.itemType === 'service' || i.itemType === 'addon' || i.itemType === 'package')
    for (const item of serviceItems) {
      if (item.isNewlyAdded || String(item.id).startsWith('new_')) {
        // إدراج بند جديد
        await supabase.from('appointment_services').insert({
          appointment_id: details.appointmentId,
          service_id: item.serviceId && !String(item.serviceId).startsWith('new_') ? item.serviceId : null,
          service_name: item.title,
          service_type: item.itemType === 'addon' ? 'addon' : 'service',
          price: item.unitPrice * (item.quantity || 1),
          original_price: (item.originalUnitPrice ?? item.unitPrice) * (item.quantity || 1),
          quantity: item.quantity || 1,
          status: item.status,
          cancel_reason: item.cancelReason || null,
          is_custom_price: item.isCustomPrice === true,
        })
      } else if (item.id) {
        // تحديث بند موجود
        await supabase
          .from('appointment_services')
          .update({
            status: item.status,
            cancel_reason: item.cancelReason || null,
            price: item.unitPrice * (item.quantity || 1),
            original_price: (item.originalUnitPrice ?? item.unitPrice) * (item.quantity || 1),
            quantity: item.quantity || 1,
            is_custom_price: item.isCustomPrice === true,
          })
          .eq('id', item.id)
      }
    }
  } catch (err) {
    console.warn('Error updating appointment_services:', err.message)
  }

  // 3. تحديث وإدراج المنتجات في appointment_products وخصم المخزون
  try {
    const productItems = details.items.filter(i => i.itemType === 'product')
    for (const prod of productItems) {
      const qty = prod.quantity || 1
      const totalP = prod.unitPrice * qty
      if (prod.isNewlyAdded || String(prod.id).startsWith('new_')) {
        await supabase.from('appointment_products').insert({
          appointment_id: details.appointmentId,
          product_id: prod.serviceId && !String(prod.serviceId).startsWith('new_') ? prod.serviceId : null,
          product_name: prod.title,
          unit_price: prod.unitPrice,
          original_price: prod.originalUnitPrice ?? prod.unitPrice,
          final_unit_price: prod.unitPrice,
          quantity: qty,
          total_price: totalP,
          status: prod.status,
          cancel_reason: prod.cancelReason || null,
          color_name: prod.subtitle || 'منتجات العناية بالصالون',
        })
      } else if (prod.id) {
        await supabase
          .from('appointment_products')
          .update({
            status: prod.status,
            cancel_reason: prod.cancelReason || null,
            unit_price: prod.unitPrice,
            final_unit_price: prod.unitPrice,
            quantity: qty,
            total_price: totalP,
          })
          .eq('id', prod.id)
      }

      // خصم من المخزون إن وُجد product_id وكان المنتج مُسلَّم
      if (prod.serviceId && prod.status === 'delivered') {
        try {
          const { data: pRow } = await supabase.from('products').select('stock_quantity').eq('id', prod.serviceId).maybeSingle()
          if (pRow && pRow.stock_quantity != null) {
            await supabase.from('products').update({
              stock_quantity: Math.max(0, pRow.stock_quantity - qty)
            }).eq('id', prod.serviceId)
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('Error updating appointment_products:', err.message)
  }

  // 4. إرسال إشعار التقييم لصاحبة الموعد
  try {
    await trySendRatingNotification(details.appointmentId, rpcData)
  } catch (notifErr) {
    console.warn('Rating notification failed (non-critical):', notifErr)
  }

  return true
}

/**
 * إرسال إشعار التقييم للعميلة وتسجيل التقييم المعلق
 */
async function trySendRatingNotification(appointmentId, rpcData) {
  try {
    let fcmToken = rpcData?.fcm_token
    let notifTitle = rpcData?.notif_title
    let notifBody = rpcData?.notif_body
    let barberId = rpcData?.barber_id || ''

    if (!fcmToken) {
      const { data: apptRow } = await supabase
        .from('appointments')
        .select('user_id, barber_id, booking_type, user_phone')
        .eq('id', appointmentId)
        .maybeSingle()

      if (!apptRow) return
      if (apptRow.booking_type === 'cashier_walkin') return

      let userId = apptRow.user_id
      if (!userId && apptRow.user_phone) {
        const { data: userByPhone } = await supabase
          .from('users')
          .select('id, fcm_token, name, nickname')
          .eq('phone', apptRow.user_phone.trim())
          .maybeSingle()
        if (userByPhone) {
          userId = userByPhone.id
          fcmToken = userByPhone.fcm_token
        }
      }

      if (!userId) return
      barberId = barberId || apptRow.barber_id || ''

      if (!fcmToken) {
        const { data: userRow } = await supabase
          .from('users')
          .select('name, nickname, fcm_token')
          .eq('id', userId)
          .maybeSingle()

        fcmToken = userRow?.fcm_token
        const nickname = (userRow?.nickname || '').trim()
        const fullName = (userRow?.name || '').trim()
        const firstName = fullName ? fullName.split(' ')[0] : ''
        const userName = nickname || firstName
        notifTitle = notifTitle || (userName ? `⭐ تقييم تجربتك يا ${userName}` : '⭐ تقييم تجربتك في صالون نهى السني')
        notifBody = notifBody || (userName
          ? `أهلاً بكِ ${userName}، بنشكرك على إنك استخدمتي تطبيق نهى السني وأتممتِ حجز موعدك، ومستنيين رأيك في التجربة علشان تاخدي 10 نقاط لما تفتحي التطبيق وتقيمينا 🎁`
          : 'بنشكرك على إنك استخدمتي تطبيق نهى السني وأتممتِ حجز موعدك، ومستنيين رأيك في التجربة علشان تاخدي 10 نقاط لما تفتحي التطبيق وتقيمينا 🎁')
      }
    }

    if (fcmToken) {
      console.log('Sending FCM rating notification to token:', fcmToken)
      const res = await supabase.functions.invoke('send-notifications', {
        body: {
          token: fcmToken,
          title: notifTitle || '⭐ تقييم تجربتك في صالون نهى السني',
          body: notifBody || 'بنشكرك على إتمام حجز موعدك، نود معرفة رأيك في التجربة 🎁',
          data: {
            title: notifTitle || '⭐ تقييم تجربتك في صالون نهى السني',
            body: notifBody || 'بنشكرك على إتمام حجز موعدك، نود معرفة رأيك في التجربة 🎁',
            type: 'rating_request',
            appointment_id: String(appointmentId),
            barber_id: String(barberId || ''),
          },
        },
      })
      console.log('FCM invocation result:', res)
    } else {
      console.warn('No FCM token found for appointment user:', appointmentId)
    }
  } catch (err) {
    console.warn('trySendRatingNotification error:', err)
  }
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
  const result = []

  // 1. جلب المنتجات النشطة من products_full أو products
  try {
    const { data: prods } = await supabase
      .from('products_full')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (prods && prods.length > 0) {
      prods.forEach(p => {
        // حساب سعر البيع النهائي بعد الخصم إن وُجد
        let finalPrice = p.price || 0
        if (p.discount_percentage && p.discount_percentage > 0) {
          finalPrice = Math.max(0, finalPrice * (1 - p.discount_percentage / 100))
        } else if (p.discount_amount && p.discount_amount > 0) {
          finalPrice = Math.max(0, finalPrice - p.discount_amount)
        }

        result.push({
          id: p.id,
          name: p.name,
          price: finalPrice,
          original_price: p.price || 0,
          purchase_price: p.purchase_price || 0,
          stock_quantity: p.stock_quantity ?? 0,
          image_url: p.image_url || (p.images && p.images[0]) || null,
          is_bundle: false,
          colors: p.colors || [],
          discount_percentage: p.discount_percentage || 0,
          discount_amount: p.discount_amount || 0,
        })
      })
    }
  } catch (_) {
    try {
      const { data: prods2 } = await supabase
        .from('products')
        .select('*, product_colors(*)')
        .eq('is_active', true)
        .order('name')

      if (prods2 && prods2.length > 0) {
        prods2.forEach(p => {
          let finalPrice = p.price || 0
          if (p.discount_percentage && p.discount_percentage > 0) {
            finalPrice = Math.max(0, finalPrice * (1 - p.discount_percentage / 100))
          } else if (p.discount_amount && p.discount_amount > 0) {
            finalPrice = Math.max(0, finalPrice - p.discount_amount)
          }
          result.push({
            id: p.id,
            name: p.name,
            price: finalPrice,
            original_price: p.price || 0,
            purchase_price: p.purchase_price || 0,
            stock_quantity: p.stock_quantity ?? 0,
            image_url: p.image_url || (p.images && p.images[0]) || null,
            is_bundle: false,
            colors: p.product_colors || [],
            discount_percentage: p.discount_percentage || 0,
            discount_amount: p.discount_amount || 0,
          })
        })
      }
    } catch (_) {}
  }

  // 2. جلب باقات ومجموعات العروض النشطة
  try {
    const { data: bundles } = await supabase
      .from('bundles_full')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (bundles && bundles.length > 0) {
      bundles.forEach(b => {
        result.push({
          id: b.id,
          name: `🎁 باقة: ${b.name}`,
          price: b.bundle_price || 0,
          original_price: b.bundle_price || 0,
          purchase_price: b.purchase_price || 0,
          stock_quantity: 99,
          image_url: b.image_url || (b.images && b.images[0]) || null,
          is_bundle: true,
          items: b.items || [],
          discount_percentage: b.discount_percentage || 0,
        })
      })
    }
  } catch (_) {
    try {
      const { data: bundles2 } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (bundles2 && bundles2.length > 0) {
        bundles2.forEach(b => {
          result.push({
            id: b.id,
            name: `🎁 باقة: ${b.name}`,
            price: b.bundle_price || 0,
            original_price: b.bundle_price || 0,
            purchase_price: b.purchase_price || 0,
            stock_quantity: 99,
            image_url: b.image_url || (b.images && b.images[0]) || null,
            is_bundle: true,
            discount_percentage: b.discount_percentage || 0,
          })
        })
      }
    } catch (_) {}
  }

  return result
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

  // ── التحقق الصارم من user_id لضمان مطابقة الـ Foreign Key (appointments_user_id_fkey) ──
  let userId = null

  // 1. البحث برقم هاتف العميل إن وُجد في جدول users
  if (customerPhone && customerPhone.trim()) {
    try {
      const { data: uPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', customerPhone.trim())
        .limit(1)
        .maybeSingle()
      if (uPhone?.id) userId = uPhone.id
    } catch (_) {}
  }

  // 2. جلب أي مستخدم صالح ومسجل في جدول users
  if (!userId) {
    try {
      const { data: anyUser } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (anyUser?.id) userId = anyUser.id
    } catch (_) {}
  }

  // 3. كحل بديل: جلب user_id موثوق من جدول appointments المسجلة مسبقاً
  if (!userId) {
    try {
      const { data: sampleAppt } = await supabase
        .from('appointments')
        .select('user_id')
        .not('user_id', 'is', null)
        .limit(1)
        .maybeSingle()
      if (sampleAppt?.user_id) userId = sampleAppt.user_id
    } catch (_) {}
  }

  // ── التحقق من barber_id لضمان وجوده في جدول barbers ──
  let sanitizedBarberId = barberId || null
  if (sanitizedBarberId) {
    try {
      const { data: bCheck } = await supabase
        .from('barbers')
        .select('id')
        .eq('id', sanitizedBarberId)
        .maybeSingle()
      if (!bCheck) {
        const { data: firstB } = await supabase.from('barbers').select('id').limit(1).maybeSingle()
        sanitizedBarberId = firstB?.id || null
      }
    } catch (_) {
      sanitizedBarberId = null
    }
  }

  const fullNotes = `(Walk-in) ${notes || ''}`.trim()

  // 1. إدراج الموعد الرئيسي
  const { data: appt, error: apptError } = await supabase
    .from('appointments')
    .insert({
      appointment_code: randomCode,
      user_name: (customerName || 'عميل مباشر').trim(),
      user_phone: (customerPhone || '').trim(),
      barber_id: sanitizedBarberId || null,
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
