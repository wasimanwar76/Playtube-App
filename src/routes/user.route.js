import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
const route = Router();

route.get("/register", registerUser);
export default route;
