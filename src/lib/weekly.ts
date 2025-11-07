import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sendAlert } from "./alerts/mailer";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!); // Ensure GEMINI_API_KEY is set

export async function sendWeeklySummary() {
  try {
    console.log("📊 Generating weekly summary...");

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch all brands
    const brands = await prisma.brand.findMany({
      select: { id: true, name: true, consistencyScores: { where: { timestamp: { gte: oneWeekAgo } }, orderBy: { timestamp: "asc" } } },
    });

    let weeklySummaryContent = "";

    for (const brand of brands) {
      if (brand.consistencyScores.length > 0) {
        const scores = brand.consistencyScores.map(s => s.score);
        const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const initialScore = scores[0];
        const finalScore = scores[scores.length - 1];
        const change = finalScore - initialScore;

        let trend = "";
        if (change > 0) trend = `improved by ${change}%`;
        else if (change < 0) trend = `decreased by ${Math.abs(change)}%`;
        else trend = `remained consistent`;

        weeklySummaryContent += `### Brand: ${brand.name}\n`;
        weeklySummaryContent += `- Average Consistency Score: ${averageScore.toFixed(2)}\n`;
        weeklySummaryContent += `- Trend: ${trend} over the last week.\n`;
        weeklySummaryContent += `- Scores: ${scores.join(", ")}\n\n`;
      }
    }

    if (weeklySummaryContent === "") {
      weeklySummaryContent = "No consistency scores recorded for any brand this week.";
    }

    // Use Gemini to generate a natural language summary
    const prompt = `
      Given the following weekly brand consistency report, generate a concise, natural language summary.
      Highlight key trends, improvements, or areas needing attention.

      Weekly Report Data:\n${weeklySummaryContent}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const geminiSummary = response.text();

    // Send email with the summary
    await sendAlert("info", "📊 Weekly Brand Consistency Report", {
      summary: geminiSummary,
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Weekly summary generated and sent.");
  } catch (error: any) {
    console.error("❌ Error generating weekly summary:", error);
    // Optionally send an error alert
    await sendAlert("error", "❌ Failed to Generate Weekly Summary", { error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
