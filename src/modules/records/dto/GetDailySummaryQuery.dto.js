import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class GetDailySummaryQueryDto extends BaseDto {
  static schema = Joi.object({
    date: Joi.date().iso().required(),
  });
}

export default GetDailySummaryQueryDto;
