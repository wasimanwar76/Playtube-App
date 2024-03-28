import { ApiError } from "../utilities/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utilities/cloudinary.js";
import { ApiResponse } from "../utilities/ApiResponse.js";

const registerUser = async (req, res) => {
  // Get User data from Frontend
  const { fullname, email, username, password } = req.body;
  // Validation - not Empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required");
  }
  // Check if User already exists :username and email
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User already exists!");
  }
  // check for images, check for avatar
  let avatarLocalPath;
  let coverImageLocalPath;
  if (req.files) {
    if (req.files.avatar) {
      avatarLocalPath = req.files.avatar[0].path;
    }
    if (req.files.coverImage) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is required");
  }
  // upload them to cloudinary, avatar
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  let coverImageResponse;
  if (coverImageLocalPath) {
    coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
  }
  if (!avatarResponse) {
    throw new ApiError(409, "Avatar Field is required");
  }
  //   Create user object
  const user = await User.create({
    fullname,
    email,
    username,
    password,
    avatar: avatarResponse.url,
    coverImage: coverImageResponse?.url || "",
  });
  //   remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //   check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something Went Wrong While Registered");
  }
  //   return response;
  const data = new ApiResponse(
    201,
    createdUser,
    "User Registered Successfully"
  );
  return res.status(201).json(data);
};

export { registerUser };
