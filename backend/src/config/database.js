import { config } from "dotenv";
import mongoose from "mongoose";

config();

export default async function connectDB() {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }
    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongo DB connected successfully!", connection.connection.host);

    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (error) => {
      console.error("Mongoose connection error: ", error);
    });
    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected from MongoDB");
    });
  } catch (err) {
    console.error("MongoDB connection error: ", err);
    process.exit(1);
  }
}
