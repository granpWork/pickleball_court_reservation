// Email Service Utility for Book Picklecourt Platform

interface SendCustomEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  message: string;
  extraParams?: Record<string, unknown>;
}

interface BookingEmailParams {
  bookingId: string;
  courtName: string;
  date: string;
  slots: string[];
  totalCost: number;
  userEmail: string;
  userName: string;
  paymentMethod?: string;
  bookingReference?: string;
  ownerCompanyName?: string;
  ownerCompanyAddress?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return (import.meta.env.VITE_APP_BASE_URL as string) || 'http://localhost:5173';
};

const buildFacilityOwnerCard = (
  ownerCompanyName?: string,
  ownerCompanyAddress?: string,
  ownerEmail?: string,
  ownerPhone?: string,
  fallbackCourtName?: string
): string => {
  const name = ownerCompanyName || fallbackCourtName || 'Court Facility Host';
  const address = ownerCompanyAddress || 'Venue Location On File';

  return `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-top: 16px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 8px;">
            VENUE DETAILS
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
            🏢 ${name}
          </div>
          <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">
            📍 <strong>Facility Address:</strong> ${address}
          </div>
          ${ownerEmail ? `<div style="font-size: 12px; color: #94a3b8; margin-bottom: 2px;">✉️ <strong>Host Email:</strong> ${ownerEmail}</div>` : ''}
          ${ownerPhone ? `<div style="font-size: 12px; color: #94a3b8;">📞 <strong>Host Phone:</strong> ${ownerPhone}</div>` : ''}
        </td>
      </tr>
    </table>
  `;
};

const buildHtmlWrapper = (title: string, subtitle: string, bodyContent: string, ownerCompanyName?: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b132b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b132b; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: center; border-bottom: 1px solid #1e293b;">
              <div style="display: inline-block; padding: 6px 18px; background-color: rgba(166, 226, 36, 0.1); border: 1px solid rgba(166, 226, 36, 0.25); border-radius: 50px; margin-bottom: 14px;">
                <span style="font-size: 18px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">Book <span style="color: #a6e224;">Picklecourt</span></span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                ${title}
              </h1>
              ${subtitle ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">${subtitle}</p>` : ''}
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 28px 20px 28px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0b132b; padding: 20px 28px; text-align: center; border-top: 1px solid #1e293b;">
              ${ownerCompanyName ? `<p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #cbd5e1;">Transaction Direct with <strong style="color: #ffffff;">${ownerCompanyName}</strong></p>` : ''}
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">
                Powered by Book Picklecourt Court Reservation Platform (Platform Provider)
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                If you have questions regarding facility rules or schedules, contact the venue owner directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

let cachedHostingerMailboxResourceId: string | null = null;
let lastUsedHostingerToken: string | null = null;

const getHostingerMailboxResourceId = async (token: string, senderEmail: string): Promise<string | null> => {
  if (cachedHostingerMailboxResourceId && lastUsedHostingerToken === token) {
    return cachedHostingerMailboxResourceId;
  }
  try {
    const res = await fetch('https://api.mail.hostinger.com/api/v1/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (res.ok) {
      const json = await res.json();
      const mailboxes = json?.data?.mailboxes || [];
      const match = mailboxes.find((m: { address?: string; resourceId?: string }) => m.address?.toLowerCase() === senderEmail?.toLowerCase()) || mailboxes[0];
      if (match?.resourceId) {
        cachedHostingerMailboxResourceId = match.resourceId;
        lastUsedHostingerToken = token;
        return cachedHostingerMailboxResourceId;
      }
    } else {
      console.warn('Hostinger /api/v1/me check failed:', res.status, await res.text());
    }
  } catch (e) {
    console.warn('Hostinger Mail API me endpoint error:', e);
  }
  return null;
};

const sendHostingerMailApi = async (
  token: string,
  senderEmail: string,
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; message: string }> => {
  void toName;
  try {
    const mailboxResourceId = await getHostingerMailboxResourceId(token, senderEmail);
    if (!mailboxResourceId) {
      return { success: false, message: 'Could not resolve Hostinger mailbox resourceId' };
    }

    const response = await fetch(`https://api.mail.hostinger.com/api/v1/mailboxes/${mailboxResourceId}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [toEmail],
        displayName: 'Book Picklecourt Platform',
        subject: subject,
        html: htmlContent,
        text: htmlContent.replace(/<[^>]*>?/gm, ''),
      }),
    });

    if (response.ok || response.status === 204) {
      return { success: true, message: 'Email sent successfully via Hostinger Mail API.' };
    } else {
      const errRes = await response.text();
      console.warn('Hostinger Mail API send error:', response.status, errRes);
      return { success: false, message: `Hostinger Mail API error (${response.status}): ${errRes}` };
    }
  } catch (err) {
    console.error('Hostinger Mail API network error:', err);
    return { success: false, message: 'Hostinger Mail API network error' };
  }
};

export const sendCustomUserEmail = async ({
  toEmail,
  toName,
  subject,
  message,
  extraParams = {},
}: SendCustomEmailParams): Promise<{ success: boolean; message: string }> => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const hostingerToken = import.meta.env.VITE_HOSTINGER_MAIL_API_TOKEN;
  const hostingerSenderEmail = import.meta.env.VITE_HOSTINGER_SENDER_EMAIL || 'no-reply@bookpicklecourt.com';

  // Format message as HTML wrapper if not already formatted
  const finalHtmlMessage = message.trim().startsWith('<!DOCTYPE') || message.trim().startsWith('<html')
    ? message
    : buildHtmlWrapper(
        subject,
        'Notification from Book Picklecourt',
        `<p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; whitespace: pre-line;">${message.replace(/\n/g, '<br/>')}</p>`
      );

  // 1. Try Hostinger Mail REST API first if token is available
  if (hostingerToken) {
    const hResult = await sendHostingerMailApi(
      hostingerToken,
      hostingerSenderEmail,
      toEmail,
      toName,
      subject,
      finalHtmlMessage
    );
    if (hResult.success) {
      return hResult;
    }
  }

  if (serviceId && templateId && publicKey) {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: toEmail,
            to_name: toName,
            email: toEmail,
            user_email: toEmail,
            subject: subject,
            message: finalHtmlMessage,
            reply_to: 'ran.peredo@gmail.com',
            ...extraParams,
          },
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Email dispatched successfully via EmailJS.' };
      } else {
        const errText = await response.text();
        console.warn('EmailJS delivery failed, falling back to local simulation:', errText);
      }
    } catch (err) {
      console.warn('EmailJS network error, falling back to local simulation:', err);
    }
  }

  // Simulated Local Dispatch Fallback (Logs formatted output & stores simulated sent mail log)
  console.log(`%c[EMAIL SERVICE DISPATCH]`, 'color: #a6e224; font-weight: bold;');
  console.log(`To: ${toName} <${toEmail}>`);
  console.log(`Subject: ${subject}`);

  // Store in localStorage simulated sent emails history
  try {
    const existingLogs = JSON.parse(localStorage.getItem('picklepoint_sent_emails') || '[]');
    existingLogs.push({
      id: 'email-' + Date.now(),
      toEmail,
      toName,
      subject,
      message: finalHtmlMessage,
      sentAt: new Date().toISOString(),
    });
    localStorage.setItem('picklepoint_sent_emails', JSON.stringify(existingLogs));
  } catch (e) {
    console.error('Failed to log sent email to localStorage:', e);
  }

  return {
    success: true,
    message: `Email notification sent to ${toEmail} (Simulated Dispatch).`,
  };
};

