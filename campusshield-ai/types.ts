
export interface ScanResult {
  isScam: boolean;
  riskScore: number;
  explanation: string;
  recommendations: string[];
  detectedPatterns: string[];
  scamType?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  content: string;
  result: ScanResult;
}

export interface User {
  phone: string;
  email?: string;
  name: string;
  isLoggedIn: boolean;
  trustScore: number;
  isElderlyMode?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  SCAN = 'scan',
  HISTORY = 'history',
  PROFILE = 'profile',
  SAFETY_CENTER = 'safety_center'
}
