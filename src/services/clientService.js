import { supabase } from '../lib/supabase'

// ── 1. جلب الخدمات المتاحة ──────────────────────────────────────
export async function getClientServices() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    if (data && data.length > 0) return data
  } catch (e) {
    console.warn('Fallback to local default services:', e.message)
  }

  // Fallback services in case table is empty or loading
  return [
    {
      id: 'srv-1',
      name: 'Hair Styling & Blowdry',
      arabic_name: 'سشوار وتسريح شعر ملكي',
      description: 'تسريح احترافي للشعر باستخدام أفضل الزيوت ومغذيات الحرارة.',
      base_price: 250,
      duration_minutes: 45,
      icon: 'content_cut',
      category: 'hair',
    },
    {
      id: 'srv-2',
      name: 'Bridal & Party Makeup',
      arabic_name: 'ميك أب سواريه وخطوبة',
      description: 'ميك أب سينمائي فخم بأحدث صيحات الموضة وخامات أصلية 100%.',
      base_price: 850,
      duration_minutes: 90,
      icon: 'brush',
      category: 'makeup',
    },
    {
      id: 'srv-3',
      name: 'HydraFacial Skincare',
      arabic_name: 'جلسة هيدرافيشل تنظيف عميق للبشرة',
      description: 'تنظيف 9 مراحل لإزالة الرؤوس السوداء، تقشير كريستالي وترطيب نضارة فوري.',
      base_price: 500,
      duration_minutes: 60,
      icon: 'face_retouching_natural',
      category: 'skin',
    },
    {
      id: 'srv-4',
      name: 'Nail Spa & Gel Polish',
      arabic_name: 'باديكير ومانيكير سبا مع جيل بولش',
      description: 'عناية كاملة للأظافر مع تقشير وترطيب وماسك البرافين ولون جيل يدوم أسابيع.',
      base_price: 300,
      duration_minutes: 60,
      icon: 'spa',
      category: 'nails',
    },
    {
      id: 'srv-5',
      name: 'Protein & Keratin Hair Treatment',
      arabic_name: 'جلسة ترميم بروتين وبوتوكس للشعر',
      description: 'علاج وتقوية الروابط الداخلية للشعر ومنحه انسيابية ولمعان خالي من الفورمالين.',
      base_price: 1500,
      duration_minutes: 120,
      icon: 'healing',
      category: 'hair',
    },
    {
      id: 'srv-6',
      name: 'Royal Bridal VIP Package',
      arabic_name: 'الباقة الملكية للعروس (VIP)',
      description: 'شامل ميك أب عروس كامل، تسريحة شعر، حمام مغربي، جلسة نضارة ومانيكير وباديكير.',
      base_price: 4500,
      duration_minutes: 240,
      icon: 'star',
      category: 'bridal',
    },
  ]
}

// ── 2. جلب الكوافيرات / المتخصصات ──────────────────────────────
export async function getClientBarbers() {
  try {
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name, phone, rating, avatar_url, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    if (data && data.length > 0) return data
  } catch (e) {
    console.warn('Fallback to staff table:', e.message)
  }

  try {
    const { data: staffData } = await supabase
      .from('salon_staff')
      .select('id, name, role, phone, is_active')
      .eq('is_active', true)
    if (staffData && staffData.length > 0) return staffData
  } catch (_) { }

  return [
    { id: '1', name: 'نهي السني', role: 'خبير التجميل والميك أب الرئيسي' },
    { id: '2', name: 'مروة أحمد', role: 'أخصائية تسريحات وعلاج الشعر' },
    { id: '3', name: 'سارة خالد', role: 'أخصائية عناية بالبشرة وهيدرافيشل' },
  ]
}

// ── 3. جلب العروض النشطة ─────────────────────────────────────────
export async function getClientOffers() {
  try {
    const { data, error } = await supabase
      .from('service_offers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) return data
  } catch (_) { }

  return [
    {
      id: 'offer-1',
      title: 'عرض باقة الجمال الأسبوعي',
      description: 'سشوار + باديكير سبا + ماسك نضارة فوري للوجه',
      original_price: 650,
      discount_price: 450,
      discount_percentage: 30,
    },
    {
      id: 'offer-2',
      title: 'باقة العروس الماسية (خصم خاص)',
      description: 'ميك أب زفاف كامل + تسريحة الشعر الفاخرة + جلسة عناية ملكية',
      original_price: 5000,
      discount_price: 3800,
      discount_percentage: 24,
    },
  ]
}

// ── 4. جلب المنتجات المتاحة في المتجر ─────────────────────────────
export async function getClientProducts() {
  try {
    const { data, error } = await supabase
      .from('cashier_products')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data && data.length > 0) return data
  } catch (_) { }

  return [
    {
      id: 'prod-1',
      name: 'سيروم الأرجان المغربي المعالج',
      category: 'شعر',
      price: 320,
      stock_quantity: 15,
      description: 'تغذية عميقة للشعر التالف وحماية من حرارة السشوار.',
    },
    {
      id: 'prod-2',
      name: 'غسول النضارة بفيتامين C وحمض الهيالورونيك',
      category: 'بشرة',
      price: 260,
      stock_quantity: 10,
      description: 'تنظيف لطيف يمنح البشرة إشراقة ونعومة حريرية.',
    },
    {
      id: 'prod-3',
      name: 'ماسك الكيراتين وزبدة الشيا المركز',
      category: 'شعر',
      price: 410,
      stock_quantity: 8,
      description: 'علاج أسبوعي للشعر الجاف والمصبوغ لملمس حريري.',
    },
  ]
}

