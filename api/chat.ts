import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function tavilySearch(query: string) {
  try {
    const apiKey = (process.env.TAVILY_API_KEY || "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").trim();
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: 5,
      include_answer: true
    });
    return response.data;
  } catch (error) {
    console.error("Tavily search error:", error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, model, stream, systemInstruction, isResearchMode } = req.body;
    let finalSystemInstruction = systemInstruction || "You are HK-Ai.";

    if (isResearchMode) {
      const lastUserMsg = (messages || []).findLast((m: any) => m.role === 'user')?.content;
      if (lastUserMsg) {
        const tavilyData = await tavilySearch(lastUserMsg);
        if (tavilyData?.results) {
          const context = tavilyData.results
            .map((r: any, idx: number) => `SOURCE ${idx + 1}: ${r.title}\nURL: ${r.url}\nCONTENT: ${r.content}`)
            .join("\n\n---\n\n");
          
          finalSystemInstruction += `
[DEEP SEARCH KNOWLEDGE BASE]
${tavilyData.answer ? `SUMMARY: ${tavilyData.answer}` : ""}
${context}

[PROTOCOL]: You are HK-Ai with realtime internet access. Use the data above. Cite sources as [Title](URL).`;
        }
      }
    }

    const response = await openai.chat.completions.create({
      model: model || "openrouter/free",
      messages: [
        { role: "system", content: finalSystemInstruction },
        ...messages.map((m: any) => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.content
        }))
      ],
      stream: !!stream,
    });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      for await (const chunk of response as any) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.status(200).json(response);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
