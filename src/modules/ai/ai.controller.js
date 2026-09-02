import * as aiService from "./ai.service.js";
import ApiResponse from "../../common/utils/api-response.js";

export const chat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;
    const result = await aiService.chat({ userId, message });
    return ApiResponse.ok(res, "AI response generated successfully", result);
  } catch (err) {
    next(err);
  }
};
