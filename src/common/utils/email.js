import Nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/**
 * Email Utility Service
 * Handles all email operations with modular, reusable templates
 * Uses Google's Gmail service with App Password
 */
class EmailService {
  constructor() {
    const userEmail = process.env.GOOGLE_USER_EMAIL;
    const passEmail = process.env.GOOGLE_PASS_EMAIL;

    if (!userEmail || !passEmail) {
      throw new Error(
        "Gmail credentials not found. Set GOOGLE_USER_EMAIL and GOOGLE_PASS_EMAIL in .env file"
      );
    }

    this.transport = Nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: userEmail,
        pass: passEmail,
      },
    });

    this.fromEmail = process.env.EMAIL_FROM || userEmail;
    this.appName = "MILK LOGS";
  }

  /**
   * Send a generic email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @returns {Promise<Object>} Mail response
   */
  async sendEmail(to, subject, html) {
    try {
      const response = await this.transport.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      return {
        success: true,
        message: "Email sent successfully",
        data: response,
      };
    } catch (error) {
      throw {
        success: false,
        message: "Failed to send email",
        error: error.message,
      };
    }
  }

  /**
   * Send registration welcome email
   * @param {string} to - User email
   * @param {string} userName - User name
   * @returns {Promise<Object>}
   */
  async sendWelcomeEmail(to, userName) {
    const subject = `Welcome to ${this.appName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h2 style="color: #333;">Welcome to ${this.appName}!</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Thank you for joining us! Your account has been successfully created.</p>
          <p>You can now log in and start using all our features.</p>
          <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-left: 4px solid #0066cc;">
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Best regards,<br/>
            ${this.appName} Team
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send password reset OTP email
   * @param {string} to - User email
   * @param {string} otp - One-time password (reset code)
   * @param {string} userName - User name
   * @returns {Promise<Object>}
   */
  async sendOtpEmail(to, otp, userName) {
    const subject = `Your Password Reset Code - ${this.appName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h2 style="color: #d9534f;">Password Reset Code</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>We received a request to reset your password. Use the code below to set a new password. If you didn't make this request, you can ignore this email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 16px 32px; letter-spacing: 8px; font-size: 28px; font-weight: bold; color: #0066cc; background-color: #e8f4f8; border: 1px dashed #0066cc; border-radius: 6px;">
              ${otp}
            </div>
          </div>
          <p style="margin-top: 20px; color: #999; font-size: 12px;">This code will expire in 10 minutes.</p>
          <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ff9800;">
            <p style="margin: 0; color: #856404; font-size: 12px;">
              <strong>Security Tip:</strong> Never share this code with anyone. ${this.appName} staff will never ask for your password.
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send password reset confirmation email
   * @param {string} to - User email
   * @param {string} userName - User name
   * @returns {Promise<Object>}
   */
  async sendPasswordResetConfirmationEmail(to, userName) {
    const subject = `Password Changed Successfully - ${this.appName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h2 style="color: #28a745;">Password Changed Successfully</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Your password has been successfully changed. You can now log in with your new password.</p>
          <div style="margin-top: 30px; padding: 15px; background-color: #d4edda; border-left: 4px solid #28a745;">
            <p style="margin: 0; color: #155724;">
              If you didn't make this change, please contact our support team immediately.
            </p>
          </div>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Best regards,<br/>
            ${this.appName} Team
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send verification email
   * @param {string} to - User email
   * @param {string} verificationToken - Email verification token
   * @param {string} userName - User name
   * @returns {Promise<Object>}
   */
  async sendVerificationEmail(to, verificationToken, userName) {
    const verificationLink = `${process.env.APP_URL || "milkdin://"}/verify-email?token=${verificationToken}`;
    
    const subject = `Verify Your Email - ${this.appName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h2 style="color: #0066cc;">Email Verification</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Please verify your email address to complete your account setup.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Or copy and paste this link in your browser:<br/>${verificationLink}</p>
          <p style="margin-top: 20px; color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

/**
 * Verify email connection (test email)
 * @returns {Promise<boolean>}
 */
async verifyConnection() {
  try {
    await this.transport.verify();
    console.log("✓ Email service connected successfully");
    return true;
  } catch (error) {
    console.error("✗ Email service connection failed:", error.message);
    return false;
  }
}

/**
 * Check if email service is configured
 * @returns {boolean}
 */
isConfigured() {
  return (
    process.env.GOOGLE_USER_EMAIL &&
    process.env.GOOGLE_PASS_EMAIL
  );
}
}

// Create singleton instance with error handling
let emailService = null;

try {
  emailService = new EmailService();
} catch (error) {
  console.error("⚠ Email service initialization failed:", error.message);
  console.log("📧 Email will be disabled until credentials are configured in .env");
  
  // Create a fallback object that prevents crashes
  emailService = {
    sendEmail: async () => {
      throw new Error("Email service not configured. Please set GOOGLE_USER_EMAIL and GOOGLE_PASS_EMAIL in .env");
    },
    sendWelcomeEmail: async () => {
      throw new Error("Email service not configured. Please set GOOGLE_USER_EMAIL and GOOGLE_PASS_EMAIL in .env");
    },
    sendOtpEmail: async () => {
      throw new Error("Email service not configured. Please set GOOGLE_USER_EMAIL and GOOGLE_PASS_EMAIL in .env");
    },
    sendPasswordResetConfirmationEmail: async () => {
      throw new Error("Email service not configured. Please set GOOGLE_USER_EMAIL and GOOGLE_PASS_EMAIL in .env");
    },
    sendVerificationEmail: async () => {
      throw new Error("Email service not configured. Please set GOOGLE_USER_EMAIL and GOOGLE_PASS_EMAIL in .env");
    },
    verifyConnection: async () => {
      console.error("❌ Email service not configured");
      return false;
    },
    isConfigured: () => false,
  };
}

export default emailService;

