// server/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");
const prisma = require("./lib/prisma");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/ritel", async (req, res) => {
  try {
    const data = req.body;
    const result = await prisma.ritelModern.create({
      data: {
        id: randomUUID(), // Tambahkan ID karena di schema lu String @id tanpa default
        namaPt: data.namaPt, // Sesuaikan dengan field schema
        inisial: data.inisial, // Sesuaikan dengan field schema
        tujuan: data.tujuan, // Sesuaikan dengan field schema
        updatedAt: new Date(),
      },
    });
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal insert ke database" });
  }
});

app.get("/api/ritel", async (req, res) => {
  try {
    const data = await prisma.ritelModern.findMany(); // Ambil semua data
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", async (req, res) => {
  try {
    // Cek koneksi ke DB
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "OK", message: "Database Terkoneksi!" });
  } catch (err) {
    res.status(500).json({ status: "Error", error: err.message });
  }
});

app.listen(5000, () => console.log("✅ Backend Ready di Port 5000"));
