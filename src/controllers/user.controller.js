import { ApiError } from "../utilities/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utilities/cloudinary.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import pkg from "jsonwebtoken";
import mongoose from "mongoose";
const { verify } = pkg;

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Error While generating Acessstoken and refresh token"
    );
  }
};
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

const loginUser = async (req, res) => {
  //req body => Data
  const { username, email, password } = req.body;
  //Username and Email
  if (!(email || username)) {
    throw new ApiError(400, "Email or Password Field is required");
  }
  if (!password) {
    throw new ApiError(404, "Password Field is required");
  }
  //find the user
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User Does not Exits!!");
  }
  //password check
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect");
  }
  //access and refresh token
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  //send Cookie
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken })
    );
};

const logoutUser = async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(200, {}, "User logged Out");
};

const refreshToken = async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(404, "Refresh Token Not Found");
    }
    const decodedToken = verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (!decodedToken) {
      throw new ApiError(401, "Invalid Refresh token");
    }
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(404, "User not Found");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(404, "Refresh is Expired Used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          accessToken,
          refreshToken,
          "Access Token and Refresh Token Generate"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
};

const changeCurrentPassword = async (req, res) => {
  const { currentPassword, changePassword, confirmChangePassword } = req.body;
  if (changePassword !== confirmChangePassword) {
    throw new ApiError(401, "Your Confirm password is not match");
  }
  const checkUser = await User.findById(req.user._id);
  if (!checkUser) {
    throw new ApiError(401, "Unauthorized user while changing a password");
  }
  const isPasswordcorrect = await checkUser.isPasswordCorrect(currentPassword);
  if (!isPasswordcorrect) {
    throw new ApiError(401, "Your current password is incorrect");
  }
  checkUser.password = changePassword;
  await checkUser.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password change Successfully"));
};

const getCurrentUser = async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
};

const getUserChannerProfile = async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: username.toLowerCase(),
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subcribtions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribeTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "subscribers",
        },
        channelSubscribedToCount: {
          $size: "subscribeTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount,
        channelSubscribedToCount,
        isSubscribed,
        avatar,
        coverImage,
        email,
      },
    },
  ]);
  console.log(channel);
  if (!channel?.length) {
    throw new ApiError(404, "Channel Does not Exists");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
};

const getWatchHistory = async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistor,
        "Watch History Fetched Successfully"
      )
    );
};
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  changeCurrentPassword,
  getCurrentUser,
  getUserChannerProfile,
  getWatchHistory
};
