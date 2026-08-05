import React, { useEffect } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { FontAwesome } from "@expo/vector-icons";
// import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Vibration, Platform } from "react-native";
import { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";

// --- Types ---
type IconName = keyof typeof FontAwesome.glyphMap;

interface ColorTheme {
  barBg: string;
  indicator: string;
  activeIcon: string;
  inactiveIcon: string;
  text: string;
}

interface TabItemProps {
  icon: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
  colors: ColorTheme;
}

interface CustomTabBarProps extends MaterialTopTabBarProps {
  isDark: boolean;
}

// --- Configuration ---
const ACTIVE_SPRING_CONFIG = {
  damping: 30,
  stiffness: 250,
  mass: 1,
};

const PRESET_COLORS = {
  light: {
    barBg: "#F4F4F5",
    indicator: "#18181B",
    activeIcon: "#FFFFFF",
    inactiveIcon: "#71717A",
    text: "#FFFFFF",
  },
  dark: {
    barBg: "#18181B",
    indicator: "#FFFFFF",
    activeIcon: "#000000",
    inactiveIcon: "#A1A1AA",
    text: "#000000",
  },
};

// --- Helper Component: The Individual Tab ---
const TabItem = ({ icon, label, isActive, onPress, colors }: TabItemProps) => {
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withTiming(isActive ? 1 : 0, {
      duration: 200,
    });
  }, [isActive]);

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: animValue.value,
      transform: [
        { translateX: interpolate(animValue.value, [0, 1], [-10, 0]) },
      ],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center w-full h-full"
    >
      <View className="w-[30px] h-[30px] items-center justify-center">
        <FontAwesome
          name={icon}
          size={22}
          color={isActive ? colors.activeIcon : colors.inactiveIcon}
        />
      </View>

      {isActive && (
        <Animated.View className="ml-1 justify-center" style={textStyle}>
          <Text
            numberOfLines={1}
            className="font-bold text-[14px]"
            style={{ color: colors.text }}
          >
            {label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
};

// --- Main Component ---
export const CustomTabBar = ({
  state,
  descriptors,
  navigation,
  isDark,
}: CustomTabBarProps) => {
  const colors = isDark ? PRESET_COLORS.dark : PRESET_COLORS.light;
  const activeIndex = useSharedValue(state.index);

  // 1. Get Screen Width
  const { width: screenWidth } = useWindowDimensions();

  // 2. Dynamic Calculations
  const TAB_COUNT = state.routes.length;
  const TOTAL_BAR_WIDTH = Math.min(screenWidth - 32, 400);
  const TAB_WIDTH_EXPANDED = 130;
  const TAB_WIDTH_COLLAPSED =
    (TOTAL_BAR_WIDTH - TAB_WIDTH_EXPANDED - 20) / (TAB_COUNT - 1);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, ACTIVE_SPRING_CONFIG);
  }, [state.index]);

  // --- Slider Animation ---
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: activeIndex.value * TAB_WIDTH_COLLAPSED }],
      width: TAB_WIDTH_EXPANDED,
    };
  });

  return (
    <View
      className="flex-row absolute bottom-[25px] self-center h-[75px] rounded-[40px] items-center justify-start px-2"
      style={{
        backgroundColor: colors.barBg,
        width: TOTAL_BAR_WIDTH,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 8,
      }}
    >
      {/* BACKGROUND SLIDER */}
      <Animated.View
        className="absolute h-[58px] rounded-[30px] top-[8.5px] left-[8px] z-0"
        style={[indicatorStyle, { backgroundColor: colors.indicator }]}
      />

      {/* TABS LAYER */}
      <View className="flex-row z-10">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.title === "string" ? options.title : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              if (Platform.OS === "android") {
                // Forces the motor to spin up and stop in exactly 10 milliseconds.
                // This creates a sharp "tick" rather than a soft buzz.
                Vibration.vibrate(5);
              } else {
                // iOS handles impacts much better natively, so stick to Expo here
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }

              navigation.navigate(route.name, route.params);
            }
          };

          let iconName: IconName = "circle";
          if (route.name === "dashboard") iconName = "home";
          if (route.name === "timetable") iconName = "calendar";
          if (route.name === "subjects") iconName = "book";
          if (route.name === "events") iconName = "calendar-check-o";
          if (route.name === "details") iconName = "info-circle";

          // Dynamic Width Animation
          const tabWidthStyle = useAnimatedStyle(() => {
            const distance = Math.abs(activeIndex.value - index);
            const width = interpolate(
              distance,
              [0, 1],
              [TAB_WIDTH_EXPANDED, TAB_WIDTH_COLLAPSED],
              "clamp",
            );
            return { width };
          });

          return (
            <Animated.View
              key={route.key}
              className="h-[60px] justify-center items-center overflow-hidden"
              style={tabWidthStyle}
            >
              <TabItem
                icon={iconName}
                label={label}
                isActive={isFocused}
                onPress={onPress}
                colors={colors}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};
