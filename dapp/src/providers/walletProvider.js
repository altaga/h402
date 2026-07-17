/**
 * 💳 ħ402 - HEDERA WALLET PROVIDER
 *
 * This provider manages the connection to the user's EVM wallet (e.g., MetaMask).
 * It uses the 'viem' library for blockchain interactions and targets Hedera Testnet.
 *
 * Handles:
 * 1. Account connection and disconnection.
 * 2. Balance fetching (HBAR + USDC via Mirror Node).
 * 3. Session persistence via cookies.
 * 4. Transaction signing and execution.
 * 5. Provider event listeners (Accounts/Chain changes).
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    createPublicClient,
    createWalletClient,
    custom,
    http,
    defineChain,
    formatEther,
} from "viem";

// ─── HEDERA TESTNET CHAIN DEFINITION ───
const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "HBAR",
    symbol: "HBAR",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.hashio.io/api"],
    },
  },
  blockExplorers: {
    default: {
      name: "Hashscan",
      url: "https://hashscan.io/testnet",
    },
  },
  testnet: true,
});

// INITIALIZATION: Standard React Context for global wallet state.
const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  // --- CORE STATE ---
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [status, setStatus] = useState("loading"); // loading | connected | disconnected
  const [error, setError] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  // --- VIEM CLIENTS ---
  const [walletClient, setWalletClient] = useState(null);
  const [publicClient, setPublicClient] = useState(null);

  const COOKIE_NAME = "wallet_session";

  /* ---------------- SESSION MANAGEMENT (COOKIES) ---------------- */

  const setCookie = (name, value, days) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 86400000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  };

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  /* ---------------- CORE LOGIC ---------------- */

  /**
   * DISCONNECT: Clears the local session and updates status.
   */
  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance(null);
    setUsdcBalance("0.00");
    deleteCookie(COOKIE_NAME);
    setStatus("disconnected");
  }, []);

  /**
   * SYNC: Refreshes account balance and persists the session.
   * Fetches HBAR balance via JSON-RPC + USDC balance via Mirror Node.
   */
  const updateAccountData = useCallback(async (walletAddress, client) => {
    if (!walletAddress || !client) return;

    try {
      // 1. Fetch Native HBAR Balance (via JSON-RPC)
      const balanceWei = await client.getBalance({
        address: walletAddress,
      });

      // 2. Fetch USDC Balance (Hedera Testnet Mirror Node)
      const HEDERA_USDC_TOKEN_ID = "0.0.429274";
      let hederaUsdcBalance = "0.000000";
      
      try {
        const mirrorRes = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${walletAddress}`);
        const mirrorData = await mirrorRes.json();
        
        if (mirrorData && mirrorData.balance && mirrorData.balance.tokens) {
          const usdcToken = mirrorData.balance.tokens.find(t => t.token_id === HEDERA_USDC_TOKEN_ID);
          if (usdcToken) {
            // USDC has 6 decimals
            hederaUsdcBalance = (usdcToken.balance / 1000000).toFixed(6);
          }
        }
      } catch (err) {
        console.warn("[MIRROR_NODE] Failed to fetch USDC balance:", err);
      }

      setAccount(walletAddress);
      setBalance(formatEther(balanceWei)); // Convert Wei-equivalent to human-readable HBAR.
      setUsdcBalance(hederaUsdcBalance);

      setCookie(COOKIE_NAME, walletAddress, 7); // Persist session for 7 days.
      setStatus("connected");
    } catch (err) {
      console.error("Balance fetch error:", err);
      // Fallback: Connect even if balance fetch fails.
      setAccount(walletAddress);
      setStatus("connected");
    }
  }, []);

  /* ---------------- ACTIONS ---------------- */

  /**
   * CONNECT: Triggers the browser wallet (MetaMask) connection flow.
   * Prompts MetaMask to switch to Hedera Testnet (chainId 296) if needed.
   */
  const connect = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask");
      return;
    }

    setStatus("loading");

    try {
      // CHAIN SWITCH: Ensure MetaMask is on Hedera Testnet
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x128" }], // 296 in hex
        });
      } catch (switchError) {
        // Chain not added to MetaMask — add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x128",
              chainName: "Hedera Testnet",
              nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
              rpcUrls: ["https://testnet.hashio.io/api"],
              blockExplorerUrls: ["https://hashscan.io/testnet"],
            }],
          });
        }
      }

      // CLIENTS: Setup viem clients for Hedera Testnet.
      const wallet = createWalletClient({
        chain: hederaTestnet,
        transport: custom(window.ethereum),
        pollingInterval: 15000,
      });

      const pub = createPublicClient({
        chain: hederaTestnet,
        transport: http("https://testnet.hashio.io/api"),
        pollingInterval: 15000,
      });

      // REQUEST: Trigger account selection popup.
      const [address] = await wallet.requestAddresses();

      setWalletClient(wallet);
      setPublicClient(pub);

      await updateAccountData(address, pub);
      setError(null);
    } catch (err) {
      setError("User rejected connection");
      setStatus("disconnected");
    }
  };

  /**
   * TX HANDLER: Manages the lifecycle of a blockchain transaction.
   */
  const sendTransaction = async (txConfig) => {
    if (!walletClient || !account) throw new Error("Wallet not connected");

    setTxLoading(true);
    setError(null);

    try {
      // EXECUTE: Send and sign the transaction.
      const hash = await walletClient.sendTransaction({
        account,
        ...txConfig,
      });

      // AWAIT: Wait for the on-chain receipt.
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      // SYNC: Update balance after transaction.
      await updateAccountData(account, publicClient);
      return receipt;
    } catch (err) {
      const msg = err.shortMessage || err.message;
      setError(msg);
      throw err;
    } finally {
      setTxLoading(false);
    }
  };

  /* ---------------- LIFECYCLE (RECONNECT & LISTENERS) ---------------- */

  useEffect(() => {
    if (!window.ethereum) {
      setStatus("disconnected");
      return;
    }

    // INITIAL SETUP: Create clients on mount.
    const wallet = createWalletClient({
      chain: hederaTestnet,
      transport: custom(window.ethereum),
    });

    const pub = createPublicClient({
      chain: hederaTestnet,
      transport: http("https://testnet.hashio.io/api"),
    });

    setWalletClient(wallet);
    setPublicClient(pub);

    const init = async () => {
      const savedAccount = getCookie(COOKIE_NAME);

      if (!savedAccount) {
        setStatus("disconnected");
        return;
      }

      try {
        // AUTO-CONNECT: Attempt to restore session if addresses are authorized.
        const accounts = await wallet.getAddresses();

        if (accounts.length > 0) {
          await updateAccountData(accounts[0], pub);
        } else {
          disconnect();
        }
      } catch {
        disconnect();
      }
    };

    init();

    // EVENT: Handle real-time account switching in the wallet extension.
    const handleAccounts = (accounts) => {
      if (accounts.length > 0) {
        updateAccountData(accounts[0], pub);
      } else {
        disconnect();
      }
    };

    // EVENT: Handle network switching.
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [updateAccountData, disconnect]);

  /* ---------------- RENDER ---------------- */

  const value = useMemo(
    () => ({
      account,
      balance,
      usdcBalance,
      status,
      error,
      txLoading,
      walletClient,
      publicClient,
      connect,
      disconnect,
      sendTransaction,
      refreshBalance: updateAccountData,
    }),
    [
      account,
      balance,
      usdcBalance,
      status,
      error,
      txLoading,
      connect,
      disconnect,
      updateAccountData,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
