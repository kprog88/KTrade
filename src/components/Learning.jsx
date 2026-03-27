import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, AreaChart, Area, BarChart, Bar, ComposedChart } from 'recharts';
import { BookOpen, TrendingUp, AlertTriangle, Crosshair, BarChart2, Layers } from 'lucide-react';

const mockDataMA = [
  { day: 'Mon', price: 150, ma: 140 },
  { day: 'Tue', price: 155, ma: 143 },
  { day: 'Wed', price: 148, ma: 145 },
  { day: 'Thu', price: 160, ma: 148 },
  { day: 'Fri', price: 165, ma: 153 },
  { day: 'Sat', price: 170, ma: 157 },
  { day: 'Sun', price: 168, ma: 160 },
];

const mockDataStopLoss = [
  { day: 'Day 1', price: 100 },
  { day: 'Day 2', price: 105 },
  { day: 'Day 3', price: 110 },
  { day: 'Day 4', price: 95 }, 
  { day: 'Day 5', price: 80 },
];

const mockDataVolume = [
  { day: 'Jan 1', price: 100, volume: 1.2 },
  { day: 'Jan 2', price: 102, volume: 1.4 },
  { day: 'Jan 3', price: 115, volume: 8.5 }, // Breakout!
  { day: 'Jan 4', price: 118, volume: 6.2 },
  { day: 'Jan 5', price: 125, volume: 5.1 },
];

const mockDataSupport = [
  { day: 'W1', price: 155 },
  { day: 'W2', price: 151 }, // Support bounce
  { day: 'W3', price: 164 },
  { day: 'W4', price: 169 }, // Resistance hit
  { day: 'W5', price: 158 },
  { day: 'W6', price: 152 }, // Support bounce
];

