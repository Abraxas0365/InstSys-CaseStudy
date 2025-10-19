import loginRoute from "./routes/login.js";
import guestRoute from "./routes/guestRoute.js";

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { callPythonAPI, configPythonAPI } = require('./API/PythonAPI')
const app = express();

console.log("server is starting...");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(cors({
  origin: 'http://localhost:5173', // allow your Vite frontend
  credentials: true
}));

app.use(express.json());

// ✅ Health check route for frontend
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Express server is running' });
  console.log("Health check endpoint was called.");
});

app.use("/", loginRoute);
app.use("/", guestRoute);


app.get('/v1/chat/prompt', async (req, res) => {
  try {

    const userQuery = req.query;

    if (!userQuery) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const response = callPythonAPI()
    res.json(response);

  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'failed to fetch data'});
  }
})
