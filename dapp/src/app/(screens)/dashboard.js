import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import { useSmartSize } from '../../providers/smartProvider';
import { FlashList } from "@shopify/flash-list";
import { backgroundColor, surfaceColor, textColor, mutedText, mainColor, mutedColor } from '../../core/styles';

const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const HASHSCAN = "https://hashscan.io/testnet";

/**
 * 🧱 STAT ROW — Key/value pair with optional accent
 */
const StatRow = React.memo(({ label, value, accent, mono = true, selectable = false }) => (
    <View style={s.statRow}>
        <Text style={s.statLabel}>{label}</Text>
        <Text 
            style={[s.statValue, accent && { color: accent }, !mono && { letterSpacing: 0 }]} 
            selectable={selectable}
            numberOfLines={1}
        >
            {value}
        </Text>
    </View>
));

/**
 * 🧱 LINK ROW — Clickable row that opens Hashscan
 */
const LinkRow = React.memo(({ label, value, displayValue, type = "account" }) => {
    const url = type === "token" 
        ? `${HASHSCAN}/token/${value}` 
        : type === "evm" 
            ? `${HASHSCAN}/account/${value}` 
            : `${HASHSCAN}/account/${value}`;
    
    return (
        <TouchableOpacity style={s.statRow} onPress={() => Linking.openURL(url)} activeOpacity={0.6}>
            <Text style={s.statLabel}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                <Text style={[s.statValue, { color: mainColor, textDecorationLine: 'underline', maxWidth: '100%' }]} numberOfLines={1}>
                    {displayValue || value}
                </Text>
                <Text style={{ color: mutedText, fontSize: 10 }}>↗</Text>
            </View>
        </TouchableOpacity>
    );
});

/**
 * 🧱 SECTION HEADER
 */
const SectionHeader = React.memo(({ title, badge }) => (
    <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        {badge && (
            <View style={[s.badge, badge === "ONLINE" && s.badgeOnline, badge === "TESTNET" && s.badgeTestnet]}>
                {badge === "ONLINE" && <View style={s.badgeDot} />}
                <Text style={[s.badgeText, badge === "ONLINE" && s.badgeTextOnline, badge === "TESTNET" && s.badgeTextTestnet]}>{badge}</Text>
            </View>
        )}
        <View style={s.sectionLine} />
    </View>
));

/**
 * 🧱 METRIC CARD — Large number with label and subtext
 */
const MetricCard = React.memo(({ label, value, sub, accent }) => (
    <View style={s.metricCard}>
        <Text style={s.metricLabel}>{label}</Text>
        <Text style={[s.metricValue, accent && { color: accent }]}>{value}</Text>
        {sub && <Text style={s.metricSub}>{sub}</Text>}
    </View>
));

/**
 * 🧱 TX ROW — Single transaction in activity feed
 */
const TxRow = React.memo(({ tx }) => {
    const ts = tx.timestamp ? new Date(parseFloat(tx.timestamp) * 1000).toLocaleString() : "—";
    const hashscanUrl = `https://hashscan.io/testnet/transaction/${tx.id}`;

    return (
        <TouchableOpacity style={s.txRow} onPress={() => Linking.openURL(hashscanUrl)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
                <Text style={s.txId} numberOfLines={1}>{tx.id}</Text>
                <Text style={s.txTimestamp}>{ts}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.txAmount}>${tx.amount}</Text>
                <Text style={s.txStatus}>USDC</Text>
            </View>
        </TouchableOpacity>
    );
});


