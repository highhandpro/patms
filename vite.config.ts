import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import nodemailer from 'nodemailer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'send-email-api-mock',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/send-email' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const { from, to, subject, html } = JSON.parse(bodyStr);
                  
                  const gmailUser = env.GMAIL_USER || process.env.GMAIL_USER || env.VITE_GMAIL_USER || process.env.VITE_GMAIL_USER;
                  const gmailPass = env.GMAIL_PASS || process.env.GMAIL_PASS || env.VITE_GMAIL_PASS || process.env.VITE_GMAIL_PASS;
                  const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY || env.VITE_RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

                  if (gmailUser && gmailPass) {
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
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, messageId: info.messageId }));
                  } else if (resendApiKey) {
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

                    const resText = await response.text();
                    res.statusCode = response.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(resText);
                  } else {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ 
                      error: 'Neither Gmail SMTP credentials (GMAIL_USER, GMAIL_PASS) nor RESEND_API_KEY are configured in your local environment. Please add them to your local .env file.' 
                    }));
                  }
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ]
  };
})
