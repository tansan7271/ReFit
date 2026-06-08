import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { colors } from "@/constants/colors";
import { fontSize } from "@/constants/typography";

export const TAB_BAR_HEIGHT = 64;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TABS = [
    { name: "index",     label: "홈",      icon: "home" as IoniconsName,    focusColor: colors.accent },
    { name: "workout",   label: "운동",    icon: "barbell" as IoniconsName, focusColor: colors.accentOrange },
    { name: "community", label: "커뮤니티", icon: "people" as IoniconsName,  focusColor: colors.accent },
    { name: "profile",   label: "프로필",  icon: "person" as IoniconsName,  focusColor: colors.accent },
];

type TabConfig = (typeof TABS)[number];

const ICON_SIZE = 22;
const ROW_PADDING = 4;

function TabItem({
    tab,
    focused,
    onPress,
}: {
    tab: TabConfig;
    focused: boolean;
    onPress: () => void;
}) {
    const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(focusAnim, {
            toValue: focused ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [focused]);

    const dimOpacity = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    return (
        <Pressable style={styles.tab} onPress={onPress}>
            {/* Icon cross-fade: outline ↔ filled */}
            <View style={styles.iconWrap}>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: dimOpacity }]}>
                    <Ionicons
                        name={`${tab.icon}-outline` as IoniconsName}
                        size={ICON_SIZE}
                        color={colors.text3}
                    />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: focusAnim }]}>
                    <Ionicons
                        name={tab.icon}
                        size={ICON_SIZE}
                        color={tab.focusColor}
                    />
                </Animated.View>
            </View>
            {/* Label cross-fade */}
            <View style={styles.labelWrap}>
                <Animated.Text style={[styles.label, { color: tab.focusColor, opacity: focusAnim }]}>
                    {tab.label}
                </Animated.Text>
                <Animated.Text
                    style={[styles.label, styles.labelOverlay, { color: colors.text3, opacity: dimOpacity }]}
                >
                    {tab.label}
                </Animated.Text>
            </View>
        </Pressable>
    );
}

function LiquidTabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const [rowWidth, setRowWidth] = useState(0);
    const pillAnim = useRef(new Animated.Value(state.index)).current;

    useEffect(() => {
        Animated.spring(pillAnim, {
            toValue: state.index,
            useNativeDriver: true,
            damping: 20,
            stiffness: 250,
            mass: 0.8,
        }).start();
    }, [state.index]);

    const tabItemWidth =
        rowWidth > 0 ? (rowWidth - ROW_PADDING * 2) / TABS.length : 0;

    const pillTranslateX = pillAnim.interpolate({
        inputRange: TABS.map((_, i) => i),
        outputRange: TABS.map((_, i) => i * tabItemWidth),
    });

    return (
        <>
        <LinearGradient
            colors={["rgba(242,242,247,0)", colors.bg]}
            style={[styles.fadeGradient, { height: insets.bottom + TAB_BAR_HEIGHT + 34 }]}
            pointerEvents="none"
        />
        <View style={[styles.container, { bottom: insets.bottom + 10 }]}>
            <BlurView intensity={50} tint="light" style={styles.blur}>
                <View
                    style={styles.row}
                    onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
                >
                    {rowWidth > 0 && (
                        <Animated.View
                            style={[
                                styles.pill,
                                {
                                    width: tabItemWidth,
                                    transform: [{ translateX: pillTranslateX }],
                                },
                            ]}
                        />
                    )}

                    {state.routes.map((route, i) => {
                        const tab = TABS.find((t) => t.name === route.name);
                        if (!tab) return null;
                        const focused = state.index === i;

                        return (
                            <TabItem
                                key={route.key}
                                tab={tab}
                                focused={focused}
                                onPress={() => {
                                    const event = navigation.emit({
                                        type: "tabPress",
                                        target: route.key,
                                        canPreventDefault: true,
                                    });
                                    if (!focused && !event.defaultPrevented) {
                                        navigation.navigate(route.name);
                                    }
                                }}
                            />
                        );
                    })}
                </View>
            </BlurView>
        </View>
        </>
    );
}

export default function MainLayout() {
    return (
        <Tabs
            tabBar={(props) => <LiquidTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                animation: "fade",
                transitionSpec: {
                    animation: "timing",
                    config: { duration: 150 },
                },
            }}
        >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="workout" />
            <Tabs.Screen name="community" />
            <Tabs.Screen name="profile" />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    fadeGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    container: {
        position: "absolute",
        left: 16,
        right: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 8,
    },
    blur: {
        borderRadius: 999,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.5)",
        padding: ROW_PADDING,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        borderRadius: 999,
        gap: 2,
        zIndex: 1,
    },
    iconWrap: {
        width: ICON_SIZE,
        height: ICON_SIZE,
    },
    labelWrap: {
        position: "relative",
    },
    label: {
        fontSize: fontSize.caption,
        textAlign: "center",
    },
    labelOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },
    pill: {
        position: "absolute",
        top: ROW_PADDING,
        bottom: ROW_PADDING,
        left: ROW_PADDING,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.9)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
});
