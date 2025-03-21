const express = require("express");
const mongoose = require('mongoose'); 
const cors = require("cors");
const employeeRoutes = require("./routes/employee.routes");
const filesupload = require("./routes/profilephoto");
const departmentRoutes = require("./routes/department.routes");
const authorizeRoutes = require("./routes/authorize.routes"); 
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB Connection Error:", err));

//routes
app.get("/", (req, res)=>{
  res.send("Server is running");
});

app.use("/api/profilephoto", filesupload);
app.use("/api/authorize", authorizeRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api", departmentRoutes);

app.listen(port, () => console.log(`server is working http://localhost:${port}`));