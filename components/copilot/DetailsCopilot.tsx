import React, { useState } from "react";
import { View, Platform, StatusBar, ScrollView } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useCopilot } from "./useCopilot";
import { CopilotOverlay, CopilotStep } from "./CopilotOverlay";

const DETAILS_STEPS: CopilotStep[] = [
  {
    title: "Semester Overview",
    description: "Check your overall attendance percentage and a quick breakdown of your classes.",
    icon: "pie-chart",
    tooltipPosition: "bottom",
  },
  {
    title: "Change Semester",
    description: "Tap here to switch semesters and view your past attendance records.",
    icon: "history",
    tooltipPosition: "bottom",
  },
  {
    title: "Subject Breakdown",
    description: "See detailed stats for each subject. You can also search or filter them by type.",
    icon: "library-books",
    tooltipPosition: "top",
  },
  {
    title: "Timetable Stats",
    description: "Track how your attendance is holding up across your different schedules.",
    icon: "event-note",
    tooltipPosition: "top",
  },
];

interface DetailsCopilotProps {
  overviewRef: React.RefObject<View>;
  semesterBtnRef: React.RefObject<View>;
  subjectsRef: React.RefObject<View>;
  timetablesRef: React.RefObject<View>;
  scrollViewRef: React.RefObject<ScrollView>;
}

export const DetailsCopilot: React.FC<DetailsCopilotProps> = ({
  overviewRef,
  semesterBtnRef,
  subjectsRef,
  timetablesRef,
  scrollViewRef,
}) => {
  const { isReady, shouldShow, markComplete } = useCopilot("@kgp_presence_details_copilot_done");
  const isFocused = useIsFocused();

  const [measurements, setMeasurements] = useState<Record<number, { cx: number; cy: number; width: number; height: number; borderRadius: number } | null>>({});

  const measureStep = (stepIndex: number) => {
    const yOffset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
    let targetRef: React.RefObject<View> | null = null;
    
    if (stepIndex === 0) targetRef = overviewRef;
    else if (stepIndex === 1) targetRef = semesterBtnRef;
    else if (stepIndex === 2) targetRef = subjectsRef;
    else if (stepIndex === 3) targetRef = timetablesRef;

    if (targetRef?.current) {
      targetRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          setMeasurements((prev) => ({
            ...prev,
            [stepIndex]: {
              cx: x + width / 2,
              cy: y + yOffset + height / 2,
              width: width + 16,
              height: height + 16,
              borderRadius: 24,
            },
          }));
        }
      });
    }
  };

  const handleStepChange = (stepIndex: number) => {
    if (!scrollViewRef.current) return;

    let scrollToY = 0;
    if (stepIndex === 2) {
      scrollToY = 320; // Scroll subjects into view
    } else if (stepIndex === 3) {
      scrollToY = 750; // Scroll timetables into view
    }

    scrollViewRef.current.scrollTo({ y: scrollToY, animated: true });

    // Wait for scroll animation to complete, then measure the target element in window
    setTimeout(() => {
      measureStep(stepIndex);
    }, 300);
  };

  if (!isReady || !isFocused) return null;

  return (
    <CopilotOverlay
      visible={shouldShow}
      onDone={markComplete}
      steps={DETAILS_STEPS}
      spotlightMeasurements={measurements}
      onStepChange={handleStepChange}
    />
  );
};
