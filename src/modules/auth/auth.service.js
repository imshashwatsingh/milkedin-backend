import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import postgres from "../../common/config/db.js";
import emailService from "../../common/utils/email.js";
// import  emailService  from "../../common/utils/emailInitializer.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ email, full_name, password }) => {
  const existingUserQuery = `SELECT id FROM users WHERE email = $1`;
  const existingUserResult = await postgres.query(existingUserQuery, [email]);
  if (existingUserResult.rows.length) {
    throw ApiError.badRequest("Email already in use");
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const defaultRole = "user";
  const insertUserQuery = `INSERT INTO users (email, full_name, password, role) VALUES ($1, $2, $3, $4) RETURNING id,email,full_name,role`;
  const insertUserResult = await postgres.query(insertUserQuery, [
    email,
    full_name,
    hashedPassword,
    defaultRole,
  ]);
  const user = insertUserResult.rows[0];

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user.email, user.full_name);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }

  return {
    user,
  };
};

const login = async ({ email, password }) => {
  // Find user by email
  const userQuery = `SELECT id,email,full_name,password,role FROM users WHERE email = $1`;
  const userResult = await postgres.query(userQuery, [email]);
  if (!userResult.rows.length) {
    throw ApiError.unauthorized("User not found");
  }
  const user = userResult.rows[0];

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized("Incorrect Email or Password");
  }

  // Generate tokens
  const accessToken = generateAccessToken({ id: user.id });
  const refreshToken = generateRefreshToken({ id: user.id });
  const hashedRefreshToken = hashToken(refreshToken);
  const updateRefreshTokenQuery = `UPDATE users SET refresh_token = $1 WHERE id = $2`;
  await postgres.query(updateRefreshTokenQuery, [hashedRefreshToken, user.id]);
  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

const logout = async (userId) => {
  const updateRefreshTokenQuery = `UPDATE users SET refresh_token = NULL WHERE id = $1`;
  await postgres.query(updateRefreshTokenQuery, [userId]);
};

const refreshToken = async (token) => {
  if (!token) {
    throw ApiError.unauthorized("No token provided");
  }
  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    throw ApiError.unauthorized("Invalid token");
  }
  const accessToken = generateAccessToken({ id: decoded.id });

  return {
    accessToken,
  };
};

const forgotPassword = async (email) => {
  const userResult = await postgres.query(
    `SELECT id,email,full_name FROM users WHERE email = $1`,
    [email]
  );

  if (!userResult.rows.length) {
    throw ApiError.unauthorized("User not found");
  }

  const user = userResult.rows[0];

  const tokens = generateResetToken();

  console.log("RAW:", tokens.rawToken);
  console.log("HASHED:", tokens.hashedToken);

  await postgres.query(
    `UPDATE users 
     SET reset_password_token = $1, 
         reset_password_expires = NOW() + INTERVAL '1 hour' 
     WHERE id = $2`,
    [tokens.hashedToken, user.id] 
  );

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user.email, user.full_name, tokens.rawToken);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }

  return { success: true, message: "If email exists, password reset link has been sent" };
};

const resetPassword = async ({ email, newPassword, rawToken }) => {
  const userResult = await postgres.query(
    `SELECT id, email, full_name, reset_password_token, reset_password_expires 
     FROM users WHERE email = $1`,
    [email],
  );

  if (!userResult.rows.length) {
    throw ApiError.unauthorized("User not found");
  }

  const user = userResult.rows[0];

  const hashedToken = hashToken(rawToken);
  console.log("RESET TOKEN:", rawToken);
  

  // console.log("---- DEBUG START ----");
  // console.log("RAW TOKEN:", rawToken);
  // console.log("HASHED INPUT:", hashToken(rawToken));
  // console.log("HASHED DB:", user.reset_password_token);
  // console.log(
  //   "TOKEN MATCH:",
  //   user.reset_password_token === hashToken(rawToken),
  // );

  // console.log("EXPIRY:", user.reset_password_expires);
  // console.log("NOW:", new Date());
  // console.log("IS EXPIRED:", new Date() > user.reset_password_expires);
  // console.log("---- DEBUG END ----");

  if (
    user.reset_password_token !== hashedToken ||
    !user.reset_password_expires ||
    new Date() > user.reset_password_expires
  ) {
    throw ApiError.unauthorized("Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await postgres.query("BEGIN");

  try {
    await postgres.query(
      `UPDATE users 
       SET password = $1,
           refresh_token = NULL,
           reset_password_token = NULL,
           reset_password_expires = NULL
       WHERE id = $2`,
      [hashedPassword, user.id],
    );

    await postgres.query("COMMIT");
  } catch (err) {
    await postgres.query("ROLLBACK");
    throw err;
  }

  try {
    await emailService.sendPasswordResetConfirmationEmail(
      user.email,
      user.full_name,
    );
  } catch (error) {
    console.error("Email failed:", error);
  }

  return { success: true, message: "Password reset successfully" };
};

export { register, login, logout, forgotPassword, resetPassword, refreshToken };
