import { client } from "../index.js";
import { ObjectId } from "mongodb";

export async function createUsers(data) {
  return await client.db("urlshortener").collection("users").insertOne(data);
}

export async function getAllUsers() {
  return await client.db("urlshortener").collection("users").find({}).toArray();
}

export async function getUserByName(name) {
  return await client.db("urlshortener").collection("users").findOne({ name });
}

export async function getUserByEmail(email) {
  return client.db("urlshortener").collection("users").findOne({ email });
}

export async function getUserById(id) {
  return client
    .db("urlshortener")
    .collection("users")
    .findOne({ _id: new ObjectId(id) });
}

export async function updateUserById(id, data) {
  return client
    .db("urlshortener")
    .collection("users")
    .updateOne({ _id: new ObjectId(id) }, { $set: data });
}

export async function deleteUserById(id) {
  return client
    .db("urlshortener")
    .collection("users")
    .deleteOne({ _id: new ObjectId(id) });
}

// Reset Token functionality
export async function saveResetToken(userId, token, expiresAt) {
  return client
    .db("urlshortener")
    .collection("resetTokens")
    .insertOne({ userId, token, expiresAt });
}

export async function getResetTokenDoc(token) {
  return client.db("urlshortener").collection("resetTokens").findOne({ token });
}

export async function deleteResetToken(token) {
  return client
    .db("urlshortener")
    .collection("resetTokens")
    .deleteOne({ token });
}

export async function findEmail(email) {
  return client.db("urlshortener").collection("users").findOne({ email });
}
