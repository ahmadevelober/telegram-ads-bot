import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function generateReferralCode(): string {
  return nanoid();
}

export function formatPoints(points: number): string {
  return points.toLocaleString("ar-SA");
}

export const POINTS_PER_REFERRAL = 50;
export const MIN_WITHDRAWAL_POINTS = 1000;
