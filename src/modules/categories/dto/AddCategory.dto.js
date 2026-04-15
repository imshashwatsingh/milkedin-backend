import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class AddCategoryDto extends BaseDto {
  static schema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),

    current_price: Joi.number().positive().precision(2).required(),
  });
}

export default AddCategoryDto;
