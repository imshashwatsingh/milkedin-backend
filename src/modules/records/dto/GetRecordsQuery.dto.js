import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class GetRecordsQueryDto extends BaseDto {
  static schema = Joi.object({
    startDate: Joi.date().iso().optional(),

    endDate: Joi.date().iso().optional(),
  });
}

export default GetRecordsQueryDto;
