// Vercel Serverless Function — Lead intake endpoint
// Handles form submissions from all pathways (buyer, seller, investor, rental)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      email,
      phone,
      pathway,    // 'buyer' | 'seller' | 'investor' | 'rental'
      message,
      source,     // which page submitted from
      timestamp
    } = req.body;

    // Validation
    if (!name || !email || !pathway) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'pathway']
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const validPathways = ['buyer', 'seller', 'investor', 'rental', 'general'];
    if (!validPathways.includes(pathway)) {
      return res.status(400).json({ error: 'Invalid pathway' });
    }

    // Lead object
    const lead = {
      id: `skr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      pathway,
      message: message ? message.trim() : null,
      source: source || 'direct',
      timestamp: timestamp || new Date().toISOString(),
      status: 'new'
    };

    // ─── INTEGRATIONS ───
    // Uncomment and configure as needed:

    // 1. Email notification
    // await sendNotificationEmail(lead);

    // 2. CRM (HubSpot, Salesforce, etc.)
    // await pushToCRM(lead);

    // 3. Google Sheets (simple, free)
    // await appendToSheet(lead);

    // 4. Database (Supabase, PlanetScale, etc.)
    // await insertLead(lead);

    // For now, log the lead and return success
    console.log('NEW LEAD:', JSON.stringify(lead, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Inquiry received. We will be in touch.',
      leadId: lead.id
    });

  } catch (error) {
    console.error('Lead submission error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
