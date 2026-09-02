---
name: dto-validation
description: Documents the DTO validation patterns using Joi and BaseDto in milk_logs_backend.
---

# DTO Validation Skill

Use when creating, modifying, or validating DTOs for request bodies and query strings. This skill covers the BaseDto pattern, Joi schema conventions, and validation middleware usage.

## When to Use

- Creating new DTOs for request validation
- Understanding existing DTO patterns
- Debugging validation errors
- Adding query parameter or body validation

## BaseDto Pattern

Every DTO extends `BaseDto` and overrides a static `schema` property:

```js
import BaseDto from "../../common/dto/base.dto.js";
import Joi from "joi";

class AddRecordDto extends BaseDto {
  static schema = Joi.object({
    categoryId: Joi.string().uuid().required(),
    quantity: Joi.number().positive().required(),
    record_date: Joi.date().iso().required(),
  });
}

export default AddRecordDto;
```

### Validation Options

The `BaseDto.validate(data)` method uses these Joi options:

- `abortEarly: false` — returns **all** validation errors (not just the first)
- `stripUnknown: true` — removes unknown keys from the validated value

### Return Value

`BaseDto.validate(data)` returns `{ errors, value }`:

- `errors` — array of error messages (or `null` if valid)
- `value` — validated/cleaned data object (or `null` if invalid)

### Example Usage in Controller

```js
import AddRecordDto from "../dto/AddRecord.dto.js";

// In controller handler:
const { errors, value } = AddRecordDto.validate(req.body);
if (errors) {
  throw ApiError.badRequest(errors.join(", "));
}
// Use value (has unknown keys stripped)
```

## DTO Conventions

- **Required fields** use `.required()` at the end of the chain
- **UUID fields** use `.string().uuid()` for validation
- **Positive numbers** use `.number().positive()`
- **ISO date strings** use `.date().iso()`
- Validation schemas are **strict** — unknown keys are stripped, extra fields cause validation failure (unless `stripUnknown` removes them)
- Each module has its own `dto/` directory with DTOs for that feature

## Common DTO Patterns

### Add Record DTO (records)

```js
class AddRecordDto extends BaseDto {
  static schema = Joi.object({
    categoryId: Joi.string().uuid().required(),
    quantity: Joi.number().positive().required(),
    record_date: Joi.date().iso().required(),
  });
}
```

### Query/Dashboard DTOs

Query string DTOs follow the same pattern but validate request query parameters:

```js
class GetRecordsQueryDto extends BaseDto {
  static schema = Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
  });
}
```