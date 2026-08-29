import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";


class ResetPasswordDto extends BaseDto {
    static schema = Joi.object({
        email : Joi.string().email().lowercase().required(),
        otp : Joi.string().length(6).pattern(/^\d+$/).required()
            .messages({
                "string.length": "Reset code must be 6 digits",
                "string.pattern.base": "Reset code must contain only digits",
            }),
        password : Joi.string()
            .min(8)
            .max(30)
            .pattern(/^(?=.*[A-Z])(?=.*\d).+$/) 
            .message("Password must contain at least 1 uppercase letter and 1 digit")
            .required(),
    });
}

export default ResetPasswordDto;