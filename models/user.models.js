const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    password: {type: String, required: true},
    role: { type: String, enum: ["admin", "employee"], default: "employee"},
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department"},
    profilephoto: {type:String}
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
