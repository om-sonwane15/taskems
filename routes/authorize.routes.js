const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../models/user.models");
const { verifyToken, generateToken, isAdmin } = require('../middleware/middleware');
const { MailtrapTransport } = require("mailtrap");
const router = express.Router();

//for self registration
//register a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (role === "admin") {                                     //check if there is already an admin in the system
      const existingAdmin = await User.findOne({role: "admin"});
      if (existingAdmin) {
        return res.status(400).json({error: "There can only be one admin"});
      }
    }
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).json({error: "Email already registered"});
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({email, password: hashedPassword, role});
    res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id,
    });
  }catch (err){
    res.status(500).json({ error: "Error registering user", details: err.message });
  }
});

//login a user
router.post("/login", async (req, res) =>{
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email});
    if (!user) return res.status(400).json({error: "Invalid email"});
    //Compare passwords
    if (!user) return res.status(400).json({error: "Invalid email"});
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({error: "Invalid password"});
    const token = generateToken(user, "3h");                 
    res.status(200).json({message: "Login successful", token});
  } catch (err) {
    res.status(500).json({error: "Error during login", details: err.message});
  }
});

//temporary store for reset tokens
const resetTokens = {};
//forgot password route (Sends reset token to the user's email)
router.post("/forgot", async (req, res) =>{
  try{
    const { email } = req.body;
    const user = await User.findOne({email});             
    if (!user) return res.status(400).json({ error: "User not found" });

    //Generate a reset token
    const resetToken = generateToken(user, "60m");  //used for new token and storing it in global varible 
    resetTokens[user.email] = resetToken;

    const transporter = nodemailer.createTransport({   //used for smtp,reusable transporter object
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,                                      
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    await transporter.sendMail({                                                                
      from: process.env.TEST_EMAIL || "adminuser@gmail.com",
      to: email,
      subject: "Password reset",
      text: `${resetToken}`,
    });
    res.status(200).json({message:"Password reset link has been sent to mail."});
  } catch (err){
    res.status(500).json({
      error: "Error processing forgot password request",
      details: err.message,
    });
  }
});

//reset password route (Allows user to reset password using the token)
router.post("/reset", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    //check if all required fields are provided
    if (!email || !token || !newPassword)
      return res.status(400).json({msg: "Missing required fields"});

    //find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({msg: "User not found"});
    const decoded = jwt.verify(token, process.env.JWT_SECRET);       //verify the reset token
    if (decoded.email !== email)
      return res.status(400).json({msg: "Token does not match the email"});

    //check if the reset token is valid or expired
    if (!resetTokens[email] || resetTokens[email] !== token){
      return res.status(400).json({msg: "Invalid or expired token"});
    }
    user.password = await bcrypt.hash(newPassword, 10);    //hash the new password and update the user's password
    await user.save();
    delete resetTokens[email];                            //delete the reset token after use
    res.status(200).json({msg:"Password reset successful"});
  } catch (error) {
    res.status(500).json({message:"Error resetting password"});
  }
});

//fetch all users (only accessible to admins) 
router.get("/employee", verifyToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Build search query (search by name or email)
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const totalUsers = await User.countDocuments(searchQuery);

    const users = await User.find(searchQuery)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select("-password"); // exclude password for security

    res.status(200).json({
      totalUsers,
      page: pageNum,
      totalPages: Math.ceil(totalUsers / limitNum),
      users
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching users",
      details: err.message
    });
  }
});

//can be accessed by any logged-in user (not just admins)
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user);
    } catch (err) {
        res.status(500).json({message: 'Error fetching user profile', details: err.message});
    }
});

module.exports = router;