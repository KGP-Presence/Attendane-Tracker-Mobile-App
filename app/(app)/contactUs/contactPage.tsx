import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  Vibration,
  Linking,
  ScrollView,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Users,
  Mail,
  AtSign,
  ChevronRight,
  ChevronLeft,
  Linkedin,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { MessageSquare } from "lucide-react-native";
import FeedbackModal from "@/components/FeedbackModal";
import BugReportModal from "@/components/BugReportModal";

interface TeamMemberData {
  id: string;
  name: string;
  role: string;
  handle: string;
  linkedin: string;
  email: string;
  imageUri: ImageSourcePropType;
}

const TEAM_DATA: TeamMemberData[] = [
  {
    id: "1",
    name: "Harshit Soni",
    role: "Lead Developer",
    handle: "harshit_soni_1010",
    linkedin: "https://www.linkedin.com/in/harshit-soni-70336229a",
    email: "sonikratin@kgpian.iitkgp.ac.in",
    imageUri: require("../../../assets/images/Harshit-Photo.png"),
  },
  {
    id: "2",
    name: "Tarun Mundhra",
    role: "Lead Developer",
    handle: "mundhra.tarun",
    linkedin: "https://www.linkedin.com/in/tarun-mundhra-0a0a5629a",
    email: "tarun.mundhara@kgpian.iitkgp.ac.in",
    imageUri: require("../../../assets/images/Tarun-Photo.png"),
  },
  {
    id: "3",
    name: "Adarsh Kumar Singh",
    role: "Lead Developer",
    handle: "_",
    linkedin: "https://www.linkedin.com/in/adarsh-kumar-singh-21954331a",
    email: "kumaradarshsingh131@kgpian.iitkgp.ac.in",
    imageUri: require("../../../assets/images/user.png"),
  },
];

// Always use web URLs — deep links require extra setup and fail silently in production
const openUrl = (url: string): void => {
  Linking.openURL(url).catch((err) => console.error("Couldn't open URL:", err));
};

