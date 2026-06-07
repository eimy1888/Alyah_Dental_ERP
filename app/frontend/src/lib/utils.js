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