// ── 5. جلب الآراء المعتمدة ──────────────────────────────────────
export async function getClientReviews() {
  try {
    const [salonRes, barberRes] = await Promise.allSettled([
      supabase
        .from('salon_reviews')
        .select('id, user_name, rating, comment, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('barber_reviews')
        .select('id, user_name, rating, comment, created_at, barbers(name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const list = []
    if (salonRes.status === 'fulfilled' && salonRes.value.data) {
      list.push(...salonRes.value.data)
    }
    if (barberRes.status === 'fulfilled' && barberRes.value.data) {
      list.push(...barberRes.value.data)
    }

    if (list.length > 0) {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      return list
    }
  } catch (_) { }

  return [
    {
      id: 'rev-1',
      user_name: 'يارا حسام',
      rating: 5,
      comment: 'أجمل تجربة ميك أب وتسريحة في فرح أختي! شغل أستاذة نهي السني فوق الخيال وقمة الذوق والرقي.',
      created_at: new Date().toISOString(),
    },
    {
      id: 'rev-2',
      user_name: 'منة الله السيد',
      rating: 5,
      comment: 'جلسة الهيدرافيشل فرقت جداً في بشرتي، المكان قمة في النظافة والتعقيم والاستقبال الملكي.',
      created_at: new Date().toISOString(),
    },
    {
      id: 'rev-3',
      user_name: 'ريم عبد العزيز',
      rating: 5,
      comment: 'البروتين طلع تحفة وبدون أي ريحة مزعجة والشعر ناعم وصحي جداً. تسلم إيديكم!',
      created_at: new Date().toISOString(),
    },
  ]
}

// ── 6. إرسال تقييم جديد ─────────────────────────────────────────
export async function submitClientReview({ userName, rating, comment, barberId }) {
  if (barberId) {
    const { error } = await supabase.from('barber_reviews').insert({
      barber_id: barberId,
      user_name: userName.trim(),
      rating: parseInt(rating, 10) || 5,
      comment: comment.trim(),
    })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('salon_reviews').insert({
      user_name: userName.trim(),
      rating: parseInt(rating, 10) || 5,
      comment: comment.trim(),
    })
    if (error) throw new Error(error.message)
  }
}

// ── 7. حجز موعد جديد أونلاين ────────────────────────────────────
export async function createClientAppointment({
  userName,
  userPhone,
  appointmentDate,
  appointmentTime,
  barberId,
  selectedServices = [],
  notes = '',
}) {
  const code = 'NS-' + Math.floor(100000 + Math.random() * 900000)
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.base_price || s.price || 0), 0)

  // 1. إنشاء الحجز في جدول appointments
  const { data: appt, error: apptError } = await supabase
    .from('appointments')
    .insert({
      appointment_code: code,
      user_name: userName.trim(),
      user_phone: userPhone.trim(),
      barber_id: barberId || null,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      price: totalPrice,
      paid_amount: 0,
      tip_amount: 0,
      status: 'pending',
      notes: notes.trim(),
    })
    .select()
    .single()

  if (apptError) throw new Error(apptError.message)

  // 2. ربط الخدمات المطلوبة في appointment_services
  if (selectedServices.length > 0 && appt?.id) {
    const srvRows = selectedServices.map(s => ({
      appointment_id: appt.id,
      service_name: s.arabic_name || s.name || 'خدمة صالون',
      price: s.base_price || s.price || 0,
      status: 'pending',
      service_type: s.category || 'service',
    }))

    try {
      await supabase.from('appointment_services').insert(srvRows)
    } catch (_) { }
  }

  return {
    ...appt,
    code,
    totalPrice,
  }
}

// ── 8. تتبع الحجز برقم الموبايل أو كود الحجز ─────────────────────
export async function trackClientBooking(query) {
  const q = query.trim()
  if (!q) throw new Error('يرجى إدخال رقم الهاتف أو كود الحجز')

  let builder = supabase
    .from('appointments')
    .select(`
      id, appointment_code, user_name, user_phone, appointment_date,
      appointment_time, price, status, notes, created_at,
      barbers(name),
      appointment_services(service_name, price, status)
    `)
    .order('created_at', { ascending: false })

  if (q.startsWith('NS-') || q.length === 8) {
    builder = builder.eq('appointment_code', q)
  } else {
    builder = builder.or(`user_phone.ilike.%${q}%,appointment_code.ilike.%${q}%`)
  }

  const { data, error } = await builder
  if (error) throw new Error(error.message)
  return data || []
}

// ── 9. إرسال رسالة دعم أو استفسار ────────────────────────────────
export async function submitSupportInquiry({ phone, message, userName }) {
  try {
    const { error } = await supabase.from('user_complaints').insert({
      user_name: userName?.trim() || '',
      user_phone: phone.trim(),
      complaint_text: message.trim(),
      status: 'pending',
    })
    if (!error) return
  } catch (_) {}

  // Fallback to customer_support
  const fullMsg = userName ? `[الاسم: ${userName}] ${message}` : message
  const { error: fbErr } = await supabase.from('customer_support').insert({
    phone: phone.trim(),
    message: fullMsg.trim(),
    status: 'جديد',
  })
  if (fbErr) throw new Error(fbErr.message)
}
