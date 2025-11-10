// Google Cloud Vision API Implementation
// Replace the moderateWithExternalAPI function in index.ts with this

async function moderateWithGoogleVision(imageUrl: string): Promise<any> {
  // Get credentials from environment
  const credentialsJson = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON');
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not set');
  }

  const credentials = JSON.parse(credentialsJson);
  const projectId = credentials.project_id;

  // Download image
  const imageResponse = await fetch(imageUrl);
  const imageBytes = await imageResponse.arrayBuffer();
  const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

  try {
    // Call Vision API
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${credentials.private_key}`;
    
    const requestBody = {
      requests: [
        {
          image: {
            content: imageBase64,
          },
          features: [
            { type: 'SAFE_SEARCH_DETECTION', maxResults: 1 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
          ],
        },
      ],
    };

    const response = await fetch(visionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    const annotations = result.responses[0];

    // Check safe search
    const safeSearch = annotations.safeSearchAnnotation;
    const isSensitive =
      safeSearch.adult === 'LIKELY' ||
      safeSearch.adult === 'VERY_LIKELY' ||
      safeSearch.violence === 'LIKELY' ||
      safeSearch.violence === 'VERY_LIKELY' ||
      safeSearch.racy === 'LIKELY' ||
      safeSearch.racy === 'VERY_LIKELY';

    // Check for pets
    const labels = annotations.labelAnnotations || [];
    const petKeywords = ['dog', 'cat', 'pet', 'animal', 'puppy', 'kitten', 'bird', 'rabbit', 'hamster'];
    const petLabels = labels.filter((label: any) =>
      petKeywords.some((keyword) =>
        label.description.toLowerCase().includes(keyword)
      )
    );

    const isPetRelated = petLabels.length > 0;
    const confidenceScore = isPetRelated
      ? Math.max(...petLabels.map((l: any) => l.score * 100))
      : 50;

    return {
      is_sensitive: isSensitive,
      is_pet_related: isPetRelated,
      confidence_score: Math.round(confidenceScore),
      moderation_reason: isSensitive
        ? 'Inappropriate content detected'
        : !isPetRelated
        ? 'No pets detected in image'
        : 'Content approved',
    };
  } catch (error) {
    console.error('Google Vision API error:', error);
    return {
      is_sensitive: true,
      is_pet_related: false,
      confidence_score: 0,
      moderation_reason: 'Error analyzing content',
    };
  }
}

// Export for use in main function
export { moderateWithGoogleVision };












