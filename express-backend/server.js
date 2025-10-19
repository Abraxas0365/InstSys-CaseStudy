import express from "express";
import axios from "axios";
import cors from "cors";
import loginRoute from "./routes/loginRoute.js";
import guestRoute from "./routes/guestRoute.js";
import refreshCollections from "./routes/refreshCollections.js";
import { callPythonAPI, configPythonAPI } from "./API/PythonAPI.js";

const app = express();

console.log("server is starting...");

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173", // allow your Vite frontend
    credentials: true,
  })
);

app.use(express.json());

// ✅ Health check route for frontend
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Express server is running" });
  console.log("Health check endpoint was called.");
});

app.use("/", loginRoute);
app.use("/student", guestRoute);
app.use("/", refreshCollections);

// ✅ Example endpoint that talks to Python
app.get("/v1/chat/prompt", async (req, res) => {
  try {
    const userQuery = req.query;

    if (!userQuery) {
      return res.status(400).json({ error: "Missing query parameter" });
    }

    const response = await callPythonAPI();
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
