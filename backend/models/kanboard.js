const mongoose = require("mongoose");

const KanboardSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Project",
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  columns: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
    },
  ],
});

const Kanboard = mongoose.model("Kanboard", KanboardSchema);

module.exports = Kanboard;
