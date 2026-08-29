import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class UpdateProfileDto extends BaseDto {
  static schema = Joi.object({
    full_name: Joi.string().min(3).max(50).optional(),
    email: Joi.string().email().lowercase().optional(),
    current_password: Joi.string().optional(),
    new_password: Joi.string()
      .min(8)
      .max(30)
      .pattern(/^(?=.*[A-Z])(?=.*\d).+$/)
      .message("Password must contain at least 1 uppercase letter and 1 digit")
      .optional(),
  })
    .min(1)
    .messages({
      "object.min": "Please provide at least one detail to update",
    });
}

export default UpdateProfileDto;
