const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendBookingConfirmation(user, booking, pg) {
    const emailTemplate = `
      <h2>Booking Confirmed! 🎉</h2>
      <p>Dear ${user.name},</p>
      <p>Your booking has been confirmed for <strong>${pg.name}</strong></p>
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>PG Name:</strong> ${pg.name}</p>
        <p><strong>Amount Paid:</strong> ₹${booking.totalAmount}</p>
      </div>
      <p>Thank you for choosing Ghar!</p>
    `;

    await this.sendEmail(user.email, 'Booking Confirmed - Ghar', emailTemplate);
  }

  async sendPGApprovalNotification(owner, pg, status) {
    const subject = status === 'approved' ? 'PG Approved!' : 'PG Rejected';
    const message = status === 'approved' 
      ? `Great news! Your PG "${pg.name}" has been approved and is now live on Ghar.`
      : `Your PG "${pg.name}" has been rejected. Please contact support for details.`;

    const emailTemplate = `
      <h2>${subject}</h2>
      <p>Dear ${owner.name},</p>
      <p>${message}</p>
      <p><strong>PG Name:</strong> ${pg.name}</p>
    `;

    await this.sendEmail(owner.email, subject, emailTemplate);
  }

  async sendEmail(to, subject, html) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      });
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }

  async sendOTP(phone, otp) {
    console.log(`OTP ${otp} sent to ${phone}`);
    return true;
  }
}

module.exports = new NotificationService();