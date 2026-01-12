import { GoogleGenAI } from "@google/genai";
import { Language, Supplier, OrderItem, Unit } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getUnitLabel = (unit: Unit, lang: Language): string => {
    if (lang === 'RO') {
        switch (unit) {
            case 'pcs': return 'buc';
            case 'kg': return 'kg';
            case 'box': return 'bax';
            default: return 'buc';
        }
    } else {
        switch (unit) {
            case 'pcs': return 'db';
            case 'kg': return 'kg';
            case 'box': return 'bax';
            default: return 'db';
        }
    }
};

export const generateOrderEmail = async (supplier: Supplier, items: OrderItem[], language: Language): Promise<string> => {
  const langName = language === 'RO' ? 'Romanian' : 'Hungarian';
  const itemsList = items.map(item => `- ${item.name} (${item.quantity} ${getUnitLabel(item.unit, language)})`).join('\n');
  
  const prompt = `
    You are a store manager in Romania. Write a formal business email to the supplier "${supplier.name}" to order the following items:
    ${itemsList}

    The email should be written in ${langName}.
    The supplier's preferred order day is ${supplier.orderDay} and delivery is usually on ${supplier.deliveryDay}.
    Mention that we expect delivery on the usual day.
    Ask for a confirmation of the order and total price.
    Keep it professional, concise, and polite.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Error generating email.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service.";
  }
};

export const askBusinessAdvisor = async (question: string, language: Language): Promise<string> => {
  const langName = language === 'RO' ? 'Romanian' : 'Hungarian';
  const prompt = `
    You are an expert retail consultant for the Romanian market.
    Answer the following question from a store manager in ${langName}.
    Consider local Romanian laws, consumer behavior, and retail trends where applicable.
    
    Question: "${question}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Error generating advice.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service.";
  }
};