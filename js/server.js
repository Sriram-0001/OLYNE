// server.js
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const os = require("os");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection pool (better than single connection for scaling)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "olyne-db.cx4u2wuku3gz.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "olyne_admin",
  password: process.env.DB_PASS || "olyne_sriram", // 🔒 move to .env
  database: process.env.DB_NAME || "OLYNE",
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10
});

// Health check & load balancer test
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    hostname: os.hostname(), // shows which EC2 served the request
    timestamp: new Date().toISOString()
  });
});

// REGISTER route
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing username or password" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [rows] = await pool.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );
    res.json({ message: "User registered successfully!" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "User already exists" });
    }
    console.error("❌ DB Error:", err);
    res.status(500).json({ message: "Error registering user", error: err });
  }
});

// LOGIN route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing username or password" });
  }

  try {
    const [results] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    if (results.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ DB Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Run server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
