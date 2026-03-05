import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const testGroaq = async () => {
  console.log('\n=== GROQ API Test ===');
  console.log('Groq API Key:', process.env.GROQ_API_KEY ? '✓ Loaded' : '✗ Missing');
  console.log('Groq Enabled:', process.env.GROQ_ENABLED);
  
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = process.env.GROQ_API_KEY;
  const model = 'mixtral-8x7b-32768';
  
  console.log('\nAPI URL:', apiUrl);
  console.log('Model:', model);
  
  try {
    console.log('\n📤 Sending request...');
    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: 'Suggest 3 options for: How do I contribute?',
          },
        ],
        temperature: 0.6,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error!');
    console.log('Status:', error.response?.status);
    console.log('Error Message:', error.message);
    console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
  }
};

testGroaq();
