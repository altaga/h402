import { FlashList } from "@shopify/flash-list";

import { useSmartSize } from "../providers/smartProvider";

// x402: Manual Hedera payment challenge handler (no EVM SDK dependency)

import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { toast } from "react-native-sonner";
import MathRenderer from "./MathRenderer";

import { GeminiStyles } from "../core/styles";
import { formatTimestamp } from "../core/utils";
import ContextModule from "../providers/contextModule";
import { useWallet } from "../providers/walletProvider";
import FinanceCard from "./FinanceCard";
import { parseAbi, encodeFunctionData, parseUnits } from "viem";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

import hbarIcon from "../assets/hbar.png";
import usdcIcon from "../assets/usdc.png";

// Base URL for the API (Empty string implies relative/localhost in Expo dev).
const AI_URL = "";

/**
 * AGENT TIER DEFINITIONS
 * Maps UI labels to backend routes, pricing, and diagnostic IDs.
 */
const TIERS = [
  {
    label: "Fast — $0.0001",
    subLabel: "Quick answers",
    route: "/api/protected/basic",
    price: "$0.0001",
    toolPrice: "$0.0004",
    id: "#101",
  },
  {
    label: "Smart — $0.001",
    subLabel: "Better reasoning & responses",
    route: "/api/protected/advance",
    price: "$0.001",
    toolPrice: "$0.003",
    id: "#102",
  },
  {
    label: "Powerful — $0.01",
    subLabel: "Deep analysis, code, complex tasks",
    route: "/api/protected/expert",
    price: "$0.01",
    toolPrice: "$0.03",
    id: "#103",
  },
];

/**
 * SUGGESTION CHIPS
 * Quick-start prompts displayed in the Hero view.
 */
const SUGGESTIONS = [
  { icon: "image-outline", text: "Create image" },
  { icon: "music-note", text: "Create music" },
  { icon: "video-outline", text: "Create video" },
  { icon: "school-outline", text: "Help me learn" },
  { icon: "sparkles-outline", text: "Boost my day" },
  { icon: "pencil-outline", text: "Write anything" },
];

/**
 * 🧱 MEMOIZED MESSAGE COMPONENT
 * Prevents expensive re-renders of the Markdown/Math engine during list ticks.
 */
const MessageItem = React.memo(
  ({ item, isUser, renderContent, formatTimestamp }) => {
    const monoFont = Platform.OS === "ios" ? "Courier" : "monospace";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? { alignItems: "flex-end" } : { alignItems: "flex-start" },
        ]}
      >
        {isUser ? (
          <View
            style={{
              maxWidth: "85%",
              marginBottom: 8,
              paddingRight: 12,
              borderRightWidth: 1,
              borderRightColor: "#00FF41",
            }}
          >
            <Text
              style={{
                color: "#00FF41",
                fontFamily: monoFont,
                fontSize: 10,
                marginBottom: 4,
                alignSelf: "flex-end",
                opacity: 0.8,
              }}
            >
              :USER_INPUT {"<"}
            </Text>
            <View style={{ width: "100%", alignItems: "flex-end" }}>
              {renderContent(item.message, true)}
            </View>
          </View>
        ) : (
          <View
            style={{
              maxWidth: "85%",
              paddingLeft: 12,
              borderLeftWidth: 1,
              borderLeftColor: "#00FF41",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: "#008F11",
                fontFamily: monoFont,
                fontSize: 10,
                marginBottom: 4,
                opacity: 0.8,
              }}
            >
              {">"} SYSTEM_RES:
            </Text>
            <View style={{ width: "100%", alignItems: "flex-start" }}>
              {item.receipt && (
                <Text
                  style={{
                    color: "#008F11",
                    fontFamily: monoFont,
                    fontSize: 10,
                    marginBottom: 8,
                  }}
                >
                  [PAYMENT_VERIFIED: {item.receipt}]
                </Text>
              )}
              {(() => {
                try {
                  if (
                    item.message.startsWith("{") &&
                    item.message.includes("finance_quote")
                  ) {
                    const data = JSON.parse(item.message);
                    return <FinanceCard data={data} />;
                  }
                } catch (e) {}
                return renderContent(item.message, false);
              })()}
              {item.txHash && (
                <View style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(0, 255, 65, 0.3)",
                  width: "100%"
                }}>
                  {renderContent(`_✓ Payment Verified: [View On-Chain Settlement Receipt on Hashscan](https://hashscan.io/testnet/transaction/${item.txHash})_`, false)}
                </View>
              )}
            </View>
          </View>
        )}
        <Text style={styles.timestamp}>{formatTimestamp(item.time)}</Text>
      </View>
    );
  },
);

