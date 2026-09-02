import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ChatDto extends BaseDto {
  static schema = Joi.object({
    message: Joi.string().trim().min(1).max(1000).required().messages({
      "string.empty": "Message must not be empty",
      "string.min": "Message must not be empty or whitespace only",
      "any.required": "Message is required",
    }),
  });
}

export default ChatDto;
