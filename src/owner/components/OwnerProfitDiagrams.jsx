import { useState } from 'react'
import { formatPrice } from '../../lib/formatters'

export default function OwnerProfitDiagrams({
  dailyStats = [],
  servicesShare = 0,
  productsShare = 0,
  buffetTotal = 0,
  tipsTotal = 0,
  grossTotal = 0,
  withdrawalsTotal = 0,
  netProfit = 0,
  totalApptsCount = 0,
}) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState('netProfit') // 'netProfit' | 'gross' | 'services' | 'buffet'

  // حساب القيم القصوى للمخطط
  const maxNetProfit = Math.max(1, ...dailyStats.map(d => Math.max(d.netProfit, d.gross, 0)))
  const totalStreams = servicesShare + productsShare + buffetTotal + tipsTotal || 1

  const sPct = ((servicesShare / totalStreams) * 100).toFixed(1)
  const pPct = ((productsShare / totalStreams) * 100).toFixed(1)
  const bPct = ((buffetTotal / totalStreams) * 100).toFixed(1)
  const tPct = ((tipsTotal / totalStreams) * 100).toFixed(1)

  // متوسطات المؤشرات
  const daysCount = Math.max(1, dailyStats.length)
  const avgDailyNet = netProfit / daysCount
  const avgTicket = totalApptsCount > 0 ? grossTotal / totalApptsCount : 0
  const withdrawalRatio = grossTotal > 0 ? ((withdrawalsTotal / grossTotal) * 100).toFixed(1) : '0'

  return (
    <div className="owner-diagrams-container" style={{ marginBottom: 24 }}>
      {/* ── الرأس التعريفي للدايجرام ── */}
      <div className="owner-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--staff-ink)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 رسم بياني ومخطط الأرباح اليومية
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--staff-muted)' }}>
              تحليل تفاعلي لحركة الإيرادات، دخل البوفيه، الإكراميات وصافي الأرباح يوماً بيوم
            </p>
          </div>

          {/* تبديل عرض المقياس */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--staff-bg)', padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              className={`owner-period-tab ${selectedMetric === 'netProfit' ? 'owner-period-tab--active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
              onClick={() => setSelectedMetric('netProfit')}
            >
              💎 صافي الأرباح
            </button>
            <button
              type="button"
              className={`owner-period-tab ${selectedMetric === 'gross' ? 'owner-period-tab--active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
              onClick={() => setSelectedMetric('gross')}
            >
              💵 الإيراد الإجمالي
            </button>
            <button
              type="button"
              className={`owner-period-tab ${selectedMetric === 'buffet' ? 'owner-period-tab--active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
              onClick={() => setSelectedMetric('buffet')}
            >
              ☕ دخل البوفيه
            </button>
            <button
              type="button"
              className={`owner-period-tab ${selectedMetric === 'services' ? 'owner-period-tab--active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
              onClick={() => setSelectedMetric('services')}
            >
              💇‍♀️ الخدمات
            </button>
          </div>
        </div>

        {/* ── المخطط الشريطي اليومي التفاعلي ── */}
        {dailyStats.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--staff-muted)' }}>
            لا توجد بيانات متاحة لعرض المخطط البياني في هذه الفترة
          </div>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: Math.max(8, Math.min(24, Math.floor(600 / daysCount))),
                height: 200,
                minWidth: Math.max(360, daysCount * 45),
                padding: '10px 10px 30px 10px',
                position: 'relative',
                borderBottom: '2px solid var(--staff-divider)',
              }}
            >
              {dailyStats.map((day, idx) => {
                const metricValue = Math.max(0, day[selectedMetric] || 0)
                const heightPct = Math.max(6, Math.min(100, (metricValue / maxNetProfit) * 100))
                const isHovered = hoveredDay?.date === day.date

                // ألوان التدرج حسب المقياس
                let barGradient = 'linear-gradient(180deg, #B76E79 0%, #7D2E46 100%)'
                if (selectedMetric === 'gross') barGradient = 'linear-gradient(180deg, #10b981 0%, #047857 100%)'
                if (selectedMetric === 'buffet') barGradient = 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)'
                if (selectedMetric === 'services') barGradient = 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)'

                return (
                  <div
                    key={day.date || idx}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* قيمة أعلى العمود */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: isHovered ? 'var(--staff-rose-dark)' : 'var(--staff-muted)',
                        marginBottom: 4,
                        whiteSpace: 'nowrap',
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {formatPrice(metricValue)}
                    </span>

                    {/* العمود التفاعلي */}
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 38,
                        height: `${heightPct}%`,
                        background: isHovered ? 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' : barGradient,
                        borderRadius: '6px 6px 0 0',
                        boxShadow: isHovered ? '0 4px 12px rgba(183, 110, 121, 0.4)' : '0 2px 6px rgba(0,0,0,0.06)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                        transformOrigin: 'bottom',
                      }}
                    />

                    {/* اسم وتاريخ اليوم أسفل العمود */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -24,
                        fontSize: '0.72rem',
                        fontWeight: isHovered ? 800 : 600,
                        color: isHovered ? 'var(--staff-rose-dark)' : 'var(--staff-ink)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {day.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* كارت تفاصيل اليوم عند التحويم */}
        {hoveredDay && (
          <div
            style={{
              marginTop: 20,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'var(--staff-bg)',
              border: '1px solid var(--staff-rose)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--staff-ink)' }}>
                📅 تفاصيل يوم {hoveredDay.label} ({hoveredDay.date}):
              </span>
              <span style={{ marginRight: 8, fontSize: '0.85rem', color: 'var(--staff-muted)' }}>
                عدد الفواتير: {hoveredDay.apptCount}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.86rem' }}>
              <span>💇‍♀️ الخدمات: <strong>{formatPrice(hoveredDay.services)} ج.م</strong></span>
              <span>☕ البوفيه: <strong style={{ color: '#d97706' }}>{formatPrice(hoveredDay.buffet)} ج.م</strong></span>
              <span>🛍️ المنتجات: <strong>{formatPrice(hoveredDay.products)} ج.م</strong></span>
              <span>🎁 التيبس: <strong style={{ color: '#8b5cf6' }}>{formatPrice(hoveredDay.tips)} ج.م</strong></span>
              <span>💸 المسحوبات: <strong style={{ color: '#ef4444' }}>{formatPrice(hoveredDay.withdrawals)} ج.م</strong></span>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: 6 }}>
                💎 الصافي: <strong style={{ color: '#10b981' }}>{formatPrice(hoveredDay.netProfit)} ج.م</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── توزيع مصادر الإيرادات والمؤشرات المالية ── */}
      <div className="owner-two-col">
        {/* 1. مخطط توزيع مصادر الدخل بالشرائط والنسب */}
        <div className="owner-card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--staff-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎯 توزيع مصادر الدخل والأرباح
          </h4>

          {/* شريط التوزيع المدمج */}
          <div
            style={{
              height: 22,
              borderRadius: 11,
              overflow: 'hidden',
              display: 'flex',
              background: 'var(--staff-divider)',
              marginBottom: 16,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {servicesShare > 0 && (
              <div
                style={{ width: `${sPct}%`, background: '#6366f1' }}
                title={`الخدمات: ${sPct}% (${formatPrice(servicesShare)} ج.م)`}
              />
            )}
            {productsShare > 0 && (
              <div
                style={{ width: `${pPct}%`, background: '#f97316' }}
                title={`المنتجات: ${pPct}% (${formatPrice(productsShare)} ج.م)`}
              />
            )}
            {buffetTotal > 0 && (
              <div
                style={{ width: `${bPct}%`, background: '#d97706' }}
                title={`البوفيه: ${bPct}% (${formatPrice(buffetTotal)} ج.م)`}
              />
            )}
            {tipsTotal > 0 && (
              <div
                style={{ width: `${tPct}%`, background: '#ec4899' }}
                title={`الإكراميات: ${tPct}% (${formatPrice(tipsTotal)} ج.م)`}
              />
            )}
          </div>

          {/* تفصيل كل بند بنسبته ومبلغه */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                <span>💇‍♀️ مبيعات الخدمات والباقات</span>
              </span>
              <span style={{ fontWeight: 700 }}>
                {formatPrice(servicesShare)} ج.م <small style={{ color: 'var(--staff-muted)', fontWeight: 600 }}>({sPct}%)</small>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316' }} />
                <span>🛍️ مبيعات المنتجات والمستحضرات</span>
              </span>
              <span style={{ fontWeight: 700 }}>
                {formatPrice(productsShare)} ج.م <small style={{ color: 'var(--staff-muted)', fontWeight: 600 }}>({pPct}%)</small>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }} />
                <span>☕ دخل البوفيه والمشروبات</span>
              </span>
              <span style={{ fontWeight: 700, color: '#d97706' }}>
                {formatPrice(buffetTotal)} ج.م <small style={{ color: 'var(--staff-muted)', fontWeight: 600 }}>({bPct}%)</small>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ec4899' }} />
                <span>🎁 إكراميات وتيبس العملاء</span>
              </span>
              <span style={{ fontWeight: 700, color: '#ec4899' }}>
                {formatPrice(tipsTotal)} ج.م <small style={{ color: 'var(--staff-muted)', fontWeight: 600 }}>({tPct}%)</small>
              </span>
            </div>
          </div>
        </div>

        {/* 2. مؤشرات الكفاءة والأداء المالي */}
        <div className="owner-card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--staff-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚡ مؤشرات الأداء المالي (KPIs)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--staff-bg)', padding: '12px 14px', borderRadius: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>متوسط الفاتورة الواحدة</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--staff-ink)', marginTop: 2 }}>
                {formatPrice(avgTicket)} <small style={{ fontSize: '0.72rem' }}>ج.م</small>
              </div>
            </div>

            <div style={{ background: 'var(--staff-bg)', padding: '12px 14px', borderRadius: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>متوسط صافي الربح اليومي</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                {formatPrice(avgDailyNet)} <small style={{ fontSize: '0.72rem' }}>ج.م</small>
              </div>
            </div>

            <div style={{ background: 'var(--staff-bg)', padding: '12px 14px', borderRadius: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>نسبة المسحوبات من الإيراد</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444', marginTop: 2 }}>
                {withdrawalRatio}%
              </div>
            </div>

            <div style={{ background: 'var(--staff-bg)', padding: '12px 14px', borderRadius: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>إجمالي العمليات المكتملة</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--staff-rose-dark)', marginTop: 2 }}>
                {totalApptsCount} <small style={{ fontSize: '0.72rem' }}>عملية</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
