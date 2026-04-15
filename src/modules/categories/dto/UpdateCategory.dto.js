import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class UpdateCategoryDto extends BaseDto {
  static schema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),

    current_price: Joi.number().positive().precision(2).optional(),
  }).min(1); // At least one field must be provided for update
}

export default UpdateCategoryDto;
