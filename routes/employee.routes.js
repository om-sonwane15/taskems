const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/user.models");
const { verifyToken, isAdmin } = require("../middleware/middleware");

//employee list all
router.get("/all", verifyToken, async (req, res) =>{
    try{
        const employees = await User.find({role:"employee"}).select("-password");
        res.status(200).json({message:"Employee list:",employees});
    }catch(error){
        res.status(500).json({message:"Error in fetching employees",error:error.message});
    }
});

//employee list(with pagination)
router.get("/emplist", verifyToken, async (req, res)=>{
    try{
        const {page = 1, limit = 10, search = ""} = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const searchQuery = search
           ?{
             $or:[
                 {name:{$regex: search, $options: "i"}},
                 {email:{$regex: search, $options: "i"}}
             ]
           }
           :{};
        const query = {role: {$ne: "admin" }, ...searchQuery};
        const totalEmployees = await User.countDocuments(query);
        const employees = await User.find(query)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .select("-password");
        res.status(200).json({totalEmployees,page: pageNum,employees});
    }catch (err){
        res.status(500).json({message:"Error in fetching employees", details: err.message});
    }
});

//delete Employee (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) =>{
    const { id } = req.params;
    try {
        const employee = await User.findByIdAndDelete(id);
        if (!employee) {
            return res.status(404).json({message:"Employee not found"});
        }
        res.status(200).json({message:"Employee deleted successfully"});
    } catch (err) {
        res.status(500).json({message:"Error in deleting employee", details: err.message});
    }
});

//employees to update their profile
router.put("/updateprofile", verifyToken, async (req, res) =>{
   try{
       const { name, email, department } = req.body;
       if (!name || !email || !department) {
           return res.status(400).json({message:"fields are required (name, email, department)"});
       }
       const user = await User.findById(req.user.id);
       if (!user) {
           return res.status(404).json({message:"User not found"});
       }
       user.name = name;
       user.email = email;
       user.department = department;
       await user.save();
       res.status(200).json({message:"Profile updated successfully", user});
   }catch (err){
       res.status(500).json({message:"Error updating profile", details: err.message});
   }
});
module.exports = router;
