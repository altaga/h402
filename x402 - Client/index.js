const { createWalletClient, http, publicActions } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { wrapFetchWithPayment } = require("x402-fetch");
const { hedera } = require("viem/chains");
const { getPrivateKey, syncAllowance } = require("./x402-client-utils");

const facilitatorURL = "https://lk5vrteuf4jmzbq7dsw4y436ti0mytdj.lambda-url.us-east-1.on.aws"

async function main() {
  try {
    const account = privateKeyToAccount(getPrivateKey());
    const client = createWalletClient({ 
      account, 
      transport: http(), 
      chain: hedera 
    }).extend(publicActions);

    const fetchWithPay = wrapFetchWithPayment(fetch, client);

    const facilitatorRes = await fetch(`${facilitatorURL}/supported`);
    const { signers } = await facilitatorRes.json();
    const spender = signers["eip155:*"]?.[0];

    await syncAllowance(client, account.address, spender);

    // Capture start time in nanoseconds (BigInt)
    const start = process.hrtime.bigint();

    const res = await fetchWithPay("http://localhost:4021/weather");
    const data = await res.json();

    // Capture end time
    const end = process.hrtime.bigint();
    
    // Calculate difference (nanoseconds to milliseconds)
    const durationMs = Number(end - start) / 1_000_000;
    console.table(data);
    console.log(`\n⏱️ Request Time: ${durationMs.toFixed(3)}ms`);

  } catch (err) {
    console.error("Client Error:", err.message);
  }
}

main();