require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { toolDeclarations, handlers } = require('./tools');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Circuit breaker maximum loop counter to prevent infinite tool calling
const MAX_AGENT_STEPS = 4;

app.post('/api/chat', async (req, res) => {
  const { message, conversationHistory = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "A valid 'message' string is required." });
  }

  const startTime = Date.now();
  const executionTraces = [];

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Graceful offline mock engine if GEMINI_API_KEY is not configured
    if (!apiKey) {
      const lower = message.toLowerCase();
      let responseText = "Hello! I am your Autonomous Emergency & Health Assistant.";
      let toolExecuted = null;

      if (lower.includes("burn") || lower.includes("fire")) {
        toolExecuted = { name: "fetchFirstAidProtocol", args: { condition: "severe_burn", ageGroup: "ADULT" } };
        const result = handlers.fetchFirstAidProtocol(toolExecuted.args);
        executionTraces.push({ tool: toolExecuted.name, args: toolExecuted.args, result });
        responseText = `### Immediate Protocol for Severe Burns:\n\n**Action:** ${result.action}\n\n**Steps:**\n${result.steps.map(s => `- ${s}`).join('\n')}\n\n⚠️ **Caution:** ${result.caution}`;
      } else if (lower.includes("hospital") || lower.includes("bed") || lower.includes("delhi") || lower.includes("noida") || lower.includes("gurgaon")) {
        const city = lower.includes("gurgaon") ? "Gurgaon" : lower.includes("noida") ? "Noida" : "New Delhi";
        toolExecuted = { name: "checkHospitalResourceCapacity", args: { city, specialty: "EMERGENCY" } };
        const result = handlers.checkHospitalResourceCapacity(toolExecuted.args);
        executionTraces.push({ tool: toolExecuted.name, args: toolExecuted.args, result });
        responseText = `### Live Hospital Capacity for ${city}:\n\n` + 
          result.facilities.map(f => `- **${f.name}**: ${f.availableBeds} beds available | Estimated wait time: ${f.waitTimeMinutes} mins (Trauma Level ${f.traumaLevel})`).join('\n');
      } else if (lower.includes("chest pain") || lower.includes("heart") || lower.includes("unconscious")) {
        toolExecuted = { name: "calculateTriageScore", args: { symptoms: ["chest pain", "shortness of breath"], heartRate: 110 } };
        const result = handlers.calculateTriageScore(toolExecuted.args);
        executionTraces.push({ tool: toolExecuted.name, args: toolExecuted.args, result });
        responseText = `🚨 **Triage Acuity Assessment:** **${result.triageCategory}** (Severity Score: ${result.calculatedScore}/100)\n\n**Urgent Directive:** ${result.recommendedAction}`;
      } else {
        responseText = `I received your query: "${message}". I can trigger automated first-aid protocols, evaluate clinical triage scores, or query real-time hospital bed capacity. Ask me about first aid for burns, checking hospital beds in Delhi, or evaluating chest pain!`;
      }

      return res.json({
        reply: responseText,
        executionTraces,
        latencyMs: Date.now() - startTime,
        mode: "mock_demo"
      });
    }

    // Official Gemini Client using Google Generative AI SDK
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: "You are an autonomous emergency health triage and protocol dispatch agent. You have access to specialized first aid and hospital capacity tools. Whenever a user reports injury, symptoms, or hospital queries, proactively execute the appropriate tool before synthesizing your answer. Format responses in clean Markdown.",
      tools: [{ functionDeclarations: toolDeclarations }]
    });

    // Multi-turn Agent Execution Loop with Circuit Breaker
    let currentStep = 0;
    let finalAnswer = "";
    let contents = [
      ...conversationHistory,
      { role: "user", parts: [{ text: message }] }
    ];

    while (currentStep < MAX_AGENT_STEPS) {
      currentStep++;

      const result = await model.generateContent({ contents });
      const candidate = result.response.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);

      // If no function call, we have received the final synthesized response
      if (!functionCalls || functionCalls.length === 0) {
        finalAnswer = result.response.text() || "Assessment completed.";
        break;
      }

      // Handle each triggered tool invocation
      for (const call of functionCalls) {
        const handler = handlers[call.name];
        let toolResult = { error: "Unknown tool invocation" };

        if (handler) {
          try {
            toolResult = handler(call.args);
          } catch (err) {
            toolResult = { error: err.message };
          }
        }

        executionTraces.push({
          step: currentStep,
          tool: call.name,
          args: call.args,
          result: toolResult
        });

        // Append function call and function response into conversational context
        contents.push({
          role: "model",
          parts: [{ functionCall: call }]
        });
        contents.push({
          role: "function",
          parts: [{
            functionResponse: {
              name: call.name,
              response: { name: call.name, content: toolResult }
            }
          }]
        });
      }
    }

    if (!finalAnswer && currentStep >= MAX_AGENT_STEPS) {
      finalAnswer = "Safety threshold reached. Provided guidance based on latest diagnostic steps.";
    }

    res.json({
      reply: finalAnswer,
      executionTraces,
      latencyMs: Date.now() - startTime,
      stepsExecuted: currentStep,
      mode: "live_gemini"
    });

  } catch (error) {
    console.error("Agent execution error:", error);
    res.status(500).json({
      error: "Internal agent execution error",
      details: error.message,
      executionTraces
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Autonomous AI Web Assistant running on http://localhost:${PORT}`);
});
