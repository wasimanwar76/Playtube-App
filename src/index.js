import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: ".env",
});
const app = express();


connectDB();
app.listen(process.env.PORT_NO, () => {
  console.log(`APP is listening on port no ${process.env.PORT_NO}`);
});