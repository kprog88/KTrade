// ── Knowledge base ────────────────────────────────────────────────────────────
// Each entry: { title, emoji, level, tldr, body (paragraphs[]), keyPoints[], tips[], related[] }

const KB = [
  {
    keys: ['rsi', 'relative strength', 'overbought', 'oversold'],
    title: 'RSI — Relative Strength Index',
    emoji: '⚡',
    level: 'Beginner',
    tldr: 'A 0–100 momentum meter that tells you if a stock is moving too fast (overbought) or has been beaten down too much (oversold).',
    body: [
      'RSI measures the speed and size of recent price changes on a scale of 0 to 100. It was created by J. Welles Wilder in 1978 and is one of the most widely used indicators in trading today.',
      'The key levels are 70 and 30. When RSI climbs above 70, the stock has been rising very fast — buyers are exhausted and a pullback becomes more likely. When it drops below 30, sellers have been in control too long and a bounce becomes more likely. Neither is a guarantee, just a warning.',
      'RSI around 50 is neutral — the stock is balanced between buyers and sellers. A reading that gradually rises from 40 to 60 while the price also rises is a healthy, sustainable uptrend. A reading above 70 while price is stalling is a classic divergence warning.',
    ],
    keyPoints: [
      'Above 70 = Overbought — consider taking profits or waiting for a pullback before buying',
      'Below 30 = Oversold — potential buying opportunity, but check why it fell first',
      'Rising RSI with rising price = healthy bullish trend',
      'RSI making lower highs while price makes higher highs = bearish divergence (hidden weakness)',
      'Best used alongside other indicators — RSI alone can stay overbought for weeks in strong trends',
    ],
    tips: ['RSI divergence is more powerful than absolute levels. If the price makes a new high but RSI does not, that hidden weakness often precedes a reversal.'],
    related: ['MACD', 'Bollinger Bands', 'Moving Averages'],
  },
  {
    keys: ['macd', 'moving average convergence', 'divergence', 'signal line', 'histogram'],
    title: 'MACD — Moving Average Convergence Divergence',
    emoji: '🧭',
    level: 'Beginner',
    tldr: 'Shows the relationship between two moving averages to reveal trend direction and momentum shifts.',
    body: [
      'MACD is calculated by subtracting the 26-day EMA from the 12-day EMA. The result is the MACD line. A 9-day EMA of the MACD line is called the Signal line. The histogram shows the difference between the two.',
      'When the MACD line crosses above the Signal line, that is a bullish signal — buying momentum is picking up. When it crosses below, that is bearish. Think of it like a compass: when it points north (MACD above zero and rising), the trend is bullish. South means bearish.',
      'The histogram bars show momentum strength. Green and growing bars = accelerating bullish momentum. Green bars shrinking = the rally is losing steam. Switching from red to green bars can be an early buy signal before the price even moves much.',
    ],
    keyPoints: [
      'MACD line crossing above Signal line = Bullish crossover (buy signal)',
      'MACD line crossing below Signal line = Bearish crossover (sell signal)',
      'Both lines above zero = strong uptrend, both below = downtrend',
      'Histogram bars growing = momentum accelerating in that direction',
      'MACD divergence from price is one of the most reliable reversal signals',
    ],
    tips: ['MACD crossovers on the daily chart are more reliable than on shorter timeframes. A crossover combined with high volume is much stronger than one on low volume.'],
    related: ['RSI', 'Moving Averages', 'Volume Analysis'],
  },
  {
    keys: ['bollinger bands', 'bollinger', 'standard deviation', 'band squeeze', 'volatility bands'],
    title: 'Bollinger Bands',
    emoji: '📦',
    level: 'Intermediate',
    tldr: 'Three lines that define a stock\'s "normal" price range — helps you spot when a move is unusually large.',
    body: [
      'Bollinger Bands consist of three lines: a 20-day Simple Moving Average (the middle band), and upper and lower bands drawn 2 standard deviations above and below it. This means roughly 95% of price action normally stays inside the bands.',
      'When price touches or pushes outside the upper band, the stock is unusually strong — but this can also mean it has moved too far too fast. When price tags the lower band, it is unusually weak and potentially oversold. The bands widen during volatile periods and narrow during quiet ones.',
      'The "Bollinger Squeeze" is one of the most powerful patterns: when the bands narrow to their tightest point in months, it signals that a major breakout is building. The market is "coiling like a spring." When price finally breaks above or below, the move tends to be explosive.',
    ],
    keyPoints: [
      'Price touching upper band = unusually high — potential reversal zone',
      'Price touching lower band = unusually low — potential support zone',
      'Bands wide = high volatility; narrow bands = low volatility (squeeze building)',
      'A squeeze followed by a strong breakout is one of the most reliable trading setups',
      'Price can "walk the band" (hug the upper band for weeks) in a strong trend',
    ],
    tips: ['Never trade a Bollinger squeeze breakout alone — wait for the direction to confirm. The squeeze tells you WHEN, not which way.'],
    related: ['RSI', 'Support & Resistance', 'Volume Analysis'],
  },
  {
    keys: ['support', 'resistance', 'support level', 'resistance level', 'floor', 'ceiling'],
    title: 'Support & Resistance',
    emoji: '🏗️',
    level: 'Beginner',
    tldr: 'Price floors where buyers step in (support) and ceilings where sellers take profits (resistance).',
    body: [
      'Support and resistance are among the most fundamental concepts in technical analysis. They exist because of human psychology: traders remember past prices. If a stock repeatedly bounced at $150, thousands of traders now associate $150 with "a good buy." This collective memory creates a self-fulfilling prophecy.',
      'Support is a price level where buying interest is strong enough to prevent the price from falling further. Resistance is where selling pressure prevents the price from rising. The more times a level is tested without breaking, the stronger it becomes.',
      'When a support level breaks, it flips to resistance (and vice versa). This is called a "role reversal" and is one of the most important concepts for timing entries and exits. A prior support that breaks becomes the target for a short entry on any bounce back to that level.',
    ],
    keyPoints: [
      'The more times a level is touched without breaking, the stronger it is',
      'Round numbers ($100, $50, $200) often act as psychological support/resistance',
      'Broken support becomes resistance, broken resistance becomes support',
      'Set buy limit orders near support, take profit orders near resistance',
      'A breakout above strong resistance on high volume is a powerful buy signal',
    ],
    tips: ['Look at the weekly chart to find the most significant support/resistance levels. Daily noise can obscure the bigger picture.'],
    related: ['Volume Analysis', 'Candlestick Patterns', 'Stop Loss'],
  },
  {
    keys: ['candlestick', 'candle', 'doji', 'hammer', 'engulfing', 'patterns', 'japanese candlestick'],
    title: 'Candlestick Patterns',
    emoji: '🕯️',
    level: 'Intermediate',
    tldr: 'Visual price patterns formed by candles that signal potential reversals or continuations.',
    body: [
      'A single candlestick shows 4 pieces of data: Open, High, Low, Close. The thick body shows the range between open and close. The thin wicks show the highest and lowest prices reached. Green (or white) candles close higher than they opened. Red (or black) candles close lower.',
      'Key reversal patterns: A Hammer at the bottom of a downtrend (small body, long lower wick) shows buyers aggressively rejecting low prices — bullish. An Inverted Hammer or Shooting Star at the top of an uptrend shows sellers rejecting high prices — bearish. A Doji (open = close) means indecision — a potential turning point.',
      'Engulfing patterns are the most powerful single-bar signals. A Bullish Engulfing candle completely engulfs the previous red candle — it means buyers overwhelmed sellers in one session. A Bearish Engulfing at the top of a rally is one of the strongest sell signals in technical analysis.',
    ],
    keyPoints: [
      'Hammer (long lower wick at bottom) = bullish reversal signal',
      'Shooting Star (long upper wick at top) = bearish reversal signal',
      'Doji = indecision, potential trend change coming',
      'Bullish Engulfing = powerful buy signal after a downtrend',
      'Bearish Engulfing = powerful sell signal after an uptrend',
      'Always combine with volume and support/resistance for confirmation',
    ],
    tips: ['A single candlestick pattern at a key support or resistance level is FAR more powerful than a pattern in the middle of nowhere. Location is everything.'],
    related: ['Support & Resistance', 'Volume Analysis', 'RSI'],
  },
  {
    keys: ['fibonacci', 'fib', 'retracement', 'golden ratio', '61.8', '38.2'],
    title: 'Fibonacci Retracement',
    emoji: '🌀',
    level: 'Intermediate',
    tldr: 'Natural percentage levels (23.6%, 38.2%, 61.8%) where stocks commonly pause or reverse after a big move.',
    body: [
      'Fibonacci levels come from the mathematical sequence discovered by Leonardo Fibonacci: 1, 1, 2, 3, 5, 8, 13... Each number is roughly 1.618x the previous one. This "Golden Ratio" appears everywhere in nature — and in market behavior, because traders use it so widely it becomes self-fulfilling.',
      'After a stock makes a strong move (up or down), it often "retraces" a portion of that move before continuing. The most common retracement levels are 23.6%, 38.2%, 50%, 61.8%, and 78.6%. The 61.8% level (the "Golden Pocket") is the single most watched retracement in all of technical analysis.',
      'To use it: find a significant swing low and swing high (or high-to-low). Draw Fibonacci levels between them. Watch how price reacts at each level. If the stock bounces cleanly off the 38.2% level during a healthy uptrend, it signals the uptrend is still strong. A breakdown below 78.6% often means the move is reversing entirely.',
    ],
    keyPoints: [
      '23.6% = shallow retracement, very strong trend',
      '38.2% = moderate pullback, trend still intact',
      '50% = the psychological midpoint, widely watched',
      '61.8% (Golden Pocket) = the most critical retracement level',
      '78.6% = deep retracement, trend may be changing',
    ],
    tips: ['Fibonacci levels work best when they align with other indicators — if the 61.8% retracement lands exactly on a key moving average or support level, that confluence makes it an extremely high-probability entry.'],
    related: ['Support & Resistance', 'Moving Averages', 'Candlestick Patterns'],
  },
  {
    keys: ['volume', 'volume analysis', 'trading volume', 'accumulation', 'distribution', 'on balance volume', 'obv'],
    title: 'Volume Analysis',
    emoji: '📊',
    level: 'Beginner',
    tldr: 'The number of shares traded — the single most honest indicator of whether a price move is real.',
    body: [
      'Price tells you what happened. Volume tells you how much conviction was behind it. A stock can rise 5% on low volume (no one really believes in it) or rise 5% on 10x normal volume (the market is screaming a conviction buy). The same move with different volume has completely different implications.',
      'Accumulation is when institutions buy large positions over days or weeks, subtly pushing price higher on above-average volume. Distribution is when they quietly sell, often at highs while retail traders are excited. Learning to read volume helps you understand what the "smart money" is actually doing, not just what they say.',
      'Key patterns: Rising price + Rising volume = healthy trend (institutions are behind it). Rising price + Falling volume = warning, rally has no fuel. Falling price + Surging volume = panic selling, often a climactic low before a bounce. Volume spike on a breakout above resistance = confirmation of real breakout.',
    ],
    keyPoints: [
      'Price + Volume rising together = the strongest bullish confirmation',
      'Price rising on falling volume = distribution (weak, likely to reverse)',
      'Volume spike at market lows = climactic selling, potential bottom',
      'A breakout without volume is usually a false breakout',
      'Average volume context: compare current day to the 20-day average',
    ],
    tips: ['When a stock gapes up or down on earnings, look at the volume on the following days. Sustained buying volume after a gap up is extremely bullish; fading volume means the gap might fill.'],
    related: ['Support & Resistance', 'MACD', 'Candlestick Patterns'],
  },
  {
    keys: ['pe ratio', 'p/e', 'price to earnings', 'valuation', 'earnings multiple'],
    title: 'P/E Ratio — Price-to-Earnings',
    emoji: '🔢',
    level: 'Beginner',
    tldr: 'How many dollars investors pay per dollar of company profit — the most widely used stock valuation metric.',
    body: [
      'P/E ratio = Stock Price ÷ Earnings Per Share. If a stock trades at $100 and earns $5 per share per year, the P/E is 20. This means investors are willing to pay $20 for every $1 of current profit — essentially, they expect the company to keep growing.',
      'A high P/E (like 50+) means investors expect strong future growth. A low P/E (like 8) means the stock is either cheap or the company has problems. Tech stocks typically have high P/Es because of growth expectations. Mature utilities and banks often have low P/Es because growth is slow but predictable.',
      'The most important context: compare the P/E to the company\'s own history, to its sector peers, and to the S&P 500 average (historically around 15-20). A stock trading at 10x its historical P/E average is likely overvalued. One trading at half its historical P/E might be a bargain — or a value trap.',
    ],
    keyPoints: [
      'P/E = Price ÷ EPS (Earnings Per Share)',
      'High P/E = market expects high growth (like tech stocks)',
      'Low P/E = slow growth, value stock, or hidden problem',
      'S&P 500 historical average P/E: ~15-18x',
      'Forward P/E uses next year\'s estimated earnings — more forward-looking',
    ],
    tips: ['P/E ratio means nothing without context. Amazon traded at a P/E of 300+ for years — it looked insanely expensive but the growth justified it. Always compare to the company\'s own history and sector peers.'],
    related: ['EPS & Earnings', 'Market Cap', 'Fundamental Analysis'],
  },
  {
    keys: ['eps', 'earnings per share', 'earnings', 'earnings report', 'earnings beat', 'earnings miss'],
    title: 'EPS & Earnings Reports',
    emoji: '📋',
    level: 'Beginner',
    tldr: 'The profit a company makes divided by its shares — the number the entire market watches every quarter.',
    body: [
      'EPS (Earnings Per Share) = Net Profit ÷ Total Shares Outstanding. It\'s the single most important number in fundamental analysis. Every 3 months, publicly traded companies report their earnings, and the market reacts instantly — sometimes violently.',
      'The key is not whether earnings are good or bad in absolute terms — it\'s whether they beat or miss analyst estimates. If analysts expected $1.00 EPS and the company reports $1.20, it\'s a "beat" and the stock often surges. If it reports $0.80, it\'s a "miss" and the stock can drop 10-20% in hours. This is why earnings season is the most volatile time for individual stocks.',
      'Watch for the "guidance" too. A company might beat this quarter but lower its forecast for next quarter — that often hurts more than missing estimates, because the future expectations are what drive stock prices. A company that consistently beats estimates and raises guidance is a compounding machine.',
    ],
    keyPoints: [
      'Beat estimate + raise guidance = often the best catalyst for stock surge',
      'Miss estimate + lower guidance = double whammy, stock often craters',
      'Revenue growth matters as much as profit (especially for growth companies)',
      'Earnings releases happen pre-market or after-hours, creating gap moves',
      'Options premiums spike before earnings — IV crush after can destroy options buyers',
    ],
    tips: ['Don\'t hold positions through earnings unless you are very confident. Professionals often use options to hedge. Even a "good" earnings report can drop if expectations were too high.'],
    related: ['P/E Ratio', 'Market Cap', 'Options'],
  },
  {
    keys: ['options', 'call', 'put', 'calls', 'puts', 'strike price', 'expiration', 'premium', 'derivatives'],
    title: 'Options — Calls & Puts',
    emoji: '🎯',
    level: 'Advanced',
    tldr: 'Contracts that give you the RIGHT (not obligation) to buy or sell a stock at a set price before a set date.',
    body: [
      'A Call option gives you the right to BUY 100 shares at a specific price (strike price) before a specific date (expiration). You buy calls when you believe the stock will go up. If it does, your call becomes more valuable. If it doesn\'t, you lose the premium you paid.',
      'A Put option gives you the right to SELL 100 shares at the strike price before expiration. You buy puts when you expect the stock to fall — like buying insurance on your portfolio. If the stock crashes, your puts soar in value.',
      'Options are leveraged instruments. A $5 option controls $500 worth of stock (100 shares × $5 strike). This leverage cuts both ways: small stock moves create large option moves. Options can expire worthless (you lose 100% of your investment) or multiply 5-10x. This is why they are considered advanced instruments and require deep understanding before trading.',
    ],
    keyPoints: [
      'Call = right to BUY at strike price (profit when stock goes up)',
      'Put = right to SELL at strike price (profit when stock goes down)',
      'Premium = what you pay for the option contract',
      'Expiration = date by which you must exercise or the option expires worthless',
      'Time decay (Theta) erodes option value every day — options lose value as expiration approaches',
      'Implied Volatility (IV) affects premium — buy options when IV is low, not high',
    ],
    tips: ['Most beginner option traders lose money because they buy short-dated options right before earnings, not understanding that premiums collapse after the event even if they were right on direction. This is called IV crush.'],
    related: ['EPS & Earnings', 'Volatility & Beta', 'Risk Management'],
  },
  {
    keys: ['short selling', 'short sell', 'shorting', 'short interest', 'short squeeze'],
    title: 'Short Selling & Short Squeezes',
    emoji: '📉',
    level: 'Advanced',
    tldr: 'Profiting when a stock falls — and the explosive counter-move when shorts are forced to buy back.',
    body: [
      'Short selling is borrowing shares you don\'t own, selling them immediately, then buying them back later at (hopefully) a lower price. Your profit is the difference. Example: borrow 100 shares at $50, sell for $5,000, stock drops to $30, buy back for $3,000. Profit: $2,000. Risk: if the stock rises to $80, you now owe $8,000 — a $3,000 loss. Short selling has theoretically unlimited loss potential.',
      'Short interest is the percentage of a stock\'s float that has been sold short. Very high short interest (above 20%) is dangerous — for shorts, not bulls. When a heavily shorted stock starts rising, short sellers are forced to buy back their borrowed shares to limit losses. This buying creates more buying, which forces more shorts to cover — a vicious cycle called a Short Squeeze.',
      'GameStop (January 2021) is the most famous short squeeze in history. The stock went from $20 to $483 in days as retail traders on Reddit deliberately forced shorts to cover. Heavily shorted stocks with high short interest can be like powder kegs — a small spark can trigger a violent squeeze.',
    ],
    keyPoints: [
      'Short selling profits when a stock goes DOWN',
      'Maximum profit for a short is 100% (stock goes to zero)',
      'Maximum loss for a short is unlimited (stock can rise forever)',
      'Short squeeze occurs when heavy short interest meets a rising price',
      'High short interest + positive catalyst = explosive upside potential',
    ],
    tips: ['Never short a stock just because it seems expensive (valuation shorts). Markets can stay irrational far longer than you can stay solvent. Only short clear technical breakdowns.'],
    related: ['Volume Analysis', 'Options', 'Market Psychology'],
  },
  {
    keys: ['dca', 'dollar cost averaging', 'dollar-cost', 'averaging down', 'averaging in'],
    title: 'Dollar-Cost Averaging (DCA)',
    emoji: '💰',
    level: 'Beginner',
    tldr: 'Investing a fixed amount at regular intervals regardless of price — reduces the risk of buying at the worst moment.',
    body: [
      'Dollar-Cost Averaging means investing a fixed dollar amount (say $500) on a regular schedule (every month) no matter what the market is doing. When prices are high, you buy fewer shares. When prices are low, you buy more. Over time, your average cost per share smooths out.',
      'The psychological benefit is enormous. You don\'t need to predict the perfect entry point — a task even professionals fail at consistently. You remove emotion from the process. Some months you\'ll buy "too high," some months you\'ll buy "cheap." Over a full market cycle, you end up with a reasonable average cost.',
      'DCA is most powerful for long-term index fund investing (S&P 500, total market ETFs). For individual stocks, it\'s more complex — averaging down into a company that is fundamentally deteriorating can turn a small loss into a catastrophe. Before averaging down on a stock, always re-evaluate whether the original investment thesis still holds.',
    ],
    keyPoints: [
      'Invest a fixed amount on a fixed schedule regardless of price',
      'Removes the impossible pressure of trying to time the market perfectly',
      'Works best for broad index funds over long time horizons (5+ years)',
      'Averaging down on individual stocks requires confirming the thesis is still intact',
      'Historically, lump-sum investing beats DCA ~67% of the time — DCA wins on psychology',
    ],
    tips: ['Set up automatic investing so you don\'t have to make an emotional decision every month. Automation removes the temptation to skip your investment when the market looks scary — which is often the best time to buy.'],
    related: ['Portfolio Diversification', 'ETFs & Index Funds', 'Risk Management'],
  },
  {
    keys: ['etf', 'index fund', 'index', 'spy', 'qqq', 'passive investing', 'exchange traded fund'],
    title: 'ETFs & Index Funds',
    emoji: '🗂️',
    level: 'Beginner',
    tldr: 'Baskets of many stocks in a single purchase — the simplest way to diversify and match market returns.',
    body: [
      'An ETF (Exchange-Traded Fund) is a collection of stocks bundled together and traded like a single stock. SPY tracks the S&P 500 (500 largest US companies). QQQ tracks the Nasdaq-100 (100 largest tech-heavy companies). VTI tracks the entire US stock market. By buying one share of SPY, you effectively own a tiny piece of all 500 companies.',
      'The genius of index funds is their simplicity. Warren Buffett has repeatedly stated that most investors — including professionals — would be better off in a simple S&P 500 index fund than trying to pick individual stocks. Studies consistently show that over 10+ years, 90%+ of actively managed funds underperform the S&P 500 index after fees.',
      'ETFs are not just for stocks. There are bond ETFs, commodity ETFs (GLD tracks gold), sector ETFs (XLK is tech, XLE is energy), and international ETFs (EEM is emerging markets). They are liquid, low-cost, and transparent — you know exactly what you own.',
    ],
    keyPoints: [
      'SPY = S&P 500 (500 largest US companies)',
      'QQQ = Nasdaq-100 (tech-heavy)',
      'VTI = Total US stock market',
      'Expense ratios are typically 0.03-0.20% — much cheaper than managed funds',
      'Sector ETFs let you bet on an industry without picking individual stocks',
    ],
    tips: ['Buying a sector ETF (like XLK for tech) is a great way to express a macro thesis without the individual stock risk. If you\'re bullish on AI, buying QQQ is safer than betting everything on one semiconductor company.'],
    related: ['Portfolio Diversification', 'Dollar-Cost Averaging', 'Market Cycles'],
  },
  {
    keys: ['diversification', 'portfolio', 'correlation', 'allocation', 'rebalancing', 'asset allocation'],
    title: 'Portfolio Diversification',
    emoji: '🎨',
    level: 'Beginner',
    tldr: 'Spreading risk across different assets so one bad investment doesn\'t sink your whole portfolio.',
    body: [
      '"Don\'t put all your eggs in one basket" is the oldest advice in investing, and it\'s still the most important. Diversification means owning assets that don\'t all move in the same direction at the same time. When tech stocks crash, defensive stocks (utilities, healthcare) often hold up. When stocks fall, gold sometimes rises.',
      'The key concept is correlation. Two assets are highly correlated if they move together (NVIDIA and AMD tend to move similarly). They are uncorrelated if their movements are independent. Diversification works because uncorrelated assets reduce your portfolio\'s overall volatility without sacrificing returns — one of the few "free lunches" in finance.',
      'True diversification goes beyond just owning 20 tech stocks. Real diversification includes different sectors (tech, healthcare, finance, energy), different geographies (US, international, emerging markets), different asset classes (stocks, bonds, real estate, commodities), and different market caps (large-cap, mid-cap, small-cap).',
    ],
    keyPoints: [
      'Own assets across different sectors (tech, health, energy, financials)',
      'Geographic diversification: US + International + Emerging Markets',
      'Asset class diversification: stocks + bonds + alternatives',
      'Rebalance annually to restore target allocation percentages',
      'Owning 20 tech stocks is NOT diversification — they all crash together',
    ],
    tips: ['A simple 3-fund portfolio (US total market + International + Bonds) is well-diversified and beats most sophisticated portfolios over time. Complexity is not the same as sophistication.'],
    related: ['ETFs & Index Funds', 'Dollar-Cost Averaging', 'Risk Management'],
  },
  {
    keys: ['market cap', 'large cap', 'small cap', 'mid cap', 'market capitalization'],
    title: 'Market Capitalization',
    emoji: '🏢',
    level: 'Beginner',
    tldr: 'The total market value of a company — calculated by multiplying share price by total shares outstanding.',
    body: [
      'Market Cap = Share Price × Total Shares Outstanding. If Apple has 15 billion shares trading at $200 each, its market cap is $3 trillion. This number tells you the size of the company as valued by the stock market — not necessarily its actual worth, but what investors collectively believe it\'s worth.',
      'Size categories matter: Mega-cap (>$200B): Apple, Microsoft, Nvidia — very liquid, well-analyzed, less risky. Large-cap ($10B-$200B): Most household names. Mid-cap ($2B-$10B): Growing companies, more volatile but more upside. Small-cap ($300M-$2B): Higher risk, higher potential reward, often underfollowed by analysts. Micro-cap (<$300M): Very high risk, speculative.',
      'Smaller companies have more room to grow (a $1B company can 10x; Apple cannot). But they also carry more risk — less analyst coverage, thinner trading volume, more vulnerable to economic shocks. Investors often allocate most of their portfolio to large-caps and use a smaller allocation for small-cap growth bets.',
    ],
    keyPoints: [
      'Mega-cap (>$200B): Most stable, well-researched, lower growth potential',
      'Mid-cap ($2-10B): Often the "sweet spot" of risk/reward',
      'Small-cap (<$2B): Higher risk, higher potential, less analyst coverage',
      'Market cap changes constantly with stock price',
      'Compare companies by market cap when evaluating relative valuations',
    ],
    tips: ['Small-cap stocks often significantly outperform large-caps over long periods (decades) but with much higher volatility. If your time horizon is 10+ years, having 20-30% of your portfolio in small-cap index funds has historically added significant returns.'],
    related: ['P/E Ratio', 'ETFs & Index Funds', 'Portfolio Diversification'],
  },
  {
    keys: ['beta', 'volatility', 'risk', 'standard deviation', 'sharp ratio', 'sharpe'],
    title: 'Beta & Volatility',
    emoji: '🎢',
    level: 'Intermediate',
    tldr: 'Beta measures how much a stock moves relative to the overall market — a beta of 2.0 means twice the market swings.',
    body: [
      'Beta measures a stock\'s sensitivity to overall market movements. A beta of 1.0 means the stock moves exactly with the S&P 500. A beta of 2.0 means when the market rises 5%, this stock typically rises 10% — but also falls 10% when the market falls 5%. A beta of 0.5 means half the market\'s swings.',
      'High-beta stocks (2.0+) like growth tech stocks can make you rich very quickly in bull markets and devastate your portfolio in bear markets. Low-beta stocks (0.3-0.6) like utilities and consumer staples are "boring" but protect capital in downturns. The right beta exposure depends entirely on your time horizon and emotional tolerance for seeing red.',
      'Volatility (measured by standard deviation) is related but distinct. A stock can have low beta (moves independently of the market) but high volatility (swings wildly on its own news). High volatility means wider Bollinger Bands, larger option premiums, and more day-trading opportunities — but also more risk for buy-and-hold investors.',
    ],
    keyPoints: [
      'Beta = 1.0 matches market movement exactly',
      'Beta > 1.0 = amplified moves (higher risk AND higher reward)',
      'Beta < 1.0 = defensive, lower volatility (utilities, healthcare)',
      'Negative beta = moves opposite the market (rare, some gold miners)',
      'High volatility = higher option premiums (good for option sellers)',
    ],
    tips: ['During a bear market or recession, reducing portfolio beta to 0.5-0.7 by shifting to defensive stocks or bonds can significantly preserve capital while still maintaining some upside exposure when the market recovers.'],
    related: ['Portfolio Diversification', 'Options', 'Market Cycles'],
  },
  {
    keys: ['bull market', 'bear market', 'recession', 'correction', 'crash', 'market cycle'],
    title: 'Market Cycles: Bull & Bear',
    emoji: '🔄',
    level: 'Beginner',
    tldr: 'Markets move in cycles of expansion (bull) and contraction (bear) — understanding the cycle changes everything.',
    body: [
      'A Bull Market is a period of rising prices, typically defined as a 20%+ rise from recent lows. Bull markets are driven by economic growth, rising corporate earnings, and investor optimism. The average S&P 500 bull market lasts about 2-5 years, though the 2009-2020 bull ran for over a decade. A Correction is a 10-20% decline within a bull market — normal and healthy.',
      'A Bear Market is a 20%+ decline from recent highs. Bear markets are driven by recession fears, rising interest rates, declining earnings, or systemic crises. The average bear market lasts 9-16 months. While painful, bear markets historically present the best long-term buying opportunities — stocks go on sale.',
      'The four market cycle phases: Accumulation (smart money buying at lows), Mark-Up (public participation, prices rising), Distribution (smart money selling at highs, often while analysts are still bullish), Mark-Down (public panic selling). Recognizing which phase you\'re in changes your strategy completely.',
    ],
    keyPoints: [
      'Bull market: 20%+ rise from lows, average lasts 2-5 years',
      'Bear market: 20%+ decline from highs, average lasts 9-16 months',
      'Correction: 10-20% decline within a bull market — perfectly normal',
      'Sector rotation: money shifts from growth to defensive stocks as bull ages',
      'Bear markets are when generational wealth is built for long-term investors',
    ],
    tips: ['The most money is made in bear markets — you just don\'t know it at the time. Warren Buffett\'s best purchases were made during market crashes (2008-09, March 2020). Building a watchlist of quality stocks at "buy if it gets to..." prices is how smart investors prepare for bear markets.'],
    related: ['Portfolio Diversification', 'Sector Rotation', 'Dollar-Cost Averaging'],
  },
  {
    keys: ['sector rotation', 'sectors', 'defensive stocks', 'cyclical', 'sector etf', 'industry'],
    title: 'Sector Rotation',
    emoji: '🌍',
    level: 'Intermediate',
    tldr: 'Money cycles through different stock sectors depending on where we are in the economic cycle.',
    body: [
      'The economy moves in cycles, and different sectors lead at different stages. Early economic expansion (coming out of recession): Small caps, Financials, Consumer Discretionary tend to outperform. Mid-cycle growth: Technology, Industrials, Materials. Late cycle (economy overheating): Energy, Commodities, Healthcare. Recession/contraction: Utilities, Consumer Staples, Bonds.',
      'Understanding where you are in the cycle helps you rotate capital into sectors likely to outperform next. When the Fed raises rates aggressively (fighting inflation), financial stocks often benefit but growth tech suffers. When recession fears peak, defensive sectors (utilities, consumer staples) outperform.',
      'You don\'t have to pick individual stocks to play sector rotation. Sector ETFs make it simple: XLK (Technology), XLE (Energy), XLF (Financials), XLU (Utilities), XLV (Healthcare), XLB (Materials), XLI (Industrials), XLY (Consumer Discretionary), XLP (Consumer Staples).',
    ],
    keyPoints: [
      'Early expansion: Financials, Consumer Discretionary, Small Caps',
      'Mid-cycle: Technology, Industrials',
      'Late cycle / inflation: Energy, Commodities, Materials',
      'Recession: Utilities, Consumer Staples, Healthcare (defensive)',
      'Use sector ETFs (XL_ series) to rotate without picking individual stocks',
    ],
    tips: ['Watch the relative strength of sector ETFs vs. SPY. When XLP (Consumer Staples) is outperforming SPY, it often signals that institutional investors are rotating defensive — an early warning that the bull market may be aging.'],
    related: ['Market Cycles', 'ETFs & Index Funds', 'Beta & Volatility'],
  },
  {
    keys: ['vix', 'fear index', 'fear & greed', 'fear and greed', 'market sentiment', 'investor sentiment'],
    title: 'VIX — The Fear Index',
    emoji: '😱',
    level: 'Intermediate',
    tldr: 'Measures expected market volatility for the next 30 days — a VIX above 30 means extreme fear in the market.',
    body: [
      'The VIX (CBOE Volatility Index) measures the market\'s expectation of S&P 500 volatility over the next 30 days, derived from options prices. It\'s often called the "Fear Index." A low VIX (below 15) signals complacency and calm markets. A high VIX (above 30) signals extreme fear, panic selling, and high uncertainty.',
      'The VIX has an inverse relationship with the stock market: when stocks fall sharply, VIX spikes. During COVID (March 2020), VIX hit 85 — its second-highest reading ever. During the 2008 financial crisis, it hit 89. These extreme fear readings historically coincide with market bottoms — the best buying opportunities.',
      'The contrarian rule: "When the VIX is high, it\'s time to buy. When the VIX is low, look out below." Extreme fear (VIX > 40) is historically a signal that the worst is near its end. Extreme complacency (VIX below 12) often precedes surprising volatility — markets tend to get complacent right before something goes wrong.',
    ],
    keyPoints: [
      'VIX below 15 = calm, complacent markets',
      'VIX 15-25 = normal uncertainty',
      'VIX 25-35 = elevated fear, market stress',
      'VIX above 35 = extreme fear — historically near market bottoms',
      'VIX spikes are sharp and fast; they rarely stay elevated for long',
    ],
    tips: ['When VIX spikes above 40, consider it a flashing green light for long-term buying. The VIX above 40 has historically been one of the most reliable "buy" signals in all of investing. Panic creates opportunity.'],
    related: ['Market Cycles', 'Options', 'Market Psychology'],
  },
  {
    keys: ['fed', 'federal reserve', 'interest rates', 'rate hike', 'rate cut', 'fomc', 'monetary policy', 'inflation'],
    title: 'Federal Reserve & Interest Rates',
    emoji: '🏦',
    level: 'Intermediate',
    tldr: 'The Fed sets interest rates, which are the single most powerful driver of stock valuations over the medium term.',
    body: [
      'The Federal Reserve (the Fed) controls short-term interest rates in the US. When it raises rates (tightening), borrowing becomes more expensive — this slows inflation but also slows economic growth. When it cuts rates (easing), money becomes cheap and flows more freely into risk assets like stocks.',
      'Interest rates affect stocks through two channels. First, corporate borrowing costs: higher rates mean companies pay more to finance operations, reducing profits. Second, valuation math: stocks are valued based on future earnings discounted back to today. Higher discount rates (driven by interest rates) make future earnings worth less today — this is why growth stocks (which earn most of their profits far in the future) get hit hardest when rates rise.',
      'The classic trade: "Don\'t fight the Fed." When the Fed is cutting rates, the tailwind for stocks is enormous — easy money flows everywhere. When the Fed is aggressively hiking (like 2022), it\'s one of the hardest environments for growth stock investors. Understanding the Fed\'s rate cycle is arguably as important as any technical analysis.',
    ],
    keyPoints: [
      'Rate cuts = bullish for stocks, especially growth tech',
      'Rate hikes = bearish for growth stocks, bonds, real estate',
      'Growth stocks (high P/E) are more sensitive to rate changes than value stocks',
      'The yield curve inverting (2-year > 10-year Treasury) has preceded every recession',
      'FOMC meetings (8x per year) move markets significantly',
    ],
    tips: ['Watch the 2-year Treasury yield — it moves fastest in response to Fed expectations. If the 2-year is rising rapidly, growth stocks are likely to underperform value and defensive stocks. Adjust your portfolio accordingly.'],
    related: ['Market Cycles', 'P/E Ratio', 'Sector Rotation'],
  },
  {
    keys: ['market psychology', 'fomo', 'emotion', 'greed', 'panic', 'behavioral finance', 'cognitive bias'],
    title: 'Market Psychology & Behavioral Finance',
    emoji: '🧠',
    level: 'Intermediate',
    tldr: 'Why rational people make irrational financial decisions — and how to avoid the traps that cost most investors money.',
    body: [
      'The biggest enemy in investing is not the market — it\'s yourself. Studies show that the average investor earns significantly less than the market index over time, not because they picked bad stocks, but because they bought high (FOMO at market tops) and sold low (panic at bottoms). Emotions are the number one wealth destroyer.',
      'Key biases: FOMO (Fear of Missing Out) causes you to chase stocks that have already run 50-100%. Loss Aversion makes losing $1,000 feel twice as painful as gaining $1,000 feels good — so you hold losing trades too long and sell winners too early. Confirmation Bias makes you seek out information that confirms what you already believe, ignoring warning signs.',
      'The solution is process over emotion. Write down your reasons for buying a stock before you buy it. Set price targets and stop-losses in advance. Review your trades against your original thesis, not just the price. Never check your portfolio every hour — it triggers reactive decision-making. The best investors are almost boring in their discipline.',
    ],
    keyPoints: [
      'FOMO = buying at tops because you can\'t stand watching others profit',
      'Loss aversion = holding losers too long and cutting winners too soon',
      'Confirmation bias = only reading bullish news on a stock you own',
      'Overconfidence = the most dangerous bias — overestimating your own ability',
      'The solution: written trading plan, pre-defined rules, process over emotion',
    ],
    tips: ['Keep a trading journal. Write down why you bought every position, your target, your stop, and your planned exit. Review it regularly. The discipline of journaling forces you to examine your decisions objectively instead of emotionally.'],
    related: ['Risk Management', 'Dollar-Cost Averaging', 'Market Cycles'],
  },
  {
    keys: ['stop loss', 'take profit', 'risk management', 'risk reward', 'position sizing', 'trailing stop', 'risk:reward'],
    title: 'Risk Management & Position Sizing',
    emoji: '🛡️',
    level: 'Beginner',
    tldr: 'The discipline that separates profitable traders from those who blow up — controlling how much you can lose on any trade.',
    body: [
      'The first rule of trading is not to make money — it\'s not to lose it uncontrollably. A trader who loses 50% of their portfolio needs to make 100% just to break even. Preventing catastrophic losses is mathematically more important than chasing big gains.',
      'Position sizing is the most underrated skill in trading. Most professionals risk only 1-2% of their total portfolio on any single trade. If you have $10,000 and risk 1% per trade, your maximum loss per trade is $100. You can be wrong 10 times in a row and still have 90% of your capital. This longevity is what allows you to recover and keep trading.',
      'Risk:Reward ratio is the relationship between your potential loss (stop loss distance) and potential gain (target distance). A 1:3 ratio means you risk $100 to potentially make $300. Even if you are only right 40% of the time, you are profitable at 1:3. The math works in your favor. Never take a trade with less than a 1:2 risk:reward ratio.',
    ],
    keyPoints: [
      'Risk only 1-2% of total portfolio on any single position',
      'Always define your stop loss before entering a trade',
      'Minimum 1:2 risk:reward ratio — risk $1 to make $2',
      'A 50% loss requires a 100% gain just to break even',
      'Trailing stops lock in profits as the stock rises',
    ],
    tips: ['Most losing traders fail not because they pick bad stocks, but because they don\'t respect position sizing. A 10% loss on 20% of your portfolio is devastating. The same loss on 2% of your portfolio is a minor setback you can recover from in days.'],
    related: ['Stop Loss', 'Market Psychology', 'Options'],
  },
  {
    keys: ['ipo', 'initial public offering', 'going public', 'direct listing', 'spac'],
    title: 'IPOs — Initial Public Offerings',
    emoji: '🚀',
    level: 'Intermediate',
    tldr: 'When a private company sells shares to the public for the first time — exciting but full of pitfalls.',
    body: [
      'An IPO is when a private company first sells shares to the public on a stock exchange. Investment banks set the initial price, institutional investors get first access, and retail traders often buy in the secondary market after the stock opens — frequently at prices already up 20-50% from the IPO price.',
      'The first-day pop is the famous phenomenon where IPO stocks often surge on opening day. This creates massive FOMO. But the data tells a different story: studies consistently show that most IPOs underperform the market over the 3-5 years after their debut. The early buyers (VCs, insiders, and institutions) often sell into the retail excitement, creating a ceiling.',
      'There are exceptions — companies like Google, Facebook, and Amazon all went on to massively outperform after their IPOs. The key is evaluating fundamentals (is this a real business? Does it make money? What is the growth trajectory?) and waiting for the initial "lockup period" of 180 days to pass before buying, when insider selling pressure eases.',
    ],
    keyPoints: [
      'IPO shares go to institutional investors first — retail usually gets the leftovers',
      'First-day pops can be 20-100%+ but often fade within weeks',
      '180-day lockup period: insiders can\'t sell for 6 months after IPO',
      'After lockup expiry, expect selling pressure and price drops',
      'Focus on profitability, revenue growth, and moat when evaluating IPOs',
    ],
    tips: ['The safest approach to IPOs: ignore the hype, let the stock find its price for 6-12 months, then evaluate with real trading data and post-lockup pricing. Many great companies are better buys 1 year post-IPO than on day one.'],
    related: ['Market Psychology', 'Fundamental Analysis', 'Market Cap'],
  },
  {
    keys: ['dividends', 'dividend yield', 'dividend investing', 'income investing', 'payout ratio', 'drip'],
    title: 'Dividends & Income Investing',
    emoji: '💵',
    level: 'Beginner',
    tldr: 'Cash payments companies make to shareholders out of profits — providing income without needing to sell shares.',
    body: [
      'A dividend is a portion of a company\'s profits paid directly to shareholders, usually quarterly. Dividend Yield = Annual Dividend ÷ Stock Price. If a stock pays $4/year in dividends and trades at $100, the yield is 4%. This is "passive income" — you get paid just for owning the stock.',
      'Dividend Aristocrats are S&P 500 companies that have increased their dividend every year for 25+ consecutive years. Companies like Johnson & Johnson, Coca-Cola, and Procter & Gamble are famous examples. These companies tend to be resilient, cash-generating businesses that provide stability during market downturns.',
      'The Payout Ratio = Dividends Paid ÷ Net Income. A payout ratio above 80% may be unsustainable — the company is paying out most of its earnings, leaving little for reinvestment or growth. A ratio of 30-60% is healthy. Be wary of stocks with very high dividend yields (above 7%) — they often signal financial distress rather than generosity.',
    ],
    keyPoints: [
      'Dividend Yield = Annual Dividend / Share Price',
      'Dividend Aristocrats have raised dividends 25+ consecutive years',
      'Payout Ratio > 80% may signal the dividend is at risk of being cut',
      'Very high yields (>7%) are often a warning sign, not an opportunity',
      'DRIP (Dividend Reinvestment Plan) auto-reinvests dividends for compounding',
    ],
    tips: ['The most powerful force in dividend investing is compounding. Reinvesting dividends automatically through a DRIP turns a 4% yield into significantly more over decades. $10,000 in a 4% dividend stock with dividends reinvested grows to ~$22,000 in 20 years from dividends alone, before any price appreciation.'],
    related: ['Dollar-Cost Averaging', 'Portfolio Diversification', 'Fundamental Analysis'],
  },
];

