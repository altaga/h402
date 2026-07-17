/**
 * 👑 ħ402 LABS - EXPANDED WALLET INFO COMPONENT
 * 
 * An informational UI component that displays the connected wallet's address and balance.
 * Used in settings or profile views where more granular account detail is required.
 */

import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { formatEther } from "viem";
import { useWallet } from "../providers/walletProvider";
import {
  mainColor,
  WalletButtonExpandedStyles as styles,
} from "../core/styles";

const ConnectButtonExpanded = () => {
  // LIFESTYLE: Access the full wallet state from global context.
  const {
    account,
    balance,
    status,
    error,
    connect,
    disconnect,
  } = useWallet();

  const [hederaId, setHederaId] = React.useState(null);

  React.useEffect(() => {
    if (account && status === "connected") {
      fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${account}`)
        .then(res => res.json())
        .then(data => {
            if (data.account) setHederaId(data.account);
        })
        .catch(err => console.log("[MIRROR_NODE] Failed to fetch Account ID:", err));
    } else {
      setHederaId(null);
    }
  }, [account, status]);

  /**
   * FORMATTING: Truncate long EVM addresses for mobile readability.
   * e.g., 0x1234...abcd
   */
  const truncate = (str) =>
    `${str.substring(0, 6)}...${str.substring(str.length - 4)}`;

  /**
   * CALCULATIONS: Format BigInt balance to human-readable HBAR (4 decimal places).
   */
  const formattedBalance =
    typeof balance === "bigint"
      ? parseFloat(formatEther(balance)).toFixed(4)
      : parseFloat(balance || 0).toFixed(4);

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  // UI: Loading Transition
  if (status === "loading") {
    return (
      <TouchableOpacity
        style={[styles.button, styles.loadingButton]}
        disabled
      >
        <ActivityIndicator size="small" color="#00FF41" />
        <Text style={styles.buttonText}>Connecting...</Text>
      </TouchableOpacity>
    );
  }

  // UI: Detailed Account View (Visible when status === "connected")
  if (status === "connected") {
    return (
      <View style={styles.connectedContainer}>
        {/* BALANCE MODULE */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceAmount}>
            {formattedBalance} HBAR
          </Text>
        </View>

        {/* ADDRESS MODULE */}
        <View style={styles.accountContainer}>
          <Text style={styles.accountLabel}>Account</Text>
          <Text style={styles.accountAddress}>
            {hederaId ? hederaId : truncate(account)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={handleDisconnect}
        >
          <Text style={styles.disconnectButtonText}>
            Disconnect
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // UI: Default State (Connect CTA + Error Messaging)
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleConnect}>
        <Text style={styles.buttonText}>Connect Wallet</Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export default ConnectButtonExpanded;
