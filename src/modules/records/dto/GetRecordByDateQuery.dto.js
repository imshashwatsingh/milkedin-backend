import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class GetRecordByDateQueryDto extends BaseDto {
  static schema = Joi.object({
    date: Joi.date().iso().required(),
  });
}

export default GetRecordByDateQueryDto;
