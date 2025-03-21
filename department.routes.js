const express = require("express");
const router = express.Router();
const User = require("../models/user.models");
const Department = require("../models/department.models");
const jwt = require("jsonwebtoken");
const { verifyToken, isAdmin } = require("../middleware/middleware");
const { Admin } = require("mongodb");

//get employees
router.get("/all",verifyToken , async(req,res)=>{
  try {   
    const employee =await User.find();
    // const query {role:"Admin"};         //i want
    // if(!role==Admin)
    res.status(200).json({message:"list is",employee});
  } catch (error) {
    res.status(500).json({message:"error",error});
  }

});

//add Department (Admin-only)
router.post("/adddept", verifyToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({message: "Department name is required"});
  }
  try{  //check if department already exists
    const existingDept = await Department.findOne({name: name.trim()});
    if (existingDept) {
      return res.status(400).json({message: "Department is already registered"});
    }
    const newDepartment = new Department({name: name.trim()});
    await newDepartment.save();
    res.status(201).json({message: "Department created successfully",department: newDepartment,});
  } catch (err){
    console.error("Error creating department:", err);
    res.status(500).json({
      message: "Error creating department",
      details: err.message,
    });
  }
});

//delete Department (Admin-only) - with check for employees
router.delete("/dept/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }
    //check if there are employees in the department
    const employeesInDepartment = await User.find({ department: id });
    if (employeesInDepartment.length > 0) {
      return res.status(400).json({ message: "Cannot delete department, employees are assigned to it." });
    }
    //delete the department using deleteOne()
    await Department.deleteOne({ _id: id });
    res.status(200).json({ message: "Department deleted successfully" });
  } catch (err) {
    console.error("Error deleting department:", err); 
    res.status(500).json({
      message: "Error deleting department",
      details: err.message,
    });
  }
});
module.exports = router;