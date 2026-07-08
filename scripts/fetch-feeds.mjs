import { readFile, writeFile } from "node:fs/promises";

const sourcesPath = new URL("../data/sources.json", import.meta.url);
const dashboardPath = new URL("../data/dashboard.json", import.meta.url);

const sources = JSON.parse(await readFile(sourcesPath, "utf8"));

const sections = await Promise.all(
  sources.sections.map(async (section) => {
    const feedItems = await fetchSectionItems(section);

    return {
      id: section.id,
      title: section.title,
      kicker: section.kicker,
      sourceUrl: section.sourceUrl,
      items: feedItems.slice(0, 5)
    };
  })
);

const dashboard = {
  generatedAt: new Date().toISOString(),
  mode: "Scheduled refresh",
  markets: await fetchMarkets(sources.markets),
  sections
};

await writeFile(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);

async function fetchSectionItems(section) {
  const results = await Promise.allSettled(
    section.feeds.map(async (feedUrl) => {
      const response = await fetch(feedUrl, {
        headers: { "user-agent": "personal-dashboard/1.0" }
      });

      if (!response.ok) {
        throw new Error(`${feedUrl} returned ${response.status}`);
      }

      const xml = await response.text();
      return parseRssItems(xml).map((item) => ({
        ...item,
        source: item.source || section.title
      }));
    })
  );

  return dedupeItems(results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])))
    .filter((item) => item.title !== "This feed is not available.");
}

async function fetchMarkets(symbols = []) {
  if (!symbols.length) return [];

  const results = await Promise.allSettled(symbols.map(fetchMarket));
  return results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    console.warn(`Unable to fetch ${symbols[index]}:`, result.reason);
    return {
      symbol: symbols[index],
      name: symbols[index],
      price: "Unavailable",
      change: "Refresh failed",
      url: `https://finance.yahoo.com/quote/${symbols[index]}`
    };
  });
}

async function fetchMarket(symbol) {
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const response = await fetch(endpoint, {
    headers: { "user-agent": "personal-dashboard/1.0" }
  });

  if (!response.ok) {
    throw new Error(`Market data returned ${response.status}`);
  }

  const payload = await response.json();
  const quote = payload.chart?.result?.[0];
  const meta = quote?.meta || {};
  const price = Number(meta.regularMarketPrice);
  const previousClose = Number(meta.chartPreviousClose || meta.previousClose);
  const change = Number.isFinite(price) && Number.isFinite(previousClose) ? price - previousClose : NaN;
  const percent = Number.isFinite(change) && previousClose !== 0 ? (change / previousClose) * 100 : NaN;

  return {
    symbol,
    name: meta.shortName || symbol,
    price: formatCurrency(price),
    change: Number.isFinite(change) && Number.isFinite(percent)
      ? `${change >= 0 ? "+" : ""}${change.toFixed(2)} (${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%)`
      : "No change data",
    url: `https://finance.yahoo.com/quote/${symbol}`
  };
}

function parseRssItems(xml) {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

  return itemBlocks.map((block) => {
    const title = decodeXml(readTag(block, "title"));
    const link = decodeXml(readTag(block, "link")) || readLinkAttribute(block);
    const publishedAt = decodeXml(readTag(block, "pubDate") || readTag(block, "updated") || readTag(block, "published"));
    const source = decodeXml(readTag(block, "source"));

    return {
      title: title || "Untitled",
      source,
      url: link || "#",
      publishedAt: normalizeDate(publishedAt)
    };
  });
}

function readTag(block, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(pattern);
  return match?.[1]?.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() || "";
}

function readLinkAttribute(block) {
  const match = block.match(/<link\b[^>]*href="([^"]+)"/i);
  return match?.[1] || "";
}

function decodeXml(value = "") {
  return repairText(value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim());
}

function repairText(value) {
  return value
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u02dc/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, '"')
    .replace(/\u00e2\u20ac\ufffd/g, '"')
    .replace(/\u00e2\u20ac\u201c/g, "-")
    .replace(/\u00e2\u20ac\u201d/g, "-")
    .replace(/\u00e2\u20ac\u00a6/g, "...");
}

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function dedupeItems(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.title}|${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatCurrency(value) {
  if (typeof value !== "number") return "Unavailable";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}
