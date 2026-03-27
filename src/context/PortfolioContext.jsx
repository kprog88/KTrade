import React, { createContext, useState, useEffect, useContext } from 'react';
import { fetchQuote } from '../data/api';
import { useAuth } from './AuthContext';
import { db } from '../firebase';

export const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const { currentUser } = useAuth();
  
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const docRef = db.collection('users').doc(currentUser.uid);
    docRef.get().then((doc) => {
      if (doc.exists && doc.data().holdings) {
        setHoldings(doc.data().holdings);
      } else {
        // Migration from localStorage if they have existing items
        const saved = localStorage.getItem('portfolioHoldings');
        const defaultHoldings = saved ? JSON.parse(saved) : [];
        setHoldings(defaultHoldings);
        docRef.set({ holdings: defaultHoldings }, { merge: true });
      }
      setLoading(false);
    }).catch(e => {
      console.error("Firestore error:", e);
      setLoading(false);
    });
  }, [currentUser]);

  // Save to Firestore exactly when holdings change
  useEffect(() => {
    if (!currentUser || loading) return;
    db.collection('users').doc(currentUser.uid).set({ holdings }, { merge: true });
    // Keep local cache as a highly resilient backup
    localStorage.setItem('portfolioHoldings', JSON.stringify(holdings));
  }, [holdings, currentUser, loading]);

  // Load live quotes
  useEffect(() => {
    if (holdings.length === 0 || loading) return;
    const loadQuotes = async () => {
      const updated = await Promise.all(holdings.map(async h => {
        const q = await fetchQuote(h.symbol);
        return q ? { ...h, currentPrice: q.price, currencySymbol: q.currencySymbol || h.currencySymbol } : h;
      }));
      // Prevent infinite loops by only updating if prices shifted
      const changed = updated.some((h, i) => h.currentPrice !== holdings[i].currentPrice);
      if (changed) {
        setHoldings(updated);
      }
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
