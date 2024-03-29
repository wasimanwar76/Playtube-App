import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  changeCurrentPassword,
  getCurrentUser
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJsonWebToken } from "../middlewares/auth.middleware.js";
const route = Router();

route.post(
  "/user/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
route.post("/user/login", loginUser);
route.post("/user/logout", verifyJsonWebToken, logoutUser);
route.get("/user/refreshtoken", verifyJsonWebToken, refreshToken);
route.get("/user/profile", verifyJsonWebToken, getCurrentUser);
route.post("/user/change-password", verifyJsonWebToken, changeCurrentPassword);
export default route;
