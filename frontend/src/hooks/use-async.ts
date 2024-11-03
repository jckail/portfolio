import { useState, useCallback } from 'react';
import { handleApiError } from '@/utils/api';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
      error: null,
    }));

    try {
      const data = await asyncFunction();
      setState({
        data,
        error: null,
        isLoading: false,
      });
      return data;
    } catch (error) {
      const errorMessage = handleApiError(error);
      setState({
        data: null,
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
