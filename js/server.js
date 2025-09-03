
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const os = require("os");

const app = express();

app.use(cors({
  origin: ["https://olyne.shop", "https://www.olyne.shop"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(bodyParser.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "olyne-db.cx4u2wuku3gz.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "olyne_admin",
  password: process.env.DB_PASS || "olyne_sriram",
  database: process.env.DB_NAME || "OLYNE",
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10
});

// Health check
app.get("/health", (req, res) => {
  console.log("✅ /health checked");
  res.json({
    status: "ok",
    hostname: os.hostname(),
    timestamp: new Date().toISOString()
  });
});

// REGISTER route
app.post("/register", async (req, res) => {
  console.log("📩 /register hit", req.body);

  const { username, password } = req.body;
  if (!username || !password) {
    console.warn("⚠️ Missing username or password");
    return res.status(400).json({ message: "Missing username or password" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [rows] = await pool.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );
    console.log("✅ User registered:", username);
    res.json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("❌ DB Error (register):", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({ message: "Error registering user", error: err.message });
  }
});

// LOGIN route
app.post("/login", async (req, res) => {
  console.log("📩 /login hit", req.body);

  const { username, password } = req.body;
  if (!username || !password) {
    console.warn("⚠️ Missing username or password");
    return res.status(400).json({ message: "Missing username or password" });
  }

  try {
    const [results] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    console.log("🔍 DB Query Results:", results);

    if (results.length === 0) {
      console.warn("⚠️ No user found:", username);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn("⚠️ Password mismatch for:", username);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("✅ Login successful:", username);
    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ DB Error (login):", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Run server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
