const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const multer = require("multer");
const csvtojson = require("csvtojson");
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only csv files
    if (!file.originalname.match(/\.(csv)$/)) {
      return cb(new Error("Please upload a CSV file."));
    }
    cb(null, true);
  },
});

const User = require("../models/user");

// User login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }

    // If the user has not changed their password yet, prompt them to do so
    if (!user.passwordChanged) {
      return res.status(200).json({
        message:
          "Please change your password by calling the /api/users/change-password route",
        email: user.email,
        role: user.role,
        name: user.name,
        passwordChanged: user.passwordChanged,
      });
    }

    // Compare password hash with user password
    const passwordMatch = await bcrypt.compare(password, user.password);

    // If password doesn't match, return an error
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token for user
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    res.status(200).json({ message: "Login successful", token , email: user.email, role: user.role, name: user.name, passwordChanged: user.passwordChanged});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//change password
router.post("/change-password", async (req, res) => {
  const { email, password, newPassword } = req.body;
  try {
    // Find user by email
    const user = await User.findOne({ email });
    // console.log(user);
    // If user doesn't exist, return an error
    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }

    // check default password which is not hashed
    if (password === process.env.DEFAULT_PASSWORD) {
      // Hash user password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      const passwordChanged = true;
      // update password
      user.password = hashedPassword;
      user.passwordChanged = passwordChanged;

      // Save new user to database
      await user.save();

      res.status(201).json({ message: "Password changed" });
    } else {
      // Compare password hash with user password
      const passwordMatch = await bcrypt.compare(password, user.password);

      // If password doesn't match, return an error
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      // Hash user password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      const passwordChanged = true;
      // update password
      user.password = hashedPassword;
      user.passwordChanged = passwordChanged;

      // Save new user to database
      await user.save();

      res.status(201).json({ message: "Password changed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// User signup route
router.post("/signup", async (req, res) => {
  const { name, email, password, role, enrollment_number } = req.body;

  try {
    // Check if user already exists with email
    const existingUser = await User.findOne({ email });

    // If user already exists, return an error
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Hash user password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const passwordChanged = true;
    // Create new user with hashed password
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      enrollment_number,
      passwordChanged,
    });

    // Save new user to database
    await user.save();

    res.status(201).json({ message: "User created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Get all students
router.get("/students", auth, async (req, res) => {
  try {
    // If user is not admin, return an error
    const user = await User.findById(req.user.userId);
    if (user.role !== "admin" && user.role !== "faculty") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find all students and don't return their password
    const students = await User.find({ role: "student" }).select("-password");

    res.status(200).json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all faculties
router.get("/faculties", auth, async (req, res) => {
  try {
    // If user is not admin, return an error
    const user = await User.findById(req.user.userId);
    if (user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find all faculty and don't return their password
    const faculty = await User.find({ role: "faculty" }).select("-password");

    res.status(200).json({ faculty });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user profile route
router.get("/profile", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.user.userId);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile route
router.put("/profile", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.user.userId);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user profile
    user.name = req.body.name;
    user.email = req.body.email;
    user.department = req.body.department;
    // if student, update enrollment number
    if (user.role === "student") {
      user.enrollment_number = req.body.enrollment_number;
    }

    // Save updated user to database
    await user.save();

    res.status(200).json({ message: "Profile updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user password route
router.put("/password", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.user.userId);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare password hash with user password
    const passwordMatch = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );

    // If password doesn't match, return an error
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);

    // Update user password
    user.password = hashedPassword;

    // Save updated user to database
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user route (only for admins)
router.delete("/:id", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check if user is admin
    if (req.user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Delete user from database
    await user.remove();

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//get student route by id(only for admins and faculties)
router.get("/student/:id", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check if user is admin or faculty
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // get student without password
    res.status(200).json({ user: user.select("-password") });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//get faculty route by id(only for admins)
router.get("/faculty/:id", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" }); 
    }

    // check if user is admin
    if (req.user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // get faculty without password
    res.status(200).json({ user: user.select("-password") });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//update student route (only for admins and faculties)
router.put("/student/:id", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);
    const role = await User.findById(req.user.userId);
    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check if user is admin or faculty
    if (role.role !== "admin" && role.role !== "faculty") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Update user profile
    user.name = req.body.name;
    user.email = req.body.email;
    user.department = req.body.department;
    user.enrollment_number = req.body.enrollment_number;

    // Save updated user to database
    await user.save();

    res.status(200).json({ message: "Profile updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//update faculty route (only for admins)
router.put("/faculty/:id", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);
    
    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check if user is admin
    if (req.user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Update user profile
    user.name = req.body.name;
    user.email = req.body.email;
    user.department = req.body.department;

    // Save updated user to database
    await user.save();

    res.status(200).json({ message: "Profile updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// delete student route (only for admins and faculties)
router.delete("/student/:id", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check if user is admin or faculty
    if (req.user.role !== "admin" && req.user.role !== "faculty") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Delete user from database
    await user.remove();

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// delete faculty route (only for admins)
router.delete("/faculty/:id", auth, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.params.id);

    // If user doesn't exist, return an error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check if user is admin
    if (req.user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Delete user from database
    await user.remove();

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// add multiple students from csv or excel file
router.post("/add-students", auth, upload.single("file"), async (req, res) => {
  try {
    // only admin or faculties can add students
    const user = await User.findById(req.user.userId);
    if (user.role !== "admin" && user.role !== "faculty") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Convert CSV buffer to JSON
    const students = await csvtojson({
      // ignore first row
      ignoreEmpty: true,
      ignoreColumns: /(email, name, enrollment_number, department)/,
    }).fromString(req.file.buffer.toString());

    // Create an array of user objects with the default password and the passwordChanged flag set to false
    const userObjects = students.map((student) => {
      return {
        email: student.email,
        name: student.name,
        role: "student",
        enrollment_number: student.enrollment_number,
        password: process.env.DEFAULT_PASSWORD,
        passwordChanged: false,
      };
    });

    // Insert the user objects into the database
    const result = await User.insertMany(userObjects);

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Flush the memory
    if (req.file && req.file.buffer) {
      req.file.buffer = null;
    }
  }
});

//reset password route (only for admins)
router.post("/reset-password/:id", auth, async (req, res) => {
  try {
    // only admin or faculties can reset password
    const user = await User.findById(req.user.userId);

    if (user.role !== "admin" ) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // reset password to default password for particular user
    const userToReset = await User.findById(req.params.id);
    userToReset.password = process.env.DEFAULT_PASSWORD;
    userToReset.passwordChanged = false;

    // Save updated user to database
    await userToReset.save();

    res.status(200).json({ message: "Password reset" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


//add multiple faculties from csv or excel file
router.post("/add-faculties", auth, upload.single("file"), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    // only admin can add faculties
    if (user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Convert CSV buffer to JSON
    const faculties = await csvtojson({
      // ignore first row
      ignoreEmpty: true,
      ignoreColumns: /(name,email, department)/,
    }).fromString(req.file.buffer.toString());

    // Create an array of user objects with the default password and the passwordChanged flag set to false
    const userObjects = faculties.map((faculty) => {
      // console.log(faculty);
      return {
        email: faculty.email,
        name: faculty.name,
        department: faculty.department,
        role: "faculty",
        password: process.env.DEFAULT_PASSWORD,
        passwordChanged: false,
      };
    });

    // Insert the user objects into the database
    const result = await User.insertMany(userObjects);

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Flush the memory
    if (req.file && req.file.buffer) {
      req.file.buffer = null;
    }
  }
});

router.post("/logout", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "You are not logged in" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Here you can perform additional checks to ensure that the token is still valid,
    // such as checking if the user is still active or if the token has been blacklisted

    res.clearCookie("token"); // Clear the cookie that holds the bearer token

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
