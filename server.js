const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config(); // Loads keys safely from .env file

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Securely reference Safaricom keys
const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortCode = '174379'; // M-Pesa sandbox test shortcode
const passkey = 'bfb272f13c2c1aef76a3ff44cca2e229307219a30d535c34d26e22645d014e65'; 

// Middleware to generate M-Pesa access token
async function generateToken(req, res, next) {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    try {
        const response = await axios.get('https://safaricom.co.ke', {
            headers: { Authorization: `Basic ${auth}` }
        });
        req.token = response.data.access_token;
        next();
    } catch (error) {
        console.error("Access Token Error", error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
}

// Payment Checkout Route
app.post('/api/checkout', generateToken, async (req, res) => {
    let phone = req.body.phone;
    const amount = req.body.amount;

    if (phone.startsWith('0')) {
        phone = '254' + phone.slice(1);
    } else if (phone.startsWith('+254')) {
        phone = phone.slice(1);
    }

    const date = new Date();
    const timestamp = date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

    try {
        const response = await axios.post(
            'https://safaricom.co.ke',
            {
                BusinessShortCode: shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: phone,
                PartyB: shortCode,
                PhoneNumber: phone,
                CallBackURL: "https://yourdomain.com", 
                AccountReference: "JamboRide Limited",
                TransactionDesc: "Ride Payment"
            },
            { headers: { Authorization: `Bearer ${req.token}` } }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.error("STK Push error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'STK push failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
          
