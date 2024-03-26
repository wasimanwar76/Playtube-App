import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARYCLOUDNAME,
  api_key: process.env.CLOUDINARYAPIKEY,
  api_secret: process.env.CLOUDINARYAPISECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //Upload the file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File Upload Response", response);
    //file upload has been successfull
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //Remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

export { uploadOnCloudinary };
