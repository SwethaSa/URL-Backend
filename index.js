import express from "express";
const app = express();
import { MongoClient } from "mongodb";
import urlRoutes from "./routes/users.route.js";

import cors from "cors";

import * as dotenv from "dotenv";
dotenv.config();
app.use(express.json());
app.use(cors());

const PORT = 4000;
app.get("/", function (request, response) {
  response.send("URL Shortner");
});

const MONGO_URL = process.env.MONGO_URL;
const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("Mongo is connected successfully!");
app.use("/url", urlRoutes);

app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
export { client };
