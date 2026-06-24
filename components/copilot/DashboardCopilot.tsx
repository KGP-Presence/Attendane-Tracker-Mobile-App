import React, { useEffect, useState } from "react";
import { View, Platform, StatusBar } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useCopilot } from "./useCopilot";
import { CopilotOverlay, CopilotStep } from "./CopilotOverlay";

const DASHBOARD_STEPS: CopilotStep[] = [
  {
    title: "Welcome to your Dashboard!",
    description: "Get a quick glance at your schedule, attendance stats, and upcoming events all in one place.",
    icon: "dashboard",
    tooltipPosition: "center",
  },
  {
    title: "Access your Profile",
    description: "Tap here to view your profile, change settings, or sign out.",
    icon: "person",
    tooltipPosition: "bottom",
  },
  {
    title: "Need Help?",
    description: "Got questions or facing issues? Tap here to contact support.",
    icon: "headphones",
    tooltipPosition: "bottom",
  },
  {
    title: "Schedule at a Glance",
    description: "See your upcoming classes and their locations. Tap 'View Full' to see everything.",
    icon: "schedule",
    tooltipPosition: "bottom",
  },
  {
    title: "Attendance Overview",
    description: "Track your semester stats and spot subjects needing focus.",
    tooltipPosition: "bottom",
  },
  {
    title: "Events & Deadlines",
    description: "Filter and stay on top of your upcoming exams, assignments, and tests right here.",
    icon: "event-note",
    tooltipPosition: "top",
  },
];

interface DashboardCopilotProps {
  profileRef: React.RefObject<View>;
  helpRef: React.RefObject<View>;
  scheduleRef: React.RefObject<View>;
  attendanceBlockRef: React.RefObject<View>;
  eventsBlockRef: React.RefObject<View>;
  onDone?: () => void;
}

export const DashboardCopilot: React.FC<DashboardCopilotProps> = ({
  profileRef,
  helpRef,
  scheduleRef,
  attendanceBlockRef,
  eventsBlockRef,
  onDone,
}) => {
  const { isReady, shouldShow, markComplete } = useCopilot("@kgp_presence_dashboard_copilot_done");
  const isFocused = useIsFocused();

  const [measurements, setMeasurements] = useState<Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null>>({});

  useEffect(() => {
    if (isReady && shouldShow && isFocused) {
      const timer = setTimeout(() => {
        const yOffset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
        
        const newMeasurements: Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null> = {};

        profileRef?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            const diameter = Math.max(width, height) + 8;
            newMeasurements[1] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: diameter, height: diameter, borderRadius: diameter / 2 };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        helpRef?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            const diameter = Math.max(width, height) + 8;
            newMeasurements[2] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: diameter, height: diameter, borderRadius: diameter / 2 };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        scheduleRef?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) newMeasurements[3] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: width + 8, height: height + 8, borderRadius: 16 };
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        attendanceBlockRef?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) newMeasurements[4] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: width + 16, height: height + 16, borderRadius: 20 };
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        eventsBlockRef?.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) newMeasurements[5] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: width + 16, height: height + 16, borderRadius: 20 };
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isReady, shouldShow, isFocused, profileRef, helpRef, scheduleRef, attendanceBlockRef, eventsBlockRef]);

  if (!isReady || !isFocused) return null;

  return (
    <CopilotOverlay
      visible={shouldShow}
      onDone={() => {
        markComplete();
        onDone?.();
      }}
      steps={DASHBOARD_STEPS}
      spotlightMeasurements={measurements}
    />
  );
};
