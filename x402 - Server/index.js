const express = require("express");
const { paymentMiddleware } = require("x402-express");
const { getWalletAddress } = require("./x402-server-utils");

const app = express();
const PORT = 4021;
const WALLET_ADDRESS = getWalletAddress();

app.use((req, res, next) => {
  if (req.path !== "/favicon.ico") {
    console.log(
      `REQUEST_RECV: Method=${req.method} Path=${req.path} IP=${req.ip}`,
    );
  }
  next();
});

app.use(
  paymentMiddleware(
    WALLET_ADDRESS,
    {
      "GET /weather": {
        price: {
          amount: "1000", // 0.001 USDC
          asset: {
            address: "0x000000000000000000000000000000000006f89a",
            decimals: 6,
            eip712: { name: "USD Coin", version: "2" },
          },
        },
        network: "hedera-mainnet",
        config: {
          description: "Get current weather data for any location",
          inputSchema: {
            type: "object",
            properties: { location: { type: "string" } },
          },
          outputSchema: {
            type: "object",
            properties: {
              weather: { type: "string" },
              temperature: { type: "number" },
            },
          },
        },
      },
    },
    {
      url: "https://lk5vrteuf4jmzbq7dsw4y436ti0mytdj.lambda-url.us-east-1.on.aws", // Facilitator URL
      onPaymentRequired: (req) => {
        console.log(
          `PAYMENT_REQUIRED: Path=${req.path} Target=${WALLET_ADDRESS}`,
        );
      },
    },
  ),
);

app.get("/weather", (req, res) => {
  console.log(`RESOURCE_ACCESS: Path=/weather Status=Paid`);
  res.send({ weather: "sunny", temperature: 70 });
});

app.listen(PORT, () => {
  console.log(`SERVER_ONLINE: Port=${PORT} Receiver=${WALLET_ADDRESS}`);
});
