import React, { useEffect, useState } from "react";
import { View, Platform, StatusBar } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useCopilot } from "./useCopilot";
import { CopilotOverlay, CopilotStep } from "./CopilotOverlay";

const TIMETABLE_STEPS: CopilotStep[] = [
  {
    title: "Timetable Hub",
    description: "Welcome to your Timetable! Here you can view, search, and manage all your scheduled classes.",
    icon: "event-note",
    tooltipPosition: "center",
  },
  {
    title: "Quick Search",
    description: "Looking for a specific class or subject? Type it here to find it instantly.",
    icon: "search",
    tooltipPosition: "bottom",
  },
  {
    title: "Filter by Day",
    description: "Tap on any day of the week to jump straight to that day's schedule.",
    icon: "calendar-today",
    tooltipPosition: "bottom",
  },
  {
    title: "Create a Class",
    description: "Need to add a new session? Tap the + button to manually schedule a class.",
    icon: "add-circle",
    tooltipPosition: "top",
  },
];

interface TimetableCopilotProps {
  searchRef: React.RefObject<View>;
  filterRef: React.RefObject<View>;
  addRef: React.RefObject<View>;
}

export const TimetableCopilot: React.FC<TimetableCopilotProps> = ({
  searchRef,
  filterRef,
  addRef,
}) => {
  const { isReady, shouldShow, markComplete } = useCopilot("@kgp_presence_timetable_copilot_done");
  const isFocused = useIsFocused();

  const [measurements, setMeasurements] = useState<Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null>>({});

  useEffect(() => {
    if (isReady && shouldShow && isFocused) {
      const timer = setTimeout(() => {
        const yOffset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
        
        const newMeasurements: Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null> = {};

        searchRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) newMeasurements[1] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: width + 8, height: height + 8, borderRadius: 16 };
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        filterRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) newMeasurements[2] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: width + 8, height: height + 8, borderRadius: 16 };
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        addRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            const diameter = Math.max(width, height) + 8;
            newMeasurements[3] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: diameter, height: diameter, borderRadius: diameter / 2 };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isReady, shouldShow, isFocused, searchRef, filterRef, addRef]);

  if (!isReady || !isFocused) return null;

  return (
    <CopilotOverlay
      visible={shouldShow}
      onDone={markComplete}
      steps={TIMETABLE_STEPS}
      spotlightMeasurements={measurements}
    />
  );
};
