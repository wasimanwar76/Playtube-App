import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: ".env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT_NO, () => {
      console.log(`Server is listening on port no ${process.env.PORT_NO}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB db connection Failed |||", error);
  });
