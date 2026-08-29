import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import postgres from "../../common/config/db.js";
import emailService from "../../common/utils/email.js";
// import  emailService  from "../../common/utils/emailInitializer.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

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
    [email],
  );

  // Always respond identically so we never reveal whether an account exists.
  if (!userResult.rows.length) {
    return {
      success: true,
      message: "If email exists, a password reset code has been sent",
    };
  }

  const user = userResult.rows[0];

  const otp = generateOtp();

  await postgres.query(
    `UPDATE users 
     SET reset_otp = $1, 
         reset_otp_expires = NOW() + INTERVAL '10 minutes' 
     WHERE id = $2`,
    [otp, user.id],
  );

  // Send the reset code by email
  try {
    await emailService.sendOtpEmail(user.email, otp, user.full_name);
  } catch (error) {
    console.error("Failed to send password reset OTP:", error);
  }

  return {
    success: true,
    message: "If email exists, a password reset code has been sent",
  };
};

const resetPassword = async ({ email, newPassword, otp }) => {
  const userResult = await postgres.query(
    `SELECT id, email, full_name, reset_otp, reset_otp_expires 
     FROM users WHERE email = $1`,
    [email],
  );

  if (!userResult.rows.length) {
    throw ApiError.unauthorized("User not found");
  }

  const user = userResult.rows[0];

  if (
    !user.reset_otp ||
    user.reset_otp !== otp ||
    !user.reset_otp_expires ||
    new Date() > user.reset_otp_expires
  ) {
    throw ApiError.unauthorized("Invalid or expired reset code");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await postgres.query("BEGIN");

  try {
    await postgres.query(
      `UPDATE users 
       SET password = $1,
           refresh_token = NULL,
            reset_otp = NULL,
            reset_otp_expires = NULL
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

const updateProfile = async ({
  userId,
  full_name,
  email,
  current_password,
  new_password,
}) => {
  // Deep guard: email is intentionally read-only and must never be changed
  // through this endpoint, even if a client sends it in the payload.
  if (email !== undefined) {
    throw ApiError.badRequest("Email address cannot be changed.");
  }

  const userResult = await postgres.query(
    `SELECT id, email, full_name, password, role FROM users WHERE id = $1`,
    [userId],
  );

  if (!userResult.rows.length) {
    throw ApiError.unauthorized("User not found");
  }

  const user = userResult.rows[0];
  const updates = {};

  if (full_name !== undefined) {
    updates.full_name = full_name;
  }

  if (new_password !== undefined) {
    if (!current_password) {
      throw ApiError.badRequest(
        "Your current password is required to set a new password",
      );
    }
    const isCurrentValid = await bcrypt.compare(current_password, user.password);
    if (!isCurrentValid) {
      throw ApiError.badRequest("Your current password is incorrect");
    }
    updates.password = await bcrypt.hash(new_password, 12);
  }

  if (Object.keys(updates).length === 0) {
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  const setClauses = [];
  const values = [];
  let paramIndex = 1;
  for (const [column, value] of Object.entries(updates)) {
    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex += 1;
  }
  values.push(userId);

  await postgres.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
    values,
  );

  const updatedResult = await postgres.query(
    `SELECT id, email, full_name, role FROM users WHERE id = $1`,
    [userId],
  );
  const updated = updatedResult.rows[0];

  return {
    user: {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      role: updated.role,
    },
  };
};

export {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  refreshToken,
  updateProfile,
};

