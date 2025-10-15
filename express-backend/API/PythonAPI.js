const axios = require('axios');

async function callPythonAPI(usr_query) {
  try {

    if (!usr_query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const reponse = await axios.post('http://localhost:5000/chatprompt', {
      query: usr_query,
    });
    
    return response.data;

  } catch (error) {
    console.error('Error calling Python API', error.message);
    res.status(500).send('Error calling Python API');
  }
}

async function configPythonAPI(collection) {
  try {

    if (!collection) {
      return res.status(400).json({ error: 'Missing collection in request body'})
    }

    const response = await axios.post('http//localhost:5000/ai_config', {
      collections: collection,
    });

    return response.data

  } catch (error) {
    console.error('Error sending collection:', error.message);
    res.status(500).send('Error sending Collection');
  }
}

module.export = {
  callPythonAPI,
  configPythonAPI,
};


