import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class RegisterDto extends BaseDto {
    static schema = Joi.object({
        name : Joi.string().min(3).max(50).required(),
        email : Joi.string().email().lowercase().required(),
        password : Joi.string()
            .min(8)
            .max(30)
            .pattern(/^(?=.*[A-Z])(?=.*\d).+$/) 
            .message("Password must be of min 8 characters and contain at least 1 uppercase letter and 1 digit")
            .required(),
    });
}

export default RegisterDto;