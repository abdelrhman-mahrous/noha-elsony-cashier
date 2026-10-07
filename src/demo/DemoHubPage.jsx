import { Link } from 'react-router-dom'
import './demo.css'
import { DEMO_SALON_INFO } from './demoData'

const DEMO_CARDS = [
  {
    id: 'owner',
    title: '👑 لوحة تحكم صاحبة الصالون (Owner Portal)',
    subtitle: 'إدارة مالية كاملة، أرباح، مراقبة المخزون والبوفيه، توزيع مهام اليوم، تقييمات الموظفات والإكراميات',
    badge: 'إدارة شاملة',
    gradient: 'linear-gradient(135deg, #4A1525 0%, #8E3A59 100%)',
    icon: '👑',
    to: '/demo/owner',
    features: [
      '📊 تقارير الأرباح والمبيعات اليومية والشهرية',
      '👥 كشف أداء الكوافيرات وحصيلة التبس والعمولات',
      '📦 جرد المخزن ومنبهات نقص المنتجات',
      '☕ إيرادات ومبيعات البوفيه والضيافة',
    ],
  },
  {
    id: 'stylist',
    title: '✂️ واجهة الكوافيرة وخبيرة التجميل (Stylist / Staff)',
    subtitle: 'شاشة مخصصة لكل مصففة لمتابعة جدول مواعيدها اليومية، بدء وإنهاء الخدمات، ومحفظة العمولات المباشرة',
    badge: 'تجربة الستاف',
    gradient: 'linear-gradient(135deg, #1C2833 0%, #2C3E50 100%)',
    icon: '✂️',
    to: '/demo/stylist',
    features: [
      '📅 جدول الحجوزات اليومية وحالة كل عميلة (قيد العمل / مكتمل)',
      '💰 عداد العمولات والأرباح والإكراميات الشخصية',
      '⭐ سجل تقييمات ورسائل العميلات لخبيرة التجميل',
      '🧴 طلب مستلزمات وخامات عمل من المخزن بضغطة زر',
    ],
  },
  {
    id: 'marketing',
    title: '🏷️ لوحة التسويق والعروض (Marketing & CRM)',
    subtitle: 'إنشاء باقات العرايس، الخصومات الترويجية، كوبونات الخصم، متابعة آراء العميلات وإدارة الشكاوى',
    badge: 'نمو المبيعات',
    gradient: 'linear-gradient(135deg, #6C3483 0%, #884EA0 100%)',
    icon: '🏷️',
    to: '/demo/marketing',
    features: [
      '🎁 إنشاء وتعديل باقات وعروض الخدمات المخفضة',
      '🎟️ مولد كوبونات الخصم وتحديد نسب الاستخدام',
      '⭐ مراقبة تقييمات ورضا العميلات والرد على الشكاوى',
      '📱 محاكي حملات الـ SMS والإشعارات الترويجية',
    ],
  },
  {
    id: 'cashier',
    title: '🖥️ شاشة الكاشير ونقاط البيع (POS System)',
    subtitle: 'نظام كاشير فائق السرعة لإتمام الفواتير، اختيار الكوافيرة المستحقة للعمولة، ودمج خدمات وبوفيه ومنتجات في فاتورة واحدة',
    badge: 'نقطة البيع السريعة',
    gradient: 'linear-gradient(135deg, #196F3D 0%, #27AE60 100%)',
    icon: '🖥️',
    to: '/demo/cashier',
    features: [
      '⚡ إضافة سريعة للخدمات والمنتجات ومشروبات البوفيه',
      '🧾 محاكاة طباعة فاتورة إيصال حرارية فورية للعميلة',
      '💳 دعم طرق دفع متعددة (كاش، فيزا، فودافون كاش)',
      '📋 سجل الفواتير اليومية وتفاصيل الحسابات',
    ],
  },
  {
    id: 'client',
    title: '🌸 منصة العميلات الملكية (Client Web Portal)',
    subtitle: 'بوابة رقمية أنيقة تسمح للعميلة بتصفح قائمة الخدمات، اختيار الكوافيرة المفضلة، وحجز الموعد أونلاين',
    badge: 'تجربة الويب',
    gradient: 'linear-gradient(135deg, #B03A2E 0%, #E74C3C 100%)',
    icon: '🌸',
    to: '/demo/client',
    features: [
      '💆‍♀️ كتالوج مصور لكافة الخدمات والباقات والأسعار',
      '🌟 إمكانية اختيار خبيرة التجميل المفضلة بالتقييم',
      '🕒 حجز الموعد والتوقيت المناسب بدقة',
      '🛍️ تصفح وشراء منتجات العناية بالبشرة والشعر',
    ],
  },
  {
    id: 'mobile-app',
    title: '📱 تطبيق الموبايل التفاعلي للعميلات (صالون نهى السني)',
    subtitle: 'العرض التفاعلي الحي لتطبيق الموبايل المخصص للهواتف الذكية (iOS & Android) — حجز مواعيد، بروفايل، كوبونات وإشعارات',
    badge: 'تطبيق الموبايل 📲',
    gradient: 'linear-gradient(135deg, #7D2E46 0%, #C69537 100%)',
    icon: '📱',
    isExternal: true,
    to: 'https://abdelrhman-mahrous.github.io/salon-noha-elsony-demo/',
    features: [
      '📲 واجهة وتجربة تطبيق الموبايل الكاملة (Mobile UI)',
      '🌸 تجربة حجز الخدمات والمواعيد من هاتف العميلة',
      '🎟️ المحفظة وكوبونات الخصم ورصيد النقاط التفاعلي',
      '🌟 تصفح ملف خبيرات التجميل وتقييماتهن وصور الأعمال',
    ],
  },
]

