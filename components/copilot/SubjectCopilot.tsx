import React, { useEffect, useState } from "react";
import { View, Platform, StatusBar } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useCopilot } from "./useCopilot";
import { CopilotOverlay, CopilotStep } from "./CopilotOverlay";

const SUBJECT_STEPS: CopilotStep[] = [
  {
    title: "Welcome to Subjects",
    description: "Manage all your academic subjects here. View details, update information, and track everything in one place.",
    icon: "book",
    tooltipPosition: "center",
  },
  {
    title: "Search Subjects",
    description: "Use the search bar to instantly find subjects by name or code.",
    icon: "search",
    tooltipPosition: "bottom",
  },
  {
    title: "Filter by Category",
    description: "Quickly filter your subjects by Semester, Timetable, or Type.",
    icon: "filter-list",
    tooltipPosition: "bottom",
  },
  {
    title: "Sort & Select",
    description: "Tap here to sort your subjects or enter selection mode to edit or delete multiple subjects at once.",
    icon: "sort",
    tooltipPosition: "bottom",
  },
  {
    title: "Add Subject",
    description: "Ready to add a new subject? Tap the blue floating button to get started.",
    icon: "add-circle-outline",
    tooltipPosition: "top",
  },
];

interface SubjectCopilotProps {
  searchRef: React.RefObject<View>;
  filterRef: React.RefObject<View>;
  menuRef: React.RefObject<View>;
  addRef: React.RefObject<View>;
}

export const SubjectCopilot: React.FC<SubjectCopilotProps> = ({
  searchRef,
  filterRef,
  menuRef,
  addRef,
}) => {
  const { isReady, shouldShow, markComplete } = useCopilot("@kgp_presence_subject_copilot_done");
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
          if (width > 0 && height > 0) newMeasurements[2] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: width + 8, height: height + 8, borderRadius: height / 2 + 4 };
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        menuRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            const diameter = Math.max(width, height) + 8;
            newMeasurements[3] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: diameter, height: diameter, borderRadius: diameter / 2 };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });

        addRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            const diameter = Math.max(width, height) + 8;
            newMeasurements[4] = { cx: x + width / 2, cy: y + yOffset + height / 2, width: diameter, height: diameter, borderRadius: diameter / 2 };
          }
          setMeasurements((prev) => ({ ...prev, ...newMeasurements }));
        });
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isReady, shouldShow, isFocused, searchRef, filterRef, menuRef, addRef]);

  if (!isReady || !isFocused) return null;

  return (
    <CopilotOverlay
      visible={shouldShow}
      onDone={markComplete}
      steps={SUBJECT_STEPS}
      spotlightMeasurements={measurements}
    />
  );
};
