import { Document, Types } from "mongoose";

export interface UserInterface {
  // Data Fields
  firstName: string;
  lastName: string;
  instituteId: string;
  password: string;
  rollNo: string;
  graduationYear?: number;
  timetables: Types.ObjectId[]; // References to Timetable model
  department: {
    _id: string;
    shortCode: string;
    longName: string;
  } | string;
  subjects: Types.ObjectId[];   // References to Subject model
  role: "normal" | "admin";
  refreshToken?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Custom Schema Methods
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}