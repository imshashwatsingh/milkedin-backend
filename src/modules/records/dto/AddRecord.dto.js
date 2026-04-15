import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

class AddRecordDto extends BaseDto {
  static schema = Joi.object({
    categoryId: Joi.number().integer().positive().required(),

    quantity: Joi.number().positive().precision(2).required(),

    record_date: Joi.date().iso().required(),
  });
}

export default AddRecordDto;
