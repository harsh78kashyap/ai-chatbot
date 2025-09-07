const express = require('express');
const axios = require('axios');
const router = express.Router();   // ✅ must be declared

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Simple in-memory conversation store
const conversations = {};

// Helper to call OpenAI completion (chat) endpoint
async function callOpenAIChat(messages) {
  const url = `${OPENAI_BASE}/chat/completions`;
  const payload = {
    model: 'gpt-4o-mini',   // change if needed
    messages: messages,
    max_tokens: 500,
    temperature: 0.7
  };

  const headers = {
    'Authorization': `Bearer ${OPENAI_KEY}`,
    'Content-Type': 'application/json'
  };

  const resp = await axios.post(url, payload, { headers });
  const assistant = resp.data.choices?.[0]?.message?.content ?? '';
  return assistant;
}

// POST /api/openai/chat
// body: { sessionId: string (optional), message: string }
router.post('/chat', async (req, res) => {
  try {
    const { sessionId = 'default', message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    // initialize convo if needed
    if (!conversations[sessionId]) conversations[sessionId] = [];

    // push user message
    conversations[sessionId].push({ role: 'user', content: message });

    // assemble messages for API
    const systemPrompt = { role: 'system', content: 'You are a helpful assistant.' };
    const messagesForAPI = [systemPrompt, ...conversations[sessionId]];

    const reply = await callOpenAIChat(messagesForAPI);

    // push assistant reply to convo
    conversations[sessionId].push({ role: 'assistant', content: reply });

    return res.json({ reply, sessionId });
  } catch (err) {
    console.error(err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/openai/history?sessionId=...
router.get('/history', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  return res.json({ sessionId, messages: conversations[sessionId] || [] });
});

module.exports = router;   // ✅ export router
