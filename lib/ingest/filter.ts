import { geminiVision } from "@/lib/clients/gemini";

// Cheap pre-filter: does this image contain visible clothing on a person?
// Returns true if yes, false if skip (empty scene, food, screenshots, etc.).
// On Gemini error we default to true (prefer false splits over dropping real photos).
export async function containsClothing(imageBytes: Buffer, mimeType: string): Promise<boolean> {
  try {
    const model = geminiVision();
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: 'Does this image contain visible clothing items being worn by a person, OR a clear flat-lay of garments? Answer strictly "yes" or "no".',
            },
            {
              inlineData: {
                mimeType,
                data: imageBytes.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 4 },
    });
    const text = result.response.text().trim().toLowerCase();
    return text.startsWith("y");
  } catch {
    return true;
  }
}