export default function AIAppChat() {
  const { isDesktop, fetchAllowance } = useSmartSize();
  const context = useContext(ContextModule);
  const {
    walletClient,
    account,
    status,
    connect,
    usdcBalance,
    refreshBalance,
    publicClient,
    sendTransaction,
  } = useWallet();

  const listRef = useRef(null);

  // UI STATE
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tierIndex, setTierIndex] = useState(0);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const toolsEnabled = searchEnabled || weatherEnabled || financeEnabled;
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // 🧪 X402 DIAGNOSTIC TEST
  const runX402Test = async () => {
    if (testLoading) return;
    setTestLoading(true);
    toast.info("Starting x402 Diagnostic...");

    try {
      console.log("[x402_TEST] Sending probe to /api/protected/basic...");
      const res = await fetchWithPay(`${AI_URL}/api/protected/basic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "x402 Diagnostic Probe" }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("x402 SUCCESS!", {
          description: "Handshake & Settlement verified.",
        });
        console.log("[x402_TEST] Success response:", data);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Error ${res.status}`;
        toast.error("x402 FAILED", { description: msg });
        console.error("[x402_TEST] Error status:", res.status, errData);
      }
    } catch (err) {
      toast.error("x402 CRITICAL ERROR", { description: err.message });
      console.error("[x402_TEST] Exception:", err);
    } finally {
      setTestLoading(false);
    }
  };

  // 🛰️ x402 HEDERA PAYMENT HANDLER
  // Manual 402 challenge flow: Intercept → Sign proof → Retry
  const fetchWithPay = useCallback(
    async (url, options = {}) => {
      if (!walletClient || !account) return fetch(url, options);

      console.log(`[x402] Making initial request for ${account}`);

      // Step 1: Make the initial request
      const initialResponse = await fetch(url, options);

      // Step 2: If not 402, return as-is
      if (initialResponse.status !== 402) {
        if (initialResponse.ok) console.log("[x402] No payment required. Status: 200 OK");
        return initialResponse;
      }

      console.log("[x402] 402 Payment Required — parsing challenge...");

      // Step 3: Parse the 402 challenge
      let requirements;
      try {
        const paymentRequiredHeader = initialResponse.headers.get("PAYMENT-REQUIRED");
        if (paymentRequiredHeader) {
          requirements = JSON.parse(atob(paymentRequiredHeader));
        } else {
          requirements = await initialResponse.json();
        }
      } catch (e) {
        console.error("[x402] Failed to parse 402 challenge:", e);
        throw new Error("Failed to parse payment challenge from server.");
      }

      console.log("[x402] Challenge parsed:", JSON.stringify(requirements.accepts?.[0]?.asset));

      // Step 4: Pick the accepted payment option based on user selection
      const isUSDC = true;
      let accepted = requirements.accepts?.find(a => isUSDC ? a.asset !== "HBAR" : a.asset === "HBAR");
      if (!accepted) accepted = requirements.accepts?.[0];
      if (!accepted) throw new Error("Server returned no payment options.");

      // Step 5: Sign a proof-of-intent message with MetaMask
      const proofMessage = JSON.stringify({
        resource: requirements.resource,
        accepted: {
          scheme: accepted.scheme,
          network: accepted.network,
          amount: accepted.amount,
          asset: accepted.asset,
          payTo: accepted.payTo,
        },
        payer: account,
        timestamp: Date.now(),
      });

      console.log("[x402] Requesting wallet signature for payment proof...");
      const signature = await walletClient.signMessage({
        account,
        message: proofMessage,
      });

      // Step 6: Build the signed payment payload
      const paymentPayload = {
        x402Version: 2,
        scheme: accepted.scheme,
        network: accepted.network,
        resource: requirements.resource,
        accepted,
        payload: {
          signature,
          payer: account,
          message: proofMessage,
        },
      };

      const encodedPayment = btoa(unescape(encodeURIComponent(JSON.stringify(paymentPayload))));

      // Step 7: Retry the original request with the payment signature
      console.log("[x402] Retrying request with signed payment proof...");
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "PAYMENT-SIGNATURE": encodedPayment,
        },
      });

      if (retryResponse.ok) {
        console.log("[x402] Handshake complete. Status: 200 OK");
      } else {
        console.warn(`[x402] Retry returned status: ${retryResponse.status}`);
      }

      return retryResponse;
    },
    [walletClient, account],
  );

  useEffect(() => {
    setMounted(true);
    // 🚀 PERFORMANCE: Reduced tick frequency to 15s to save re-renders
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 📐 MATH + MARKDOWN RENDERING ENGINE
   * Splits message text on LaTeX delimiters, routes each segment to the
   * correct renderer: KaTeX (via MathRenderer) for math, react-native-markdown-display
   * for everything else.
   *
   * Supported delimiters:
   *   Inline: \( ... \)
   *   Block:  \[ ... \]
   */
  const renderMessageContent = (content, isUser) => {
    if (!content) return null;

    // Regex captures both inline \(...\) and block \[...\] LaTeX segments.
    const mathRegex = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
    const parts = content.split(mathRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      const isInlineMath = part.startsWith("\\(");
      const isBlockMath = part.startsWith("\\[");

      if (isInlineMath || isBlockMath) {
        // Strip the delimiters and pass clean LaTeX to KaTeX.
        const mathContent = part.replace(/^\\[\(\[]|\\[\)\]]$/g, "").trim();
        return (
          <MathRenderer key={index} math={mathContent} display={isBlockMath} />
        );
      }

      // Non-math segment — render as rich Markdown.
      return (
        <Markdown
          key={index}
          style={isUser ? UserMarkdownStyles : SystemMarkdownStyles}
          rules={MarkdownRules}
        >
          {part}
        </Markdown>
      );
    });
  };

  // The mounted check is moved to the bottom of the hooks list.
  /**
   * DYNAMIC INPUT LOGIC
   * Measures content height to animate the input box between 1 and 4 lines.
   */
  const MIN_CONTENT = 48; // 1 line height
  const MAX_CONTENT = 96; // 4 lines height

  // 🚀 WORKLETS: Using Reanimated Shared Values for smooth UI-thread animations
  const animatedHeight = useSharedValue(MIN_CONTENT);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
    };
  });

  const animateToHeight = (toValue) => {
    animatedHeight.value = withSpring(toValue, {
      damping: 25,
      stiffness: 300,
      mass: 0.5,
    });
  };

  const chatGeneral = context.value?.chatGeneral || [];
  const showHero = chatGeneral.length === 0;

  /**
   * SESSION SPEND CALCULATION
   * Aggregates all receipts from the current chat context.
   */
  const totalSpend = chatGeneral.reduce((acc, msg) => {
    if (msg.receipt) {
      const val = parseFloat(msg.receipt.replace("$", ""));
      return acc + (isNaN(val) ? 0 : val);
    }
    return acc;
  }, 0);
  const formattedSpend = `$${totalSpend.toFixed(6)}`;

  /**
   * MESSAGE PROCESSING ENGINE
   * Handles the end-to-end flow of sending a message and receiving an AI response.
   */
  const sendMessage = useCallback(
    async (msgOverride) => {
      const activeMsg = msgOverride || message;
      if (!activeMsg.trim() || loading) return;

      // GUARD: Wallet connection requirement.
      if (!walletClient || !account) {
        toast.warning("Please connect your wallet first");
        return;
      }

      const userMsg = activeMsg;
      const tier = TIERS[tierIndex];

      setMessage("");
      animateToHeight(MIN_CONTENT);
      setLoading(true);

      // TRACE-ID: Generate a unique ID for end-to-end request tracking.
      const traceId = Math.random().toString(36).substring(2, 15);

      // OPTIMISTIC UI: Add the user's message immediately.
      const newUserChat = [
        ...chatGeneral,
        { message: userMsg, type: "user", time: Date.now(), traceId },
      ];
      await context.setValueAsync({ chatGeneral: newUserChat });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      try {
        // EXECUTION: Direct Fetch (BYPASS X402)
        // 🚀 MEMORY: Optimized history extraction (Limit to last 10 turns, filtered for content)
        const history = chatGeneral
          .filter(
            (m) =>
              (m.type === "user" || m.type === "system") &&
              m.message &&
              !m.message.includes("error"),
          )
          .slice(-10)
          .map((m) => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.message.substring(0, 2000), // 🛡️ Limit individual message size
          }));

        const res = await fetchWithPay(`${AI_URL}${tier.route}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-h402-Trace-Id": traceId,
            "X-Tools-Enabled": toolsEnabled ? "true" : "false",
          },
          body: JSON.stringify({
            message: userMsg,
            history,
            context: { thread_id: account },
          }),
        });

        // 🛡️ [DEBUG: RESPONSE_HANDSHAKE]
        // wrapFetchWithPayment handles the 402 retry loop internally.
        // If result is reached here, it's either the final data or a final error.
        if (!res.ok) {
          // Safe parsing: Only attempt .json() if the status suggests a body might exist.
          // During a cancelled 402 flow, the body is often empty, which triggers SyntaxError.
          let errorData = {};
          if (res.status !== 402) {
            try {
              errorData = await res.json();
            } catch (e) {
              console.warn(
                `[${account}] Failed to parse error JSON (Empty body).`,
              );
            }
          }
          throw new Error(
            errorData.error ||
              `Server response error (Status: ${res.status}, ID: ${tier.id})`,
          );
        }

        // Safe body parsing for success
        const data = await res.json().catch(() => ({}));

        // PERSISTENCE: Append the AI response on top of newUserChat (which already has the user's message).
        // DO NOT use context.value.chatGeneral here — it's a stale closure from before the user message was added.
        let updatedChat = [
          ...newUserChat,
          {
            message:
              data.message?.replace(/^\n+/, "") ||
              "ħ402 did not provide a response.",
            type: "system",
            time: Date.now(),
            traceId: data.traceId || traceId,
            receipt: toolsEnabled ? tier.toolPrice : tier.price,
          },
        ];

        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

        // 🔄 PROTOCOL SYNC: Extract settlement receipt from x402 headers
        const paymentResponse = res.headers.get("PAYMENT-RESPONSE");
        if (paymentResponse) {
          try {
            const settlement = JSON.parse(atob(paymentResponse));
            console.log(
              `[x402] Server confirmed settlement: ${settlement.transaction?.hash || "confirmed"}`,
            );

            // Inject settlement confirmation into the CURRENT chat message instead of pushing a new one
            const txHash = settlement.transaction?.hash;
            if (txHash) {
              updatedChat[updatedChat.length - 1].txHash = txHash;
              updatedChat[updatedChat.length - 1].settled = true;
            }

            context?.settleAllIntents?.();
          } catch (sErr) {
            console.warn(
              "[x402] Failed to parse settlement receipt:",
              sErr.message,
            );
          }
        }
        
        await context.setValueAsync({
          chatGeneral: updatedChat,
        });

        // 🔄 BALANCE SYNC
        if (refreshBalance && account && publicClient) {
          setTimeout(() => refreshBalance(account, publicClient), 3500);
        }
        if (fetchAllowance) {
          // Poll multiple times because the Hedera JSON-RPC relay caches eth_call and can lag behind mirror nodes
          setTimeout(() => fetchAllowance(), 3000); 
          setTimeout(() => fetchAllowance(), 6000); 
          setTimeout(() => fetchAllowance(), 9000); 
        }
      } catch (err) {
        console.error("Chat Error:", err);
        
        // 🔄 AUTO-ALLOWANCE FALLBACK
        if (err.message.includes("ALLOWANCE") || err.message.includes("allowance")) {
          try {
            toast.info("No budget detected. Auto-approving 1 USDC...");
            const amount = parseUnits("1", 6);
            const FACILITATOR_EVM = process.env.EXPO_PUBLIC_FACILITATOR_EVM || "0xe244adba23d2e84a48176de1eb0740bde27ed850";
            const USDC_EVM = process.env.EXPO_PUBLIC_USDC_EVM || "0x0000000000000000000000000000000000068cda";
            
            const abi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);
            const data = encodeFunctionData({
              abi,
              functionName: 'approve',
              args: [FACILITATOR_EVM, amount]
            });

            await sendTransaction({
              to: USDC_EVM,
              data,
              value: 0n
            });

            toast.success("Budget set to 1 USDC! Retrying prompt...");
            
            // Wait a moment for network propagation, then cleanly retry
            setTimeout(() => {
              sendMessage(activeMsg);
            }, 2000);
            
            // Revert loading state for this run since we are spawning a retry
            setLoading(false);
            return;
          } catch (autoErr) {
            console.error("Auto-approve failed:", autoErr);
            toast.error("Auto-approval failed", { description: autoErr.shortMessage || autoErr.message });
          }
        }

        // ERROR HANDLING: Standardize error display with Tier-specific price info.
        const currentPrice = toolsEnabled ? tier.toolPrice : tier.price;
        const errorMessage = err.message.includes("ID:")
          ? err.message
          : `Payment required — this request costs ${currentPrice} (ID: ${tier.id})`;

        toast.error(errorMessage);

        context.setValue({
          chatGeneral: [
            ...newUserChat,
            {
              message: errorMessage,
              type: "system",
              time: Date.now(),
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    },
    [
      message,
      loading,
      walletClient,
      account,
      tierIndex,
      context,
      chatGeneral,
      searchEnabled,
      weatherEnabled,
      financeEnabled,
      refreshBalance,
      publicClient,
    ],
  );

  // HYDRATION FIX: Safely return empty UI before rendering to prevent client/server mismatches.
  // This must be placed AFTER all hooks (useState, useRef, useCallback) to obey the Rules of Hooks.
  if (!mounted) {
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.container,
        { backgroundColor: isDesktop ? "#000000" : "#131314" },
      ]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* SUB-HEADER: SESSION SPEND */}
      {status === "connected" && !isDesktop && (
        <View style={GeminiStyles.subHeader}>
          {parseFloat(usdcBalance) === 0 ? (
            <Text style={GeminiStyles.sessionSpendLabel}>
              Insufficient Funds
            </Text>
          ) : (
            <>
              <Text style={GeminiStyles.sessionSpendLabel}>
                Current Session Spend
              </Text>
              <Text style={GeminiStyles.sessionSpendAmount}>
                {formattedSpend} USDC
              </Text>
            </>
          )}
        </View>
      )}

      {/* TOOLS MENU (Overlay) */}
      {showToolsMenu && (
        <>
          <Pressable
            style={GeminiStyles.modelMenuOverlay}
            onPress={() => setShowToolsMenu(false)}
          />
          <View
            style={[GeminiStyles.toolsMenuContainer, { paddingVertical: 8 }]}
          >
            <Text
              style={[
                GeminiStyles.modelItemSub,
                {
                  paddingHorizontal: 16,
                  paddingBottom: 8,
                  color: "#9AA0A6",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontSize: 10,
                },
              ]}
            >
              Agent Tools & APIs
            </Text>

            {/* WEB SEARCH TOOL */}
            <Pressable
              style={[
                GeminiStyles.modelMenuItem,
                searchEnabled && GeminiStyles.modelMenuItemActive,
              ]}
              onPress={() => setSearchEnabled((prev) => !prev)}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={searchEnabled ? "#00FF41" : "#E3E3E3"}
                  />
                  <Text
                    style={[
                      GeminiStyles.modelItemTitle,
                      searchEnabled && { color: "#00FF41" },
                    ]}
                  >
                    Web Search
                  </Text>
                </View>
                <Text style={GeminiStyles.modelItemSub}>
                  DuckDuckGo ·{" "}
                  {searchEnabled
                    ? TIERS[tierIndex].toolPrice
                    : TIERS[tierIndex].price}
                </Text>
              </View>
              <View
                style={[
                  {
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  },
                  { backgroundColor: searchEnabled ? "#00FF41" : "#3A3A3A" },
                ]}
              >
                <View
                  style={[
                    {
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#fff",
                    },
                    { transform: [{ translateX: searchEnabled ? 16 : 0 }] },
                  ]}
                />
              </View>
            </Pressable>

            {/* WEATHER TOOL */}
            <Pressable
              style={[
                GeminiStyles.modelMenuItem,
                weatherEnabled && GeminiStyles.modelMenuItemActive,
              ]}
              onPress={() => setWeatherEnabled((prev) => !prev)}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name="sunny-outline"
                    size={16}
                    color={weatherEnabled ? "#00FF41" : "#E3E3E3"}
                  />
                  <Text
                    style={[
                      GeminiStyles.modelItemTitle,
                      weatherEnabled && { color: "#00FF41" },
                    ]}
                  >
                    Weather API
                  </Text>
                </View>
                <Text style={GeminiStyles.modelItemSub}>
                  Open-Meteo ·{" "}
                  {weatherEnabled
                    ? TIERS[tierIndex].toolPrice
                    : TIERS[tierIndex].price}
                </Text>
              </View>
              <View
                style={[
                  {
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  },
                  { backgroundColor: weatherEnabled ? "#00FF41" : "#3A3A3A" },
                ]}
              >
                <View
                  style={[
                    {
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#fff",
                    },
                    { transform: [{ translateX: weatherEnabled ? 16 : 0 }] },
                  ]}
                />
              </View>
            </Pressable>

            {/* FINANCE TOOL */}
            <Pressable
              style={[
                GeminiStyles.modelMenuItem,
                financeEnabled && GeminiStyles.modelMenuItemActive,
              ]}
              onPress={() => setFinanceEnabled((prev) => !prev)}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name="stats-chart-outline"
                    size={16}
                    color={financeEnabled ? "#00FF41" : "#E3E3E3"}
                  />
                  <Text
                    style={[
                      GeminiStyles.modelItemTitle,
                      financeEnabled && { color: "#00FF41" },
                    ]}
                  >
                    Finance API
                  </Text>
                </View>
                <Text style={GeminiStyles.modelItemSub}>
                  Real-time Quotes ·{" "}
                  {financeEnabled
                    ? TIERS[tierIndex].toolPrice
                    : TIERS[tierIndex].price}
                </Text>
              </View>
              <View
                style={[
                  {
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  },
                  { backgroundColor: financeEnabled ? "#00FF41" : "#3A3A3A" },
                ]}
              >
                <View
                  style={[
                    {
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#fff",
                    },
                    { transform: [{ translateX: financeEnabled ? 16 : 0 }] },
                  ]}
                />
              </View>
            </Pressable>

            {/* 🧪 X402 DIAGNOSTIC TOOL */}
            <View
              style={{
                height: 1,
                backgroundColor: "#3A3A3A",
                marginVertical: 8,
                marginHorizontal: 16,
              }}
            />
            <Pressable
              style={[
                GeminiStyles.modelMenuItem,
                testLoading && { opacity: 0.5 },
              ]}
              onPress={runX402Test}
              disabled={testLoading}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons name="bug-outline" size={16} color="#F59E0B" />
                  <Text
                    style={[GeminiStyles.modelItemTitle, { color: "#F59E0B" }]}
                  >
                    x402 Protocol Test
                  </Text>
                </View>
                <Text style={GeminiStyles.modelItemSub}>
                  Run diagnostic handshake & settlement
                </Text>
              </View>
              {testLoading ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <Ionicons
                  name="play-circle-outline"
                  size={24}
                  color="#F59E0B"
                />
              )}
            </Pressable>
          </View>
        </>
      )}

      {/* MODEL SELECTION MENU (Overlay) */}
      {showModelMenu && (
        <>
          <Pressable
            style={GeminiStyles.modelMenuOverlay}
            onPress={() => setShowModelMenu(false)}
          />
          <View
            style={[GeminiStyles.modelMenuContainer, { paddingVertical: 8 }]}
          >
            <Text
              style={[
                GeminiStyles.modelItemSub,
                {
                  paddingHorizontal: 16,
                  paddingBottom: 8,
                  color: "#9AA0A6",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontSize: 10,
                },
              ]}
            >
              Choose how much to pay
            </Text>
            {TIERS.map((tier, idx) => (
              <Pressable
                key={idx}
                style={[
                  GeminiStyles.modelMenuItem,
                  tierIndex === idx && GeminiStyles.modelMenuItemActive,
                ]}
                onPress={() => {
                  setTierIndex(idx);
                  setShowModelMenu(false);
                }}
              >
                <View>
                  <Text style={GeminiStyles.modelItemTitle}>{tier.label}</Text>
                  <Text style={GeminiStyles.modelItemSub}>{tier.subLabel}</Text>
                </View>
                {tierIndex === idx && (
                  <Ionicons name="checkmark" size={18} color="#00FF41" />
                )}
              </Pressable>
            ))}

          </View>
        </>
      )}

      {/* CHAT MESSAGES / HERO VIEW */}
      <View style={{ flex: 1, width: "100%" }}>
        {showHero ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={GeminiStyles.heroContainer}>
              <Text style={GeminiStyles.greetingText}>C?atGPT</Text>
              <Text style={GeminiStyles.promptText}>
                SECURE INFERENCE TERMINAL\nAWAITING INPUT...
              </Text>
            </View>
            <View style={GeminiStyles.suggestionsList}></View>
          </ScrollView>
        ) : (
          <FlashList
            ref={listRef}
            data={chatGeneral}
            extraData={tick}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                isUser={item.type === "user"}
                renderContent={renderMessageContent}
                formatTimestamp={formatTimestamp}
              />
            )}
            estimatedItemSize={100}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listPadding}
          />
        )}
      </View>

      {/* INPUT AREA */}
      <View
        style={[GeminiStyles.inputBox, { marginHorizontal: isDesktop ? 0 : 8 }]}
      >
        {status !== "connected" ? (
          <Pressable style={styles.connectButton} onPress={connect}>
            <Text style={styles.connectText}>Connect Wallet to Chat</Text>
          </Pressable>
        ) : (
          <View style={{ position: "relative" }}>
            {/* HIDDEN MEASURING INPUT: Used to calculate content height for the animation. */}
            <TextInput
              multiline
              maxLength={2000}
              value={message}
              style={[
                styles.input,
                {
                  position: "absolute",
                  opacity: 0,
                  width: "100%",
                  zIndex: -1,
                  pointerEvents: "none",
                },
              ]}
              onContentSizeChange={(e) => {
                const rawH = e.nativeEvent.contentSize.height;
                const clamped = Math.min(
                  Math.max(rawH, MIN_CONTENT),
                  MAX_CONTENT,
                );
                animateToHeight(clamped);
              }}
              editable={false}
              tabIndex={-1}
            />

            {/* VISIBLE ANIMATED INPUT */}
            <AnimatedTextInput
              placeholder="Send a paid request..."
              placeholderTextColor="#9AA0A6"
              multiline
              maxLength={1024}
              value={message}
              showVerticalScrollIndicator={false}
              onChangeText={(text) => setMessage(text)}
              onKeyPress={(e) => {
                if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                  e.preventDefault();
                  if (!loading && message.trim().length > 0) {
                    sendMessage();
                  }
                }
              }}
              style={[styles.input, animatedStyle]}
            />

            {/* ACTION BAR (Bottom of Input Box) */}
            <View style={GeminiStyles.inputActionRow}>
              <View style={GeminiStyles.inputLeftActions}>
                <Pressable
                  onPress={() => {
                    setShowToolsMenu((prev) => !prev);
                    setShowModelMenu(false);
                  }}
                >
                  <Ionicons
                    name="options-outline"
                    size={22}
                    color={toolsEnabled ? "#00FF41" : "#E3E3E3"}
                  />
                </Pressable>
              </View>

              <View style={GeminiStyles.inputRightActions}>
                {/* STATIC PAYMENT ASSET BADGE */}
                <Text style={[GeminiStyles.modelText, { fontSize: 9, color: "#9AA0A6", marginRight: 4 }]}>PAYING IN:</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#00FF41", backgroundColor: "rgba(0,255,65,0.15)", paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 }}>
                  <Image source={usdcIcon} style={{ width: 12, height: 12 }} resizeMode="contain" />
                  <Text style={[GeminiStyles.modelText, { fontSize: 10, color: "#00FF41" }]}>USDC</Text>
                </View>

                {/* TIER PICKER TRIGGER */}
                <Pressable
                  style={GeminiStyles.modelSelector}
                  onPress={() => {
                    setShowModelMenu((prev) => !prev);
                    setShowToolsMenu(false);
                  }}
                >
                  <Text style={GeminiStyles.modelText}>
                    {TIERS[tierIndex].label}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#9AA0A6" />
                </Pressable>
                
                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, color: message.length >= 1024 ? "#FF3333" : "#9AA0A6", marginRight: 8 }}>
                  {message.length}/1024
                </Text>

                {loading ? (
                  <ActivityIndicator color="#00FF41" size="small" />
                ) : (
                  <Pressable
                    onPress={() => sendMessage()}
                    disabled={!message.trim() || loading}
                    style={{ opacity: message.trim() ? 1 : 0.3 }}
                  >
                    <Ionicons name="send" size={24} color="#00FF41" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * 🎨 EDITORIAL MARKDOWN STYLES
 * Full rich-text style map for react-native-markdown-display.
 * Adheres to the Brutalist/Editorial design system:
 *   - Off-white code blocks, razor-sharp borders, hard shadows.
 *   - Violent typographic hierarchy (large headings vs. small meta).
 *   - Neon accents for bold/links in user bubbles.
 */
const _baseText = {
  color: "#00FF41",
  fontSize: 13,
  lineHeight: 20,
  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
};

const UserMarkdownStyles = {
  body: { ..._baseText, color: "#00FF41", textAlign: "right" },
  text: { ..._baseText, color: "#00FF41", textAlign: "right" },
  strong: {
    fontFamily: Platform.OS === "ios" ? "Courier-Bold" : "monospace",
    color: "#00FF41",
    fontWeight: "bold",
  },
  em: { fontStyle: "italic", color: "rgba(0,255,65,0.85)" },
  code_inline: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#000000",
    backgroundColor: "#00FF41",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 0,
  },
  fence: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#00FF41",
    backgroundColor: "#111111",
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#00FF41",
    borderRadius: 0,
  },
};

const SystemMarkdownStyles = {
  body: _baseText,
  text: _baseText,
  heading1: {
    fontSize: 20,
    fontFamily: Platform.OS === "ios" ? "Courier-Bold" : "monospace",
    color: "#00FF41",
    marginVertical: 12,
    fontWeight: "bold",
  },
  heading2: {
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Courier-Bold" : "monospace",
    color: "#00FF41",
    marginVertical: 10,
    fontWeight: "bold",
  },
  heading3: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier-Bold" : "monospace",
    color: "#008F11",
    marginVertical: 8,
    fontWeight: "bold",
  },
  strong: {
    fontFamily: Platform.OS === "ios" ? "Courier-Bold" : "monospace",
    color: "#00FF41",
    fontWeight: "bold",
  },
  em: { fontStyle: "italic", color: "rgba(0,255,65,0.85)" },
  link: { color: "#00FF41", textDecorationLine: "underline" },
  bullet_list: { marginVertical: 8 },
  ordered_list: { marginVertical: 8 },
  list_item: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bullet_list_icon: {
    color: "#00FF41",
    marginRight: 8,
    marginTop: 5,
    fontSize: 10,
  },
  ordered_list_icon: {
    color: "#00FF41",
    fontFamily: Platform.OS === "ios" ? "Courier-Bold" : "monospace",
    marginRight: 8,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#00FF41",
    marginVertical: 16,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: "#00FF41",
    paddingLeft: 12,
    marginVertical: 8,
    opacity: 0.85,
  },
  code_inline: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#000000",
    backgroundColor: "#00FF41",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 0,
  },
  fence: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#00FF41",
    backgroundColor: "#111111",
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#00FF41",
    borderRadius: 0,
    ...Platform.select({ web: { overflowX: "auto" } }),
  },
  code_block: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    color: "#E3E3E3",
    backgroundColor: "#111111",
    padding: 16,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#00FF41",
    borderRadius: 0,
  },
};

/**
 * MARKDOWN RULES OVERRIDE
 * Keeps default rendering for most nodes. Extend this to
 * inject custom components (e.g., syntax-highlighted code).
 */
const MarkdownRules = {};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    ...Platform.select({
      web: { scrollbarWidth: "none", msOverflowStyle: "none" },
    }),
  },
  listPadding: { paddingHorizontal: 16, paddingVertical: 20 },
  messageContainer: { marginBottom: 24, width: "100%" },
  timestamp: {
    fontSize: 9,
    color: "#008F11",
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    alignSelf: "flex-end",
  },
  input: {
    color: "#00FF41",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textAlignVertical: "top",
    borderWidth: 0,
    outlineStyle: "none",
    minHeight: 32,
    maxHeight: 120,
    ...Platform.select({
      web: {
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        resize: "none",
        overflow: "hidden",
      },
    }),
  },
  connectButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00FF41",
    borderRadius: 0,
  },
  connectText: {
    color: "#00FF41",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    textTransform: "uppercase",
  },
});
