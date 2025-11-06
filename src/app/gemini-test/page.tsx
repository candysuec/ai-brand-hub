'use client';

import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/test/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setResponse(data.candidates[0].content.parts[0].text);
      } else {
        setError('No response received from Gemini.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">💎 Gemini Chat Test</h1>

      <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-md">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini anything..."
          className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Thinking...' : 'Ask Gemini'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-500">{error}</p>}
      {response && (
        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-md w-full max-w-md">
          <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </main>
  );
}
