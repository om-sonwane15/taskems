const jwt = require("jsonwebtoken");
const User = require("../models/user.models"); 

//middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({error: "Access Denied: No token provided"});
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);    //verify the token
    req.user = decoded;                     //attach user info to the request object
    next();  
  } catch (err) {
    res.status(401).json({error: "Invalid or expired token"});
  }
};

// Middleware to check if user is an admin
const isAdmin = async (req, res, next) =>{
  try {
    const user = await User.findById(req.user.id);    //fetch the user from the database using the ID from the token
    if (!user || user.role !== "admin") {               //check if user exists and has the admin role
      return res.status(403).json({message:"Access Denied: Admins Only"});
    }
    next();
  } catch (err) {
    console.error("Error in isAdmin middleware:", err);  
    res.status(500).json({message: "Server Error"});
  }
};

const generateToken = (user) =>{
  return jwt.sign(
    { id: user._id, email: user.email }, 
    process.env.JWT_SECRET, 
    { expiresIn: "3h" }  
  );
};
module.exports = { verifyToken, generateToken, isAdmin };