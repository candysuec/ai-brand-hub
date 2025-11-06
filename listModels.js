import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY environment variable not set.');
    return;
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  try {
    for await (const model of genAI.listModels()) {
      console.log(`Model Name: ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Description: ${model.description}`);
      console.log(`  Input Token Limit: ${model.inputTokenLimit}`);
      console.log(`  Output Token Limit: ${model.outputTokenLimit}`);
      console.log(`  Supported Generation Methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log('---\n');
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
