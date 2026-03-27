import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Sector } from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchAIInsights, fetchMomentum } from '../data/api'
import './Dashboard.css'

export default function Dashboard() {
  const { holdings } = usePortfolio();
  const [insights, setInsights] = useState({ analysis: 'Analyzing portfolio data...', recommendation: 'Generating advice...' });
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [momentum, setMomentum] = useState([]);
  const [activePieIndex, setActivePieIndex] = useState(0);

  // Awesome Recharts Pie colors
  const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6', '#6366f1'];

  const metrics = useMemo(() => {
    let totalValue = 0;
    let costBasis = 0;
    let topGainer = null;
    let topLoser = null;
    
    // Process pie chart data directly from holdings
    const pieDataMap = [];

    holdings.forEach(asset => {
      const price = asset.currentPrice || asset.avgPrice;
      const rate = asset.exchangeRateToUSD || 1;
      
      const tVal = asset.amount * price * rate;
      const costB = asset.amount * asset.avgPrice * rate;
      
      totalValue += tVal;
      costBasis += costB;
      
      pieDataMap.push({ name: asset.symbol, value: tVal });

      const changePct = asset.avgPrice > 0 ? ((tVal - costB) / costB) * 100 : 0;
      if (!topGainer || changePct > topGainer.pct) topGainer = { symbol: asset.symbol, pct: changePct };
      if (!topLoser || changePct < topLoser.pct) topLoser = { symbol: asset.symbol, pct: changePct };
    });

    const profit = totalValue - costBasis;
    const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;
    
    let biggestMover = null;
    if (topGainer && topLoser) {
      biggestMover = Math.abs(topGainer.pct) > Math.abs(topLoser.pct) ? topGainer : topLoser;
    } else {
      biggestMover = topGainer || topLoser;
    }

    // Sort pie data descending
    pieDataMap.sort((a,b) => b.value - a.value);

    return { totalValue, costBasis, profit, profitPercent, assetCount: holdings.length, biggestMover, pieData: pieDataMap };
  }, [holdings]);

  useEffect(() => {
    const loadData = async () => {
      const moData = await fetchMomentum();
      if (moData && moData.length > 0) setMomentum(moData);
    };
    loadData();
  }, []);

  useEffect(() => {
    loadInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings]);

  const loadInsights = async () => {
    setIsInsightsLoading(true);
    setInsights({ analysis: 'Analyzing latest market structure...', recommendation: 'Formulating macroeconomic strategy...' });
    await new Promise(resolve => setTimeout(resolve, 600));
    const insightData = await fetchAIInsights(holdings);
    if (insightData) {
      setInsights(insightData);
    }
    setIsInsightsLoading(false);
  };

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 14}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="var(--text-primary)" fontSize={13} fontWeight="bold">{`${payload.name}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="var(--success-color)" fontSize={12}>
          {`$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${(percent * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="dashboard-grid">
      <div className="glass-panel portfolio-overview">
        <div className="metric">
          <span className="metric-label">Total Balance</span>
          <span className="metric-value">${metrics.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Total P/L</span>
          <span className={`metric-value ${metrics.profit >= 0 ? 'trend-positive' : 'trend-negative'}`}>
            {metrics.profit >= 0 ? '+' : '-'} ${Math.abs(metrics.profit).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ({metrics.profitPercent.toFixed(2)}%) {metrics.profit >= 0 ? '▲' : '▼'}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Total Assets</span>
          <span className="metric-value" style={{ color: 'var(--text-primary)' }}>
            {metrics.assetCount} Positions
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Biggest Mover</span>
          {metrics.biggestMover ? (
            <span className={`metric-value ${metrics.biggestMover.pct >= 0 ? 'trend-positive' : 'trend-negative'}`}>
              {metrics.biggestMover.symbol} {metrics.biggestMover.pct >= 0 ? '+' : ''}{Math.abs(metrics.biggestMover.pct).toFixed(2)}%
            </span>
          ) : (
            <span className="metric-value" style={{ color: 'var(--text-secondary)' }}>--</span>
          )}
        </div>
      </div>

      <div className="glass-panel holdings-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Asset Allocation</h2>
        </div>
        <div style={{ width: '100%', height: '300px' }}>
          {metrics.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.pieData}
                  cx="50%"
                  cy="50%"
                  activeIndex={activePieIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="var(--panel-bg)"
                  strokeWidth={2}
                >
                  {metrics.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                  contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Add assets to your portfolio to view the distribution graph.
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel ai-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>AI Pro Insights ✦</h2>
          <button 
            className="btn-primary" 
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: 'var(--panel-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isInsightsLoading ? 'default' : 'pointer' }}
            onClick={loadInsights}
            disabled={isInsightsLoading}
          >
            {isInsightsLoading ? <span style={{ animation: 'pulse 1s infinite' }}>Analyzing...</span> : '⟳ Refresh'}
          </button>
        </div>
        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <p>
            <strong style={{ color: 'var(--text-primary)' }}>Macro Analysis:</strong> {insights.analysis}
          </p>
          <br/>
          <p>
            <strong style={{ color: 'var(--success-color)' }}>Recommendation:</strong> {insights.recommendation}
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ gridColumn: 'span 12', marginTop: '1.5rem' }}>
         <h2 style={{ marginBottom: '1rem' }}>Market Opportunities</h2>
         <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', paddingTop: '120px', marginTop: '-120px' }}>
           {momentum.map((stock, i) => {
             const isPositive = stock.change >= 0;
             // Procedural AI rationales
             const rationales = [
               "Algorithm breakdown shows massive institutional accumulation.",
               "Technical indicators crossing MACD zero-line for a breakout.",
               "Trading significantly above 50-day moving average.",
               "Sector tailwinds driving outsized volume and price discovery."
             ];
             const aiRationale = rationales[i % rationales.length];
             
             return (
               <div key={i} className="glass-panel momentum-card" style={{ flex: '0 0 220px', padding: '1rem', cursor: 'default' }}>
                 <div className="momentum-tooltip">
                   <strong>AI Review:</strong> {aiRationale}
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img 
                        src={`https://financialmodelingprep.com/image-stock/${stock.symbol}.png`} 
                        alt="logo" 
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <strong style={{ fontSize: '1.1rem' }}>{stock.symbol}</strong>
                    </div>
                    <div className={isPositive ? "trend-positive" : "trend-negative"} style={{ fontSize: '0.85rem' }}>
                      {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}% {isPositive ? '▲' : '▼'}
                    </div>
                 </div>
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock.name}</div>
                 <div style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
                   ${stock.price.toFixed(2)}
                 </div>
               </div>
             )
           })}
         </div>
      </div>
    </div>
  )
}
