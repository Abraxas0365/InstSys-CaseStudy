const express = require('express');
const axios = require('axois');
const { callPythonAPI, configPythonAPI } = require('./API/PythonAPI')
const app = express();

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