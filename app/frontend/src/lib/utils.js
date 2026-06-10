import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Get current Ethiopian date string
 * @param {number} offsetDays - Days to offset (default 0)
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getEthiopianDate = (offsetDays = 0) => {
  const d = new Date();
  const ethiopiaOffset = 3 * 60;
  const localOffset = d.getTimezoneOffset();
  const ethiopiaTime = new Date(d.getTime() + (ethiopiaOffset + localOffset) * 60000);
  ethiopiaTime.setDate(ethiopiaTime.getDate() + offsetDays);
  const year = ethiopiaTime.getFullYear();
  const month = String(ethiopiaTime.getMonth() + 1).padStart(2, '0');
  const day = String(ethiopiaTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert standard "HH:MM" (EAT / UTC+3) to Ethiopian Traditional Time (ETT) string.
 *
 * Ethiopian traditional clock is a true 12-hour clock starting at sunrise (std 06:00).
 * Each half-day starts at 12 and counts up: 12 → 1 → 2 → ... → 11 → 12 → ...
 *
 *   std 06:00 → 12:00 ጥዋት   (morning starts at 12)
 *   std 07:00 →  1:00 ጥዋት
 *   std 11:00 →  5:00 ጥዋት
 *   std 12:00 →  6:00 ቀን
 *   std 17:00 → 11:00 ቀን
 *   std 18:00 → 12:00 ምሽት   (evening starts at 12)
 *   std 19:00 →  1:00 ምሽት
 *   std 23:00 →  5:00 ምሽት
 *   std 00:00 →  6:00 ሌሊት
 *   std 05:00 → 11:00 ሌሊት
 *
 * Periods:
 *   ጥዋት  (morning)   std 06:00–11:59
 *   ቀን   (afternoon) std 12:00–17:59
 *   ምሽት  (evening)   std 18:00–23:59
 *   ሌሊት  (night)     std 00:00–05:59
 *
 * @param {string}  timeStr    "HH:MM" in standard EAT time
 * @param {boolean} showPeriod append Amharic period label (default true)
 * @returns {string}  e.g. "2:30 ጥዋት"
 */
export const toEthiopianTime = (timeStr, showPeriod = true) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const stdHour = parseInt(hStr, 10);
  const minute  = parseInt(mStr, 10);

  // Shift back 6 hours, then take mod 12 for display (0 → 12)
  const shifted   = (stdHour - 6 + 24) % 12;
  const display12 = shifted === 0 ? 12 : shifted;
  const formatted = `${display12}:${String(minute).padStart(2, '0')}`;

  if (!showPeriod) return formatted;

  let period = '';
  if      (stdHour >= 6  && stdHour < 12) period = 'ጥዋት';  // morning
  else if (stdHour >= 12 && stdHour < 18) period = 'ቀን';   // afternoon
  else if (stdHour >= 18 && stdHour < 24) period = 'ምሽት';  // evening
  else                                    period = 'ሌሊት';  // night (00–05)

  return `${formatted} ${period}`;
};