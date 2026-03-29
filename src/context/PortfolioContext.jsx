import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { fetchQuote } from '../data/api';
import { useAuth } from './AuthContext';
import { db } from '../firebase';

export const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const { currentUser } = useAuth();

  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true); // guard against saving on initial load

  // Real-time Firestore listener — syncs instantly across all devices
  useEffect(() => {
    if (!currentUser) return;

    isFirstLoad.current = true;
    setLoading(true);

    const docRef = db.collection('users').doc(currentUser.uid);

    const unsubscribe = docRef.onSnapshot((doc) => {
      // Only apply the initial load once (prevent overwriting user edits with stale DB snapshot)
      if (isFirstLoad.current) {
        if (doc.exists && doc.data().holdings && doc.data().holdings.length > 0) {
          // Firestore has data — use it
          setHoldings(doc.data().holdings);
        } else {
          // New device / empty doc — try localStorage migration ONLY
          // NEVER write an empty array back to Firestore here
          const saved = localStorage.getItem('portfolioHoldings');
          const localHoldings = saved ? JSON.parse(saved) : [];
          setHoldings(localHoldings);
          if (localHoldings.length > 0) {
            // Migrate local data up to Firestore (one-time)
            docRef.set({ holdings: localHoldings }, { merge: true });
          }
        }
        isFirstLoad.current = false;
        setLoading(false);
      }
    }, (error) => {
      console.error('Firestore sync error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Save to Firestore whenever user changes holdings (not on first load)
  useEffect(() => {
    if (!currentUser || loading || isFirstLoad.current) return;
    db.collection('users')
      .doc(currentUser.uid)
      .set({ holdings }, { merge: true })
      .catch(e => console.error('Save error:', e));
    // Keep localStorage as offline backup
    localStorage.setItem('portfolioHoldings', JSON.stringify(holdings));
  }, [holdings, currentUser, loading]);

  // Refresh live market prices after data loads
  useEffect(() => {
    if (holdings.length === 0 || loading) return;
    const loadQuotes = async () => {
      const updated = await Promise.all(holdings.map(async h => {
        const q = await fetchQuote(h.symbol);
        return q ? { ...h, currentPrice: q.price, currencySymbol: q.currencySymbol || h.currencySymbol } : h;
      }));
      const changed = updated.some((h, i) => h.currentPrice !== holdings[i]?.currentPrice);
      if (changed) setHoldings(updated);
    };
    loadQuotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length, loading]);

  return (
    <PortfolioContext.Provider value={{ holdings, setHoldings }}>
      {!loading && children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);
