export type ScanStatus = "created" | "updated" | "reused" | "skipped";

export type ScanSkipReason = "conflict" | "no-slots" | "error";

export type ScanConflict = {
  /** The time block two subjects both wanted. */
  slot: string;
  /** The other subject codes claiming that block. */
  with: string[];
};

export type ScanResult = {
  code: string;
  name: string;
  status: ScanStatus;
  slots: string[];
  subjectId?: string;
  reason?: ScanSkipReason;
  detail?: string;
  conflicts?: ScanConflict[];
};

export type TimetableScanResponse = {
  timetable: { _id: string; name: string; semester: number };
  results: ScanResult[];
  counts: Partial<Record<ScanStatus, number>>;
  scannedCount: number;
  unreadableCount: number;
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

/** "MONDAY_8AM-9AM" -> "Mon 8AM-9AM" */
export const formatSlot = (slot: string) => {
  const [day, time] = slot.split("_");
  return `${DAY_LABELS[day] ?? day} ${time ?? ""}`.trim();
};
