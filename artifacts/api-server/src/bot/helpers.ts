import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function generateReferralCode(): string {
  return nanoid();
}

// ===== نظام النقاط =====
// 1000 نقطة = 1$ USDT
export const POINTS_PER_USDT = 1000;

// العمولات
export const USER_COMMISSION = 0.70;  // 70% للمستخدم
export const ADMIN_COMMISSION = 0.30; // 30% للمدير

// حساب نقاط المستخدم من قيمة USDT
export function calcUserPoints(usdtValue: number): number {
  return Math.round(usdtValue * USER_COMMISSION * POINTS_PER_USDT);
}

// حساب نقاط المدير من قيمة USDT
export function calcAdminPoints(usdtValue: number): number {
  return Math.round(usdtValue * ADMIN_COMMISSION * POINTS_PER_USDT);
}

// تحويل نقاط إلى USDT
export function pointsToUsdt(points: number): number {
  return points / POINTS_PER_USDT;
}

// تنسيق قيمة USDT للعرض
export function formatUsdt(usdt: number): string {
  return usdt.toFixed(4);
}

// نقاط الإحالة (50 نقطة = 0.05$)
export const POINTS_PER_REFERRAL = 50;

// الحد الأدنى للسحب (1000 نقطة = 1$ USDT)
export const MIN_WITHDRAWAL_POINTS = 1000;

// قائمة المواقع الموثوقة المضمّنة مسبقاً
export const TRUSTED_SITES = [
  {
    title: "AdBTC - مشاهدة إعلانات للبيتكوين",
    description: "شاهد إعلانات قصيرة واربح بيتكوين مباشرةً. موقع موثوق منذ 2015. سجّل، اذهب لقسم View Ads وشاهد الإعلانات.",
    type: "watch_ad",
    url: "https://adbtc.top/",
    source: "AdBTC.top",
    usdtValue: "0.0050",
  },
  {
    title: "Cointiply - شاهد فيديوهات واربح كريبتو",
    description: "منصة رائدة لمشاهدة إعلانات وفيديوهات مقابل عملات رقمية. سجّل وانتقل لقسم Offers ثم Videos.",
    type: "watch_ad",
    url: "https://cointiply.com/",
    source: "Cointiply",
    usdtValue: "0.0080",
  },
  {
    title: "Rollercoin - العب وعدّن كريبتو",
    description: "لعبة مجانية تمنحك قوة تعدين حقيقية. العب الألعاب اليومية واربح BTC/ETH/DOGE.",
    type: "other",
    url: "https://rollercoin.com/",
    source: "Rollercoin",
    usdtValue: "0.0060",
  },
  {
    title: "FaucetPay - مهام يومية للكريبتو",
    description: "منصة ميكرو-كريبتو موثوقة. سجّل وأكمل المهام اليومية في قسم Earn.",
    type: "other",
    url: "https://faucetpay.io/",
    source: "FaucetPay",
    usdtValue: "0.0040",
  },
  {
    title: "Picoworkers - مهام بسيطة مدفوعة",
    description: "أكمل مهام صغيرة (تسجيل، متابعة، تقييم) واربح أموالاً. آلاف المهام المتاحة.",
    type: "other",
    url: "https://picoworkers.com/",
    source: "Picoworkers",
    usdtValue: "0.0100",
  },
  {
    title: "Microworkers - مهام مدفوعة متنوعة",
    description: "موقع موثوق لتنفيذ مهام بسيطة عبر الإنترنت مقابل أجر. اختر المهمة وأكملها.",
    type: "other",
    url: "https://microworkers.com/",
    source: "Microworkers",
    usdtValue: "0.0120",
  },
  {
    title: "AdSter - إعلانات مدفوعة بالكريبتو",
    description: "شاهد إعلانات قصيرة واربح USDT مباشرة. الحد الأدنى للسحب منخفض جداً.",
    type: "watch_ad",
    url: "https://adster.io/",
    source: "AdSter",
    usdtValue: "0.0030",
  },
  {
    title: "Timebucks - مهام ومشاهدة إعلانات",
    description: "منصة شاملة: شاهد إعلانات، أكمل استطلاعات، تابع مواقع التواصل. تدفع عبر PayPal وكريبتو.",
    type: "watch_ad",
    url: "https://timebucks.com/",
    source: "Timebucks",
    usdtValue: "0.0070",
  },
] as const;
