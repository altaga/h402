const fs = require("fs");
const path = require("path");

function getWalletAddress() {
    const walletFile = fs.readdirSync(process.cwd()).find(f => f.startsWith("wallet-") && f.endsWith(".json"));
    
    if (walletFile) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), walletFile), "utf8"));
            return data.address;
        } catch (e) {
            console.error(`CONFIG_ERROR: Failed to read wallet file: ${e.message}`);
        }
    }
    return process.env.WALLET_ADDRESS;
}

module.exports = { getWalletAddress };