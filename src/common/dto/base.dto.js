import Joi from "joi";

class BaseDto {
  static schema = Joi.object({});
  // inherit from this class and override the schema to validate the data

  static validate(data) {
    const { error, value } = this.schema.validate(data, {
      abortEarly: false, // return all errors
      stripUnknown: true, // remove unknown keys
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return { errors, value: null };
    }

    return { errors: null, value };
  }
}

export default BaseDto;
