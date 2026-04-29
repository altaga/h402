const fs = require("fs");
const path = require("path");
const { parseUnits } = require("viem");
const IERC20 = require("@openzeppelin/contracts/build/contracts/IERC20.json");

const USDC_ADDRESS = "0x000000000000000000000000000000000006f89a";
const SAFE_MAX_APPROVAL = parseUnits("100000000", 6);

function getPrivateKey() {
  const walletFile = fs.readdirSync(process.cwd()).find(f => f.startsWith("wallet-") && f.endsWith(".json"));
  if (walletFile) {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), walletFile), "utf8"));
    return data.privateKey.startsWith("0x") ? data.privateKey : `0x${data.privateKey}`;
  }
  return process.env.BUYER_PRIVATE_KEY;
}

async function syncAllowance(client, owner, spender) {
  const current = await client.readContract({
    address: USDC_ADDRESS,
    abi: IERC20.abi,
    functionName: "allowance",
    args: [owner, spender],
  });

  if (current >= parseUnits("1000", 6)) return { status: "already_set" };

  const gasPrice = await client.getGasPrice();

  const getBufferedLimit = async (amount) => {
    try {
      const estimated = await client.estimateContractGas({
        address: USDC_ADDRESS,
        abi: IERC20.abi,
        functionName: "approve",
        args: [spender, amount],
        account: owner,
      });
      return (estimated * 120n) / 100n;
    } catch (e) {
      return 150000n;
    }
  };

  if (current > 0n) {
    const gasLimit = await getBufferedLimit(0n);
    const resetHash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: IERC20.abi,
      functionName: "approve",
      args: [spender, 0n],
      gasPrice,
      gas: gasLimit,
    });
    await client.waitForTransactionReceipt({ hash: resetHash });
  }

  const gasLimit = await getBufferedLimit(SAFE_MAX_APPROVAL);
  const hash = await client.writeContract({
    address: USDC_ADDRESS,
    abi: IERC20.abi,
    functionName: "approve",
    args: [spender, SAFE_MAX_APPROVAL],
    gasPrice,
    gas: gasLimit,
  });
  
  const receipt = await client.waitForTransactionReceipt({ hash });
  return { status: "updated", hash: receipt.transactionHash };
}

module.exports = { getPrivateKey, syncAllowance, USDC_ADDRESS };