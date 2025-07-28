// FILE: netlify/functions/api-provider-proxy.js

const axios = require('axios');
const admin = require('firebase-admin');

// --- Firebase Admin Initialization ---
// This secures the function so only the logged-in admin can use it.
// IMPORTANT: Ensure your Netlify environment variables are set for this to work.
// Required variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

// The email address of the admin user who is allowed to access this function.
const ADMIN_EMAIL = "admin@paksmm.com";

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

    // Construct the request body for the external SMM panel API
    // Most SMM panels use 'application/x-www-form-urlencoded' format.
    const requestBody = new URLSearchParams();
    requestBody.append('key', apiKey);
    requestBody.append('action', action);

    // Add any additional parameters for actions like 'add' or 'status'
    if (params) {
      for (const key in params) {
        requestBody.append(key, params[key]);
      }
    }
    
    console.log(`Proxying request to: ${apiUrl} with action: ${action}`);

    // Make the external API call using axios
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Return the exact response from the provider back to the admin panel frontend
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };

  } catch (error) {
    console.error('API Provider Proxy Error:', error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch from API provider.', details: error.message }),
    };
  }
};