const TeamMemberCard: React.FC<TeamMemberData> = ({
  name,
  role,
  handle,
  linkedin,
  email,
  imageUri,
}) => (
  <View className="bg-white dark:bg-slate-900/50 p-4 rounded-xl shadow-sm border border-primary/20 flex-row items-center mb-3">
    <View className="w-20 h-20 rounded-lg overflow-hidden bg-primary/20">
      <Image source={imageUri} className="w-full h-full" resizeMode="cover" />
    </View>
    <View className="flex-1 ml-4">
      <Text className="text-primary text-[10px] font-bold uppercase tracking-wider">
        {role}
      </Text>
      <Text
        className="text-lg font-bold text-slate-900 dark:text-white"
        numberOfLines={1}
      >
        {name}
      </Text>
      <View className="mt-1">
        {/* Instagram — always web URL, works in all builds */}
        {handle !== "_" && (
          <TouchableOpacity
            className="flex-row items-center gap-1 mb-1"
            onPress={() =>
              openUrl(`https://instagram.com/${handle.replace("@", "")}`)
            }
          >
            <AtSign size={14} color="#64748b" />
            <Text className="text-sm text-slate-500" numberOfLines={1}>
              {handle}
            </Text>
          </TouchableOpacity>
        )}

        {/* LinkedIn — always web URL */}
        <TouchableOpacity
          className="flex-row items-center gap-1 mb-1"
          onPress={() => openUrl(linkedin)}
        >
          <Linkedin size={14} color="#64748b" />
          <Text className="text-sm text-slate-500" numberOfLines={1}>
            {linkedin.split("/").at(-1)}
          </Text>
        </TouchableOpacity>

        {/* Email */}
        <TouchableOpacity
          className="flex-row items-center gap-1"
          onPress={() => openUrl(`mailto:${email}`)}
        >
          <Mail size={14} color="#64748b" />
          <Text className="text-sm text-slate-500" numberOfLines={1}>
            {email}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function KGPPresence(): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Shuffle the team data when the component mounts
  const shuffledTeam = useMemo(() => {
    return shuffleArray(TEAM_DATA);
  }, []);

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [bugReportVisible, setBugReportVisible] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-primary/10 bg-background-light/80 dark:bg-background-dark/80">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="bg-primary/10 p-2 rounded-lg"
            onPress={() => {
              Vibration.vibrate(20);
              router.back();
            }}
          >
            <ChevronLeft size={20} color="#0fbd2c" />
          </TouchableOpacity>
          <Text className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            KGP Presence
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* About Section */}
        <View className="px-4 pt-8 pb-6">
          <View className="self-start px-3 py-1 rounded-full bg-primary/10 mb-2">
            <Text className="text-primary text-[10px] font-semibold uppercase tracking-widest">
              Our Mission
            </Text>
          </View>
          <Text className="text-3xl font-extrabold mb-4 text-slate-900 dark:text-white">
            About KGP Presence
          </Text>
          <Text className="text-slate-600 dark:text-slate-400 leading-6 text-lg">
            The Attendance-Tracker is built exclusively for IIT Kharagpur students to keep Track of their Classes in our academic curriculum. We make it easy to stay above mandatory ERP attendance thresholds by helping you log daily classes, calculate safe margins, and monitor your standing in real-time so you can focus on what matters.
          </Text>
        </View>

        {/* Team Section */}
        <View className="px-4 pb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Users size={20} color="#0fbd2c" />
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              Meet the Team
            </Text>
          </View>

          {/* Map over the shuffled array instead of TEAM_DATA */}
          {shuffledTeam.map((member) => (
            <TeamMemberCard key={member.id} {...member} />
          ))}
        </View>

        {/* Contact Section */}
        <View className="px-4">
          <View className="bg-primary/5 rounded-2xl p-6 border border-primary/10 mb-8">
            <Text className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
              Get in touch
            </Text>
            <Text className="text-slate-600 dark:text-slate-400 mb-6">
              Have questions or feedback? We{`'`}d love to hear from you.
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-primary/10 shadow-sm"
              onPress={() => openUrl("mailto:kgppresence@gmail.com")}
            >
              <View className="w-12 h-12 bg-primary items-center justify-center rounded-full">
                <Mail size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                  Primary Email
                </Text>
                <Text className="text-lg font-bold text-primary">
                  kgppresence@gmail.com
                </Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Feedback & Bug Report Section */}
        <View className="px-4 mt-2 mb-4">
          <View className="flex-row gap-3">
            {/* Send Feedback Card */}
            <TouchableOpacity
              className="flex-1 bg-[#135bec]/5 border border-[#135bec]/20 rounded-2xl p-4 items-center"
              onPress={() => {
                Vibration.vibrate(20);
                setFeedbackVisible(true);
              }}
            >
              <View className="w-12 h-12 bg-[#135bec]/10 items-center justify-center rounded-full mb-3">
                <MessageSquare size={22} color="#135bec" />
              </View>
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Send Feedback
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-xs text-center">
                Share your thoughts
              </Text>
            </TouchableOpacity>

            {/* Report Bug Card */}
            <TouchableOpacity
              className="flex-1 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 items-center"
              onPress={() => {
                Vibration.vibrate(20);
                setBugReportVisible(true);
              }}
            >
              <View className="w-12 h-12 bg-amber-500/10 items-center justify-center rounded-full mb-3">
                <MaterialIcons name="bug-report" size={24} color="#f59e0b" />
              </View>
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Report Bug
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-xs text-center">
                Help us fix issues
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-slate-400 text-xs text-center mt-3">
            Your feedback helps us improve KGP Presence
          </Text>
        </View>

        {/* Modals */}
        <FeedbackModal
          visible={feedbackVisible}
          onClose={() => setFeedbackVisible(false)}
        />
        <BugReportModal
          visible={bugReportVisible}
          onClose={() => setBugReportVisible(false)}
        />

        {/* Footer */}
        <View className="pb-12 items-center">
          <Text className="text-slate-400 text-sm">© 2026 KGP Presence Attendance Tracker</Text>
          <Text className="text-slate-400 text-xs mt-1">Made for the academic excellence of the campus</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}