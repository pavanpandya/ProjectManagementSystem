const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");

const Project = require("../models/project");

// Get all projects
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get a single project
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(500).send("Server Error");
  }
});

// Create a project
router.post(
  "/",
  [
    auth,
    body("title", "Title is required").not().isEmpty(),
    body("description", "Description is required").not().isEmpty(),
    // body("start_date", "Start date is required").not().isEmpty(),
    // body("end_date", "End date is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, start_date, end_date, faculty_id, capacity } = req.body;
    // console.log(req.user);
    // console.log(req.user.userId);
    const leader = req.user.userId;
    try {
      const project = new Project({
        title,
        description,
        faculty_id,
        start_date,
        end_date,
        leader,
        capacity,
        students: [leader],
        status: "pending",
        invite_code: generateInviteCode(),
      });

      await project.save();

      res.json(project);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// generate invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Approve a project
router.post("/:id/approve", auth, async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    if (project.status !== "pending") {
      return res.status(400).json({ msg: "Project is not pending" });
    }
    // get role from user id
    const user = await User.findById(req.user.userId);
    // console.log(user);
    // only faculty can approve a project
    if (user.role !== "faculty") {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    project.status = "active";
    project.approved = true;

    await project.save();

    res.json(project);
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(500).send("Server Error");
  }
});

// Join a project
router.post("/:id/join", auth, async (req, res) => {
  const { id } = req.params;
  const inviteCode = req.body.inviteCode;

  try {
    const project = await Project.findById(id);

    // if student is already in a project, return error
    if (req.user.project_id) {
      return res.status(400).json({ msg: "You are already in a project" });
    }
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    if (project.status !== "active") {
      return res.status(400).json({ msg: "Project is not active" });
    }

    if (project.students.includes(req.user.userId)) {
      return res
        .status(400)
        .json({ msg: "You have already joined this project" });
    }

    // Check if the invite code matches the project's invite code
    if (inviteCode !== project.invite_code) {
      return res.status(400).json({ msg: "Invalid invite code" });
    }

    // Check if the project is full
    if (project.students.length >= project.capacity) {
      project.invite_code = null;
    }
    // regenerate invite code if project is not full
    else {
      project.invite_code = generateInviteCode();
    }

    project.students.push(req.user.userId);

    await project.save();

    res.json(project);
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(500).send("Server Error");
  }
});

// Remove a student from a project
router.delete("/:id/students/:student_id", auth, async (req, res) => {
  const { id, student_id } = req.params;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    if (
      project.leader.toString() !== req.user.userId &&
      req.user.role !== "faculty"
    ) {
      return res
        .status(401)
        .json({ msg: "Not authorized to remove a student from the project" });
    }

    const index = project.students.indexOf(student_id);

    if (index === -1) {
      return res.status(404).json({ msg: "Student not found in project" });
    }

    project.students.splice(index, 1);

    if (
      project.invite_code === null &&
      project.students.length < project.capacity
    ) {
      // Generate a new invite code if project is not full and invite code is null
      project.invite_code = generateInviteCode();
    }

    await project.save();

    res.json(project);
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.status(500).send("Server Error");
  }
});

// Generate an invite code for a project
router.post("/:id/generate-code", auth, async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    // Find the project
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }
    //get user role from user id
    const user = await User.findById(req.user.userId);

    // Check if user is authorized to generate invite code
    if (project.leader.toString() !== user.userId || user.role !== "faculty") {
      return res
        .status(401)
        .json({ msg: "Not authorized to generate invite code" });
    }

    // Generate invite code
    const inviteCode = generateInviteCode();

    // Save invite code to project
    project.invite_code = inviteCode;
    await project.save();

    res.status(200).json({ inviteCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Update a project by ID
router.put("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    if (
      project.leader.toString() !== req.user.userId &&
      req.user.role !== "faculty"
    ) {
      return res
        .status(401)
        .json({ msg: "Not authorized to update the project" });
    }

    const { title, description, maxStudents } = req.body;

    project.title = title;
    project.description = description;
    project.maxStudents = maxStudents;

    const updatedProject = await project.save();

    res.json(updatedProject);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Delete a project by ID
router.delete("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    if (
      project.leader.toString() !== req.user.userId &&
      req.user.role !== "faculty"
    ) {
      return res
        .status(401)
        .json({ msg: "Not authorized to delete the project" });
    }

    await project.remove();

    res.json({ msg: "Project removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// get project by student leader id
router.get("/leader/:id", auth, async (req, res) => {
  try {
    const project = await Project.find({ leader: req.params.id });
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// activate project
router.get(":id/active", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    // only leader can activate project
    if (project.leader.toString() !== req.user.userId) {
      return res
        .status(401)
        .json({ msg: "Not authorized to activate project" });
    }

    project.status = "active";
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
