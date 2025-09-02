// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection (RDS)
const db = mysql.createConnection({
  host: "olyne-db.cx4u2wuku3gz.ap-southeast-2.rds.amazonaws.com",
  user: "olyne_admin",
  password: "olyne_sriram", // ❌ move to .env later
  database: "OLYNE",
  port: 3306
});

// Connect to DB
db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL RDS");
  }
});

// REGISTER route (with bcrypt)
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing username or password" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "User already exists" });
          }
          return res.status(500).json({ message: "Error registering user", error: err });
        }
        res.json({ message: "User registered successfully!" });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN route (with bcrypt compare)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing username or password" });
  }

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (results.length === 0) return res.status(400).json({ message: "Invalid credentials" });

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      res.json({ message: "Login successful" });
    }
  );
});

// Run server
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
