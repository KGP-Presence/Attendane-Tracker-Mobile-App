import React, { useEffect, useState } from "react";
import { View, Platform, StatusBar } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useCopilot } from "./useCopilot";
import { CopilotOverlay, CopilotStep } from "./CopilotOverlay";

const TABBAR_STEPS: CopilotStep[] = [
  {
    title: "Dashboard",
    description: "Your home screen. See your stats, upcoming classes, and pending events.",
    icon: "dashboard",
    tooltipPosition: "top",
  },
  {
    title: "Timetable",
    description: "Manage your daily class schedules and create new routines.",
    icon: "event-note",
    tooltipPosition: "top",
  },
  {
    title: "Subjects",
    description: "Keep track of your attendance and details for every subject.",
    icon: "library-books",
    tooltipPosition: "top",
  },
  {
    title: "Events",
    description: "Stay ahead of your exams, assignments, and test deadlines.",
    icon: "event",
    tooltipPosition: "top",
  },
  {
    title: "Overview",
    description: "Your detailed attendance breakdown. See semester stats, subject progress, and more.",
    icon: "analytics",
    tooltipPosition: "top",
  },
];

interface TabBarCopilotProps {
  tab1Ref: React.RefObject<View>;
  tab2Ref: React.RefObject<View>;
  tab3Ref: React.RefObject<View>;
  tab4Ref: React.RefObject<View>;
  tab5Ref: React.RefObject<View>;
  enabled?: boolean;
}

export const TabBarCopilot: React.FC<TabBarCopilotProps> = ({
  tab1Ref,
  tab2Ref,
  tab3Ref,
  tab4Ref,
  tab5Ref,
  enabled = true,
}) => {
  const { isReady, shouldShow, markComplete } = useCopilot("@kgp_presence_tabbar_copilot_done");
  const isFocused = useIsFocused();

  const [measurements, setMeasurements] = useState<Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null>>({});

  useEffect(() => {
    if (isReady && shouldShow && isFocused && enabled) {
      const timer = setTimeout(() => {
        const yOffset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
        
        const newMeasurements: Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null> = {};

        const refs = [tab1Ref, tab2Ref, tab3Ref, tab4Ref, tab5Ref];
        refs.forEach((ref, index) => {
          ref?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
            if (width > 0 && height > 0) {
              // Add a bit of padding to the spotlight diameter
              const diameter = Math.max(width, height) + 8;
              // For a rectangle, we'll just use width and height directly, but since tab items are often round or pill shaped:
              newMeasurements[index] = { 
                cx: x + width / 2, 
                cy: y + yOffset + height / 2, 
                width: width + 16, 
                height: height + 16, 
                borderRadius: height / 2 + 8
              };
            }
            setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
          });
        });
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isReady, shouldShow, isFocused, enabled, tab1Ref, tab2Ref, tab3Ref, tab4Ref, tab5Ref]);

  if (!isReady || !isFocused || !enabled) return null;

  return (
    <CopilotOverlay
      visible={shouldShow}
      onDone={markComplete}
      steps={TABBAR_STEPS}
      spotlightMeasurements={measurements}
    />
  );
};
