import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class UpdateRecordDto extends BaseDto {
  static schema = Joi.object({
    categoryId: Joi.number().integer().positive().optional(),

    quantity: Joi.number().positive().precision(2).optional(),

    record_date: Joi.date().iso().optional(),
  }).min(1); // At least one field must be provided for update
}

export default UpdateRecordDto;
