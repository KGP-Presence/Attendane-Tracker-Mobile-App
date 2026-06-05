import { SubjectCardType } from "@/types/timetableTypes";
// Note: 'Icon' is a generic name, you likely need a specific icon component passed as a prop
// or imported dynamically. For this example, I'll assume you pass an Icon component prop.
import { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

interface SubjectCardProps extends SubjectCardType {
  colorClass: string;
  barColor: string;
  IconComponent: LucideIcon; // Changed to accept the actual component
}

export const SubjectCard = ({
  _id,
  name,
  code,
  type,
  professor,
  credits,
  slots,
  Grading,
  totalClasses,
  attendedClasses,
  colorClass,
  barColor,
  IconComponent,
}: SubjectCardProps) => {
  const percentage = Math.round((attendedClasses / totalClasses) * 100);
  const isLow = percentage < 75;

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Top Section: Icon, Name, Type, Prof */}
      <View className="flex-row p-4">
        <View
          className={`h-14 w-14 items-center justify-center rounded-xl ${colorClass}`}
        >
          <IconComponent size={28} color={barColor} />
        </View>
        <View className="ml-4 flex-1">
          <View className="flex-row items-start justify-between">
            <Text
              className="flex-1 text-base font-bold text-slate-900 dark:text-white"
              numberOfLines={1}
            >
              {name} ({code})
            </Text>
            <View className={`${colorClass} rounded px-2 py-0.5`}>
              <Text
                className="text-[10px] font-bold uppercase"
                style={{ color: barColor }}
              >
                {type}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            {professor}
          </Text>
        </View>
      </View>

      {/* Middle Section: Attendance Progress */}
      <View className="px-4 pb-4">
        <View className="mb-1.5 flex-row justify-between items-center">
          <Text
            className={`text-xs font-medium ${
              isLow
                ? "text-red-500 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {isLow ? "Attendance Low: " : "Attendance: "}
            {attendedClasses}/{totalClasses} sessions
          </Text>
          <Text
            className={`text-xs font-bold ${
              isLow ? "text-red-500" : "text-slate-900 dark:text-white"
            }`}
          >
            {percentage}%
          </Text>
        </View>

        <View className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <View
            className="h-full rounded-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: isLow ? "#ef4444" : barColor,
            }}
          />
        </View>

        {/* Bottom Section: Details Grid (Credits, Grading, Slots) */}
        <View className="mt-4 flex-row flex-wrap border-t border-dashed border-slate-200 pt-4 dark:border-slate-700">
          {/* Credits */}
          <View className="mb-3 w-1/2 pr-2">
            <Text className="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
              Credits
            </Text>
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {credits} Units
            </Text>
          </View>

          {/* Grading */}
          <View className="mb-3 w-1/2 pl-2">
            <Text className="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
              Grading
            </Text>
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {Grading}
            </Text>
          </View>

          {/* Slots (Full Width) */}
          <View className="w-full">
            <Text className="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
              Slots
            </Text>
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {/* Assuming slots is an array of strings like ["Mon 10:00", "Wed 10:00"] */}
              {Array.isArray(slots) ? slots.join(", ") : slots}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
