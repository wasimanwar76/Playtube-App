import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueValue = Date.now().toLocaleString();
    cb(null, file.originalname + "-" + uniqueValue);
  },
});

export const upload = multer({
  storage,
});