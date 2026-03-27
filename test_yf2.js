async function run() {
  try {
    const yfModule = await import('yahoo-finance2');
    const yahooFinance = yfModule.default || yfModule;
    const res = await yahooFinance.search('wix');
    console.log("OK", res.quotes[0].symbol);
  } catch(e) {
    console.log("FAIL:", e.message);
  }
}
run();
