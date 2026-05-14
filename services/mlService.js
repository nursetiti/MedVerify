const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

const analyzeCredentials = async (mdcnPath, idPath, name, regNo) => {
    try {
        const response = await axios.post(`${process.env.ML_SERVICE_URL}/analyze`, {
            mdcn_path: mdcnPath,
            id_path: idPath,
            full_name: name,
            registration_number: regNo
        });
        return response.data; // Should return the score (e.g., 60.8) and flags
    } catch (error) {
        console.error("ML Service Bridge Error:", error.message);
        throw new Error("Failed to communicate with AI service.");
    }
};
/**
 * ML Bridge: Connects Node.js Backend to FastAPI ML Layer
 * @param {Object} files - The req.files object from Multer
 * @param {Object} userData - Contains fullName and mdcnNumber
 */
const analyzeMedicalCredential = async (files, userData) => {
    try {
        const form = new FormData();

        // 1. Prepare Multipart Form Data (Matching your FastAPI expectation)
        if (files['mdcnCertificate']) {
            form.append('file', fs.createReadStream(files['mdcnCertificate'][0].path));
        }
        
        // If your FastAPI expects a second file for ID
        if (files['governmentId']) {
            form.append('id_file', fs.createReadStream(files['governmentId'][0].path));
        }

        // 2. Append text metadata for cross-referencing
        form.append('full_name', userData.fullName);
        form.append('reg_number', userData.mdcnNumber);

        const mlUrl = `${process.env.ML_SERVICE_URL}`;
        console.log(`[ML-BRIDGE] Dispatching payload for ${userData.fullName} to ${mlUrl}...`);

        // 3. Execute Request with extended timeout
        const response = await axios.post(mlUrl, form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 45000,
            httpsAgent: new https.Agent({  
                rejectUnauthorized: false 
            }) 
        });
        console.log("RAW ML DATA:", response.data);

        const { trust_score, flags, recommendation } = response.data;

        // 4. INTERNAL SECURITY AUDIT
        let finalRecommendation = recommendation;
        if (trust_score < 40) {
            console.log('\x1b[41m%s\x1b[0m', `!!! CRITICAL FRAUD ALERT !!!`);
            console.log(`Score: ${trust_score} | Flags: ${JSON.stringify(flags)}`);
            finalRecommendation = 'REJECT';
        }

        return {
            success: true,
            trust_score,
            flags: flags || [],
            recommendation: finalRecommendation
        };

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('ML Service is Offline. Ensure Python api.py is running on port 8000.');
        } else {
            console.error('ML Bridge Error:', error.response?.data || error.message);
        }

        // FAIL-SAFE: Secure by default
        return {
            success: false,
            trust_score: 0,
            flags: ['ML_UNREACHABLE'],
            recommendation: "REJECT"
        };
    }
};

module.exports = { analyzeMedicalCredential, analyzeCredentials };