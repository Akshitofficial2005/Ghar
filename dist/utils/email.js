"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplates = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `"PG Booking" <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.to}`);
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
exports.emailTemplates = {
    welcomeEmail: (name) => ({
        subject: 'Welcome to PG Booking!',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to PG Booking, ${name}!</h2>
        <p>Thank you for joining our platform. You can now:</p>
        <ul>
          <li>Browse and book PG accommodations</li>
          <li>Leave reviews for places you've stayed</li>
          <li>Manage your bookings easily</li>
        </ul>
        <p>Happy booking!</p>
        <div style="margin-top: 30px; color: #666; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
    }),
    bookingConfirmation: (name, pgName, checkIn, checkOut) => ({
        subject: 'Booking Confirmation - PG Booking',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Booking Confirmed!</h2>
        <p>Hi ${name},</p>
        <p>Your booking has been confirmed for:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${pgName}</h3>
          <p><strong>Check-in:</strong> ${checkIn}</p>
          <p><strong>Check-out:</strong> ${checkOut}</p>
        </div>
        <p>You will receive the property owner's contact details closer to your check-in date.</p>
        <p>Have a great stay!</p>
      </div>
    `,
    }),
    pgApproval: (ownerName, pgName) => ({
        subject: 'PG Approved - PG Booking',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Congratulations! Your PG has been approved</h2>
        <p>Hi ${ownerName},</p>
        <p>Great news! Your PG "<strong>${pgName}</strong>" has been approved and is now live on our platform.</p>
        <p>Guests can now discover and book your property. You'll receive notifications for new bookings.</p>
        <p>Thank you for partnering with us!</p>
      </div>
    `,
    }),
    pgRejection: (ownerName, pgName, reason) => ({
        subject: 'PG Application Update - PG Booking',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">PG Application Update</h2>
        <p>Hi ${ownerName},</p>
        <p>We've reviewed your PG application for "<strong>${pgName}</strong>".</p>
        <p>Unfortunately, we cannot approve it at this time for the following reason:</p>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>${reason}</p>
        </div>
        <p>Please make the necessary changes and submit again. We're here to help if you have any questions.</p>
      </div>
    `,
    }),
};
//# sourceMappingURL=email.js.map