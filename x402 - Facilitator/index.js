const express = require("express");
const { createWalletClient, http, publicActions } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { hedera } = require("viem/chains");
const { x402Facilitator } = require("@x402/core/facilitator");
const { toFacilitatorEvmSigner } = require("@x402/evm");
const { registerExactEvmScheme } = require("@x402/evm/exact/facilitator");
const { getPrivateKey, transferUsdc } = require("./x402-facilitator-utils");

const PORT = "4022";
const activeTransfers = new Map();

const privateKey = getPrivateKey();
if (!privateKey) {
  console.error("CRITICAL: Private key not found.");
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);
const client = createWalletClient({
  account,
  chain: hedera,
  transport: http(),
}).extend(publicActions);

const evmSigner = toFacilitatorEvmSigner({
  address: account.address,
  getCode: (args) => client.getCode(args),
  readContract: (args) =>
    client.readContract({ ...args, args: args.args || [] }),
  verifyTypedData: (args) => client.verifyTypedData(args),
  sendTransaction: (args) => client.sendTransaction(args),
  waitForTransactionReceipt: (args) => client.waitForTransactionReceipt(args),
  writeContract: (args) =>
    client.writeContract({ ...args, args: args.args || [] }),
});

const facilitator = new x402Facilitator()
  .onBeforeVerify((context) => {
    // Log start of request to track arrival time and payer intent
    const sig = context.paymentPayload.payload.signature.slice(0, 10);
    console.log(`VERIFY_START: Payer=${payer} Sig=${sig}...`);
  })
  .onAfterVerify((context) => {
    const payer = context.result?.payer;
    const sig = context.paymentPayload.payload.signature;

    if (!payer || !context.result.isValid) {
      console.error(
        `VERIFY_FAIL: Payer=${payer || "unknown"} Sig=${sig.slice(0, 10)}...`,
      );
      return;
    }

    const amount = BigInt(context.requirements.maxAmountRequired);
    const recipient = context.requirements.payTo;

    // Start background transfer
    const promise = transferUsdc(client, account, payer, recipient, amount);
    activeTransfers.set(sig, promise);
  })
  .onBeforeSettle(async (context) => {
    return { skip: true, transaction: "background_pending" }; // Manual settlement because hedera doesnt allow EIP-3009, same function
  })
  .onAfterSettle(async (context) => {
    const sig = context.paymentPayload.payload.signature;
    const pendingTransfer = activeTransfers.get(sig);

    if (pendingTransfer) {
      try {
        const hash = await pendingTransfer;
        console.log(
          `TRANSFER_CONFIRMED: Hash=${hash} Payer=${context.result.payer}`,
        );
      } catch (error) {
        console.error(
          `TRANSFER_FATAL: Payer=${context.result.payer} Msg=${error.message}`,
        );
        throw error;
      } finally {
        activeTransfers.delete(sig);
      }
    }
  })
  .onSettleFailure(async (context) => {
    console.error(`SETTLE_ABORT: Msg=${context.error.message}`);
  });

registerExactEvmScheme(facilitator, {
  signer: evmSigner,
  networks: "hedera-mainnet",
});

const app = express();
app.use(express.json());

app.get("/supported", (req, res) => res.json(facilitator.getSupported()));

app.post("/verify", async (req, res) => {
  try {
    const response = await facilitator.verify(
      req.body.paymentPayload,
      req.body.paymentRequirements,
    );
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", code: "VERIFY_ERR", message: error.message });
  }
});

app.post("/settle", async (req, res) => {
  try {
    const response = await facilitator.settle(
      req.body.paymentPayload,
      req.body.paymentRequirements,
    );
    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", code: "SETTLE_ERR", message: error.message });
  }
});

app.listen(parseInt(PORT), () => {
  console.log(`FACILITATOR_ONLINE: Port=${PORT} Owner=${account.address}`);
});
