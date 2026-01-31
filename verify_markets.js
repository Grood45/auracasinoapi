// using built-in fetch in Node 18+ or generic fetch

const sportId = "sr:sport:21";
const eventId = "sr:match:64012085"; // Perth Scorchers vs. Sydney Sixers

const originalUrl = 'https://scatalog.mysportsfeed.io/api/v2/core/list-markets';
const localUrl = `http://localhost:3000/v1/sportradar/markets/${sportId.split(':')[2]}/${eventId.split(':')[2]}`;

const payload = {
    "operatorId": "laser247",
    "partnerId": "LAPID01",
    "sportId": sportId,
    "eventId": eventId,
    "token": "c0e509b0-6bc1-4132-80cb-71b54345af12"
};

async function checkOdds(iteration) {
    const start = Date.now();

    // 1. Fetch Original
    const p1 = fetch(originalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(res => res.json()).catch(err => ({ error: err.message }));

    // 2. Fetch Local Proxy
    const p2 = fetch(localUrl).then(res => res.json()).catch(err => ({ error: err.message }));

    const [original, local] = await Promise.all([p1, p2]);
    const duration = Date.now() - start;

    function getRunnerPrice(data, runnerName) {
        try {
            if (data.status === "RS_ERROR") return "Error/Suspended";

            // Check in standard markets
            const markets = data.event?.markets?.matchOdds || [];
            const market = markets.find(m => m.marketName === "Winner (incl. super over)" || m.marketName === "Match Odds");

            if (!market) return "Market Closed";

            const runner = market.runners.find(r => r.runnerName.includes(runnerName));
            if (!runner) return "Runner Not Found";

            const price = runner.backPrices[0]?.price || "Suspended";
            return price;
        } catch (e) {
            return "Parse Error";
        }
    }

    const runnerName = "Perth Scorchers";
    const priceOrig = getRunnerPrice(original, runnerName);
    const priceLocal = getRunnerPrice(local, runnerName);

    // Formatting output for readability
    const matchStatus = (priceOrig == priceLocal) ? "✅ MATCH" : "⚠️  DIFF";

    console.log(`[${iteration}] Time: ${duration}ms | ${matchStatus} | Orig: ${priceOrig} | Proxy: ${priceLocal}`);
}

console.log('--- Starting Real-Time Odds Monitor (20 Seconds) ---');
console.log('Target: Perth Scorchers vs. Sydney Sixers');
console.log('Watching Odds for: Perth Scorchers\n');

// Run 10 times with 2 sec delay
(async () => {
    for (let i = 1; i <= 10; i++) {
        await checkOdds(i);
        await new Promise(r => setTimeout(r, 2000));
    }
})();
