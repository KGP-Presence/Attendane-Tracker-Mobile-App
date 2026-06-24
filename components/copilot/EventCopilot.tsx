import React, { useEffect, useState } from "react";
import { View, Platform, StatusBar } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useCopilot } from "./useCopilot";
import { CopilotOverlay, CopilotStep } from "./CopilotOverlay";

const EVENT_STEPS: CopilotStep[] = [
  {
    title: "Welcome to Events",
    description: "This is your events hub. Keep track of exams, assignments, tests, and more — all in one place.",
    icon: "event",
    tooltipPosition: "center",
  },
  {
    title: "Voice-Create Events",
    description: 'Tap the purple mic button and just speak — "Maths exam on Friday at 2 PM in LBS". Our AI will create the event for you instantly.',
    icon: "mic",
    tooltipPosition: "top",
  },
  {
    title: "Manual Create",
    description: "Prefer typing? Tap the blue + button to fill in event details yourself — name, location, type, date and time.",
    icon: "add-circle-outline",
    tooltipPosition: "top",
  },
  {
    title: "Filter by Type",
    description: "Use the Type filter to quickly see only Exams, Assignments, Tests or Others. Pull down to refresh.",
    icon: "filter-list",
    tooltipPosition: "bottom",
  },
  {
    title: "Long-press to Multi-Select",
    description: "Long-press any event card to enter multi-select mode. Then delete several events at once.",
    icon: "select-all",
    tooltipPosition: "center",
  },
];

interface EventCopilotProps {
  micButtonRef: React.RefObject<View>;
  addButtonRef: React.RefObject<View>;
  filterButtonRef: React.RefObject<View>;
}

export const EventCopilot: React.FC<EventCopilotProps> = ({
  micButtonRef,
  addButtonRef,
  filterButtonRef,
}) => {
  const { isReady, shouldShow, markComplete } = useCopilot("@kgp_presence_event_copilot_done");
  const isFocused = useIsFocused();

  const [measurements, setMeasurements] = useState<Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null>>({});

  useEffect(() => {
    if (isReady && shouldShow && isFocused) {
      const timer = setTimeout(() => {
        const yOffset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
        
        const newMeasurements: Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null> = {};

        micButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            const diameter = Math.max(width, height) + 8;
            newMeasurements[1] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: diameter, height: diameter, borderRadius: diameter / 2 };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        addButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            const diameter = Math.max(width, height) + 8;
            newMeasurements[2] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: diameter, height: diameter, borderRadius: diameter / 2 };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        filterButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            newMeasurements[3] = { 
              cx: x + width / 2, 
              cy: y + yOffset + height / 2, 
              width: width + 16, 
              height: height + 16, 
              borderRadius: height / 2 + 8 
            };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isReady, shouldShow, isFocused, micButtonRef, addButtonRef, filterButtonRef]);

  if (!isReady || !isFocused) return null;

  return (
    <CopilotOverlay
      visible={shouldShow}
      onDone={markComplete}
      steps={EVENT_STEPS}
      spotlightMeasurements={measurements}
    />
  );
};
