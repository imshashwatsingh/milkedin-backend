import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";

/**
 * Register a new user
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  const result = await authService.register({
    email,
    full_name: name,
    password,
  });

  return ApiResponse.created(
    res,
    "User registered successfully",
    result
  );
};

/**
 * Login user
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login({
    email,
    password,
  });

  return ApiResponse.ok(
    res,
    "Login successful",
    result
  );
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  const userId = req.user.id;

  await authService.logout(userId);

  return ApiResponse.ok(
    res,
    "Logout successful"
  );
};

/**
 * Forgot password - send reset link
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  await authService.forgotPassword(email);

  return ApiResponse.ok(
    res,
    "If email exists, password reset link has been sent"
  );
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
  const { email, password} = req.body;
  const { token } = req.query;

  await authService.resetPassword({
    email,
    newPassword: password,
    rawToken: token,
  });

  return ApiResponse.ok(
    res,
    "Password reset successfully"
  );
};

/**
 * Verify email (placeholder for future implementation)
 */
// const verifyEmail = async (req, res) => {
//   const { token } = req.body;

//   // TODO: Implement email verification logic
//   // This would involve:
//   // 1. Verifying the token
//   // 2. Marking user as verified in database
//   // 3. Returning success response

//   return ApiResponse.ok(
//     res,
//     "Email verification feature coming soon"
//   );
// };

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;

  const result = await authService.refreshToken(token);

  return ApiResponse.ok(
    res,
    "Access token refreshed",
    result
  );
};

export {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  refreshToken,
};