export const sendBookingConfirmationEmail = async (
  booking: BookingEmailParams
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const subject = `Booking Confirmation - ${booking.courtName} (${booking.date})`;
  const refCode = booking.bookingReference || booking.bookingId;
  const trackUrl = refCode
    ? `${baseUrl}?view=lookup&ref=${encodeURIComponent(refCode)}`
    : `${baseUrl}?view=lookup`;

    const ownerCard = buildFacilityOwnerCard(
      booking.ownerCompanyName,
      booking.ownerCompanyAddress,
      booking.ownerEmail,
      booking.ownerPhone,
      booking.courtName
    );

    const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Hello <strong style="color: #ffffff;">${booking.userName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Thank you for reserving a court at <strong style="color: #a6e224;">${booking.ownerCompanyName || booking.courtName}</strong> via Book Picklecourt! Here are your reservation details:
    </p>

    <!-- Summary Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 12px;">
            RESERVATION SUMMARY
          </div>
          
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reference Code</span>
            <span style="font-size: 15px; color: #ffffff; font-weight: 800; font-family: monospace;">${refCode}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Venue / Court</span>
            <span style="font-size: 14px; color: #cbd5e1; font-weight: 700;">${booking.ownerCompanyName && booking.ownerCompanyName !== booking.courtName ? `${booking.ownerCompanyName} / ${booking.courtName}` : booking.courtName}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Date & Slot(s)</span>
            <span style="font-size: 13px; color: #cbd5e1;">${booking.date} &bull; ${booking.slots.join(', ')}</span>
          </div>

          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Total Paid</span>
            <span style="font-size: 16px; color: #a6e224; font-weight: 800;">₱${booking.totalCost.toLocaleString()}</span>
          </div>
        </td>
      </tr>
    </table>

    ${ownerCard}

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${trackUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 8px 16px -4px rgba(166, 226, 36, 0.3); text-align: center;">
            Track Reservation Status &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Booking Confirmation',
    `Reservation for ${booking.courtName}`,
    bodyContent,
    booking.ownerCompanyName || booking.courtName
  );

  return sendCustomUserEmail({
    toEmail: booking.userEmail,
    toName: booking.userName,
    subject,
    message: htmlMessage,
  });
};

export const sendBookingStatusUpdateEmail = async (
  booking: BookingEmailParams,
  newStatus: 'approved' | 'cancelled'
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const isApproved = newStatus === 'approved';
  const statusTitle = isApproved ? 'Approved' : 'Cancelled';
  const refCode = booking.bookingReference || booking.bookingId || 'N/A';
  const trackUrl = refCode
    ? `${baseUrl}?view=lookup&ref=${encodeURIComponent(refCode)}`
    : `${baseUrl}?view=lookup`;

  const subject = `Booking Update: Reservation #${refCode} is ${statusTitle}`;

  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Hello <strong style="color: #ffffff;">${booking.userName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Your pickleball reservation has been <strong style="color: ${isApproved ? '#a6e224' : '#ef4444'};">${statusTitle}</strong>.
    </p>

    <!-- Details Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 24px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${isApproved ? '#a6e224' : '#ef4444'}; letter-spacing: 1px; margin-bottom: 12px;">
            RESERVATION SUMMARY
          </div>
          
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reference Code</span>
            <span style="font-size: 15px; color: #ffffff; font-weight: 800; font-family: monospace;">${refCode}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Venue / Court</span>
            <span style="font-size: 14px; color: #cbd5e1; font-weight: 700;">${booking.ownerCompanyName && booking.ownerCompanyName !== booking.courtName ? `${booking.ownerCompanyName} / ${booking.courtName}` : booking.courtName}</span>
          </div>

          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Date & Slot(s)</span>
            <span style="font-size: 13px; color: #cbd5e1;">${booking.date} &bull; ${booking.slots.join(', ')}</span>
          </div>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${trackUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 8px 16px -4px rgba(166, 226, 36, 0.3); text-align: center;">
            Track Reservation Status &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    `Reservation ${statusTitle}`,
    `Status update for ${booking.courtName}`,
    bodyContent
  );

  return sendCustomUserEmail({
    toEmail: booking.userEmail,
    toName: booking.userName,
    subject,
    message: htmlMessage,
  });
};

interface CompanyInvitationParams {
  companyName: string;
  companyAddress: string;
  clientAdminEmail: string;
  status?: 'pending' | 'active' | 'inactive';
}

export const sendCompanyInvitationEmail = async ({
  companyName,
  companyAddress,
  clientAdminEmail,
  status = 'pending',
}: CompanyInvitationParams): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const inviteLink = `${baseUrl}?invite=true&email=${encodeURIComponent(clientAdminEmail)}&company=${encodeURIComponent(companyName)}`;
  const isPending = status === 'pending';
  const subject = isPending
    ? `Welcome to Book Picklecourt! Organization Registration Pending Review: ${companyName}`
    : `Welcome to Book Picklecourt! Client Admin Invitation for ${companyName}`;

  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Dear <strong style="color: #ffffff;">Client Admin</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      ${isPending
        ? `Your organization/venue has been registered on <strong style="color: #a6e224;">Book Picklecourt</strong> and is currently in <strong style="color: #facc15;">Pending Review</strong> status.`
        : `Congratulations! Your company/venue has been officially registered and activated on the <strong style="color: #a6e224;">Book Picklecourt Court Reservation Platform</strong>.`
      }
    </p>

    <!-- Venue Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 24px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 12px;">
            REGISTERED VENUE DETAILS
          </div>
          
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Organization / Venue Name</span>
            <span style="font-size: 15px; color: #ffffff; font-weight: 700;">${companyName}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Location Address</span>
            <span style="font-size: 13px; color: #cbd5e1;">${companyAddress}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Account Status</span>
            <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: ${isPending ? '#facc15' : '#a6e224'};">${isPending ? '⏳ Pending Review' : '✓ Active'}</span>
          </div>

          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Designated Admin Account</span>
            <span style="font-size: 13px; color: #a6e224; font-family: monospace; font-weight: 700;">${clientAdminEmail}</span>
          </div>
        </td>
      </tr>
    </table>

    <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
      Next Steps to Access Your Account
    </h3>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td width="32" valign="top" style="padding-bottom: 10px;">
          <div style="width: 24px; height: 24px; background-color: rgba(166, 226, 36, 0.15); border: 1px solid rgba(166, 226, 36, 0.3); border-radius: 50%; color: #a6e224; font-weight: 800; font-size: 12px; line-height: 24px; text-align: center;">1</div>
        </td>
        <td style="padding-bottom: 10px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Click the button below to claim your Client Admin account on the <strong style="color: #ffffff;">Book Picklecourt Portal</strong>.
        </td>
      </tr>
      <tr>
        <td width="32" valign="top" style="padding-bottom: 10px;">
          <div style="width: 24px; height: 24px; background-color: rgba(166, 226, 36, 0.15); border: 1px solid rgba(166, 226, 36, 0.3); border-radius: 50%; color: #a6e224; font-weight: 800; font-size: 12px; line-height: 24px; text-align: center;">2</div>
        </td>
        <td style="padding-bottom: 10px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Sign in or Register using your email: <strong style="color: #a6e224;">${clientAdminEmail}</strong>
        </td>
      </tr>
      <tr>
        <td width="32" valign="top">
          <div style="width: 24px; height: 24px; background-color: rgba(166, 226, 36, 0.15); border: 1px solid rgba(166, 226, 36, 0.3); border-radius: 50%; color: #a6e224; font-weight: 800; font-size: 12px; line-height: 24px; text-align: center;">3</div>
        </td>
        <td style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Access your <strong style="color: #ffffff;">Client Admin Dashboard</strong> to manage courts, operating hours, prices, and player reservations.
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${inviteLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 8px 16px -4px rgba(166, 226, 36, 0.3); text-align: center;">
            Confirm & Access Client Admin Portal &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Client Admin Invitation',
    `Venue registration for ${companyName}`,
    bodyContent
  );

  return sendCustomUserEmail({
    toEmail: clientAdminEmail,
    toName: companyName + ' Admin',
    subject,
    message: htmlMessage,
    extraParams: {
      company_name: companyName,
      company_address: companyAddress,
      client_admin_email: clientAdminEmail,
      base_url: baseUrl,
      login_link: inviteLink,
    },
  });
};

export const sendCompanyApprovalEmail = async ({
  companyName,
  companyAddress,
  clientAdminEmail,
}: CompanyInvitationParams): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const loginLink = `${baseUrl}?view=admin`;
  const subject = `🎉 Approved! Your Organization ${companyName} is Now Active on Book Picklecourt`;

  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Dear <strong style="color: #ffffff;">${companyName} Administrator</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Great news! Your partner organization application for <strong style="color: #a6e224;">${companyName}</strong> has been reviewed and <strong style="color: #a6e224;">approved</strong> by the Book Picklecourt Super Admin team.
    </p>

    <!-- Venue Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 24px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 12px;">
            APPROVED VENUE ACCOUNT
          </div>
          
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Organization / Venue</span>
            <span style="font-size: 15px; color: #ffffff; font-weight: 700;">${companyName}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Location Address</span>
            <span style="font-size: 13px; color: #cbd5e1;">${companyAddress}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Status</span>
            <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #a6e224;">✓ Active & Operational</span>
          </div>

          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Client Admin Email</span>
            <span style="font-size: 13px; color: #a6e224; font-family: monospace; font-weight: 700;">${clientAdminEmail}</span>
          </div>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${loginLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 8px 16px -4px rgba(166, 226, 36, 0.3); text-align: center;">
            Log in to Client Admin Dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Organization Approved',
    `${companyName} is active on Book Picklecourt`,
    bodyContent
  );

  return sendCustomUserEmail({
    toEmail: clientAdminEmail,
    toName: companyName + ' Admin',
    subject,
    message: htmlMessage,
  });
};

