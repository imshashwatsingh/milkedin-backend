import emailService from "./email.js";

/**
 * Initialize and verify email service on app startup
 */
export async function initializeEmailService() {
  console.log("\n📧 Initializing Email Service...");

  if (!emailService.isConfigured || !emailService.isConfigured()) {
    console.warn("⚠️  Email service not configured. Skipping verification.");
    console.info("📝 To enable email, add these to your .env file:");
    console.info("   GOOGLE_USER_EMAIL=your_email@gmail.com");
    console.info("   GOOGLE_PASS_EMAIL=your_app_password");
    return false;
  }

  const isConnected = await emailService.verifyConnection();
  
  if (isConnected) {
    console.log("✅ Email service ready\n");
    return true;
  } else {
    console.warn("⚠️  Email service verification failed. Check your credentials.\n");
    return false;
  }
}

export default emailService;
