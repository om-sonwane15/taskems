const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/user.models");
const { verifyToken, isAdmin } = require("../middleware/middleware");

//for employee details -by admin
router.post("/details", verifyToken, isAdmin, async (req, res) => {
    const { email, name, role, department } = req.body;
    if (!email || !name || !role || !department) {
        return res.status(400).json({ message: 'Please provide all required fields (email, name, role, department)' });
    }
    try {
        const employee = await User.findOne({ email });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found with this email' });
        }
        //update fields
        employee.name = name;
        employee.role = role;
        employee.department = department;
        await employee.save();
        res.status(200).json({ message: 'Employee updated successfully', employee });
    } catch (err) {
        res.status(500).json({ message: 'Error updating employee', details: err.message });
    }
});

//delete Employee (Admin-only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const employee = await User.findByIdAndDelete(id); // ✅ Updated line
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting employee', details: err.message });
    }
});

//update Employee (Admin-only)
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, role, department } = req.body;
    if (!name || !email || !role || !department) {
        return res.status(400).json({message: 'Please provide all required fields (name, email, role, department)'});
    }
    try {
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({message: 'Employee not found'});
        }
        //Update employee details
        employee.name = name;
        employee.email = email;
        employee.role = role;
        employee.department = department;
        await employee.save();
        res.status(200).json({message: 'Employee updated successfully', employee});
    } catch (err) {
        res.status(500).json({message: 'Error updating employee', details: err.message});
    }
});
module.exports = router;