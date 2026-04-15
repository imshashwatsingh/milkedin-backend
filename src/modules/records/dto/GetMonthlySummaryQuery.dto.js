import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class GetMonthlySummaryQueryDto extends BaseDto {
  static schema = Joi.object({
    month: Joi.string().regex(/^\d{4}-\d{2}$/).required(), // YYYY-MM format
  });
}

export default GetMonthlySummaryQueryDto;
