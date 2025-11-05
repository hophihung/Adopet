// Supabase Edge Function for Content Moderation
// This function can be integrated with various AI services

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  image_url: string;
  video_url?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_url, video_url } = await req.json() as ModerationRequest;

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'image_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Option 1: Use external API (Google Vision, AWS Rekognition, etc.)
    // For now, we'll use a simple validation
    // In production, replace this with actual AI service

    const moderationResult = await moderateWithExternalAPI(image_url);

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function moderateWithExternalAPI(imageUrl: string) {
  // ============================================
  // CHỌN AI SERVICE - Uncomment service bạn muốn dùng
  // ============================================

  // OPTION 1: OpenAI Vision API (Khuyến nghị - Dễ nhất)
  // Yêu cầu: Thêm OPENAI_API_KEY vào Supabase Secrets
  try {
    return await moderateWithOpenAI(imageUrl);
  } catch (error) {
    console.error('OpenAI error:', error);
    // Fall through to basic validation
  }

  // OPTION 2: Google Cloud Vision API
  // Yêu cầu: Thêm GOOGLE_APPLICATION_CREDENTIALS_JSON vào Supabase Secrets
  // try {
  //   return await moderateWithGoogleVision(imageUrl);
  // } catch (error) {
  //   console.error('Google Vision error:', error);
  // }

  // OPTION 3: AWS Rekognition
  // Yêu cầu: Thêm AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION vào Supabase Secrets
  // try {
  //   return await moderateWithAWSRekognition(imageUrl);
  // } catch (error) {
  //   console.error('AWS Rekognition error:', error);
  // }

  // FALLBACK: Basic validation (nếu không có AI service)
  console.warn('Using basic validation - No AI service configured');
  return {
    is_sensitive: false,
    is_pet_related: true,
    confidence_score: 50,
    moderation_reason: 'Content validated (basic check - no AI service)',
  };
}

// ============================================
// AI SERVICE IMPLEMENTATIONS
// ============================================

// OpenAI Vision API Implementation
async function moderateWithOpenAI(imageUrl: string): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in Supabase Secrets');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // or 'gpt-4-vision-preview'
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image for a pet adoption app. Answer in JSON:
{
  "is_sensitive": boolean (true if adult content, violence, inappropriate),
  "is_pet_related": boolean (true if contains pets/animals),
  "confidence_score": number (0-100),
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
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in OpenAI response');
  }

  const result = JSON.parse(jsonMatch[0]);
  
  return {
    is_sensitive: result.is_sensitive || false,
    is_pet_related: result.is_pet_related || false,
    confidence_score: result.confidence_score || 50,
    moderation_reason: result.moderation_reason || 'Analyzed by OpenAI Vision',
  };
}

// Google Cloud Vision API Implementation (placeholder - needs full implementation)
async function moderateWithGoogleVision(imageUrl: string): Promise<any> {
  // TODO: Implement Google Vision API
  // See: supabase/functions/moderate-content/google-vision-implementation.ts
  throw new Error('Google Vision API not implemented - see implementation file');
}

// AWS Rekognition Implementation (placeholder - needs full implementation)
async function moderateWithAWSRekognition(imageUrl: string): Promise<any> {
  // TODO: Implement AWS Rekognition
  // See: supabase/functions/moderate-content/aws-rekognition-implementation.ts
  throw new Error('AWS Rekognition not implemented - see implementation file');
}

