const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/user.models");
const router = express.Router();
const { verifyToken } = require("../middleware/middleware");

//set up storage for multer
const storage = multer.diskStorage({destination: (req, file, cb) =>{
    cb(null, "profilepics");
  },filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const allowedTypes = {jpeg: "image/jpeg", jpg: "image/jpg", png: "image/png"}; //allowed file formats

//multer limit (5MB file size)
const upload = multer({storage: storage, limits: { fileSize: 5 * 1024 * 1024 }, //5MB limit
  fileFilter: (req, file, cb) => {
    const fileFormat = req.body.fileFormat; //to get file format from request body
    if (!fileFormat || !allowedTypes[fileFormat]) {
      return cb(new Error("Invalid file format,Specify 'fileFormat' as 'jpeg', 'jpg', or 'png'"));
    }
    if (file.mimetype !== allowedTypes[fileFormat]){  //miindicate type file sent or recieved
      return cb(new Error(`File type mismatch! Expected ${fileFormat.toUpperCase()} but received ${file.mimetype}`));
    }
    cb(null, true); //accept file
  }
});

//upload or update profilephoto
router.post("/uploadpic", verifyToken, (req, res) =>{
  upload.single("profilep")(req, res, async (err) =>{
      try {
          if (err instanceof multer.MulterError){
              if (err.code === "LIMIT_FILE_SIZE"){
                  return res.status(400).json({message: "File size exceeded (max 5MB)"});
              }
          }
          if (err){
              return res.status(400).json({message: err.message});
          }
          if (!req.file){
              return res.status(400).json({message:"No file uploaded or invalid format"});
          }
          const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user){
        return res.status(404).json({message:"User not found"});
      }
      const newFilePath = `profilepics/${req.file.filename}`;
      //check if the uploaded photo is same as existing one (same filename)
      if (user.profilephoto && path.basename(user.profilephoto) === req.file.filename){
        //delete the newly uploaded duplicate file since it's not needed
        const duplicateFilePath = path.join(__dirname, "../", newFilePath);
        if (fs.existsSync(duplicateFilePath)){
          fs.unlinkSync(duplicateFilePath);
        }
        return res.status(200).json({message:"Profile photo already uploaded so no changes made",filePath: user.profilephoto});
      }
      if (user.profilephoto){
        const oldFilePath = path.join(__dirname, "../", user.profilephoto);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      user.profilephoto = newFilePath;         //save new photo
      await user.save();  
      res.status(200).json({message:"Profile photo uploaded successfully",filePath: newFilePath});
    } catch (error){
      res.status(500).json({message:"Error in uploading photo",details: error.message});
    }
  });
});

//profile photo
router.get("/download", verifyToken, async (req, res) =>{
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user || !user.profilephoto){
      //check if the user exits and has a profile photo
      return res.status(404).json({message: "profile photo not found"});
    }
    const filePath = path.join(__dirname, "../", user.profilephoto);
    if (!fs.existsSync(filePath)){
      return res.status(404).json({message: "profile image file not found"});
    }
    res.sendFile(filePath); //sends image as file res
  } catch (err){
    res.status(500).json({message: "error retrieving profilephoto", details: err.message});
  }
});
module.exports = router;
