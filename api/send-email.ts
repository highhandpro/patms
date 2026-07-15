import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY env variable is not set on the Vercel backend!');
    return res.status(500).json({ error: 'Server misconfiguration: RESEND_API_KEY is not defined' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'Penny Ante Poker Club <no-reply@pennyantepoker.com>',
        to: [to],
        subject: subject,
        html: html
      })
    });

    const resText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(resText);
    } catch {
      data = { message: resText };
    }

    if (!response.ok) {
      console.error('Resend API response error:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to send email via Resend' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Internal server error sending email:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
