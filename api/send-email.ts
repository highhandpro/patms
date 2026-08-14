import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { from, to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required parameters: to, subject, html' });
  }

  const gmailUser = process.env.GMAIL_USER || process.env.VITE_GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS || process.env.VITE_GMAIL_PASS;
  const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

  if (gmailUser && gmailPass) {
    // Send via Gmail SMTP using Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });

      const mailOptions = {
        from: from || `Penny Ante Poker Club <${gmailUser}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        html: html
      };

      const info = await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error('Gmail SMTP send error:', error);
      return res.status(500).json({ error: error.message || 'Gmail SMTP dispatch failed' });
    }
  } else if (resendApiKey) {
    // Send via Resend
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: from || 'Penny Ante Poker Club <onboarding@resend.dev>',
          to: Array.isArray(to) ? to : [to],
          subject: subject,
          html: html
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText || 'Resend API returned error' });
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Resend dispatch failed' });
    }
  } else {
    return res.status(500).json({
      error: 'Neither Gmail SMTP credentials (GMAIL_USER, GMAIL_PASS) nor RESEND_API_KEY are configured in the server environment.'
    });
  }
}
