// OpenAI Vision API Implementation
// Replace the moderateWithExternalAPI function in index.ts with this

import { OpenAI } from 'https://deno.land/x/openai@v4.20.0/mod.ts';

async function moderateWithOpenAI(imageUrl: string): Promise<any> {
  // Get API key from environment
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const openai = new OpenAI({ apiKey });

  try {
    // Analyze image with GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4-vision-preview' for older models
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and answer these questions:
1. Is this image appropriate for a pet adoption app? (no adult content, violence, or inappropriate material)
2. Does this image contain pets or animals? (dog, cat, bird, etc.)
3. What is your confidence level (0-100)?

Respond in JSON format:
{
  "is_sensitive": true/false,
  "is_pet_related": true/false,
  "confidence_score": 0-100,
  "moderation_reason": "brief explanation"
}`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let moderationResult;
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback: try to parse as-is
      moderationResult = JSON.parse(content);
    }

    return {
      is_sensitive: moderationResult.is_sensitive || false,
      is_pet_related: moderationResult.is_pet_related || false,
      confidence_score: moderationResult.confidence_score || 50,
      moderation_reason: moderationResult.moderation_reason || 'Analyzed by OpenAI Vision',
    };
  } catch (error) {
    console.error('OpenAI Vision API error:', error);
    // Fallback: reject if error
    return {
      is_sensitive: true,
      is_pet_related: false,
      confidence_score: 0,
      moderation_reason: 'Error analyzing content',
    };
  }
}

// Export for use in main function
export { moderateWithOpenAI };












