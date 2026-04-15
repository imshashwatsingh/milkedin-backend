import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";


class ResetPasswordDto extends BaseDto {
    static schema = Joi.object({
        email : Joi.string().email().lowercase().required(),
        password : Joi.string()
            .min(8)
            .max(30)
            .pattern(/^(?=.*[A-Z])(?=.*\d).+$/) 
            .message("Password must contain at least 1 uppercase letter and 1 digit")
            .required(),
    });
}

export default ResetPasswordDto;