const mongoose = require("mongoose");
const profileSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    profile_picture: String,
    bio_short_intro: String,
},
{timestamps: true});

module.exports = mongoose.model("Profile", profileSchema);