// ── Fuzzy matching ─────────────────────────────────────────────────────────────

function findTopic(query) {
  const q = query.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  const words = q.split(/\s+/).filter(w => w.length > 2);

  let best = null;
  let bestScore = 0;

  for (const topic of KB) {
    let score = 0;
    for (const key of topic.keys) {
      if (q.includes(key)) score += key.length * 2;        // exact phrase match
      if (key.includes(q)) score += q.length * 1.5;        // query is part of key
      for (const word of words) {
        if (key.includes(word)) score += word.length;      // word match
      }
    }
    if (score > bestScore) { bestScore = score; best = topic; }
  }

  // Minimum confidence threshold
  return bestScore >= 4 ? best : null;
}

// ── Template generator for unknown topics ─────────────────────────────────────

function generateFallback(query) {
  const q = query.trim();
  const isIndicator = /\b(indicator|index|ratio|average|band|oscillator)\b/i.test(q);
  const isStrategy  = /\b(strategy|approach|method|system|trading|technique)\b/i.test(q);
  const isConcept   = /\b(what is|how does|explain|define|meaning)\b/i.test(q);

  return {
    title: q.replace(/\b\w/g, c => c.toUpperCase()),
    emoji: isIndicator ? '📐' : isStrategy ? '♟️' : '📚',
    level: 'General',
    tldr: `An educational overview of "${q}" in the context of stock trading and investing.`,
    body: [
      `"${q}" is a concept that traders and investors encounter in financial markets. While this topic isn\'t in our core library yet, here\'s a structured framework for approaching it.`,
      isIndicator
        ? `Technical indicators like this are tools that help traders interpret price and volume data to make better decisions. Most indicators are derived from historical price data and are used to identify trends, momentum, strength, and potential reversal points.`
        : isStrategy
        ? `Trading strategies define the rules for entering and exiting positions. The best strategies have clear entry criteria, defined risk parameters (stop loss), profit targets, and are backtested on historical data before being applied with real money.`
        : `In investing and trading, every concept connects to the fundamental relationship between risk and reward. Understanding a new concept means asking: what information does this give me? How does it change my assessment of risk or opportunity?`,
      `The most important principle when learning any new trading concept: test it in a paper trading account (simulated trades with no real money) before using it with real capital. Many concepts that seem compelling in theory behave differently in live market conditions.`,
    ],
    keyPoints: [
      'Research multiple sources before forming a strong opinion on any technique',
      'Backtest any strategy on historical data before applying it live',
      'Combine new concepts with existing tools you trust for confirmation',
      'Paper trade first — use simulated money to build confidence',
      'Be especially skeptical of any approach that promises guaranteed profits',
    ],
    tips: ['The best traders are lifelong learners. Markets evolve, and strategies that worked in one regime (like low interest rates) may fail in another (high rates). Always be willing to adapt.'],
    related: ['Risk Management', 'Market Psychology', 'Technical Analysis'],
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  try {
    const query = (req.query.q || '').trim();
    if (!query) return res.status(400).json({ error: 'Query required' });

    const found = findTopic(query) || generateFallback(query);

    res.setHeader('Cache-Control', 's-maxage=86400'); // cache 24h
    res.json(found);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
}
