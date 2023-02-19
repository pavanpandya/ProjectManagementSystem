const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const { json } = require("express");

const Kanboard = require("../models/kanboard");

// Get the kanboard for a project
// Only project members and faculty members can see the kanboard
router.get("/:project_id/kanboard", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.project_id);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    // Check if the user is a member of the project or a faculty member
    if (!project.members.includes(req.user.userId) && req.user.role !== "faculty") {
      return res
        .status(401)
        .json({ msg: "Not authorized to view the kanboard" });
    }

    // Retrieve the kanboard for the project
    const kanboard = await Kanboard.findOne({
      project_id: req.params.project_id,
    });

    if (!kanboard) {
      return res.status(404).json({ msg: "Kanboard not found" });
    }

    return res.json(kanboard);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Create a new kanboard for a project
// Only student members can create a kanboard
router.post("/:project_id/kanboard", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.project_id);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    // Check if the user is a student member of the project
    if (!project.members.includes(req.user.userId) || req.user.role !== "student") {
      return res
        .status(401)
        .json({ msg: "Not authorized to create a kanboard" });
    }

    // Create the kanboard
    const newKanboard = new Kanboard({
      project_id: req.params.project_id,
      title: req.body.title,
      description: req.body.description,
      columns: [],
    });

    const kanboard = await newKanboard.save();

    return res.json(kanboard);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Update an existing kanboard for a project
// Only student members can update a kanboard
router.put("/:project_id/kanboard", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.project_id);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    // Check if the user is a student member of the project
    if (!project.members.includes(req.user.userId) || req.user.role !== "student") {
      return res
        .status(401)
        .json({ msg: "Not authorized to update the kanboard" });
    }

    const kanboard = await Kanboard.findOne({
      project_id: req.params.project_id,
    });

    if (!kanboard) {
      return res.status(404).json({ msg: "Kanboard not found" });
    }

    // Update the kanboard
    kanboard.title = req.body.title;
    kanboard.description = req.body.description;

    const updatedKanboard = await kanboard.save();

    return res.json(updatedKanboard);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Delete an existing kanboard for a project
// Only student members can delete a kanboard
router.delete("/:boardId", auth, async (req, res) => {
  try {
    const kanboard = await Kanboard.findById(req.params.boardId);

    if (!kanboard) {
      return res.status(404).json({ msg: "Kanboard not found" });
    }

    // Only project members can delete the kanboard
    if (!kanboard.members.includes(req.user.userId)) {
      return res
        .status(401)
        .json({ msg: "Not authorized to delete the kanboard" });
    }

    await kanboard.remove();

    res.json({ msg: "Kanboard removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;