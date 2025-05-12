import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const auth = (req, res, next) => {
  try {
    const token = req.header("x-auth-token");
    if (!token) throw new Error("Token missing");

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; // ✅ Store user info in req

    next();
  } catch (error) {
    res.status(401).send({ message: error.message });
  }
};
