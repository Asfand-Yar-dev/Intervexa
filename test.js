const mongoose = require ("mongoose");

mongoose.connect("mongodb://localhost:27017/ai_interview_system")
.then(() => console.log("MongoDb connected"))
.catch((err) => console.error(err));
