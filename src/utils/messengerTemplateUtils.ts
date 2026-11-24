export interface MessengerTemplateVariable {
  key: string;
  label: string;
  example: string;
}

export const MESSENGER_TEMPLATE_VARIABLES: MessengerTemplateVariable[] = [
  { key: '{playerName}', label: 'Player Name', example: 'Alex Santos' },
  { key: '{venueName}', label: 'Venue / Club Name', example: 'BGC Pickleball Club' },
  { key: '{bookingRef}', label: 'Booking Reference Code', example: 'PKL-849201' },
  { key: '{courtName}', label: 'Court / Event Title', example: 'Friday Night Open Play' },
  { key: '{date}', label: 'Scheduled Date', example: 'Friday, October 24, 2026' },
  { key: '{timeSlot}', label: 'Time Window', example: '06:00 PM - 09:00 PM' },
  { key: '{playerCount}', label: 'Player / Spot Count', example: '1 spot' },
  { key: '{totalCost}', label: 'Total Amount Paid', example: '350' },
  { key: '{paymentStatus}', label: 'Payment Status', example: 'Approved (GCash)' },
  { key: '{venueAddress}', label: 'Facility Address', example: '26th Street cor. 9th Ave, Bonifacio Global City, Taguig' },
  { key: '{mapLink}', label: 'Google Maps Directions Link', example: 'https://www.google.com/maps/search/?api=1&query=BGC+Pickleball+Club' },
  { key: '{voucherLink}', label: 'Digital Voucher Pass URL', example: 'https://bookpicklecourt.com/?view=lookup&ref=PKL-849201' },
  { key: '{hostPhone}', label: 'Venue Host Phone', example: '+63 917 123 4567' },
  { key: '{hostEmail}', label: 'Venue Host Email', example: 'info@bgcpickleball.ph' },
];

export const DEFAULT_MESSENGER_TEMPLATE = `🎾 *PICKLEBALL RESERVATION CONFIRMED!* 🎾

Hi {playerName}! Your reservation at *{venueName}* has been confirmed. Here are your booking details:

📋 *Booking Ref:* {bookingRef}
🏸 *Event / Court:* {courtName}
📅 *Date:* {date}
⏰ *Time:* {timeSlot}
👥 *Players:* {playerCount}
💰 *Total Amount:* ₱{totalCost} ({paymentStatus})

📍 *Venue Address:* {venueAddress}
🗺️ *Map Directions:* {mapLink}

🎫 *View & Download Digital Pass:*
{voucherLink}

See you on the court! Please arrive 10-15 minutes before your scheduled slot. 🏓`;

export interface BookingMessengerData {
  playerName?: string;
  venueName?: string;
  bookingRef?: string;
  courtName?: string;
  date?: string;
  timeSlot?: string;
  playerCount?: number | string;
  totalCost?: number | string;
  paymentStatus?: string;
  venueAddress?: string;
  mapLink?: string;
  voucherLink?: string;
  hostPhone?: string;
  hostEmail?: string;
}

export const formatMessengerMessage = (
  template: string = DEFAULT_MESSENGER_TEMPLATE,
  data: BookingMessengerData
): string => {
  const currentTemplate = template && template.trim().length > 0 ? template : DEFAULT_MESSENGER_TEMPLATE;

  const replacements: Record<string, string> = {
    '{playerName}': data.playerName || 'Pickleball Player',
    '{venueName}': data.venueName || 'Pickleball Court Facility',
    '{bookingRef}': data.bookingRef || 'PKL-000000',
    '{courtName}': data.courtName || 'Court Slot',
    '{date}': data.date || 'Scheduled Date',
    '{timeSlot}': data.timeSlot || 'Reserved Time Window',
    '{playerCount}': data.playerCount ? String(data.playerCount) : '1 spot',
    '{totalCost}': data.totalCost !== undefined ? String(data.totalCost) : '0',
    '{paymentStatus}': data.paymentStatus || 'Confirmed',
    '{venueAddress}': data.venueAddress || 'Venue Location',
    '{mapLink}':
      data.mapLink ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.venueAddress || data.venueName || '')}`,
    '{voucherLink}':
      data.voucherLink ||
      (data.bookingRef
        ? `https://bookpicklecourt.com/?view=lookup&ref=${encodeURIComponent(data.bookingRef)}`
        : 'https://bookpicklecourt.com/?view=lookup'),
    '{hostPhone}': data.hostPhone || '',
    '{hostEmail}': data.hostEmail || '',
  };

  let formatted = currentTemplate;
  Object.entries(replacements).forEach(([key, val]) => {
    formatted = formatted.split(key).join(val);
  });

  return formatted;
};

export const getSampleMessengerData = (): BookingMessengerData => {
  return {
    playerName: 'Alex Santos',
    venueName: 'BGC Pickleball Club',
    bookingRef: 'PKL-849201',
    courtName: 'Friday Night Open Play - Intermediate',
    date: 'Friday, October 24, 2026',
    timeSlot: '06:00 PM - 09:00 PM (3 Hours)',
    playerCount: '1 spot',
    totalCost: '350',
    paymentStatus: 'Approved (GCash)',
    venueAddress: '26th Street cor. 9th Ave, Bonifacio Global City, Taguig',
    mapLink: 'https://www.google.com/maps/search/?api=1&query=BGC+Pickleball+Club',
    voucherLink: 'https://bookpicklecourt.com/?view=lookup&ref=PKL-849201',
    hostPhone: '+63 917 123 4567',
    hostEmail: 'info@bgcpickleball.ph',
  };
};
