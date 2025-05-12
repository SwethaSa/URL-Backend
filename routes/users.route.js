import express from "express";
const router = express.Router();

import {
  createUsers,
  getAllUsers,
  getUserByName,
  getUserByEmail,
  getUserById,
  updateUserById,
  deleteUserById,
  saveResetToken,
  getResetTokenDoc,
  deleteResetToken,
  findEmail,
} from "../services/users.service.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import { auth } from "../middleware/auth.js";
dotenv.config();
import { createTransport } from "nodemailer";

const transporter = createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function generateHashedPassword(password) {
  const NO_OF_ROUNDS = 10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const db = client.db("yourDatabaseName"); // Replace with your DB name
    const urlsCollection = db.collection("urls");

    const totalUrls = await urlsCollection.countDocuments({ userId });

    const urls = await urlsCollection.find({ userId }).toArray();

    res.json({
      totalUrls,
      recent: urls.slice(-5), // latest 5 URLs
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});
//GET USER DATA
router.get("/", async function (req, res) {
  const dbData = await getAllUsers();
  res.send(dbData);
});

//CREATE USER LOGIC
router.post("/signup", async function (req, res) {
  const { name, email, phone, password } = req.body;

  const userFromDB = await getUserByName(name);
  const existingUserByEmail = await getUserByEmail(email);

  if (existingUserByEmail) {
    return res.status(400).send({ message: "Email already registered!" });
  }

  if (userFromDB) {
    res.status(400).send({ message: "User Name already exists!" });
    return;
  } else if (password.length < 8) {
    res
      .status(400)
      .send({ message: "Password should be at least 8 characters long!" });
    return;
  } else {
    const hashedPassword = await generateHashedPassword(password);
    const userData = await createUsers({
      name: name,
      email: email,
      phone: phone,
      password: hashedPassword,
    });

    res.send(userData);
  }
});

//LOGIN LOGIC
router.post("/login", async function (req, res) {
  const { name, password } = req.body;

  const userFromDB = await getUserByName(name);

  if (!userFromDB) {
    res.status(401).send({ message: "Invalid Credentials" });
    return;
  } else {
    const storedPassword = userFromDB.password;
    const isPasswordMatch = await bcrypt.compare(password, storedPassword);

    if (isPasswordMatch) {
      const token = jwt.sign({ id: userFromDB._id }, process.env.SECRET_KEY);

      res.send({
        message: "Login Success",
        token: token,
        userId: userFromDB._id,
        name: userFromDB.name,
        email: userFromDB.email,
      });
    } else {
      res.status(401).send({ message: "Invalid Credentials" });
    }
  }
});

// GET USER BY ID
router.get("/:id", auth, async function (req, res) {
  const { id } = req.params;
  try {
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send(user);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// UPDATE USER BY ID
router.put("/:id", auth, async function (req, res) {
  const { id } = req.params;
  const updateData = req.body;

  if (updateData.password) {
    updateData.password = await generateHashedPassword(updateData.password);
  }

  try {
    const result = await updateUserById(id, updateData);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// DELETE USER BY ID
router.delete("/:id", auth, async function (req, res) {
  const { id } = req.params;
  try {
    const result = await deleteUserById(id);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// POST /users/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await findEmail(email);

    if (!user) {
      return res.status(400).send({ message: "User doesn't exist" });
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await saveResetToken(user._id, token, expiresAt);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const emailHtml = `
      <div style="background: #ff5733; padding: 30px; font-family: 'Kite One', sans-serif; color: #ffffff; text-align: center;">
        <h1 style="margin: 0 0 20px; font-size: 2rem; font-weight: bold;">URL Shortner</h1>
        <p style="margin: 0 0 16px; font-size: 1rem;">Hi ${user.name},</p>
        <p style="margin: 0 0 24px; font-size: 1rem;">Click the button below to reset your password:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #ffffff; color: #ff5733; text-decoration: none; font-weight: 500; border-radius: 6px;">Reset Password</a>
        <p style="margin: 32px 0 0; font-size: 0.875rem; opacity: 0.9;">If you didn’t request a password reset, just ignore this email.</p>
      </div>`;

    await transporter.sendMail({
      from: `"URL Shortner" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Your password reset link",
      html: emailHtml,
    });

    res.send({ message: "Reset email sent" });
  } catch (err) {
    console.error("Error in /forgot-password:", err);
    res.status(500).send({ message: "Server error. Please try again later." });
  }
});

// POST /reset-password/:token
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const doc = await getResetTokenDoc(token);
  if (!doc || doc.expiresAt < new Date()) {
    return res
      .status(400)
      .send({ message: "Reset link is invalid or has expired." });
  }

  const hashed = await generateHashedPassword(newPassword);

  await updateUserById(doc.userId, { password: hashed });
  await deleteResetToken(token);

  res.send({ message: "Password has been reset successfully." });
});

export default router;
