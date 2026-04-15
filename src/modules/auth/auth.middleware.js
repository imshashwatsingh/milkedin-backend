import ApiError from "../../common/utils/api-error.js";
import postgres from "../../common/config/db.js";
import { verifyAccessToken } from "../../common/utils/jwt.utils.js";

const authenticate = async (req, res, next) => {

    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return next(ApiError.unauthorized("No token provided"));
    } 

    const token = authHeader.split(" ")[1];

    const decoded = verifyAccessToken(token);

    if(!decoded){
        return next(ApiError.unauthorized("Invalid token"));
    }

    const userResult = await postgres.query("SELECT id,email,full_name,role FROM users WHERE id = $1", [decoded.id]);

    if(!userResult.rows.length){
        return next(ApiError.unauthorized("User not found"));
    }

    req.user = userResult.rows[0];

    next();

}

export {authenticate}