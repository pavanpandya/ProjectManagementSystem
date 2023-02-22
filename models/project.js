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
  report_uploded: {
    type: Boolean,
    default: false,
  },
  repository_link: {
    type: String,
    default: "",
  },
  report_link: {
    type: String,
    default: "",
  },
  presentation_link: {
    type: String,
    default: "",
  },
});


module.exports = mongoose.model("Project", projectSchema);
