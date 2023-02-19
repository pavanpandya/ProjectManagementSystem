const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  faculty_approval: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  start_date: {
    type: Date,
    required: false,
  },
  end_date: {
    type: Date,
    required: false,
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  status: {
    type: String,
    enum: ["active", "pending", "inactive", "completed"],
    default: "inactive",
  },
  invite_code: {
    type: String,
  },
  approved: {
    type: Boolean,
    default: false,
  },
});


module.exports = mongoose.model("Project", projectSchema);
