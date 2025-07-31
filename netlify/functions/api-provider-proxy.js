// FILE: netlify/functions/api-provider-proxy.js

const axios = require('axios');
const admin = require('firebase-admin');

// --- Firebase Admin Initialization ---
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
const FALLBACK_USD_TO_PKR_RATE = 283.75; // A safe fallback rate

// --- NEW: Provider Fee Buffer ---
// Adjust this percentage to match the provider's final price.
// This accounts for any commissions or fees they add on top of the base API rate.
// Example: 3.0 means we add 3% to the final converted price.
const PROVIDER_FEE_BUFFER_PERCENTAGE = 0.0;

/**
 * Fetches the live USD to PKR exchange rate from a free API.
 * @returns {Promise<number>} The current exchange rate or a fallback value.
 */
const getLiveExchangeRate = async () => {
  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD');
    if (response.data && response.data.rates && response.data.rates.PKR) {
      const liveRate = parseFloat(response.data.rates.PKR);
      console.log(`Live exchange rate fetched: 1 USD = ${liveRate} PKR`);
      return liveRate;
    }
    throw new Error("Invalid API response structure from currency API.");
  } catch (error) {
    console.error(`Failed to fetch live exchange rate: ${error.message}. Using fallback rate.`);
    return FALLBACK_USD_TO_PKR_RATE;
  }
};

exports.handler = async (event) => {
  // --- Security Check ---
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

  const liveUsdToPkrRate = await getLiveExchangeRate();

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

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
      }
    });

    let responseData = response.data;

    // --- REAL-TIME CURRENCY CONVERSION & BUFFER LOGIC ---
    const feeMultiplier = 1 + (PROVIDER_FEE_BUFFER_PERCENTAGE / 100);

    if (action === 'services' && Array.isArray(responseData)) {
        responseData = responseData.map(service => {
            if (service.rate) {
                const originalRate = parseFloat(service.rate);
                const convertedRate = originalRate * liveUsdToPkrRate;
                const finalRate = convertedRate * feeMultiplier; // Apply buffer
                service.rate = finalRate.toFixed(4);
            }
            return service;
        });
    }

    if (action === 'balance' && responseData.balance) {
        const originalBalance = parseFloat(responseData.balance);
        const convertedBalance = originalBalance * liveUsdToPkrRate;
        const finalBalance = convertedBalance * feeMultiplier; // Apply buffer
        responseData.balance = finalBalance.toFixed(2);
        responseData.currency = 'PKR';
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
        error: 'Failed to fetch from API provider.', 
        details: 'The provider may be blocking our server or an internal error occurred.'
      }),
    };
  }
};