interface VoucherEmailParams {
  userEmail: string;
  userName: string;
  voucherCode: string;
  discountText: string;
  reasonText: string;
  expiryDate?: string;
  companyName?: string;
  ownerCompanyName?: string;
}

export const sendVoucherIssuedEmail = async (params: VoucherEmailParams): Promise<{ success: boolean; message: string }> => {
  const venueName = params.companyName || params.ownerCompanyName;
  const title = `🎟️ You Received a Credit Voucher!`;
  const subtitle = venueName ? `Valid Exclusively at ${venueName}` : `Book Picklecourt Court Reservation Credit`;

  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
      Hello <strong style="color: #ffffff;">${params.userName || 'Valued Player'}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
      ${params.reasonText} You have been issued an exclusive credit voucher for your next match.
    </p>
    <div style="background: #1e293b; border: 2px dashed #a6e224; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">Your Voucher Code</span>
      <div style="font-size: 24px; font-weight: 900; color: #a6e224; font-family: monospace; letter-spacing: 2px; margin: 8px 0;">${params.voucherCode}</div>
      <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Discount: ${params.discountText}</div>
      ${venueName ? `<div style="font-size: 11px; font-weight: 700; color: #38bdf8; margin-top: 6px;">🏢 Valid exclusively at: <strong>${venueName}</strong></div>` : ''}
      ${params.expiryDate ? `<div style="font-size: 11px; font-weight: 700; color: #facc15; margin-top: 6px; background: rgba(250, 204, 21, 0.1); padding: 4px 10px; border-radius: 8px; display: inline-block;">📅 Valid until: ${params.expiryDate}</div>` : ''}
    </div>
    <p style="margin: 0 0 16px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
      💡 Simply enter this code at checkout when booking courts at <strong style="color: #ffffff;">${venueName || 'this venue'}</strong> to redeem your credit discount.
    </p>
  `;

  const htmlMessage = buildHtmlWrapper(title, subtitle, bodyContent, venueName);

  return sendCustomUserEmail({
    toEmail: params.userEmail,
    toName: params.userName,
    subject: `🎟️ Credit Voucher Issued: ${params.voucherCode} (${params.discountText}) - ${venueName || 'Book Picklecourt'}`,
    message: htmlMessage,
  });
};

export interface RefundEmailParams {
  bookingId: string;
  bookingReference?: string;
  courtName: string;
  date: string;
  slots: string[];
  totalCost: number;
  refundAmount: number;
  refundReason?: string;
  userEmail: string;
  userName: string;
  ownerCompanyName?: string;
  ownerCompanyAddress?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export const sendRefundConfirmationEmail = async (
  params: RefundEmailParams
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const refCode = params.bookingReference || params.bookingId || 'N/A';
  const trackUrl = refCode
    ? `${baseUrl}?view=lookup&ref=${encodeURIComponent(refCode)}`
    : `${baseUrl}?view=lookup`;

  const subject = `💸 Refund Processed: Reservation #${refCode} (₱${params.refundAmount.toLocaleString()})`;

  const ownerCard = buildFacilityOwnerCard(
    params.ownerCompanyName,
    params.ownerCompanyAddress,
    params.ownerEmail,
    params.ownerPhone,
    params.courtName
  );

  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Hello <strong style="color: #ffffff;">${params.userName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      A refund has been issued by <strong style="color: #ffffff;">${params.ownerCompanyName || 'the venue owner'}</strong> for your pickleball court reservation.
    </p>

    <!-- Details Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #c084fc; letter-spacing: 1px; margin-bottom: 12px;">
            REFUND DETAILS
          </div>
          
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reference Code</span>
            <span style="font-size: 15px; color: #ffffff; font-weight: 800; font-family: monospace;">${refCode}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Venue / Court</span>
            <span style="font-size: 14px; color: #cbd5e1; font-weight: 700;">${params.ownerCompanyName && params.ownerCompanyName !== params.courtName ? `${params.ownerCompanyName} / ${params.courtName}` : params.courtName}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Date & Slot(s)</span>
            <span style="font-size: 13px; color: #cbd5e1;">${params.date} &bull; ${params.slots.join(', ')}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Original Amount Paid</span>
            <span style="font-size: 14px; color: #cbd5e1; font-weight: 700;">₱${params.totalCost.toLocaleString()}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Amount Refunded</span>
            <span style="font-size: 18px; color: #c084fc; font-weight: 900;">₱${params.refundAmount.toLocaleString()}</span>
          </div>

          ${params.refundReason ? `
            <div>
              <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reason / Remarks</span>
              <span style="font-size: 13px; color: #e2e8f0; font-style: italic;">${params.refundReason}</span>
            </div>
          ` : ''}
        </td>
      </tr>
    </table>

    ${ownerCard}

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${trackUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 8px 16px -4px rgba(166, 226, 36, 0.3); text-align: center;">
            View Reservation Status &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Refund Processed',
    `Refund notification for ${params.courtName}`,
    bodyContent,
    params.ownerCompanyName || params.courtName
  );

  return sendCustomUserEmail({
    toEmail: params.userEmail,
    toName: params.userName,
    subject,
    message: htmlMessage,
  });
};

export interface NonRefundableCancellationParams {
  bookingId: string;
  bookingReference?: string;
  courtName: string;
  date: string;
  slots: string[];
  totalCost: number;
  cancellationReason: string;
  userEmail: string;
  userName: string;
  ownerCompanyName?: string;
  ownerCompanyAddress?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export const sendNonRefundableCancellationEmail = async (
  params: NonRefundableCancellationParams
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const refCode = params.bookingReference || params.bookingId || 'N/A';
  const trackUrl = `${baseUrl}?view=lookup&ref=${encodeURIComponent(refCode)}`;

  const subject = `Booking Cancelled: Reservation #${refCode}`;
  const ownerCard = buildFacilityOwnerCard(
    params.ownerCompanyName,
    params.ownerCompanyAddress,
    params.ownerEmail,
    params.ownerPhone,
    params.courtName
  );

  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Hello <strong style="color: #ffffff;">${params.userName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Your court reservation at <strong style="color: #ffffff;">${params.ownerCompanyName || params.courtName}</strong> has been cancelled per facility policies.
    </p>

    <!-- Details Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ef4444; letter-spacing: 1px; margin-bottom: 12px;">
            CANCELLATION SUMMARY
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reference Code</span>
            <span style="font-size: 15px; color: #ffffff; font-weight: 800; font-family: monospace;">${refCode}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Venue / Court</span>
            <span style="font-size: 14px; color: #cbd5e1; font-weight: 700;">${params.ownerCompanyName && params.ownerCompanyName !== params.courtName ? `${params.ownerCompanyName} / ${params.courtName}` : params.courtName}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Date & Slot(s)</span>
            <span style="font-size: 13px; color: #cbd5e1;">${params.date} &bull; ${params.slots.join(', ')}</span>
          </div>

          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Cancellation Reason & Terms</span>
            <span style="font-size: 13px; color: #f87171; font-weight: 700;">${params.cancellationReason}</span>
          </div>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td align="center">
          <a href="${trackUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #334155; color: #f8fafc; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 10px; text-align: center;">
            View Cancellation Record &rarr;
          </a>
        </td>
      </tr>
    </table>

    ${ownerCard}
  `;

  const htmlMessage = buildHtmlWrapper(
    'Reservation Cancelled',
    `Cancellation notice for ${params.courtName}`,
    bodyContent,
    params.ownerCompanyName || params.courtName
  );

  return sendCustomUserEmail({
    toEmail: params.userEmail,
    toName: params.userName,
    subject,
    message: htmlMessage,
  });
};

export interface PaymentReceiptEmailParams {
  bookingId: string;
  bookingReference?: string;
  gcashReferenceNumber?: string;
  courtName: string;
  courtType?: string;
  date: string;
  slots: string[];
  rentals?: { name: string; price: number; quantity: number }[];
  totalCost: number;
  paymentMethod?: string;
  userEmail: string;
  userName: string;
  ownerCompanyName?: string;
  ownerCompanyAddress?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export const sendPaymentApprovalReceiptEmail = async (
  params: PaymentReceiptEmailParams
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const refCode = params.bookingReference || params.bookingId || 'N/A';
  const trackUrl = `${baseUrl}?view=lookup&ref=${encodeURIComponent(refCode)}`;
  const approvedDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const subject = `Payment Approved & Official Receipt - Reservation #${refCode}`;
  const ownerCard = buildFacilityOwnerCard(
    params.ownerCompanyName,
    params.ownerCompanyAddress,
    params.ownerEmail,
    params.ownerPhone,
    params.courtName
  );

  const rentalsHtml = params.rentals && params.rentals.length > 0
    ? `
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #334155;">
        <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Equipment Rentals / Add-ons</span>
        ${params.rentals.map(r => `<div style="font-size: 12px; color: #cbd5e1;">&bull; ${r.name} x${r.quantity} (₱${(r.price * r.quantity).toLocaleString()})</div>`).join('')}
      </div>
    ` : '';

  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Hello <strong style="color: #ffffff;">${params.userName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Your payment for court reservation at <strong style="color: #a6e224;">${params.ownerCompanyName || params.courtName}</strong> has been <strong style="color: #a6e224;">VERIFIED & APPROVED</strong> by the venue host!
    </p>

    <!-- OFFICIAL PAYMENT RECEIPT CARD -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 12px;">
            🧾 OFFICIAL PAYMENT RECEIPT
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Booking Reference Code</span>
            <span style="font-size: 16px; color: #ffffff; font-weight: 800; font-family: monospace;">${refCode}</span>
          </div>

          ${params.gcashReferenceNumber ? `
            <div style="margin-bottom: 10px;">
              <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">GCash Reference Number</span>
              <span style="font-size: 14px; color: #38bdf8; font-weight: 800; font-family: monospace;">${params.gcashReferenceNumber}</span>
            </div>
          ` : ''}

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Payment Approval Date</span>
            <span style="font-size: 13px; color: #cbd5e1;">${approvedDateStr}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Payment Mode</span>
            <span style="font-size: 13px; color: #cbd5e1; text-transform: uppercase; font-weight: 700;">${params.paymentMethod || 'GCash Online Payment'}</span>
          </div>

          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Total Amount Paid</span>
            <span style="font-size: 18px; color: #a6e224; font-weight: 900;">₱${params.totalCost.toLocaleString()}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- RESERVED BOOKING DETAILS CARD -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #38bdf8; letter-spacing: 1px; margin-bottom: 12px;">
            📅 RESERVED BOOKING DETAILS
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reserved Venue / Court</span>
            <span style="font-size: 14px; color: #ffffff; font-weight: 700;">${params.ownerCompanyName && params.ownerCompanyName !== params.courtName ? `${params.ownerCompanyName} / ${params.courtName}` : params.courtName} ${params.courtType ? `(${params.courtType})` : ''}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reservation Date</span>
            <span style="font-size: 13px; color: #cbd5e1; font-weight: 700;">${params.date}</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Reserved Time Slot(s)</span>
            <span style="font-size: 13px; color: #a6e224; font-weight: 700;">${params.slots.join(', ')}</span>
          </div>

          ${rentalsHtml}
        </td>
      </tr>
    </table>

    ${ownerCard}

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${trackUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 8px 16px -4px rgba(166, 226, 36, 0.3); text-align: center;">
            View Digital QR Match Pass &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Payment Approved & Official Receipt',
    `Official Receipt for ${params.ownerCompanyName && params.ownerCompanyName !== params.courtName ? `${params.ownerCompanyName} / ${params.courtName}` : params.courtName}`,
    bodyContent,
    params.ownerCompanyName || params.courtName
  );

  return sendCustomUserEmail({
    toEmail: params.userEmail,
    toName: params.userName,
    subject,
    message: htmlMessage,
  });
};

export interface PendingPaymentItemSummary {
  customerName: string;
  courtName: string;
  date: string;
  slots: string[];
  totalCost: number;
  paymentMethod?: string;
  gcashReferenceNumber?: string;
  bookingReference?: string;
}

export interface PendingPaymentsReminderEmailParams {
  toEmail: string;
  toName: string;
  pendingCount: number;
  companyName?: string;
  pendingList?: PendingPaymentItemSummary[];
  customMessage?: string;
}

export const sendPendingPaymentsReminderEmail = async (
  params: PendingPaymentsReminderEmailParams
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}?view=admin`;
  const subject = `⚠️ Reminder: ${params.pendingCount} Customer Payment(s) Awaiting Approval - Book Picklecourt`;

  const pendingRowsHtml = (params.pendingList && params.pendingList.length > 0)
    ? params.pendingList.slice(0, 6).map((item, idx) => `
      <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 12px 10px; font-size: 13px; color: #ffffff; font-weight: 700;">
          ${idx + 1}. ${item.customerName}
          ${item.bookingReference ? `<div style="font-size: 11px; font-family: monospace; color: #a6e224; font-weight: 600;">#${item.bookingReference}</div>` : ''}
        </td>
        <td style="padding: 12px 10px; font-size: 12px; color: #cbd5e1;">
          <strong style="color: #ffffff;">${item.courtName}</strong>
          <div style="font-size: 11px; color: #94a3b8;">${item.date} (${item.slots.join(', ')})</div>
        </td>
        <td style="padding: 12px 10px; font-size: 12px; color: #cbd5e1;">
          ${item.paymentMethod ? `<span style="text-transform: uppercase; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${item.paymentMethod}</span>` : '<span style="font-size: 11px; color: #94a3b8;">GCash</span>'}
          ${item.gcashReferenceNumber ? `<div style="font-size: 11px; font-family: monospace; color: #cbd5e1; margin-top: 2px;">Ref: ${item.gcashReferenceNumber}</div>` : ''}
        </td>
        <td style="padding: 12px 10px; font-size: 14px; font-weight: 800; color: #a6e224; text-align: right;">
          ₱${item.totalCost.toLocaleString()}
        </td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">
          ${params.pendingCount} transaction(s) currently awaiting verification.
        </td>
      </tr>
    `;

  const moreCount = (params.pendingList && params.pendingList.length > 6)
    ? params.pendingList.length - 6
    : 0;

  const bodyContent = `
    <div style="margin-bottom: 20px;">
      <div style="display: inline-block; padding: 6px 14px; background-color: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.35); border-radius: 50px; margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #facc15; letter-spacing: 0.5px;">
          ⏳ ${params.pendingCount} PAYMENT(S) AWAITING REVIEW
        </span>
      </div>
      <p style="margin: 0 0 12px 0; font-size: 15px; color: #ffffff; line-height: 1.6;">
        Hello <strong style="color: #a6e224;">${params.toName || 'Administrator'}</strong>,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
        This is an automated reminder that you have <strong style="color: #facc15;">${params.pendingCount} customer payment transaction(s)</strong> awaiting your verification and approval ${params.companyName ? `for <strong style="color: #ffffff;">${params.companyName}</strong>` : ''}.
      </p>
      ${params.customMessage ? `<p style="margin: 0 0 16px 0; font-size: 13px; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #38bdf8;">${params.customMessage}</p>` : ''}
    </div>

    <!-- PENDING ITEMS SUMMARY TABLE -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 20px; overflow: hidden;">
      <thead>
        <tr style="background-color: #0f172a; border-bottom: 1px solid #334155;">
          <th style="padding: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; text-align: left;">Customer</th>
          <th style="padding: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; text-align: left;">Court / Slot</th>
          <th style="padding: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; text-align: left;">Method / Ref</th>
          <th style="padding: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${pendingRowsHtml}
      </tbody>
    </table>

    ${moreCount > 0 ? `
      <p style="text-align: center; font-size: 12px; color: #94a3b8; margin: -10px 0 16px 0;">
        + ${moreCount} more pending item(s) in your dashboard
      </p>
    ` : ''}

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; margin-bottom: 10px;">
      <tr>
        <td align="center">
          <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 8px 16px -4px rgba(166, 226, 36, 0.3); text-align: center;">
            Open Dashboard & Approve Payments &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Payment Approval Reminder',
    `${params.pendingCount} Payment(s) Waiting for Verification`,
    bodyContent,
    params.companyName
  );

  return sendCustomUserEmail({
    toEmail: params.toEmail,
    toName: params.toName,
    subject,
    message: htmlMessage,
  });
};

export interface ClientAdminInvitationEmailParams {
  toEmail: string;
  toName?: string;
  inviteUrl: string;
  expiresAt: string;
  invitedBy?: string;
  customMessage?: string;
  companyName?: string;
  role?: 'super_admin' | 'client_admin' | 'manager' | 'editor' | 'player';
}

export interface UserInvitationEmailParams {
  toEmail: string;
  toName?: string;
  role: 'super_admin' | 'client_admin' | 'manager' | 'editor' | 'player';
  inviteUrl: string;
  expiresAt: string;
  invitedBy?: string;
  customMessage?: string;
  companyName?: string;
}

export const sendUserInvitationEmail = async (params: UserInvitationEmailParams): Promise<{ success: boolean; error?: string }> => {
  const roleLabels: Record<string, { title: string; badge: string; color: string }> = {
    super_admin: { title: 'Super Administrator (Global Platform Access)', badge: '🛡️ SUPER ADMIN', color: '#f59e0b' },
    client_admin: { title: 'Client Admin (Venue & Facility Host)', badge: '🎾 FACILITY HOST', color: '#a6e224' },
    manager: { title: 'Facility Manager (Venue Operations & Management)', badge: '📋 FACILITY MANAGER', color: '#ccff00' },
    editor: { title: 'Court Staff / Scorekeeper (Front-Desk & Check-in Staff)', badge: '✏️ STAFF EDITOR', color: '#38bdf8' },
    player: { title: 'Standard Player / Court Member', badge: '⚡ PLAYER ACCOUNT', color: '#38bdf8' },
  };

  const roleInfo = roleLabels[params.role] || roleLabels.client_admin;
  const subject = `Official Invitation: Register as ${roleInfo.badge} on Book Picklecourt`;
  const inviteeDisplayName = params.toName || params.toEmail.split('@')[0];
  const formattedExpiry = new Date(params.expiresAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const bodyContent = `
    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; font-size: 15px; color: #e2e8f0; line-height: 1.5;">
        Hello <strong style="color: #ffffff;">${inviteeDisplayName}</strong>,
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
        You have been invited by Book Picklecourt System Administration${params.invitedBy ? ` (<strong>${params.invitedBy}</strong>)` : ''} to join the platform as a <strong style="color: ${roleInfo.color};">${roleInfo.title}</strong>${params.companyName ? ` for <strong>${params.companyName}</strong>` : ''}.
      </p>
      ${params.customMessage ? `
        <div style="background-color: rgba(56, 189, 248, 0.08); border-left: 3px solid ${roleInfo.color}; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${roleInfo.color}; letter-spacing: 0.5px; margin-bottom: 4px;">NOTE FROM SUPER ADMIN</div>
          <p style="margin: 0; font-size: 12px; color: #bae6fd; font-style: italic; line-height: 1.5;">"${params.customMessage}"</p>
        </div>
      ` : ''}
    </div>

    <!-- SECURITY NOTICE CARD -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${roleInfo.color}; letter-spacing: 0.5px; margin-bottom: 8px;">
            🔒 AUTHORIZED INVITATION LINK (${roleInfo.badge})
          </div>
          <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">
            Designated Recipient: <strong style="color: #ffffff;">${params.toEmail}</strong>
          </div>
          <div style="font-size: 11px; color: #94a3b8;">
            ⏱️ <strong>Expires:</strong> ${formattedExpiry} (Single-use token)
          </div>
        </td>
      </tr>
    </table>

    <!-- ACTION BUTTON -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${params.inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, ${roleInfo.color} 0%, #38bdf8 100%); color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 900; border-radius: 12px; box-shadow: 0 8px 20px -4px rgba(166, 226, 36, 0.4); text-align: center; letter-spacing: 0.3px;">
            Accept Invitation & Complete Registration &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
      If you did not expect this invitation or believe it was sent in error, you can safely ignore this email.
    </p>
  `;

  const htmlMessage = buildHtmlWrapper(
    `${roleInfo.badge} Invitation`,
    'Official Platform Registration Access',
    bodyContent
  );

  return sendCustomUserEmail({
    toEmail: params.toEmail,
    toName: params.toName || 'Invited User',
    subject,
    message: htmlMessage,
  });
};

export const sendClientAdminInvitationEmail = async (params: ClientAdminInvitationEmailParams): Promise<{ success: boolean; error?: string }> => {
  return sendUserInvitationEmail({
    ...params,
    role: params.role || 'client_admin',
  });
};

export interface RegistrationConfirmationEmailParams {
  toEmail: string;
  toName: string;
  role?: string;
  loginUrl: string;
}

export const sendRegistrationConfirmationEmail = async (params: RegistrationConfirmationEmailParams): Promise<{ success: boolean; error?: string }> => {
  const subject = `Welcome to PicklePoint - Account Registration Confirmed`;
  const isClientAdmin = params.role === 'client_admin';

  const bodyContent = `
    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; font-size: 15px; color: #e2e8f0; line-height: 1.5;">
        Welcome to PicklePoint, <strong style="color: #ffffff;">${params.toName}</strong>!
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
        Your account registration has been successfully confirmed. You now have access as a <strong style="color: #a6e224;">${isClientAdmin ? 'Client Administrator' : 'Member'}</strong> on the platform.
      </p>
      ${isClientAdmin ? `
        <div style="background-color: rgba(166, 226, 36, 0.08); border-left: 3px solid #a6e224; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 0.5px; margin-bottom: 4px;">NEXT STEP: FACILITY SETUP</div>
          <p style="margin: 0; font-size: 12px; color: #d9f99d; line-height: 1.5;">
            Please log in to complete your <strong>Company & Facility Profile</strong> and configure your <strong>GCash payment QR code</strong> to start receiving court bookings.
          </p>
        </div>
      ` : ''}
    </div>

    <!-- ACTION BUTTON -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${params.loginUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 900; border-radius: 12px; box-shadow: 0 8px 20px -4px rgba(166, 226, 36, 0.35); text-align: center;">
            Log In to Your Account &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Registration Confirmed',
    'Welcome to the PicklePoint Platform',
    bodyContent
  );

  return sendCustomUserEmail({
    toEmail: params.toEmail,
    toName: params.toName,
    subject,
    message: htmlMessage,
  });
};

export interface OpenPlayInvitationParams {
  guestEmail: string;
  guestName: string;
  primaryPlayerName: string;
  eventTitle: string;
  eventCategory: string;
  eventDate: string;
  timeSlot: string;
  location?: string;
  companyName?: string;
  registrationReference: string;
}

export const sendOpenPlayInvitationEmail = async (
  params: OpenPlayInvitationParams
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const subject = `You're Invited to Open Play: ${params.eventTitle} (${params.eventDate})`;
  
  const bodyContent = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
      Hello <strong style="color: #ffffff;">${params.guestName || 'Pickleball Player'}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      <strong style="color: #a6e224;">${params.primaryPlayerName}</strong> has registered you as a guest for an upcoming Pickleball Open Play session! Here are your event details:
    </p>

    <!-- Summary Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 18px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 12px;">
            OPEN PLAY INVITATION
          </div>
          
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Event Title & Skill Level</span>
            <span style="font-size: 15px; color: #ffffff; font-weight: 800;">${params.eventTitle} (${params.eventCategory})</span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Event Date & Time</span>
            <span style="font-size: 14px; color: #cbd5e1; font-weight: 700;">${params.eventDate} • ${params.timeSlot}</span>
          </div>

          ${params.location ? `
          <div style="margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Venue Location</span>
            <span style="font-size: 13px; color: #cbd5e1;">${params.location}</span>
          </div>
          ` : ''}

          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Host Venue / Organizer</span>
            <span style="font-size: 13px; color: #a6e224; font-weight: 700;">${params.companyName || 'Book Picklecourt Host'}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- ACTION BUTTON -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${baseUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 900; border-radius: 12px; box-shadow: 0 8px 20px -4px rgba(166, 226, 36, 0.35); text-align: center;">
            View Open Play Details &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Open Play Guest Invitation',
    `You're invited by ${params.primaryPlayerName}`,
    bodyContent
  );

  return sendCustomUserEmail({
    toEmail: params.guestEmail,
    toName: params.guestName || 'Open Play Guest',
    subject,
    message: htmlMessage,
  });
};

export interface OpenPlayEventCancellationEmailParams {
  toEmail: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location?: string;
  cancellationReason?: string;
  refundNotice?: string;
  companyName?: string;
  hostPhone?: string;
}

export const sendOpenPlayEventCancellationEmail = async (
  params: OpenPlayEventCancellationEmailParams
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = getBaseUrl();
  const subject = `⚠️ EVENT CANCELLED: ${params.eventTitle} (${params.eventDate})`;

  const bodyContent = `
    <!-- CANCELLATION BANNER -->
    <div style="background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <div style="font-size: 28px; margin-bottom: 8px;">⚠️</div>
      <div style="font-size: 16px; font-weight: 900; color: #f87171; text-transform: uppercase; letter-spacing: 0.5px;">
        Open Play Session Cancelled
      </div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #fca5a5;">
        We regret to inform you that the following session has been cancelled by the venue administration.
      </p>
    </div>

    <!-- EVENT DETAILS SUMMARY CARD -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a6e224; letter-spacing: 1px; margin-bottom: 8px;">
            CANCELLED SESSION SUMMARY
          </div>
          
          <div style="margin-bottom: 12px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Event Title</span>
            <span style="font-size: 17px; color: #ffffff; font-weight: 900;">${params.eventTitle}</span>
          </div>

          <div style="margin-bottom: 12px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Original Date & Schedule</span>
            <span style="font-size: 14px; color: #cbd5e1; font-weight: 700;">${params.eventDate} • ${params.eventTime}</span>
          </div>

          ${params.location ? `
          <div style="margin-bottom: 12px;">
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Venue Location</span>
            <span style="font-size: 13px; color: #cbd5e1;">${params.location}</span>
          </div>
          ` : ''}

          ${params.companyName ? `
          <div>
            <span style="font-size: 11px; color: #64748b; display: block; font-weight: 600; text-transform: uppercase;">Organizer</span>
            <span style="font-size: 13px; color: #a6e224; font-weight: 700;">${params.companyName}</span>
          </div>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- CANCELLATION REASON -->
    ${params.cancellationReason ? `
    <div style="background-color: #0f172a; border-radius: 14px; border: 1px solid #1e293b; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.5px; margin-bottom: 6px;">
        💬 Reason for Cancellation
      </div>
      <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.5;">
        "${params.cancellationReason}"
      </p>
    </div>
    ` : ''}

    <!-- REFUND & GCASH NOTICE -->
    <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #10b981; letter-spacing: 0.5px; margin-bottom: 6px;">
        💳 Payment & Refund Status
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        ${params.refundNotice || 'If you completed registration payment via GCash, our admin team is processing your full refund directly to your GCash account. For inquiries, please contact our support host.'}
      </p>
      ${params.hostPhone ? `
      <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 700; color: #34d399;">
        📞 Organizer Support Line: ${params.hostPhone}
      </p>
      ` : ''}
    </div>

    <!-- ACTION BUTTON -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${baseUrl}?view=openplay" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 900; border-radius: 12px; box-shadow: 0 8px 20px -4px rgba(166, 226, 36, 0.35); text-align: center;">
            Browse Other Open Play Sessions &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const htmlMessage = buildHtmlWrapper(
    'Event Cancellation Notification',
    `Session Update: ${params.eventTitle}`,
    bodyContent,
    params.companyName
  );

  return sendCustomUserEmail({
    toEmail: params.toEmail,
    toName: params.toName || 'Valued Player',
    subject,
    message: htmlMessage,
  });
};

export interface OpenPlayGameReminderEmailParams {
  toEmail: string;
  toName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location: string;
  eventDateIso?: string;
  startTime24h?: string;
  leadTimeMinutes?: number;
  assignedCourts?: string;
  companyName?: string;
  hostPhone?: string;
  customMessage?: string;
}

export const sendOpenPlayGameReminderEmail = async (
  params: OpenPlayGameReminderEmailParams
): Promise<{ success: boolean; error?: string }> => {
  const baseUrl = getBaseUrl();

  let timeText = '';
  let isGameStartingNow = false;

  if (params.eventDateIso && params.startTime24h) {
    try {
      const [year, month, day] = params.eventDateIso.split('-').map((n) => parseInt(n, 10));
      const [hours, minutes] = params.startTime24h.split(':').map((n) => parseInt(n, 10));
      const gameStartTimestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
      const now = Date.now();
      const diffMs = gameStartTimestamp - now;
      const diffMins = Math.round(diffMs / (60 * 1000));

      if (diffMins <= 0) {
        isGameStartingNow = true;
        timeText = 'Now';
      } else if (diffMins < 60) {
        timeText = `${diffMins} Minute${diffMins > 1 ? 's' : ''}`;
      } else {
        const hrs = Math.floor(diffMins / 60);
        const remMins = diffMins % 60;
        if (remMins === 0) {
          timeText = `${hrs} Hour${hrs > 1 ? 's' : ''}`;
        } else {
          timeText = `${hrs} Hour${hrs > 1 ? 's' : ''} and ${remMins} Minute${remMins > 1 ? 's' : ''}`;
        }
      }
    } catch (e) {
      const fallbackMins = params.leadTimeMinutes || 15;
      timeText = `${fallbackMins} Minutes`;
    }
  } else {
    const fallbackMins = params.leadTimeMinutes || 15;
    timeText = fallbackMins >= 60 && fallbackMins % 60 === 0
      ? `${fallbackMins / 60} Hour${fallbackMins / 60 > 1 ? 's' : ''}`
      : `${fallbackMins} Minutes`;
  }

  const subject = isGameStartingNow
    ? `⏰ Game Starting Now! - ${params.eventTitle}`
    : `⏰ Game Reminder: Starting in ${timeText}! - ${params.eventTitle}`;

  const bannerTitle = isGameStartingNow
    ? `Your Game Session is Starting Now!`
    : `Your Game Begins in ${timeText}!`;

  const bodyContent = `
    <!-- REMINDER BANNER -->
    <div style="background-color: rgba(166, 226, 36, 0.12); border: 1px solid rgba(166, 226, 36, 0.35); border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 28px; margin-bottom: 6px;">⏰ 🏓</div>
      <div style="font-size: 18px; font-weight: 900; color: #a6e224; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
        ${bannerTitle}
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; font-weight: 600;">
        Hello <strong style="color: #ffffff;">${params.toName || 'Player'}</strong>, get ready! Your Open Play pickleball session is starting soon.
      </p>
    </div>

    <!-- EVENT DETAILS CARD -->
    <div style="background-color: #0f172a; border-radius: 16px; padding: 20px; border: 1px solid #1e293b; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
        📋 SESSION RECAP & LOCATION
      </div>
      
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding-bottom: 10px; font-size: 14px; color: #94a3b8; font-weight: 700; width: 110px;">Event Title:</td>
          <td style="padding-bottom: 10px; font-size: 14px; color: #ffffff; font-weight: 800;">${params.eventTitle}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 10px; font-size: 14px; color: #94a3b8; font-weight: 700;">Date & Time:</td>
          <td style="padding-bottom: 10px; font-size: 14px; color: #a6e224; font-weight: 800;">${params.eventDate} (${params.eventTime})</td>
        </tr>
        <tr>
          <td style="padding-bottom: 10px; font-size: 14px; color: #94a3b8; font-weight: 700;">Venue Location:</td>
          <td style="padding-bottom: 10px; font-size: 14px; color: #e2e8f0; font-weight: 700;">${params.location}</td>
        </tr>
        ${params.assignedCourts ? `
        <tr>
          <td style="padding-bottom: 10px; font-size: 14px; color: #94a3b8; font-weight: 700;">Courts:</td>
          <td style="padding-bottom: 10px; font-size: 14px; color: #38bdf8; font-weight: 800;">${params.assignedCourts}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <!-- PRE-GAME CHECKLIST -->
    <div style="background-color: rgba(30, 41, 59, 0.6); border: 1px solid #334155; border-radius: 16px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px; margin-bottom: 10px;">
        💡 Quick Player Checklist
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
        <li>Please check in with the desk host upon arrival at the court.</li>
        <li>Bring your paddle, court shoes, and hydration bottle.</li>
        <li>Warm up thoroughly and enjoy competitive, fun games!</li>
      </ul>
    </div>

    <!-- ACTION BUTTON -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; margin-bottom: 20px;">
      <tr>
        <td align="center">
          <a href="${baseUrl}?view=openplay" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #a6e224; color: #0b132b; text-decoration: none; font-size: 14px; font-weight: 900; border-radius: 12px; box-shadow: 0 8px 20px -4px rgba(166, 226, 36, 0.35); text-align: center;">
            View Session Details & Roster &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const headerTitle = isGameStartingNow
    ? 'Game Starting Now!'
    : `Game Starting in ${timeText}!`;

  const htmlMessage = buildHtmlWrapper(
    headerTitle,
    `Reminder: ${params.eventTitle}`,
    bodyContent,
    params.companyName
  );

  return sendCustomUserEmail({
    toEmail: params.toEmail,
    toName: params.toName || 'Valued Player',
    subject,
    message: htmlMessage,
  });
};


