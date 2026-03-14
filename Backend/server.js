const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log("Checking API Key...", process.env.GEMINI_API_KEY ? "✅ Found" : "❌ Not Found");
console.log("Environment:", process.env.NODE_ENV || "development");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve the frontend files from ../public
app.use(express.static(path.join(__dirname, "../public")));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction:
    "Your name is Event Finder. Your task is to help users find events in their area. You provide details like event name, location, date, realevent website, random tech image but working link and a short description. You will **only** list tech-related events, conferences, and anything related to startups, coding, and IT topics.",
});

// ✅ NEW: Event Finder Route (tech-related events only)
app.post("/api/gemini-events", async (req, res) => {
  const { city, state } = req.body;

  if (!city || !state) {
    return res.status(400).json({
      error: "City and state are required.",
    });
  }

  const prompt = `
Generate EXACTLY 6 technology-related events happening in ${city}, ${state}, India within the next 45 days from TODAY (${new Date().toISOString().split("T")[0]
    }).

Event rules:
- Event dates MUST be real calendar dates and MUST be between today and the next 45 days.
- No past events allowed.

Valid event types:
Hackathons, AI/ML Meetups, Cybersecurity Conferences, DevOps Bootcamps, Startup Pitches, Web Development Meetups, Cloud Computing Workshops, Open Source Summits.

RETURN ONLY a raw JSON array. No text before or after.

Each entry MUST have:

{
  "title": "",
  "date": "",
  "location": "",
  "description": "Max 2 sentences",
  "website": "A working real event website from eventbrite.com, devpost.com, meetup.com, tickermaster.com, or official college fest URL.",
  "image": "A working direct pexels.com image URL in format: https://images.pexels.com/...?.auto=compress&cs=tinysrgb&w=1200"
}

NO example.com
NO dummy text
NO markdown
ONLY pure JSON.
`;

  try {
    const result = await model.generateContent(prompt);

    let text = result.response.text().trim();

    // Remove formatting if Gemini returns extra wrapping like ```json ... ```
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let events;

    try {
      events = JSON.parse(text);
    } catch (err) {
      console.warn("⚠ Parsing failed. Attempting recovery...");

      const start = text.indexOf("[");
      const end = text.lastIndexOf("]") + 1;
      const extracted = text.slice(start, end);

      events = JSON.parse(extracted);
    }

    // Validation: Ensure array format
    if (!Array.isArray(events)) {
      throw new Error("Gemini returned invalid format.");
    }

    res.json({ events });
  } catch (error) {
    console.error("❌ Gemini Event API Error:", error.message);

    // FALLBACK: Return mock events if API fails
    console.log("⚠️ Switching to MOCK DATA due to API failure.");

    const mockEvents = [
      {
        title: "AI & Future Tech Summit 2026",
        date: "2026-03-15",
        location: `${city}, ${state}`,
        description: "Join industry leaders to discuss the future of AI, machine learning, and automation in the tech world.",
        website: "https://www.meetup.com/",
        image: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
      },
      {
        title: "Full Stack Dev Conference",
        date: "2026-03-20",
        location: `${city}, ${state}`,
        description: "A comprehensive conference for web developers covering the latest frameworks, tools, and best practices.",
        website: "https://devpost.com/",
        image: "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
      },
      {
        title: "Cybersecurity Bootcamp",
        date: "2026-04-05",
        location: `${city}, ${state}`,
        description: "Hands-on workshop on ethical hacking, network security, and data protection strategies.",
        website: "https://www.eventbrite.com/",
        image: "https://images.pexels.com/photos/5380642/pexels-photo-5380642.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
      },
      {
        title: "Startup Pitch Night",
        date: "2026-04-12",
        location: `${city}, ${state}`,
        description: "Watch aspiring entrepreneurs pitch their innovative ideas to a panel of investors and mentors.",
        website: "https://www.meetup.com/",
        image: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
      },
      {
        title: "Cloud Computing Expo",
        date: "2026-04-25",
        location: `${city}, ${state}`,
        description: "Explore the latest trends in cloud technology, serverless architecture, and DevOps practices.",
        website: "https://www.eventbrite.com/",
        image: "https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
      },
      {
        title: "Open Source Hackathon",
        date: "2026-05-02",
        location: `${city}, ${state}`,
        description: "Collaborate with developers from around the world to contribute to open source projects and win prizes.",
        website: "https://devpost.com/",
        image: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
      }
    ];

    res.json({ events: mockEvents });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

// Export for Vercel
module.exports = app;
