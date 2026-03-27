import yahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const res = await yahooFinance.search('wix');
    console.log("Search OK");
    const chart = await yahooFinance.historical('AAPL', { period1: '2023-01-01' });
    console.log("Chart OK");
  } catch (e) {
    console.error("ERROR TYPE:", e.name);
    console.error("MESSAGE:", e.message);
  }
}
test();
