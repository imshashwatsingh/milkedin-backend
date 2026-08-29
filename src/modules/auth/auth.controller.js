import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await authService.logout(userId);

    return ApiResponse.ok(
      res,
      "Logout successful"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - send reset code (OTP)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    await authService.forgotPassword(email);

    return ApiResponse.ok(
      res,
      "If email exists, a password reset code has been sent"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, password, otp } = req.body;

    await authService.resetPassword({
      email,
      newPassword: password,
      otp,
    });

    return ApiResponse.ok(
      res,
      "Password reset successfully"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    const result = await authService.refreshToken(token);

    return ApiResponse.ok(
      res,
      "Access token refreshed",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update the signed-in user's profile (name, email and/or password)
 */
const updateProfile = async (req, res, next) => {
  try {
    const { full_name, email, current_password, new_password } = req.body;

    const result = await authService.updateProfile({
      userId: req.user.id,
      full_name,
      email,
      current_password,
      new_password,
    });

    return ApiResponse.ok(res, "Profile updated successfully", result);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    return ApiResponse.ok(
      res,
      "User data retrieved",
      req.user
    );
  } catch (error) {
    next(error);
  }
};

export {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  refreshToken,
  updateProfile,
};