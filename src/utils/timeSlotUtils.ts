import type { DailyOperatingHoursMap } from '../components/AdminDashboard';

export interface TimeSlot {
  time: string; // e.g. "05:00 AM - 06:00 AM"
  startHour: number; // 5
  available?: boolean;
}

export const DEFAULT_OPERATING_HOURS: DailyOperatingHoursMap = {
  monday: { isOpen: true, isDayOff: false, openTime: '05:00 AM', closeTime: '10:00 PM' },
  tuesday: { isOpen: true, isDayOff: false, openTime: '05:00 AM', closeTime: '10:00 PM' },
  wednesday: { isOpen: true, isDayOff: false, openTime: '05:00 AM', closeTime: '10:00 PM' },
  thursday: { isOpen: true, isDayOff: false, openTime: '05:00 AM', closeTime: '10:00 PM' },
  friday: { isOpen: true, isDayOff: false, openTime: '05:00 AM', closeTime: '10:00 PM' },
  saturday: { isOpen: true, isDayOff: false, openTime: '05:00 AM', closeTime: '10:00 PM' },
  sunday: { isOpen: true, isDayOff: false, openTime: '05:00 AM', closeTime: '10:00 PM' },
};

export const DAYS_OF_WEEK: { key: keyof DailyOperatingHoursMap; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

/**
 * Converts a 24-hour integer (0-24) into a 12-hour formatted time string.
 * Examples:
 *   0  -> '12:00 AM'
 *   5  -> '05:00 AM'
 *   12 -> '12:00 PM'
 *   13 -> '01:00 PM'
 *   23 -> '11:00 PM'
 *   24 -> '12:00 AM'
 */
export const formatHourTo12h = (hour: number): string => {
  const normalized = hour % 24;
  const period = normalized >= 12 && normalized < 24 ? 'PM' : 'AM';
  let displayHour = normalized % 12;
  if (displayHour === 0) displayHour = 12;
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`;
};

/**
 * Parses time strings into a 24-hour number (0 to 24).
 * Handles: '05:00 AM', '12:00 PM' (noon -> 12), '12:00 MD' (noon -> 12), '12:00 AM' (midnight -> 24), '10:00 PM' -> 22, etc.
 */
export const parseTimeStringToHour = (timeStr: string): number => {
  if (!timeStr) return 5;
  const clean = timeStr.trim().toUpperCase();

  // Special midnight / noon aliases
  if (clean === '12:00 AM' || clean === '12:00 MN' || clean === 'MIDNIGHT') return 24;
  if (clean === '12:00 PM' || clean === '12:00 MD' || clean === '12:00 NN' || clean === 'NOON') return 12;

  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|MD|NN|MN)?$/);
  if (!match) return 5;

  let hour = parseInt(match[1], 10);
  const period = match[3] || 'AM';

  if ((period === 'PM' || period === 'MD') && hour < 12) {
    hour += 12;
  }
  if ((period === 'AM' || period === 'MN') && hour === 12) {
    hour = 0;
  }

  return hour;
};

/**
 * Dynamically generates 1-hour TimeSlots between startHour and endHour.
 * Example: startHour = 5 (05:00 AM), endHour = 12 (12:00 PM)
 * Returns slots:
 *   - '05:00 AM - 06:00 AM' (startHour: 5)
 *   - '06:00 AM - 07:00 AM' (startHour: 6)
 *   - ...
 *   - '11:00 AM - 12:00 PM' (startHour: 11)
 */
export const generateTimeSlots = (startHour = 5, endHour = 22): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const safeStart = Math.max(0, Math.min(23, startHour));
  const safeEnd = Math.max(safeStart + 1, Math.min(24, endHour));

  for (let h = safeStart; h < safeEnd; h++) {
    const startStr = formatHourTo12h(h);
    const endStr = formatHourTo12h(h + 1);
    slots.push({
      time: `${startStr} - ${endStr}`,
      startHour: h,
      available: true,
    });
  }

  return slots;
};

/**
 * Master slot range spanning 05:00 AM to 12:00 AM (midnight)
 */
export const MASTER_SLOTS: TimeSlot[] = generateTimeSlots(5, 24);

/**
 * Returns the day key (e.g. 'monday', 'tuesday') for a date string 'YYYY-MM-DD'.
 */
export const getDayKeyFromDateString = (dateStr: string): keyof DailyOperatingHoursMap | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  const dayIndex = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const keys: (keyof DailyOperatingHoursMap)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return keys[dayIndex];
};

/**
 * Computes dynamic schedule information and time slots for a specific date given the operating hours.
 */
export const getScheduleForDate = (
  dateStr: string,
  operatingHours?: DailyOperatingHoursMap
) => {
  const dayKey = getDayKeyFromDateString(dateStr);
  const daySchedule = dayKey && operatingHours?.[dayKey]
    ? operatingHours[dayKey]
    : (dayKey ? DEFAULT_OPERATING_HOURS[dayKey] : null);

  if (!daySchedule) {
    const defaultSlots = generateTimeSlots(5, 22);
    return {
      dayKey,
      daySchedule: null,
      isDayOff: false,
      openHour: 5,
      closeHour: 22,
      openTime: '05:00 AM',
      closeTime: '10:00 PM',
      slots: defaultSlots,
      morningSlots: defaultSlots.filter((s) => s.startHour < 12),
      afternoonSlots: defaultSlots.filter((s) => s.startHour >= 12),
    };
  }

  const isDayOff = daySchedule.isDayOff ?? !daySchedule.isOpen;
  const openHour = parseTimeStringToHour(daySchedule.openTime || '05:00 AM');
  let closeHour = parseTimeStringToHour(daySchedule.closeTime || '10:00 PM');

  // Handle midnight closing (12:00 AM -> 24)
  if (closeHour <= openHour && closeHour === 0) {
    closeHour = 24;
  }

  const slots = isDayOff ? [] : generateTimeSlots(openHour, closeHour);
  const morningSlots = slots.filter((s) => s.startHour < 12);
  const afternoonSlots = slots.filter((s) => s.startHour >= 12);

  return {
    dayKey,
    daySchedule,
    isDayOff,
    openHour,
    closeHour,
    openTime: daySchedule.openTime || '05:00 AM',
    closeTime: daySchedule.closeTime || '10:00 PM',
    slots,
    morningSlots,
    afternoonSlots,
  };
};

/**
 * Converts start time and end time into an array of 1-hour time slot strings.
 * Example: start = "18:00", end = "21:00" -> ["06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM", "08:00 PM - 09:00 PM"]
 */
export const getOpenPlayTimeSlots = (startTimeStr: string, endTimeStr: string): string[] => {
  if (!startTimeStr || !endTimeStr) return [];
  const startHour = parseTimeStringToHour(startTimeStr);
  let endHour = parseTimeStringToHour(endTimeStr);

  if (endHour <= startHour && (endHour === 0 || endHour <= 5)) {
    endHour = 24;
  }

  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    const startStr = formatHourTo12h(h);
    const endStr = formatHourTo12h(h + 1);
    slots.push(`${startStr} - ${endStr}`);
  }

  return slots;
};