export default function DashboardPage() {
    const { isDesktop } = useSmartSize();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(0);

    const fetchStats = useCallback(async (isManual = false) => {
        const now = Date.now();
        if (isManual && now - lastRefresh < 15000) return;
        if (isManual) setRefreshing(true);
        try {
            const url = isManual ? '/api/dashboard?refresh=true' : '/api/dashboard';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setStats(data);
                if (isManual) setLastRefresh(now);
            }
        } catch (err) {
            console.error('DASHBOARD_FETCH_FAILED', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [lastRefresh]);

    useEffect(() => { 
        fetchStats(); 
        const interval = setInterval(() => fetchStats(), 15000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const formatAge = useCallback((timestamp) => {
        if (!timestamp) return "N/A";
        const created = new Date(parseFloat(timestamp) * 1000);
        const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        return `${days}d ago`;
    }, []);

    if (loading) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={mainColor} size="large" />
                <Text style={[s.loadingText]}>LOADING_FACILITATOR_DIAGNOSTICS...</Text>
            </View>
        );
    }

    const op = stats?.operator || {};
    const fac = stats?.facilitator || {};
    const recentTxs = fac.recentTxs || [];

    // Data array for FlashList
    const sections = [
        { type: 'header' },
        { type: 'network' },
        { type: 'operator' },
        { type: 'seller' },
        { type: 'facilitator' },
        ...(recentTxs.length > 0 ? [{ type: 'activityHeader' }, ...recentTxs.map(tx => ({ type: 'tx', data: tx }))] : []),
        { type: 'config' },
        { type: 'footer' }
    ];

    return (
        <SafeAreaView style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <FlashList
                data={sections}
                keyExtractor={(item, index) => `${item.type}-${index}`}
                estimatedItemSize={120}
                contentContainerStyle={s.content}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    switch (item.type) {
                        case 'header':
                            return (
                                <>
                                    {!isDesktop && (
                                        <View style={s.header}>
                                            <View>
                                                <Text style={s.logoText}>ħ402</Text>
                                                <Text style={s.logoSubtext}>FACILITATOR DIAGNOSTICS</Text>
                                            </View>
                                        </View>
                                    )}
                                    <Text style={s.title}>SYSTEM STATUS</Text>
                                    <Text style={s.subtitle}>Real-time on-chain infrastructure health</Text>
                                </>
                            );

                        case 'network':
                            return (
                                <>
                                    <SectionHeader title="NETWORK" badge="TESTNET" />
                                    <View style={s.card}>
                                        <StatRow label="NETWORK" value="Hedera Testnet" />
                                        <StatRow label="HBAR/USD" value={`$${stats?.hbarPrice || "0.065"}`} accent={mainColor} />
                                        <LinkRow label="USDC TOKEN" value={stats?.usdcTokenId || "0.0.429274"} type="token" />
                                        <StatRow label="SCAN TIME" value={new Date(stats?.timestamp).toLocaleTimeString()} />
                                    </View>
                                    <TouchableOpacity
                                        style={s.hashscanBtn}
                                        onPress={() => Linking.openURL('https://hashscan.io/testnet')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={s.hashscanBtnText}>OPEN HASHSCAN EXPLORER ↗</Text>
                                    </TouchableOpacity>
                                </>
                            );

                        case 'operator':
                            return (
                                <>
                                    <SectionHeader title="OPERATOR TREASURY" />
                                    <View style={s.metricsRow}>
                                        <MetricCard label="HBAR" value={op.hbar} sub={`≈ $${op.hbarUsd} USD`} />
                                        <MetricCard label="USDC" value={op.usdc} sub="Stablecoin" accent={mainColor} />
                                    </View>
                                    <View style={s.card}>
                                        <LinkRow label="NODE ID" value={op.id} />
                                        <LinkRow label="EVM" value={op.evm} displayValue={`0x${op.evm?.slice(2, 6)}...${op.evm?.slice(-4)}`} type="evm" />
                                        <StatRow label="CREATED" value={formatAge(op.createdAt)} />
                                    </View>
                                </>
                            );

                        case 'seller':
                            const sell = stats?.seller || {};
                            return (
                                <>
                                    <SectionHeader title="SELLER TREASURY" />
                                    <View style={s.metricsRow}>
                                        <MetricCard label="HBAR" value={sell.hbar} sub={`≈ $${sell.hbarUsd} USD`} />
                                        <MetricCard label="USDC" value={sell.usdc} sub="Stablecoin" accent={mainColor} />
                                    </View>
                                    <View style={s.card}>
                                        <LinkRow label="NODE ID" value={sell.id} />
                                        <LinkRow label="EVM" value={sell.evm} displayValue={`0x${sell.evm?.slice(2, 6)}...${sell.evm?.slice(-4)}`} type="evm" />
                                        <StatRow label="CREATED" value={formatAge(sell.createdAt)} />
                                    </View>
                                </>
                            );

                        case 'facilitator':
                            return (
                                <>
                                    <SectionHeader title="X402 FACILITATOR" badge="ONLINE" />
                                    <View style={s.metricsRow}>
                                        <MetricCard label="GAS RESERVE" value={`${fac.hbar} ℏ`} sub={`≈ $${fac.hbarUsd} USD`} />
                                        <MetricCard label="TX SETTLED" value={fac.txCount?.toString() || "0"} sub="Successful" accent={mainColor} />
                                    </View>
                                    <View style={s.card}>
                                        <LinkRow label="NODE ID" value={fac.id} />
                                        <LinkRow label="EVM" value={fac.evm} displayValue={`0x${fac.evm?.slice(2, 6)}...${fac.evm?.slice(-4)}`} type="evm" />
                                        <StatRow label="ENDPOINT" value={fac.endpoint || "/api/public/*"} />
                                        <StatRow label="VOLUME" value={`$${fac.volume} USDC`} accent={mainColor} />
                                        <StatRow label="USDC HELD" value={fac.usdc} />
                                        <StatRow label="CREATED" value={formatAge(fac.createdAt)} />
                                    </View>
                                </>
                            );

                        case 'activityHeader':
                            return <SectionHeader title="RECENT SETTLEMENTS" />;

                        case 'tx':
                            return <TxRow tx={item.data} />;

                        case 'config':
                            return (
                                <>
                                    <SectionHeader title="MAINNET READINESS" />
                                    <View style={s.card}>
                                        <View style={s.checkRow}>
                                            <Text style={s.checkIcon}>✓</Text>
                                            <Text style={s.checkText}>Direct Hedera SDK settlement (no EVM relay)</Text>
                                        </View>
                                        <View style={s.checkRow}>
                                            <Text style={s.checkIcon}>✓</Text>
                                            <Text style={s.checkText}>Token allowance-based spending (no custody)</Text>
                                        </View>
                                        <View style={s.checkRow}>
                                            <Text style={s.checkIcon}>✓</Text>
                                            <Text style={s.checkText}>x402 HTTP payment protocol compliant</Text>
                                        </View>
                                        <View style={s.checkRow}>
                                            <Text style={s.checkIcon}>✓</Text>
                                            <Text style={s.checkText}>Facilitator pays gas — users pay only USDC</Text>
                                        </View>
                                        <View style={[s.checkRow, { borderBottomWidth: 0 }]}>
                                            <Text style={[s.checkIcon, { color: "#F59E0B" }]}>○</Text>
                                            <Text style={s.checkText}>Switch env to mainnet + production USDC token</Text>
                                        </View>
                                    </View>
                                </>
                            );

                        case 'footer':
                            return (
                                <View style={s.footer}>
                                    <Text style={s.footerLabel}>LAST_SCAN: {new Date(stats?.timestamp).toLocaleTimeString()}</Text>
                                    <TouchableOpacity
                                        style={[s.syncBtn, (refreshing || Date.now() - lastRefresh < 15000) && { opacity: 0.3 }]}
                                        onPress={() => fetchStats(true)}
                                        disabled={refreshing || Date.now() - lastRefresh < 15000}
                                    >
                                        <Text style={s.syncBtnText}>
                                            {refreshing ? "SCANNING..." : "RE_SCAN"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );

                        default:
                            return null;
                    }
                }}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor,
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    header: {
        marginBottom: 32,
    },
    logoText: {
        color: mainColor,
        fontFamily: monoFont,
        fontSize: 18,
        letterSpacing: 2,
    },
    logoSubtext: {
        color: mutedText,
        fontSize: 8,
        fontFamily: monoFont,
        letterSpacing: 1,
        marginTop: 2,
    },
    title: {
        color: textColor,
        fontFamily: monoFont,
        fontSize: 22,
        letterSpacing: 3,
        marginBottom: 4,
    },
    subtitle: {
        color: mutedText,
        fontFamily: monoFont,
        fontSize: 10,
        letterSpacing: 0.5,
        marginBottom: 24,
    },
    loadingText: {
        marginTop: 16,
        color: mainColor,
        letterSpacing: 2,
        fontFamily: monoFont,
        fontSize: 12,
    },

    // ── SECTION HEADERS ────────────────────────────────────────────────────
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        marginTop: 28,
    },
    sectionTitle: {
        color: mutedText,
        fontSize: 10,
        fontFamily: monoFont,
        letterSpacing: 2,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: mutedColor,
    },

    // ── BADGES ─────────────────────────────────────────────────────────────
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
    },
    badgeOnline: {
        borderColor: mainColor,
        backgroundColor: "rgba(0, 255, 65, 0.08)",
    },
    badgeTestnet: {
        borderColor: "#F59E0B",
        backgroundColor: "rgba(245, 158, 11, 0.08)",
    },
    badgeDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: mainColor,
    },
    badgeText: {
        fontFamily: monoFont,
        fontSize: 8,
        letterSpacing: 1,
    },
    badgeTextOnline: {
        color: mainColor,
    },
    badgeTextTestnet: {
        color: "#F59E0B",
    },

    // ── METRIC CARDS ───────────────────────────────────────────────────────
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: surfaceColor,
        padding: 16,
        borderWidth: 1,
        borderColor: mutedColor,
    },
    metricLabel: {
        color: mutedText,
        fontSize: 9,
        fontFamily: monoFont,
        marginBottom: 8,
        letterSpacing: 2,
    },
    metricValue: {
        color: textColor,
        fontSize: 18,
        fontFamily: monoFont,
        letterSpacing: -0.5,
    },
    metricSub: {
        color: mutedText,
        fontSize: 9,
        fontFamily: monoFont,
        marginTop: 6,
    },

    // ── DATA CARDS ─────────────────────────────────────────────────────────
    card: {
        backgroundColor: surfaceColor,
        borderWidth: 1,
        borderColor: mutedColor,
        padding: 16,
        marginBottom: 4,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.03)",
    },
    statLabel: {
        color: mutedText,
        fontSize: 9,
        fontFamily: monoFont,
        letterSpacing: 1.5,
    },
    statValue: {
        color: textColor,
        fontSize: 11,
        fontFamily: monoFont,
        letterSpacing: 0.5,
        maxWidth: "80%",
        textAlign: "right",
    },

    // ── TX ACTIVITY FEED ───────────────────────────────────────────────────
    txRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: mutedColor,
        marginBottom: 4,
        backgroundColor: surfaceColor,
    },
    txId: {
        color: textColor,
        fontSize: 10,
        fontFamily: monoFont,
        marginBottom: 3,
        maxWidth: 200,
    },
    txTimestamp: {
        color: mutedText,
        fontSize: 9,
        fontFamily: monoFont,
    },
    txAmount: {
        color: mainColor,
        fontSize: 12,
        fontFamily: monoFont,
        marginBottom: 2,
    },
    txStatus: {
        color: mutedText,
        fontSize: 8,
        fontFamily: monoFont,
        letterSpacing: 1,
    },

    // ── CHECKLIST ──────────────────────────────────────────────────────────
    checkRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.03)",
    },
    checkIcon: {
        color: mainColor,
        fontSize: 12,
        fontFamily: monoFont,
        marginTop: 1,
    },
    checkText: {
        color: textColor,
        fontSize: 11,
        fontFamily: monoFont,
        flex: 1,
        lineHeight: 16,
    },

    // ── FOOTER ─────────────────────────────────────────────────────────────
    footer: {
        marginTop: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLabel: {
        color: mutedText,
        fontSize: 9,
        fontFamily: monoFont,
    },
    syncBtn: {
        borderWidth: 1,
        borderColor: mainColor,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    syncBtnText: {
        color: mainColor,
        fontFamily: monoFont,
        fontSize: 10,
        letterSpacing: 1,
    },

    // ── HASHSCAN BUTTON ────────────────────────────────────────────────────
    hashscanBtn: {
        borderWidth: 1,
        borderColor: mainColor,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 4,
        backgroundColor: "rgba(0, 255, 65, 0.04)",
    },
    hashscanBtnText: {
        color: mainColor,
        fontFamily: monoFont,
        fontSize: 10,
        letterSpacing: 2,
    },
});
