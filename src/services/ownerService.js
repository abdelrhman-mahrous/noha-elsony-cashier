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

  // 1. المواعيد المكتملة
  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .select('id, price, paid_amount, tip_amount, status, appointment_date, completed_at')
    .eq('status', 'completed')
    .gte('completed_at', startIso)
    .lte('completed_at', endIso)
    .order('completed_at', { ascending: false })

  if (apptErr) throw new Error(apptErr.message)

  const apptList = appts || []
  const apptIds = apptList.map(a => a.id)

  let servicesShare = 0
  let productsShare = 0

  if (apptIds.length > 0) {
    // 2. الخدمات (بدون buffet)
    try {
      const { data: srvData } = await supabase
        .from('appointment_services')
        .select('price, status, service_type')
        .neq('status', 'cancelled')
        .in('appointment_id', apptIds)

      for (const s of (srvData || [])) {
        if (s.service_type !== 'buffet') servicesShare += (s.price || 0)
      }
    } catch (_) { }

    // 3. المنتجات
    try {
      const { data: prodData } = await supabase
        .from('appointment_products')
        .select('total_price, final_unit_price, unit_price, price, status')
        .neq('status', 'cancelled')
        .in('appointment_id', apptIds)

      for (const p of (prodData || [])) {
        const pPrice = p.total_price || p.final_unit_price || p.unit_price || p.price || 0
        if (pPrice > 0) productsShare += pPrice
      }
    } catch (_) { }
  }

  let grossTotal = 0
  let tipsTotal = 0
  for (const a of apptList) {
    grossTotal += (a.paid_amount || a.price || 0)
    tipsTotal += (a.tip_amount || 0)
  }

  if (servicesShare === 0 && productsShare === 0 && grossTotal > 0) {
    servicesShare = grossTotal - tipsTotal
  }

  // 4. البوفيه
  let buffetTotal = 0
  try {
    const { data: buffetData } = await supabase
      .from('cashier_transactions')
      .select('total_amount')
      .eq('item_type', 'buffet')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
    for (const b of (buffetData || [])) buffetTotal += (b.total_amount || 0)
  } catch (_) { }

  // 5. المسحوبات
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

  const netProfit = (grossTotal + buffetTotal) - withdrawalsTotal

  return {
    apptList,
    servicesShare,
    productsShare,
    buffetTotal,
    tipsTotal,
    grossTotal,
    withdrawals,
    withdrawalsTotal,
    netProfit,
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
}

export async function toggleStaffAbsent(staffId, isCurrentlyAbsent) {
  const { error } = await supabase
    .from('salon_staff')
    .update({ is_absent: !isCurrentlyAbsent })
    .eq('id', staffId)
  if (error) throw new Error(error.message)
}

// ── مواعيد التاريخ المحدد ────────────────────────────────────

export async function getTodayUnassignedAppointments(dateStr) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, appointment_code, user_name, user_phone, appointment_time,
      appointment_date, status, price,
      barbers(name),
      appointment_services(id, service_name, price, status, assigned_to)
    `)
    .eq('appointment_date', dateStr)
    .order('appointment_time', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
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
      ;(groups || []).forEach(g => {
        groupsMap[g.id] = { ...g, items: [] }
      })

      ;(items || []).forEach(it => {
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
    } catch (_) {}
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
    } catch (_) {}
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

export async function getProducts({ limit = 30, offset = 0, query = '' }) {
  let builder = supabase
    .from('cashier_products')
    .select('*')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (query.trim()) {
    builder = builder.ilike('name', `%${query}%`)
  }

  const { data, error } = await builder
  if (error) throw new Error(error.message)
  return data || []
}
