import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(true);

  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading  = useCallback(() => setLoading(false), []);

  return (
    <LoadingContext.Provider value={{ loading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
