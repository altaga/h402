import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  PixelRatio,
  Platform,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import { parseAbi, encodeFunctionData, parseUnits, formatUnits } from "viem";
import { useCallback } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { toast } from "react-native-sonner";
import ContextModule from "./contextModule";
import { useWallet } from "./walletProvider";

// 1. Create the Context
const SmartSizeContext = createContext({
  width: 0,
  height: 0,
  scale: 1,
  normalize: (size) => size,
});

// 2. Export the Hook
export const useSmartSize = () => useContext(SmartSizeContext);

export default function SmartProvider({ children }) {
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [windowDimensions, setWindowDimensions] = useState(
    Dimensions.get("window"),
  );
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hederaId, setHederaId] = useState(null);
  
  // BUDGET LOGIC
  const [budgetInput, setBudgetInput] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [currentAllowance, setCurrentAllowance] = useState("0.000000");

  // 🚀 WORKLETS: UI-thread Sidebar Animation
  const sidebarWidthShared = useSharedValue(280);

  const sidebarAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: sidebarWidthShared.value,
    };
  });

  useEffect(() => {
    sidebarWidthShared.value = withSpring(isSidebarCollapsed ? 68 : 280, {
      damping: 25,
      stiffness: 300,
      mass: 0.5,
    });
  }, [isSidebarCollapsed]);
  const router = useRouter();
  const segments = useSegments();
  const {
    account,
    usdcBalance,
    status,
    disconnect,
    refreshBalance,
    publicClient,
    sendTransaction,
  } = useWallet();

  const handleApproveBudget = async () => {
    if (!budgetInput || isNaN(budgetInput) || Number(budgetInput) <= 0) {
      toast.error("Please enter a valid USDC budget amount.");
      return;
    }
    setIsApproving(true);
    try {
      const amount = parseUnits(budgetInput, 6);
      const FACILITATOR_EVM = process.env.EXPO_PUBLIC_FACILITATOR_EVM || "0xe244adba23d2e84a48176de1eb0740bde27ed850"; // Alias that maps to 0.0.9572127
      const USDC_EVM = process.env.EXPO_PUBLIC_USDC_EVM || "0x0000000000000000000000000000000000068cda";
      
      const abi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);
      const data = encodeFunctionData({
        abi,
        functionName: 'approve',
        args: [FACILITATOR_EVM, amount]
      });

      toast.info(`Approving ${budgetInput} USDC for Agent...`);
      await sendTransaction({
        to: USDC_EVM,
        data,
        value: 0n
      });

      toast.success("Budget Approved!", { description: `Agent can now spend up to ${budgetInput} USDC.` });
      setBudgetInput(""); // Clear input on success
    } catch (err) {
      toast.error("Approval Failed", { description: err.shortMessage || err.message });
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  const fetchAllowance = useCallback(async () => {
      if (!account || !publicClient) return;
      try {
        const FACILITATOR_EVM = process.env.EXPO_PUBLIC_FACILITATOR_EVM || "0xe244adba23d2e84a48176de1eb0740bde27ed850";
        const USDC_EVM = process.env.EXPO_PUBLIC_USDC_EVM || "0x0000000000000000000000000000000000068cda";
        const allowance = await publicClient.readContract({
          address: USDC_EVM,
          abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
          functionName: 'allowance',
          args: [account, FACILITATOR_EVM]
        });
        setCurrentAllowance(Number(formatUnits(allowance, 6)).toFixed(6));
      } catch (err) {
        console.error("[x402] Failed to fetch allowance:", err);
      }
    }, [account, publicClient]);

  useEffect(() => {
    if (account && status === "connected") {
      fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${account}`)
        .then(res => res.json())
        .then(data => {
            if (data.account) setHederaId(data.account);
        })
        .catch(err => console.log("[MIRROR_NODE] Failed to fetch Account ID:", err));
        
      fetchAllowance();
      const interval = setInterval(fetchAllowance, 15000);
      return () => clearInterval(interval);
    } else {
      setHederaId(null);
    }
  }, [account, status, publicClient]);

  useEffect(() => {
    setIsMounted(true);
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setWindowDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const ratio = windowDimensions.height / windowDimensions.width;

  /**
   * 🖥️ DESKTOP VS MOBILE DETECTION
   * Desktop: Web + Landscape mode.
   * Mobile: Native OR Web in Portrait/Narrow mode.
   */
  const isDesktop = isMounted
    ? Platform.OS === "web" && ratio < 1.2 && windowDimensions.width > 768
    : false;

  const context = useContext(ContextModule);

  const chatGeneral = context?.value?.chatGeneral || [];

  // 🚀 MEMORY: Memoize spend calculation to prevent redundant math on layout ticks
  const totalSpend = useMemo(() => {
    return chatGeneral.reduce((acc, msg) => {
      if (msg.receipt) {
        const val = typeof msg.receipt === 'string' ? parseFloat(msg.receipt.replace("$", "")) : parseFloat(msg.receipt);
        return acc + (isNaN(val) ? 0 : val);
      }
      return acc;
    }, 0);
  }, [chatGeneral]);

  const formattedSpend = useMemo(
    () => `$${totalSpend.toFixed(6)}`,
    [totalSpend],
  );

  const internalSize = useMemo(() => {
    let width, height;

    // On desktop, we still want to keep the "focused" app feel for the content,
    // but the layout itself is full desktop.
    if (!isDesktop) {
      width = windowDimensions.width;
      height = windowDimensions.height;
    } else {
      // Content width on desktop sidebar layout
      // We use a simplified listener for the memo to ensure it reacts to the target state
      const sidebarTarget = isSidebarCollapsed ? 68 : 280;
      width = Math.min(600, windowDimensions.width - sidebarTarget);
      height = windowDimensions.height;
    }

    const baseScale = width / 375;
    const factor = 0.4;
    const moderateScale = 1 + (baseScale - 1) * factor;
    const clampedScale = Math.max(0.85, Math.min(1.2, moderateScale));
    const normalize = (size) =>
      PixelRatio.roundToNearestPixel(size * clampedScale);

    return {
      width,
      height,
      scale: clampedScale,
      normalize,
      isDesktop,
      fetchAllowance,
    };
  }, [windowDimensions, isDesktop, fetchAllowance]);

  const handleLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setFrameSize((prev) => {
      if (
        Math.round(prev.width) === Math.round(width) &&
        Math.round(prev.height) === Math.round(height)
      ) {
        return prev;
      }
      return { width, height };
    });
  };

  const isActive = (route) => {
    return segments.includes(route);
  };

  /**
   * 🎨 DESKTOP LAYOUT COMPONENTS
   */
  const renderSidebar = () => (
    <Animated.View
      style={[
        styles.sidebar,
        sidebarAnimatedStyle,
        { overflow: "hidden" },
        isSidebarCollapsed && styles.sidebarCollapsed,
      ]}
    >
      <View
        style={{
          width: 280,
          flex: 1,
          padding: 24,
          justifyContent: "space-between",
        }}
      >
        <View style={styles.sidebarTop}>
          <View
            style={{
              flexDirection: isSidebarCollapsed ? "column" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 40,
            }}
          >
            {!isSidebarCollapsed && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >

                <View>
                  <Text style={styles.logoText}>ħ402</Text>
                  <Text style={styles.logoSubtext}>HEDERA - X402</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ padding: 4 }}
            >
              <Ionicons name="menu" size={24} color="#00FF41" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.navSection}>
          <TouchableOpacity
            style={[
              styles.navItem,
              isSidebarCollapsed && styles.navItemCollapsed,
              isActive("main") && styles.navItemActive,
            ]}
            onPress={() => router.push("/main")}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={20}
              color={isActive("main") ? "#00FF41" : "#008F11"}
            />
            {!isSidebarCollapsed && (
              <Text
                style={[
                  styles.navText,
                  isActive("main") && styles.navTextActive,
                ]}
              >
                AI Assistant
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navItem,
              isSidebarCollapsed && styles.navItemCollapsed,
              isActive("dashboard") && styles.navItemActive,
            ]}
            onPress={() => router.push("/dashboard")}
          >
            <Feather
              name="grid"
              size={20}
              color={isActive("dashboard") ? "#00FF41" : "#008F11"}
            />
            {!isSidebarCollapsed && (
              <Text
                style={[
                  styles.navText,
                  isActive("dashboard") && styles.navTextActive,
                ]}
              >
                Dashboard
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {(status === "connected" || !segments.includes("connect")) && (
          <View style={styles.sidebarFooter}>
            {status === "connected" ? (
              <View
                style={[
                  styles.walletInfo,
                  isSidebarCollapsed && styles.walletInfoCollapsed,
                ]}
              >
                {isSidebarCollapsed ? (
                  <View style={styles.statusDot} />
                ) : (
                  <>
                    <View style={styles.walletHeader}>
                      <View style={styles.statusDot} />
                      <Text style={styles.walletAddress}>
                        {hederaId ? hederaId : (account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : "")}
                      </Text>
                    </View>
                    <Text style={styles.walletBalance}>
                      {usdcBalance
                        ? parseFloat(usdcBalance).toFixed(6)
                        : "0.000000"}{" "}
                      USDC
                    </Text>

                    {/* BUDGET INPUT */}
                    <View style={styles.budgetContainer}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <Text style={[styles.budgetLabel, { marginBottom: 0 }]}>AGENT BUDGET</Text>
                        <Text style={styles.budgetCurrent}>ALLOWANCE: {currentAllowance} USDC</Text>
                      </View>
                      <View style={styles.budgetInputWrapper}>
                        <TextInput 
                          style={styles.budgetInputRaw} 
                          value={budgetInput}
                          onChangeText={setBudgetInput}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor="#008F11"
                        />
                        <TouchableOpacity 
                          style={[styles.budgetActionBtn, isApproving && { opacity: 0.5 }]} 
                          onPress={handleApproveBudget}
                          disabled={isApproving}
                        >
                          <Text style={styles.budgetActionBtnText}>{isApproving ? "..." : "APPROVE"}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.cardSpendContainer}>
                      <Text style={styles.cardSpendLabel}>Session Spend</Text>
                      <Text style={styles.cardSpendValue}>
                        {formattedSpend}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.disconnectLink}
                      onPress={disconnect}
                    >
                      <Text style={styles.disconnectLinkText}>Disconnect</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.connectButton,
                  isSidebarCollapsed && styles.connectButtonCollapsed,
                ]}
                onPress={() => router.push("/connect")}
              >
                {isSidebarCollapsed ? (
                  <Ionicons name="wallet-outline" size={20} color="#00FF41" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect Wallet</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <SmartSizeContext.Provider value={internalSize}>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        {isDesktop ? (
          <View style={styles.desktopWrapper}>
            {renderSidebar()}
            <View style={styles.contentArea}>
              <View
                style={{
                  width: internalSize.width,
                  height: "100%",
                  alignSelf: "center",
                }}
              >
                {children}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
      </View>
    </SmartSizeContext.Provider>
  );
}

const monoFont = Platform.OS === "ios" ? "Courier" : "monospace";

const styles = {
  desktopWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#000000",
  },
  sidebar: {
    backgroundColor: "#000000",
    borderRightWidth: 1,
    borderRightColor: "#00FF41",
  },
  sidebarTop: {
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    color: "#00FF41",
    fontFamily: monoFont,
    letterSpacing: 2,
    fontWeight: "bold",
  },
  logoSubtext: {
    fontSize: 10,
    color: "#008F11",
    fontFamily: monoFont,
    marginTop: 2,
    letterSpacing: 1,
  },
  navSection: {
    flex: 1,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 0,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  navItemActive: {
    backgroundColor: "rgba(0, 255, 65, 0.1)",
    borderColor: "#00FF41",
    borderLeftWidth: 4,
  },
  navText: {
    color: "#008F11",
    fontSize: 15,
    fontFamily: monoFont,
    marginLeft: 12,
    letterSpacing: 1,
  },
  navTextActive: {
    color: "#00FF41",
    fontFamily: monoFont,
    fontWeight: "bold",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "#00FF41",
    paddingTop: 24,
  },
  walletInfo: {
    backgroundColor: "#000000",
    padding: 16,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#00FF41",
    overflow: "hidden",
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: "#00FF41",
    marginRight: 8,
  },
  walletAddress: {
    color: "#00FF41",
    fontFamily: monoFont,
    fontSize: 12,
  },
  walletBalance: {
    color: "#008F11",
    fontSize: 14,
    fontFamily: monoFont,
    marginBottom: 12,
  },
  disconnectLink: {
    alignSelf: "flex-start",
  },
  disconnectLinkText: {
    color: "#8B0000",
    fontSize: 12,
    fontFamily: monoFont,
    textDecorationLine: "underline",
  },
  connectButton: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#00FF41",
    paddingVertical: 12,
    borderRadius: 0,
    alignItems: "center",
  },
  connectButtonText: {
    color: "#00FF41",
    fontFamily: monoFont,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  budgetContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  budgetLabel: {
    fontSize: 9,
    color: "#008F11",
    fontFamily: monoFont,
    letterSpacing: 1,
    marginBottom: 6,
  },
  budgetCurrent: {
    fontSize: 9,
    color: "#00FF41",
    fontFamily: monoFont,
    letterSpacing: 1,
  },
  budgetInputWrapper: {
    position: "relative",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#00FF41",
    height: 32,
    width: "100%",
    overflow: "hidden",
  },
  budgetInputRaw: {
    width: "100%",
    height: "100%",
    color: "#00FF41",
    fontFamily: monoFont,
    paddingLeft: 8,
    paddingRight: 64,
    fontSize: 12,
  },
  budgetActionBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(0, 255, 65, 0.15)",
    borderLeftWidth: 1,
    borderLeftColor: "#00FF41",
    justifyContent: "center",
    alignItems: "center",
  },
  budgetActionBtnText: {
    color: "#00FF41",
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  cardSpendContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#008F11",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardSpendLabel: {
    fontSize: 11,
    color: "#008F11",
    fontFamily: monoFont,
  },
  cardSpendValue: {
    fontSize: 12,
    color: "#00FF41",
    fontFamily: monoFont,
    fontWeight: "bold",
  },
  sidebarCollapsed: {
    paddingHorizontal: 0,
    alignItems: "center",
  },
  navItemCollapsed: {
    paddingHorizontal: 0,
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 0,
    alignSelf: "center",
  },
  walletInfoCollapsed: {
    padding: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    alignItems: "center",
  },
  connectButtonCollapsed: {
    width: 40,
    height: 40,
    borderRadius: 0,
    paddingVertical: 0,
    justifyContent: "center",
  },
};
