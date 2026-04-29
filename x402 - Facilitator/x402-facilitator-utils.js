const fs = require("fs");
const path = require("path");
const IERC20 = require("@openzeppelin/contracts/build/contracts/IERC20.json");

const USDC_ADDRESS = "0x000000000000000000000000000000000006f89a";

/**
 * loads private key from a local 'wallet-*.json' file or .env
 */
function getPrivateKey() {
  const walletFile = fs.readdirSync(process.cwd()).find(f => f.startsWith("wallet-") && f.endsWith(".json"));
  
  if (walletFile) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), walletFile), "utf8"));
      // Ensure '0x' prefix for Viem
      return data.privateKey.startsWith("0x") ? data.privateKey : `0x${data.privateKey}`;
    } catch (e) {
      console.error("Error reading wallet file:", e.message);
    }
  }
  
  const envKey = process.env.EVM_PRIVATE_KEY;
  return envKey && !envKey.startsWith("0x") ? `0x${envKey}` : envKey;
}

/**
 * Executes a Safe TransferFrom with Gas Buffering
 */
async function transferUsdc(client, account, sender, recipient, amount) {
  const gasPrice = await client.getGasPrice();

  // 1. Estimate Gas
  let gasLimit;
  try {
    const estimated = await client.estimateContractGas({
      address: USDC_ADDRESS,
      abi: IERC20.abi,
      functionName: "transferFrom",
      args: [sender, recipient, amount],
      account,
    });
    // 2. Add 20% Buffer for Hedera stability
    gasLimit = (estimated * 120n) / 100n;
  } catch (error) {
    // Fallback if estimation fails (rare but possible on precompile edges)
    console.warn("Gas estimation failed, using fallback:", error.shortMessage);
    gasLimit = 200000n; 
  }

  // 3. Execute Transaction
  const hash = await client.writeContract({
    address: USDC_ADDRESS,
    abi: IERC20.abi,
    functionName: "transferFrom",
    args: [sender, recipient, amount],
    gas: gasLimit,
    gasPrice,
  });

  // 4. Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash });
  return receipt.transactionHash;
}

module.exports = { getPrivateKey, transferUsdc };