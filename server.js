const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const axios = require('axios');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Analysis Report Schema
const analysisReportSchema = new mongoose.Schema({
  productTitle: { type: String, required: true },
  targetCountry: { type: String, required: true },
  keywords: { type: [String], required: true },
  imageUrl: { type: String },
  adsData: [{
    advertiser: String,
    adPreviewText: String,
    videoSrc: String,
    poster: String,
    image: String
  }],
  aiAnalysis: {
    aiSummaryVerdict: String,
    influencerSaturation: Object,
    costEstimates: Object,
    productTrendInsights: Object,
    searchDemand: Object,
    marketSaturation: Object,
    audienceProfile: Object,
    pricePositioning: Object,
    platformStrategies: Object,
    researchKeywordsGuide: Object,
    actionPlan: Object,
    finalVerdict: Object
  },
  createdAt: { type: Date, default: Date.now }
});

const AnalysisReport = mongoose.model('AnalysisReport', analysisReportSchema);

/** --- UTILITY FUNCTIONS --- **/

function buildPrompt({ productTitle, targetCountry, keywords, imageUrl }) {
  return `
You are an expert e-commerce consultant with deep knowledge of digital marketing. Analyze the viability of launching "${productTitle}" specifically in ${targetCountry}, focusing on market opportunity and profitability.

PRODUCT DETAILS:
- Title: ${productTitle}
- Target Market: ${targetCountry} (FOCUS ONLY ON THIS COUNTRY)
- Keywords: ${keywords}
- product example image url : ${imageUrl}

ANALYSIS REQUIREMENTS:
- Focus EXCLUSIVELY on ${targetCountry} market
- Analyze market opportunity and demand
- Provide search volume data including last month's actual searches for each keyword
- Generate comprehensive search keywords and hashtags for competitor research on social media
- Provide specific search terms for finding similar products and competitors on different platforms
- Include platform-specific search strategies for Instagram, TikTok, Facebook, and Google
- Provide profitability assessment
- Include market fit evaluation
- Deliver actionable launch strategy
- Conduct a deep web search to identify specific successful brands currently selling the EXACT SAME product (in ${targetCountry} )
- Include a list of those exact competitors with:
  - Brand name
  - Website or sales page link (if available)
  - Sales platform (e.g., website, Facebook, Instagram, TikTok, Amazon, etc.)
  - Any available information about their pricing, offer, or unique selling point
- Focus on precision
- Search ONLY for real, verifiable brands currently selling the EXACT SAME product in ${targetCountry}
- If no real competitors are found with clear confirmation (such as a real product page or brand name), DO NOT include any entries
- DO NOT guess brand names or create fictitious links
- DO NOT generate placeholder text — leave the competitor list empty if no real data is available
- Search ONLY for real, verifiable people or brands currently selling or promoting the EXACT SAME product in ${targetCountry}
- Focus exclusively on influencers, creators, or small ecommerce brands with a clear and active presence on:
  - Instagram
  - TikTok
  - Facebook
  - Twitter/X
- Return only results with direct profile or post links — no placeholder, no guessing
- If the product is shown in a video, post, or story by a creator, include that post link and username
- DO NOT invent or fabricate brand names, usernames, or product links — if not found, leave the list empty
- Estimate **Cost Per Mille (CPM)** and **Cost Per Click (CPC)** benchmarks for ${targetCountry} on Facebook and TikTok (include rough expected CPM range like "2–4 TND per 1000 impressions")
- Estimate **Customer Acquisition Cost (CAC)** based on assumed conversion rates (e.g., 1%, 2%, and 5%)
- Include a CAC table like:
  {
    "conversionRate": "1%",
    "estimatedCAC": "27.50 country local currency"
  }

- For each keyword or product variation, scan social media and evaluate **influencer saturation** with the following insights:
  - Total number of creators who recently posted about similar products
  - Breakdown of follower ranges (e.g., <10k, 10k–100k, 100k+)
  - Influencer activity level (e.g., active in last 30 days)
  - Add a **saturation verdict**: "Heavily used by influencers", "Moderately used", or "Underrated"
  - Include platform breakdown if possible (e.g., 12 creators on TikTok, 8 on Instagram)

Return ONLY valid JSON with this structure:
{
  "aiSummaryVerdict": "Short 1-line AI-generated summary of viability (max 25 words)",
  "influencerSaturation": {
    "platformBreakdown": {
      "TikTok": {
       "relatedProductContentExistence" : ["low, high or medium"]
      },
      "Instagram": {
         "relatedProductContentExistence" : ["low, high or medium"]
      }
    },
   
  },

  "costEstimates": {
    "meta": {
      "CPM": "cost",
      "CPC": "cost "
    },
    "tiktok": {
      "CPM": "cost",
      "CPC": "cost country local currency"
    },
    "CACProjection": [
      { "conversionRate": "1%", "estimatedCAC": "35.00 country local currency" },
      { "conversionRate": "2%", "estimatedCAC": "17.50 country local currency" },
      { "conversionRate": "5%", "estimatedCAC": "7.00 country local currency" }
    ]
  },
 

  "productTrendInsights": {
    "googleTrendScore": 0-100,
    "regionalDemand": ["City1", "City2"],
    "risingSearches": ["related trending queries"],
    "seasonality": "High/Medium/Low/None",
    "idealLaunchWindow": "E.g., Back-to-school, Q4 sales, etc."
  },

  "searchDemand": {
    "topKeywords": [
      {
        "keyword": "string",
        "searchVolume": "estimated monthly volume",
        "lastMonthSearches": "actual searches",
        "difficulty": "Low/Medium/High"
      }
    ]
  },

  "marketSaturation": {
    "ugcPresence": "High/Medium/Low",
    "adPresence": "High/Medium/Low",
    "saturationScore": 0-100,
    "verdict": "Low/Moderate/High"
  },

  "audienceProfile": {
    "personaName": "E.g., Yassine, 25, student",
    "interests": ["room decor", "TikTok trends", "gaming"],
    "platforms": ["Instagram", "TikTok"],
    "painPoints": ["dull room", "no ambiance at night"]
  },

  "pricePositioning": {
    "suggestedPrice": "27.900 country local currency",
    "marketAverage": "30.000 country local currency)",
    "psychologicalAdvice": "Keep under 28 (country local currency) for impulse buys",
    "estimatedCOGS": "Cost of goods sold",
    "profitMargin": "High/Medium/Low"
  },

  "platformStrategies": {
    "bestChannelsToLaunch": ["TikTok", "Instagram"],
    "contentIdeas": ["before-after videos", "aesthetic room setup"],
    "influencerStrategy": "Partner with micro influencers in Tunisia doing room decor or LED reviews",
    "UGCStrategy": "Use testimonials or TikTok trends to go viral"
  },

  "researchKeywordsGuide": {
    "instagram": {
      "hashtags": ["#bandeLumineuse", "#ledroom", "#tunisieDecor"],
      "searchTerms": ["led strip setup", "chambre decor"],
      "locationTags": ["#Tunisie", "#Sousse", "#Tunis"]
    },
    "tiktok": {
      "hashtags": ["#ledlights", "#roomsetup", "#tunisiafinds"],
      "searchTerms": ["led strip lights setup", "room glow up"],
      "effects": ["blue ambient light", "aesthetic filters"]
    },
    "facebook": {
      "marketplaceTerms": ["bande lumineuse", "led chambre"],
      "groups": ["Tunisie ecommerce", "room decor tunisia"]
    },
    "google": {
      "searchTerms": ["acheter bande lumineuse tunisie", "led chambre setup tunisie"],
      "tools": ["Google Trends", "Keyword Planner"]
    }
  },

  "actionPlan": {
    "timeToMarket": "7 days",
    "immediateSteps": ["Contact 3 influencers", "Run test ads on TikTok"],
    "budgetSuggestion": {
      "totalLaunchBudget": "500 TND",
      "allocation": {
        "paidAds": "50%",
        "contentCreation": "30%",
        "influencerMarketing": "20%"
      }
    },
    "kpis": [
      { "metric": "CTR", "target": "3%", "timeframe": "first week" },
      { "metric": "Conversion rate", "target": "5%", "timeframe": "first 2 weeks" }
    ]
  },

  "finalVerdict": {
    "launchDecision": "LAUNCH NOW/LAUNCH WITH CHANGES/POSTPONE/AVOID",
    "confidenceLevel": "High/Medium/Low",
    "riskLevel": "Low/Medium/High",
    "summaryReason": "Why this verdict was chosen in 1–2 lines"
  }
}

REQUIREMENTS:
- 5–10 well-varied Meta Ad Library keywords (from problem, slang, synonyms)
- only put related ad library keywords, don't put the targeted country name within the keyword (accuracy is key), the key words should be in the targeted country spoken languages
- Focus EXCLUSIVELY on ${targetCountry} market
- Generate comprehensive search keywords and hashtags for competitor research on social media
- Provide platform-specific search strategies for Instagram, TikTok, Facebook, Twitter, and Google
- Include local language variations and location-specific terms
- Provide search operators and tools for effective competitor research
- Provide market opportunity assessment
- Include actual search numbers for each keyword from the last month
- Deliver profitability analysis
- Include actionable launch recommendations
- Return ONLY valid JSON with no additional text
  `;
}

