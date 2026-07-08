const fallbackData = {
  generatedAt: new Date().toISOString(),
  mode: "Sample data",
  markets: [
    { symbol: "SPY", name: "S&P 500 ETF", price: "Watch", change: "Add live refresh with GitHub Actions" },
    { symbol: "DIA", name: "Dow ETF", price: "Watch", change: "Configurable" },
    { symbol: "QQQ", name: "Nasdaq ETF", price: "Watch", change: "Configurable" },
    { symbol: "AAPL", name: "Apple", price: "Watch", change: "Edit data/sources.json" },
    { symbol: "MSFT", name: "Microsoft", price: "Watch", change: "Edit data/sources.json" },
    { symbol: "TSLA", name: "Tesla", price: "Watch", change: "Edit data/sources.json" }
  ],
  sections: [
    {
      id: "news",
      title: "Top News",
      kicker: "General",
      sourceUrl: "https://news.google.com/",
      items: [
        { title: "Daily national headlines will appear here", source: "Google News", url: "https://news.google.com/", publishedAt: new Date().toISOString() }
      ]
    },
    {
      id: "army",
      title: "U.S. Army",
      kicker: "Military",
      sourceUrl: "https://www.army.mil/news/",
      items: [
        { title: "Army and military updates will appear here", source: "Army news", url: "https://www.army.mil/news/", publishedAt: new Date().toISOString() }
      ]
    },
    {
      id: "usma",
      title: "USMA",
      kicker: "West Point",
      sourceUrl: "https://www.westpoint.edu/news",
      items: [
        { title: "West Point updates will appear here", source: "USMA", url: "https://www.westpoint.edu/news", publishedAt: new Date().toISOString() }
      ]
    },
    {
      id: "army-sports",
      title: "Army Sports",
      kicker: "Black Knights",
      sourceUrl: "https://goarmywestpoint.com/",
      items: [
        { title: "Army West Point sports headlines will appear here", source: "GoArmyWestPoint", url: "https://goarmywestpoint.com/", publishedAt: new Date().toISOString() }
      ]
    },
    {
      id: "steelers",
      title: "Steelers",
      kicker: "NFL",
      sourceUrl: "https://www.steelers.com/news/",
      items: [
        { title: "Pittsburgh Steelers headlines will appear here", source: "Steelers", url: "https://www.steelers.com/news/", publishedAt: new Date().toISOString() }
      ]
    },
    {
      id: "country",
      title: "Country Music",
      kicker: "Music",
      sourceUrl: "https://www.billboard.com/c/music/country/",
      items: [
        { title: "Country music news and releases will appear here", source: "Country music", url: "https://www.billboard.com/c/music/country/", publishedAt: new Date().toISOString() }
      ]
    }
  ]
};

const sectionTemplate = document.querySelector("#sectionTemplate");
const itemTemplate = document.querySelector("#itemTemplate");
const dashboardGrid = document.querySelector("#dashboardGrid");
const tickerGrid = document.querySelector("#tickerGrid");
const updatedAt = document.querySelector("#updatedAt");
const dataMode = document.querySelector("#dataMode");
const refreshButton = document.querySelector("#refreshButton");

refreshButton.addEventListener("click", () => {
  loadDashboard(true);
});

loadDashboard();

async function loadDashboard(forceRefresh = false) {
  try {
    const response = await fetch(`data/dashboard.json${forceRefresh ? `?t=${Date.now()}` : ""}`);
    if (!response.ok) {
      throw new Error(`Dashboard data returned ${response.status}`);
    }
    renderDashboard(await response.json());
  } catch (error) {
    console.warn("Using fallback dashboard data:", error);
    renderDashboard(fallbackData);
  }
}

function renderDashboard(data) {
  updatedAt.textContent = formatDateTime(data.generatedAt);
  dataMode.textContent = data.mode || "Live when available";
  renderMarkets(data.markets || []);
  renderSections(data.sections || []);
}

function renderMarkets(markets) {
  tickerGrid.replaceChildren();

  markets.forEach((market) => {
    const tile = document.createElement(market.url ? "a" : "article");
    tile.className = "ticker";
    if (market.url) {
      tile.href = market.url;
      tile.target = "_blank";
      tile.rel = "noreferrer";
    }

    const heading = document.createElement("div");
    heading.className = "ticker-symbol";

    const symbol = document.createElement("span");
    symbol.textContent = market.symbol;

    const name = document.createElement("span");
    name.textContent = market.name || "";

    const price = document.createElement("span");
    price.className = "ticker-price";
    price.textContent = market.price ?? "Unavailable";

    const change = document.createElement("span");
    change.className = `ticker-change ${getChangeClass(market.change)}`;
    change.textContent = market.change ?? "No change data";

    heading.append(symbol, name);
    tile.append(heading, price, change);
    tickerGrid.append(tile);
  });
}

function renderSections(sections) {
  dashboardGrid.replaceChildren();

  sections.forEach((section) => {
    const node = sectionTemplate.content.cloneNode(true);
    const article = node.querySelector(".content-section");
    const kicker = node.querySelector(".section-kicker");
    const title = node.querySelector("h2");
    const link = node.querySelector(".section-link");
    const list = node.querySelector(".item-list");

    article.dataset.section = section.id;
    kicker.textContent = section.kicker || "Briefing";
    title.textContent = section.title;
    link.href = section.sourceUrl || "#";

    if (section.items?.length) {
      section.items.slice(0, 5).forEach((item) => {
        list.append(renderItem(item));
      });
    } else {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No current items from this source.";
      list.append(empty);
    }

    dashboardGrid.append(node);
  });
}

function renderItem(item) {
  const node = itemTemplate.content.cloneNode(true);
  const link = node.querySelector(".briefing-item");
  const source = node.querySelector(".item-source");
  const title = node.querySelector("strong");
  const meta = node.querySelector(".item-meta");

  link.href = item.url || "#";
  source.textContent = item.source || "Source";
  title.textContent = item.title || "Untitled item";
  meta.textContent = formatDate(item.publishedAt);

  return node;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getChangeClass(change) {
  const text = String(change || "");
  if (text.startsWith("+")) return "positive";
  if (text.startsWith("-")) return "negative";
  return "";
}
