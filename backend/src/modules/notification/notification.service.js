/* ─────────────────────────────────────────────────────────────────────────
   src/modules/notification/notification.service.js
   Provider-abstraction layer. Adapters: console (dev), WhatsApp (prod).
   All send calls are fire-and-forget from booking service.
───────────────────────────────────────────────────────────────────────── */

const env = require("../../config/env");

/* ── Message templates ── */
const buildMessage = (event, booking) => {
    const base = `🏨 *ROOST Booking Update*\n\nBooking: ${booking.bookingCode}\nGuest: ${booking.guestName}\nCheck-in: ${new Date(booking.checkIn).toDateString()}\nCheck-out: ${new Date(booking.checkOut).toDateString()}\nAmount: ₹${booking.totalAmount}`;

    const statusLine = {
        BOOKING_CREATED:   "📋 Status: *PENDING* — Awaiting owner confirmation",
        BOOKING_CONFIRMED: "✅ Status: *CONFIRMED* — See you soon!",
        BOOKING_REJECTED:  `❌ Status: *REJECTED*${booking.rejectionReason ? `\nReason: ${booking.rejectionReason}` : ""}`,
        BOOKING_CANCELLED: "🚫 Status: *CANCELLED*",
    }[event] || `Status: ${booking.status}`;

    return `${base}\n${statusLine}`;
};

/* ── Console adapter (dev default) ── */
const consoleAdapter = async ({ event, booking }) => {
    console.log(JSON.stringify({ level: "info", event: "notification_preview", type: event, bookingCode: booking.bookingCode }));
};

/* ── WhatsApp adapter (Cloud API) ── */
const whatsappAdapter = async ({ event, booking, recipientPhone }) => {
    const token      = env.whatsapp.token;
    const phoneId    = env.whatsapp.phoneId;
    const apiVersion = env.whatsapp.apiVersion;

    if (!token || !phoneId || !recipientPhone) {
        console.warn("[WhatsApp] Missing config or recipient — skipping");
        return;
    }

    const url     = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
    const message = buildMessage(event, booking);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to:                recipientPhone,
            type:              "text",
            text:              { body: message },
        }),
    });

    if (!response.ok) {
        throw new Error(`WhatsApp API returned status ${response.status}`);
    }

    console.log(JSON.stringify({ level: "info", event: "whatsapp_sent", type: event }));
};

/* ── Main dispatcher ── */
const sendNotification = async ({ event, booking, tenant }) => {
    try {
        const useWhatsApp = env.isProduction && env.whatsapp.token;

        if (useWhatsApp) {
            const recipientPhone = booking.guestPhone || tenant?.whatsappNumber;
            await whatsappAdapter({ event, booking, recipientPhone });
        } else {
            await consoleAdapter({ event, booking });
        }
    } catch (err) {
        // Never crash the app due to notification failures
        console.error(`[NOTIFICATION_ERROR] ${event}:`, err.message);
    }
};

module.exports = { sendNotification };