export default function Learning() {
  return (
    <div className="portfolio-container" style={{ paddingBottom: '3rem' }}>
      <div className="portfolio-header">
        <h2>AI Trading Academy</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Master the concepts behind the algorithms.</p>
      </div>

      <div className="dashboard-grid">
        
        {/* Module 1: Moving Averages */}
        <div className="glass-panel" style={{ gridColumn: 'span 12' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(79, 70, 229, 0.15)', borderRadius: '12px' }}>
               <TrendingUp color="var(--accent-color)" size={28} />
            </div>
            <h2>Moving Averages (MA) & MACD</h2>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '1rem' }}>
                A <strong>Moving Average</strong> smooths out short-term price fluctuations to reveal the true underlying trend. Instead of reacting to daily market noise, algorithms look at the average price over a specific timeframe (like 50 or 200 days).
              </p>
              <p>
                When a stock's current price crosses <em>above</em> its moving average, it is often seen as a bullish breakout. When the short-term MA crosses the long-term MA, that is called a <strong>MACD crossover</strong>. Our AI relies on these crossovers to identify when massive institutional accumulation is taking place.
              </p>
              <br/>
              <p style={{ fontSize: '0.9rem', padding: '1rem', background: 'var(--panel-border)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>💡 Example:</strong> Hover over the interactive graph to see the raw fluctuating Daily Price (white) versus the smoothed Moving Average (purple). Notice how the purple line ignores sudden drops!
              </p>
            </div>
            <div style={{ flex: '1 1 400px', height: '280px', background: 'var(--bg-color)', borderRadius: '16px', padding: '1rem', border: '1px solid var(--panel-border)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.1)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockDataMA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" hide />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="price" stroke="var(--text-secondary)" strokeWidth={2} name="Daily Price" dot={{ r: 4, fill: 'var(--bg-color)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="ma" stroke="var(--accent-color)" strokeWidth={4} name="Moving Average" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Module 4: Momentum & Institutional Volume (NEW) */}
        <div className="glass-panel" style={{ gridColumn: 'span 12' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px' }}>
               <BarChart2 color="#3b82f6" size={28} />
            </div>
            <h2>Algorithmic Momentum & Volume Spikes</h2>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 400px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Volume</strong> is the absolute number of shares traded in a given day. Retail investors like you and me cannot move the price of mega-cap stocks. It takes <em>hedge funds and institutional algorithms</em> buying millions of shares to spark a rally.
              </p>
              <p>
                When our <strong>Market Opportunities</strong> scanner flags a stock, it's looking for "Momentum". This usually means the stock's price is rising simultaneously with an enormous spike in traded Volume. This confirms that big banks are accumulating the asset, giving you a green light to ride their coattails.
              </p>
              <br/>
              <p style={{ fontSize: '0.9rem', padding: '1rem', background: 'var(--panel-border)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <strong style={{ color: 'var(--text-primary)' }}>💡 Example:</strong> Look at Jan 3. The price surged, but more importantly, the Volume (blue bars) exploded by 600%. This is the exact signature of an institutional breakout.
              </p>
            </div>
            <div style={{ flex: '1 1 400px', height: '280px', background: 'var(--bg-color)', borderRadius: '16px', padding: '1rem', border: '1px solid var(--panel-border)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.1)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mockDataVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} hide />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 20]} hide />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }} />
                  <Bar yAxisId="right" dataKey="volume" fill="#3b82f6" opacity={0.5} name="Trading Volume (Millions)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="price" stroke="var(--text-primary)" strokeWidth={3} name="Stock Price" dot={{ r: 4, fill: 'var(--bg-color)', strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Module 5: Support & Resistance (NEW) */}
        <div className="glass-panel" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px' }}>
              <Layers color="#f59e0b" size={26} />
            </div>
            <h2>Support & Resistance Zones</h2>
          </div>
          <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem', flex: 1 }}>
            Financial assets often bounce between invisible ceilings and floors driven by human psychology. A <strong>Support level</strong> is a price floor where buyers historically step in to buy the dip. A <strong>Resistance level</strong> is a ceiling where sellers historically take massive profits.
            <br/><br/>
            When KTrade advises a Limit Buy, it calculates the strongest Support floor to ensure you buy safely at the bottom of the channel.
          </p>
          <div style={{ height: '180px', width: '100%', background: 'var(--bg-color)', borderRadius: '16px', padding: '1rem', border: '1px solid var(--panel-border)' }}>
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockDataSupport}>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'transparent', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  <ReferenceLine y={150} stroke="var(--success-color)" strokeWidth={2} label={{ position: 'insideBottomLeft', value: 'Support Floor ($150)', fill: 'var(--success-color)', fontSize: 12, fontWeight: 'bold' }} />
                  <ReferenceLine y={170} stroke="var(--danger-color)" strokeWidth={2} label={{ position: 'insideTopLeft', value: 'Resistance Ceiling ($170)', fill: 'var(--danger-color)', fontSize: 12, fontWeight: 'bold' }} />
                </LineChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* Module 2: Order Types (Stop Loss) */}
        <div className="glass-panel" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '12px' }}>
              <AlertTriangle color="var(--danger-color)" size={26} />
            </div>
            <h2>Risk & Stop-Losses</h2>
          </div>
          <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem', flex: 1 }}>
            A <strong>Stop-Loss Order</strong> is an automated trigger you set with your broker. If a stock drops drastically, it acts as a parachute, selling automatically to prevent complete capital destruction. 
            <br/><br/>
            Our Insights highly recommend <strong>Trailing Stop-Losses</strong>. As the stock climbs higher, your stop-loss climbs with it, locking in your profits while capping downside risk!
          </p>
          <div style={{ height: '180px', width: '100%', background: 'var(--bg-color)', borderRadius: '16px', padding: '1rem', border: '1px solid var(--panel-border)' }}>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockDataStopLoss}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--danger-color)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--danger-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'transparent', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="price" stroke="var(--danger-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                  <ReferenceLine y={102} stroke="var(--text-primary)" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'Stop-Loss Triggers Here!', fill: 'var(--text-primary)', fontSize: 12 }} />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
