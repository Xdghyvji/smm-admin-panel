// FILE: netlify/functions/api-provider-proxy.js

const axios = require('axios');
const admin = require('firebase-admin');

// --- Firebase Admin Initialization ---
// Ensure you have set these environment variables in your Netlify project settings.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const ADMIN_EMAIL = "admin@paksmm.com";
// --- IMPORTANT: Set your USD to PKR exchange rate here ---
// This should be updated periodically. For a production app, consider using a live currency API.
const USD_TO_PKR_RATE = 280.50; 

exports.handler = async (event) => {
  // --- Security Check: Ensure the request is from the authenticated admin ---
  const { authorization } = event.headers;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No token provided.' }) };
  }
  try {
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.email !== ADMIN_EMAIL) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Access denied.' }) };
    }
  } catch (error) {
    console.error("Auth token verification failed:", error);
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Invalid token.' }) };
  }

  // --- Main API Proxy Logic ---
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { apiUrl, apiKey, action, params } = JSON.parse(event.body);

    if (!apiUrl || !apiKey || !action) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters: apiUrl, apiKey, action' }) };
    }

    const requestBody = new URLSearchParams();
    requestBody.append('key', apiKey);
    requestBody.append('action', action);

    if (params) {
      for (const key in params) {
        requestBody.append(key, params[key]);
      }
    }
    
    console.log(`Proxying request to: ${apiUrl} with action: ${action}`);

    // Make the external API call using axios
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
      }
    });

    let responseData = response.data;

    // --- NEW: CURRENCY CONVERSION LOGIC ---
    // If the action is 'services', convert the rate for each service.
    if (action === 'services' && Array.isArray(responseData)) {
        responseData = responseData.map(service => {
            if (service.rate) {
                const originalRate = parseFloat(service.rate);
                // Convert from USD to PKR and format to 4 decimal places
                service.rate = (originalRate * USD_TO_PKR_RATE).toFixed(4);
            }
            return service;
        });
    }

    // If the action is 'balance', convert the balance field.
    if (action === 'balance' && responseData.balance && responseData.currency === 'USD') {
        const originalBalance = parseFloat(responseData.balance);
        responseData.balance = (originalBalance * USD_TO_PKR_RATE).toFixed(2);
        responseData.currency = 'PKR'; // Update currency symbol
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('API Provider Proxy Error:', errorDetails);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch from API provider. The provider may be blocking our server.', 
        details: 'Cloudflare security challenge was triggered or another error occurred.'
      }),
    };
  }
};
