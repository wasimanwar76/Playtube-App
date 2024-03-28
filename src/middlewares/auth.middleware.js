import pkg from "jsonwebtoken";
import { ApiError } from "../utilities/ApiError.js";
import { User } from "../models/user.model.js";
const { verify } = pkg;

const verifyJsonWebToken = async (req, res, next) => {
  try {
    let extractToken;
    console.log(extractToken);
    if (req.cookies || req.headers.authorization) {
      if (req.cookies.accessToken) {
        extractToken = req.cookies.accessToken;
      }
      if (req.headers.authorization) {
        extractToken = req.headers.authorization.replace("Bearer ", "");
      }
    }
    if (!extractToken) {
      throw new ApiError(401, "Unauthorized Request");
    }
    const decodedToken = verify(
      extractToken,
      process.env.ACCESS_TOKEN_SECRET
    );
    if (!decodedToken) {
      throw new ApiError(401, "Invalid Token");
    }
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized Request");
  }
};

export { verifyJsonWebToken };
