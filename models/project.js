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
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: undefined,
    required: false, // change to true later
  },
  faculty_approval: {
    type: Boolean,
    default: false,
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
    enum: ["active", "pending", "inactive", "completed", "rejected", "approved"],
    default: "inactive",
  },
  invite_code: {
    type: String,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  capacity: {
    type: Number,
    default: 4,
  },
});


module.exports = mongoose.model("Project", projectSchema);
