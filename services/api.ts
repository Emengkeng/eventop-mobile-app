import axios from 'axios';
import { useWalletStore } from '@/store/walletStore';
import { APP_CONFIG } from '@/config/app';

const API_URL = APP_CONFIG.APP_URL || 'https://api.eventop.xyz';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const { authToken } = useWalletStore.getState();
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { disconnect } = useWalletStore.getState();
      disconnect();
    }
    return Promise.reject(error);
  }
);

export interface MerchantPlan {
  planPda: string;
  merchantWallet: string;
  planId: string;
  planName: string;
  mint: string;
  feeAmount: string;
  paymentInterval: string;
  isActive: boolean;
  totalSubscribers: number;
  description?: string;
  logoUrl?: string;
  category?: string;
}

export interface SubscriptionResponse {
  subscriptionPda: string;
  userWallet: string;
  merchantWallet: string;
  merchantPlanPda: string;
  feeAmount: string;
  paymentInterval: string;
  lastPaymentTimestamp: string;
  totalPaid: string;
  paymentCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface getUserSubscriptionResponse {
  createdAt: Date;
  merchantWallet: string;
  mint: string;
  feeAmount: string;
  paymentInterval: string;
  isActive: boolean;
  customerEmail: string | null;
  customerId: string | null;
  subscriptionPda: string;
  userWallet: string;
  subscriptionWalletPda: string;
  merchantPlanPda: string;
  lastPaymentTimestamp: string;
  totalPaid: string;
  paymentCount: number;
  updatedAt: Date;
  cancelledAt: Date | null;
}

export interface WalletBalance {
  walletPda: string;
  ownerWallet: string;
  mint: string;
  isYieldEnabled: boolean;
  totalSubscriptions: number;
  totalSpent: string;
}

export const apiService = {
  getPlans: async (params?: { category?: string; search?: string }) => {
    const { data } = await api.get<MerchantPlan[]>('/merchants/plans/search', { params });
    return data;
  },

  getPlanDetail: async (planPda: string) => {
    const { data } = await api.get<MerchantPlan>(`/merchants/plans/${planPda}`);
    return data;
  },

  getUserSubscriptions: async (wallet: string) => {
    const { data } = await api.get<getUserSubscriptionResponse[]>(`/subscriptions/user/${wallet}`);
    console.log('Fetched user subscriptions:', data);
    return data;
  },

  getSubscriptionDetail: async (subscriptionPda: string) => {
    const { data } = await api.get(`/subscriptions/${subscriptionPda}`);
    return data;
  },

  getUpcomingPayments: async (wallet: string) => {
    const { data } = await api.get(`/subscriptions/user/${wallet}/upcoming`);
    return data;
  },

  getWalletBalance: async (walletPda: string) => {
    const { data } = await api.get<WalletBalance>(`/subscriptions/wallet/${walletPda}/balance`);
    return data;
  },

  getUserStats: async (wallet: string) => {
    const { data } = await api.get(`/subscriptions/user/${wallet}/stats`);
    return data;
  },
};