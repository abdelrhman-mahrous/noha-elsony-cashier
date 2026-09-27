/**
 * Format any price / money amount to a clean number without floating-point issues (e.g. 218.70000000000002 -> 218.7)
 * @param {number|string} amount 
 * @returns {string}
 */
export function formatPrice(amount) {
  if (amount === null || amount === undefined || amount === '') return '0'
  const num = typeof amount === 'number' ? amount : parseFloat(amount)
  if (isNaN(num)) return '0'
  // Remove floating point noise and round to max 2 decimals
  const rounded = Math.round(num * 100) / 100
  return rounded.toString()
}

/**
 * Format a 24-hour time or ISO date string into 12-hour format with صباحاً / مساءً
 * e.g. "14:00" -> "2:00 مساءً"
 * e.g. "09:30" -> "9:30 صباحاً"
 * @param {string|Date} timeInput 
 * @returns {string}
 */
export function formatTime12(timeInput) {
  if (!timeInput) return '—'

  let hours = 0
  let minutes = 0

  if (timeInput instanceof Date) {
    hours = timeInput.getHours()
    minutes = timeInput.getMinutes()
  } else if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim()
    if (trimmed.includes('T')) {
      const d = new Date(trimmed)
      if (!isNaN(d.getTime())) {
        hours = d.getHours()
        minutes = d.getMinutes()
      }
    } else {
      const parts = trimmed.split(':')
      if (parts.length >= 2) {
        hours = parseInt(parts[0], 10)
        minutes = parseInt(parts[1], 10)
      } else {
        return trimmed
      }
    }
  }

  if (isNaN(hours) || isNaN(minutes)) return String(timeInput)

  const period = hours >= 12 ? 'مساءً' : 'صباحاً'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const minuteStr = minutes.toString().padStart(2, '0')

  return `${hour12}:${minuteStr} ${period}`
}

/**
 * Format a full datetime into Arabic date and 12-hour time
 * e.g. "2026-09-27T14:30:00" -> "27/9/2026 • 2:30 مساءً"
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatDateTime12(dateInput) {
  if (!dateInput) return '—'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return String(dateInput)

  const datePart = d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const timePart = formatTime12(d)

  return `${datePart} • ${timePart}`
}
