// Reminder Scheduler Utility for Open Play Sessions

export interface ScheduledReminderJob {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  leadTimeMinutes: number;
  targetSendTimestamp: number; // Date.now() timestamp when email should trigger
  targetSendTimeFormatted: string; // e.g. "3:45 PM"
  scheduledAt: string;
  status: 'pending' | 'dispatched' | 'cancelled';
  recipientsCount: number;
  dispatchedAt?: string;
}

const STORAGE_KEY = 'picklepoint_scheduled_reminders';

export function getScheduledReminders(): ScheduledReminderJob[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function saveScheduledReminders(jobs: ScheduledReminderJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch (e) {}
}

export function getScheduledReminderForEvent(eventId: string): ScheduledReminderJob | undefined {
  const jobs = getScheduledReminders();
  return jobs.find((j) => j.eventId === eventId && j.status === 'pending');
}

/**
 * Calculates exact target send timestamp given an event date string (YYYY-MM-DD),
 * startTime (24h "HH:MM"), and leadTimeMinutes.
 */
export function calculateTargetSendTime(
  eventDateStr: string,
  startTime24h: string,
  leadTimeMinutes: number
): { targetTimestamp: number; formattedTime: string; isPast: boolean } {
  try {
    const [year, month, day] = eventDateStr.split('-').map((n) => parseInt(n, 10));
    const [hours, minutes] = startTime24h.split(':').map((n) => parseInt(n, 10));

    const gameStartDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const targetDate = new Date(gameStartDate.getTime() - leadTimeMinutes * 60 * 1000);

    const isPast = Date.now() >= targetDate.getTime();

    // Format target time to 12h AM/PM
    const targetHours = targetDate.getHours();
    const targetMins = targetDate.getMinutes();
    const ampm = targetHours >= 12 ? 'PM' : 'AM';
    const h12 = targetHours % 12 || 12;
    const mStr = targetMins < 10 ? `0${targetMins}` : `${targetMins}`;
    const formattedTime = `${h12}:${mStr} ${ampm}`;

    return {
      targetTimestamp: targetDate.getTime(),
      formattedTime,
      isPast,
    };
  } catch (e) {
    return {
      targetTimestamp: Date.now(),
      formattedTime: 'Immediately',
      isPast: true,
    };
  }
}

export function scheduleReminderForEvent(
  event: { id: string; title: string; eventDate: string; startTime: string },
  leadTimeMinutes: number,
  recipientsCount: number
): ScheduledReminderJob {
  const { targetTimestamp, formattedTime } = calculateTargetSendTime(
    event.eventDate,
    event.startTime,
    leadTimeMinutes
  );

  const newJob: ScheduledReminderJob = {
    id: `rem_${event.id}_${Date.now()}`,
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.eventDate,
    startTime: event.startTime,
    leadTimeMinutes,
    targetSendTimestamp: targetTimestamp,
    targetSendTimeFormatted: formattedTime,
    scheduledAt: new Date().toISOString(),
    status: 'pending',
    recipientsCount,
  };

  const existing = getScheduledReminders().filter((j) => j.eventId !== event.id || j.status !== 'pending');
  saveScheduledReminders([...existing, newJob]);

  return newJob;
}

export function cancelScheduledReminderForEvent(eventId: string): void {
  const jobs = getScheduledReminders().map((j) => {
    if (j.eventId === eventId && j.status === 'pending') {
      return { ...j, status: 'cancelled' as const };
    }
    return j;
  });
  saveScheduledReminders(jobs);
}
