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
 * Convert standard "HH:MM" to Ethiopian Traditional Time string
 * Ethiopian clock: standard 06:00 = ETT 0:00, standard 08:30 = ETT 2:30 ጥዋት
 * Formula: ETT_hour = (standard_hour - 6 + 24) % 24
 *
 * @param {string} timeStr  "HH:MM" in standard (EAT) time
 * @param {boolean} showPeriod  append Amharic period label
 * @returns {string}  e.g. "2:30 ጥዋት"
 */
export const toEthiopianTime = (timeStr, showPeriod = true) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const stdHour = parseInt(hStr, 10);
  const minute  = parseInt(mStr, 10);

  const ettHour    = (stdHour - 6 + 24) % 24;
  const display12  = ettHour % 12 === 0 ? 12 : ettHour % 12;
  const formatted  = `${display12}:${String(minute).padStart(2, '0')}`;

  if (!showPeriod) return formatted;

  let period = '';
  if (stdHour >= 6  && stdHour < 12) period = 'ጥዋት';   // morning
  else if (stdHour >= 12 && stdHour < 18) period = 'ቀን'; // afternoon
  else if (stdHour >= 18 && stdHour < 24) period = 'ምሽት'; // evening
  else period = 'ሌሊት'; // night

  return `${formatted} ${period}`;
};