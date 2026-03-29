export const fetchQuote = async (symbol) => {
  try {
    const res = await fetch(`/api/quote?symbol=${symbol}`);
    if (!res.ok) throw new Error('Failed to fetch quote');
    return await res.json();
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
};

export const fetchChart = async (symbol, period = '7d') => {
  try {
    const res = await fetch(`/api/chart?symbol=${symbol}&period=${period}`);
    if (!res.ok) throw new Error('Failed to fetch chart');
    return await res.json();
  } catch (error) {
    console.error(`Error fetching chart for ${symbol}:`, error);
    return [];
  }
};

export const fetchSearch = async (query) => {
  if (!query) return [];
  try {
    const res = await fetch(`/api/search?query=${query}`);
    if (!res.ok) throw new Error('Failed to search');
    return await res.json();
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    return [];
  }
};

export const fetchAIInsights = async (holdings) => {
  try {
    const res = await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdings })
    });
    if (!res.ok) throw new Error('Failed to fetch insights');
    return await res.json();
  } catch (error) {
    console.error('Error fetching insights:', error);
    return null;
  }
};

export const fetchMomentum = async () => {
  try {
    const res = await fetch('/api/market-momentum');
    if (!res.ok) throw new Error('Failed to fetch momentum');
    return await res.json();
  } catch (error) {
    console.error('Error fetching momentum:', error);
    return [];
  }
};

export const fetchInstitutional = async (symbol) => {
  try {
    const res = await fetch(`/api/institutional?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch (error) {
    console.error(`Institutional fetch error for ${symbol}:`, error);
    return null;
  }
};

export const fetchTechnical = async (symbol) => {
  try {
    const res = await fetch(`/api/technical?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error('Failed to fetch technical data');
    return await res.json();
  } catch (error) {
    console.error(`Error fetching technical data for ${symbol}:`, error);
    return null;
  }
};

export const fetchExchangeRate = async (currency) => {
  try {
    const res = await fetch(`/api/exchange-rate?currency=${currency}`);
    const data = await res.json();
    return data.rate || 1;
  } catch (error) {
    return 1;
  }
};
