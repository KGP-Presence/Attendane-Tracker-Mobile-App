
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { User, Calendar, ArrowRight, AlertCircle } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { SubjectInterface } from '../types/subjectTypes';

export const SubjectCard = ({
  name,
  code,
  credits,
  type,
  grading,
  professors,
  slots,
  classesAttended = 0,
  totalClasses = 0,
}: SubjectInterface) => {
  const percentage = totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;
  
  // Dynamic UI Constants
  // Logic: Critical if below 75% (and if classes have actually started)

  const isCritical = percentage < 75 && totalClasses > 0;

  const isLab = type?.toUpperCase() === 'LAB';
  const progressColor = isLab ? '#10B981' : '#2563EB'; // Green for Lab, Blue for Theory
  const badgeBg = isLab ? 'bg-emerald-50' : 'bg-blue-50';
  const badgeText = isLab ? 'text-emerald-600' : 'text-blue-600';

  // SVG Progress Ring calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View className={`bg-white rounded-3xl p-5 mb-4 shadow-sm border ${
        isCritical ? 'border-red-200' : 'border-gray-100'
      }`}>
      {/* Header Badges & Progress Ring */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row gap-2">
          <View className={`${badgeBg} px-3 py-1 rounded-md`}>
            <Text className={`${badgeText} text-[10px] font-bold tracking-widest`}>{type?.toUpperCase()}</Text>
          </View>
          <View className="bg-orange-50 px-3 py-1 rounded-md">
            <Text className="text-orange-500 text-[10px] font-bold tracking-widest uppercase">{grading}</Text>
          </View>
          {/* Critical Warning Badge */}

          {isCritical && (
            <View className="bg-red-50 px-2 py-1 rounded-md flex-row items-center">
              <AlertCircle size={10} color="#EF4444" />
              <Text className="text-red-500 text-[10px] font-bold ml-1">LOW</Text>
            </View>
          )}
        </View>

        {/* Circular Progress Ring */}
        <View className="items-center">
          <View className="relative items-center justify-center">
            <Svg onLayout={() => {}} width="54" height="54" viewBox="0 0 54 54">
              <Circle cx="27" cy="27" r={radius} stroke="#F3F4F6" strokeWidth="5" fill="none" />
              <Circle
                cx="27"
                cy="27"
                r={radius}
                stroke={progressColor}
                strokeWidth="5"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 27 27)"
              />
            </Svg>
            <View className="absolute">
              <Text className={`text-[12px] font-bold ${isCritical ? 'text-red-600' : 'text-gray-800'}`}>
                {percentage}%
              </Text>
            </View>
          </View>
          <Text className="text-[10px] italic text-gray-400 mt-1">{classesAttended}/{totalClasses} Classes</Text>
        </View>
      </View>

      {/* Course Title & Code */}
      <View className="mb-4 -mt-12 mr-[60px]">
        <Text className="text-xl font-bold text-slate-900 leading-tight">{name}</Text>
        <Text className="text-sm text-slate-500 font-medium">{code} • {credits} Credits</Text>
      </View>

      {/* Professor and Slots Section */}
      <View className="flex-row mb-6 gap-5">
        <View className="flex-1 flex-row items-center">
          <User size={18} color="#94A3B8" strokeWidth={1.5} />
          <View className="ml-2">
            <Text className="text-[10px] text-gray-400 font-medium">Professor</Text>
            <Text className="text-[13px] font-semibold text-gray-800">{professors}</Text>
          </View>
        </View>
        
        <View className="flex-1 flex-row items-center ml-2">
          <Calendar size={18} color="#94A3B8" strokeWidth={1.5} />
          <View className="ml-2">
            <Text className="text-[10px] text-gray-400 font-medium">Slots</Text>
            <Text className="text-[13px] font-semibold text-gray-800 uppercase" numberOfLines={1}>
              {Array.isArray(slots) ? slots.join(', ') : slots}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer / View Logs */}
      <View className="flex-row justify-between items-center pt-2">
        {/* Profile Initials/Circles */}
        <View className="flex-row">
          <View className="w-7 h-7 rounded-full bg-slate-200 items-center justify-center border-2 border-white">
            <Text className="text-[8px] font-bold text-gray-600">SJ</Text>
          </View>
          <View className={`w-7 h-7 rounded-full ${isLab ? 'bg-emerald-100' : 'bg-blue-100'} -ml-2 items-center justify-center border-2 border-white`}>
            <Text className={`text-[8px] font-bold ${isLab ? 'text-emerald-600' : 'text-blue-600'}`}>{isLab ? 'DB' : 'OS'}</Text>
          </View>
        </View>

        <TouchableOpacity className="flex-row items-center">
          <Text className="text-blue-600 font-bold text-sm mr-1">View Logs</Text>
          <ArrowRight size={16} color="#2563EB" strokeWidth={3} />
        </TouchableOpacity>
      </View>
    </View>
  );
};