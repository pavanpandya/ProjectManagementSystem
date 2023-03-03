const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// env file is located in the root directory
const dotenv = require("dotenv").config({ path: "../.env" }); 
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const kanboardRoutes = require("./routes/kanboardRoutes");

const app = express();

// Connect to MongoDB database
// my .env file is located in the root directory
// dotenv.config();
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error(error));

// Enable CORS for all requests
app.use(cors());

// setup middleware
// app.use(express.static(path.join(__dirname, "client/build")));
// url encoded
app.use(express.urlencoded({ extended: true }));
// parse JSON

// Parse JSON request bodies
app.use(express.json());

// User routes
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/kanboards", kanboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error" });
});

// get api for testing
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
