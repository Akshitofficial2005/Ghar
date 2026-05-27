const nodemailer = require('nodemailer');
let sgMail = null;
try {
  sgMail = require('@sendgrid/mail');
} catch (e) {
  // not installed — optional
}

const isTruthy = value => Boolean(value) && value !== 'false' && value !== '0';

const getEmailConfig = () => {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const secure = process.env.EMAIL_SECURE
    ? isTruthy(process.env.EMAIL_SECURE)
    : port === 465;
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (host && user && pass) {
    return {
      provider: 'smtp',
      transporter: nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
      }),
      from,
    };
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return {
      provider: 'gmail',
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      }),
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
    };
  }

  // SendGrid (preferred transactional provider)
  if (process.env.SENDGRID_API_KEY && sgMail) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // Wrap SendGrid to present a sendMail API compatible shape
    const transporter = {
      sendMail: async (mailOptions) => {
        const msg = {
          to: mailOptions.to,
          from: mailOptions.from || from || process.env.EMAIL_FROM,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text
        };
        // send returns an array of responses
        return sgMail.send(msg);
      }
    };

    return {
      provider: 'sendgrid',
      transporter,
      from: process.env.EMAIL_FROM || from
    };
  }

  return null;
};

const getEmailTransporter = () => {
  const config = getEmailConfig();
  return config ? config.transporter : null;
};

const hasEmailConfig = () => Boolean(getEmailConfig());

const getEmailFrom = () => {
  const config = getEmailConfig();
  return config ? config.from : null;
};

const getEmailProvider = () => {
  const config = getEmailConfig();
  return config ? config.provider : null;
};

module.exports = {
  getEmailConfig,
  getEmailTransporter,
  hasEmailConfig,
  getEmailFrom,
  getEmailProvider,
};