export default function DemoHubPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAF5F8', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* ── الرأس الترحيبي الفاخر ── */}
      <div style={{
        background: 'linear-gradient(135deg, #2D1420 0%, #5E203B 50%, #8E3A59 100%)',
        color: '#FFF',
        padding: '50px 24px 70px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(212, 175, 55, 0.2)',
          border: '1px solid #D4AF37',
          color: '#F3E5AB',
          padding: '6px 18px',
          borderRadius: '30px',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '16px',
        }}>
          ✨ النسخة التجريبية الشاملة للعملاء (Interactive Live Demo)
        </div>

        <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '12px', color: '#FFF' }}>
          منظومة إدارة وتشغيل صالونات التجميل المتكاملة
        </h1>
        <p style={{ fontSize: '16px', color: '#E2CFD8', maxWidth: '750px', margin: '0 auto 24px', lineHeight: '1.7' }}>
          استكشف كافة أنظمة التطبيق من خلال تجربة حية تفاعلية ببيانات وهمية واقعية تحاكي يوم عمل كامل داخل الصالون
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '10px', fontSize: '13px' }}>
            🏢 {DEMO_SALON_INFO.name}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '10px', fontSize: '13px' }}>
            📍 {DEMO_SALON_INFO.branch}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '10px', fontSize: '13px' }}>
            ⭐ تقييم الصالون: 4.9 (348 عميلة)
          </span>
        </div>
      </div>

      {/* ── بطاقات الأدوار التجريبية ── */}
      <div style={{ maxWidth: '1240px', margin: '-40px auto 60px', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {DEMO_CARDS.map((card) => (
            <div
              key={card.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: card.isExternal ? '2px solid #D4AF37' : '1px solid #F0DEE7',
                boxShadow: card.isExternal ? '0 12px 35px rgba(212, 175, 55, 0.2)' : '0 10px 30px rgba(142, 58, 89, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              {/* هيدر الكارد */}
              <div style={{
                background: card.gradient,
                color: '#FFF',
                padding: '24px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#FFF',
                }}>
                  {card.badge}
                </div>

                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{card.icon}</div>
                <h3 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '6px', color: '#FFF' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5' }}>
                  {card.subtitle}
                </p>
              </div>

              {/* مزايا الدور */}
              <div style={{ padding: '22px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#8E3A59', marginBottom: '10px' }}>
                    أبرز المزايا في هذه النسخة:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {card.features.map((f, idx) => (
                      <li key={idx} style={{ fontSize: '13px', color: '#4A3B43', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {card.isExternal ? (
                  <a
                    href={card.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: card.gradient,
                      color: '#FFF',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <span>📲 فتح تجربة تطبيق الموبايل (صالون نهى السني)</span>
                    <span>↗</span>
                  </a>
                ) : (
                  <Link
                    to={card.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: card.gradient,
                      color: '#FFF',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <span>دخول وتجربة النسخة الآن</span>
                    <span>←</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── فوتر توضيحي ── */}
      <div style={{ textAlign: 'center', padding: '20px', color: '#826E77', fontSize: '13px', borderTop: '1px solid #F0DEE7' }}>
        نظام صالون العرابي بيوتي © 2026 — نسخة العرض التوضيحي المفتوحة للعملاء
      </div>
    </div>
  )
}
