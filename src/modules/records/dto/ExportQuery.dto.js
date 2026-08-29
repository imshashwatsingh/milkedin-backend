import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ExportQueryDto extends BaseDto {
  static schema = Joi.object({
    startDate: Joi.date().iso().optional(),

    endDate: Joi.date().iso().optional(),

    format: Joi.string().valid("pdf", "excel").optional().default("pdf"),
  });
}

export default ExportQueryDto;
