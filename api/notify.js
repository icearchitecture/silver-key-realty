// Vercel Serverless Function — Email notification on new lead
// Uses Resend (resend.com) — free tier handles 100 emails/day
// Set RESEND_API_KEY and NOTIFICATION_EMAIL in Vercel environment variables

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, pathway, message, leadId } = req.body;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;

  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) {
    console.warn('Email notification skipped — missing env vars');
    return res.status(200).json({ skipped: true });
  }

  const pathwayLabels = {
    buyer: 'Buyer Experience',
    seller: 'Seller Experience',
    investor: 'Investor Inquiry',
    rental: 'Rental Inquiry'
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Silver Key Realty <notifications@silverkey.realty>',
        to: NOTIFICATION_EMAIL,
        subject: `New ${pathwayLabels[pathway] || pathway} Lead — ${name}`,
        html: `
          <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; color: #1A1A1A;">
            <div style="border-bottom: 1px solid rgba(46, 125, 82, 0.18); padding-bottom: 24px; margin-bottom: 24px;">
              <h2 style="font-size: 20px; font-weight: 300; margin: 0;">New Lead — ${pathwayLabels[pathway] || pathway}</h2>
              <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #8A8178; margin-top: 8px;">Lead ID: ${leadId}</p>
            </div>
            <table style="width: 100%; font-size: 15px; line-height: 1.8;">
              <tr><td style="color: #8A8178; padding: 8px 16px 8px 0; vertical-align: top;">Name</td><td style="padding: 8px 0;">${name}</td></tr>
              <tr><td style="color: #8A8178; padding: 8px 16px 8px 0; vertical-align: top;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #1A1A1A;">${email}</a></td></tr>
              ${phone ? `<tr><td style="color: #8A8178; padding: 8px 16px 8px 0; vertical-align: top;">Phone</td><td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #1A1A1A;">${phone}</a></td></tr>` : ''}
              <tr><td style="color: #8A8178; padding: 8px 16px 8px 0; vertical-align: top;">Pathway</td><td style="padding: 8px 0;">${pathwayLabels[pathway] || pathway}</td></tr>
              ${message ? `<tr><td style="color: #8A8178; padding: 8px 16px 8px 0; vertical-align: top;">Message</td><td style="padding: 8px 0;">${message}</td></tr>` : ''}
            </table>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(201, 185, 154, 0.12); font-size: 11px; color: #B8B0A8; letter-spacing: 1px; text-transform: uppercase;">
              Silver Key Realty — Lifestyle Investment Architecture
            </div>
          </div>
        `
      })
    });

    const data = await response.json();
    return res.status(200).json({ sent: true, id: data.id });

  } catch (error) {
    console.error('Email notification failed:', error);
    return res.status(500).json({ error: 'Notification failed' });
  }
}