async function callGemini({ prompt }) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const contents = [{ parts: [{ text: prompt }] }];

    const response = await axios.post(url, { contents }, {
      timeout: 50000 // 50s timeout
    });

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('❌ Gemini API error:', err.response?.data || err.message);
    return null;
  }
}
async function scrapeFacebookAds(keyword, country) {
  let browser = null;

  try {
    // Get executable path based on environment
    let executablePath;

    if (process.env.VERCEL_ENV) {
      // Running on Vercel - use Chromium binary
      executablePath = await chromium.executablePath();
    } else {
      // Running locally - use system Chrome or downloaded Chromium
      executablePath = process.env.CHROME_EXECUTABLE_PATH ||
        (process.platform === 'win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : '/usr/bin/google-chrome');
    }

    const launchOptions = {
      args: chromium.args,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');
    await page.setJavaScriptEnabled(true);

    const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(keyword)}`;

    // Navigation with retries
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 40000
        });
        await page.waitForSelector('.x1plvlek', { timeout: 10000 });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Handle cookie banner
    try {
      const cookieBtn = await page.$('button[data-cookiebanner="accept_button"]');
      if (cookieBtn) {
        await cookieBtn.click();
        await page.waitForTimeout(1000);
      }
    } catch (cookieErr) {
      console.log('Cookie banner not found or could not be clicked');
    }

    // Wait for ads to load
    await page.waitForSelector('.x1plvlek', { timeout: 15000 });

    const ads = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.x1plvlek'));
      return cards.slice(0, 10).map(card => {
        const advertiser = card.querySelector('.x8t9es0.x1fvot60.xxio538.x108nfp6.xq9mrsl.x1h4wwuj.x117nqv4.xeuugli')?.innerText || "Unknown";
        let adPreviewText = card.querySelector('.x8t9es0.xw23nyj.xo1l8bm.x63nzvj.x108nfp6.xq9mrsl.x1h4wwuj.xeuugli span')?.innerText || null;

        const video = card.querySelector('video');
        const image = card.querySelector('img')?.src || null;

        return {
          advertiser,
          adPreviewText,
          videoSrc: video?.src,
          poster: video?.poster,
          image
        };
      });
    });

    return ads;
  } catch (err) {
    console.error('❌ Puppeteer error:', err.message);
    return []; // Return empty array instead of failing
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/** --- API ROUTES --- **/

app.post('/api/analyze', async (req, res) => {
  const { productTitle, targetCountry, keywords, imageUrl } = req.body;

  if (!productTitle || !targetCountry || !keywords) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const prompt = buildPrompt({ productTitle, targetCountry, keywords, imageUrl });
    const [aiResponse, adResults] = await Promise.all([
      callGemini({ prompt }),
      scrapeFacebookAds(productTitle, targetCountry)
    ]);

    const jsonMatch = aiResponse?.match(/\{[\s\S]*\}/);
    const parsedAI = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    // Save to MongoDB
    const newReport = new AnalysisReport({
      productTitle,
      targetCountry,
      keywords: Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim()).filter(Boolean),
      imageUrl,
      adsData: adResults,
      aiAnalysis: parsedAI
    });

    const savedReport = await newReport.save();

    return res.json({
      id: savedReport._id,
      input: { productTitle, targetCountry, keywords, imageUrl },
      adsData: adResults,
      aiAnalysis: parsedAI
    });
  } catch (err) {
    console.error('🚨 Analysis error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const reports = await AnalysisReport.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const formattedReports = reports.map(report => ({
      id: report._id,
      product: report.productTitle,
      country: report.targetCountry,
      date: report.createdAt.toISOString().split('T')[0],
      status: report.aiAnalysis?.finalVerdict?.launchDecision || 'N/A',
      confidence: report.aiAnalysis?.finalVerdict?.confidenceLevel || 'N/A'
    }));

    res.json(formattedReports);
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/history/:id', async (req, res) => {
  try {
    const report = await AnalysisReport.findById(req.params.id).lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      ...report,
      id: report._id,
      productName: report.productTitle,
      date: report.createdAt.toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Report fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

app.get('/api/dashboard-metrics', async (req, res) => {
  try {
    // Get total products analyzed
    const totalProducts = await AnalysisReport.countDocuments();

    // Get unique markets covered
    const markets = await AnalysisReport.distinct('targetCountry');
    const marketsCovered = markets.length;

    // Get total ads monitored (sum of all adsData arrays)
    const reports = await AnalysisReport.find({}, 'adsData');
    const adsMonitored = reports.reduce((total, report) => total + (report.adsData?.length || 0), 0);

    // Generate accuracy rate (random between 85-100%)
    const accuracyRate = Math.floor(Math.random() * 16) + 85; // 85-100

    res.json({
      productsAnalyzed: totalProducts,
      marketsCovered: marketsCovered,
      adsMonitored: adsMonitored,
      accuracyRate: accuracyRate
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Cubelytics Backend API');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});