import { useState, useEffect } from 'react';
import { APP_CONFIG } from '@/config/app';

interface PlanFilters {
  search?: string;
  category?: string;
}

interface Plan {
  planPda: string;
  merchantWallet: string;
  planId: string;
  planName: string;
  mint: string;
  feeAmount: string;
  paymentInterval: string;
  isActive: boolean;
  totalSubscribers: number;
  totalRevenue: string;
  description?: string;
  features?: any;
  category?: string;
  createdAt: string;
}

export function usePlans(filters?: PlanFilters) {
  const [data, setData] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const queryParams = new URLSearchParams();
        
        if (filters?.search) {
          queryParams.append('search', filters.search);
        }
        if (filters?.category) {
          queryParams.append('category', filters.category);
        }

        const url = `${APP_CONFIG.APP_URL}/plans${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }

        const plans = await response.json();
        setData(plans);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [filters?.search, filters?.category]);

  return { data, isLoading, error };
}

export function usePlan(planPda: string) {
  const [data, setData] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${APP_CONFIG.APP_URL}/plans/${planPda}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch plan');
        }

        const plan = await response.json();
        setData(plan);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (planPda) {
      fetchPlan();
    }
  }, [planPda]);

  const refetch = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${APP_CONFIG.APP_URL}/plans/${planPda}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch plan');
      }

      const plan = await response.json();
      setData(plan);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch };
}