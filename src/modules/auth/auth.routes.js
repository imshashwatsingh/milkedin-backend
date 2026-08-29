import { Router } from "express";
import * as authController from "./auth.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";
import ForgotPasswordDto from "./dto/forgot-password.dto.js";
import UpdateProfileDto from "./dto/update-profile.dto.js";
import ResetPasswordDto from "./dto/reset-password.dto.js";
import { authenticate } from "./auth.middleware.js";
  
const router = Router();

// working
router.post("/register", validate(RegisterDto), authController.register);

// working
router.post("/login", validate(LoginDto), authController.login);

// working
router.post("/logout", authenticate, authController.logout);

// working
router.post(
  "/forgot-password",
  validate(ForgotPasswordDto),
  authController.forgotPassword,
);

//
router.post(
  "/reset-password",
  validate(ResetPasswordDto),
  authController.resetPassword,
);

router.post("/refresh-token", authController.refreshToken);

router.get("/me", authenticate, authController.getMe);

router.put(
  "/profile",
  authenticate,
  validate(UpdateProfileDto),
  authController.updateProfile,
);

export default router;
