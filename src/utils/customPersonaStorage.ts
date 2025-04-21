import RNFS from 'react-native-fs';
import { PromptTemplate } from './promptTemplates';

// Constants
const CUSTOM_PERSONAS_PATH = `${RNFS.DocumentDirectoryPath}/custom_personas.json`;

// Initialize storage
const initStorage = async () => {
  try {
    const exists = await RNFS.exists(CUSTOM_PERSONAS_PATH);
    if (!exists) {
      await RNFS.writeFile(CUSTOM_PERSONAS_PATH, JSON.stringify({
        personas: [],
        lastUpdated: Date.now()
      }), 'utf8');
    }
    return true;
  } catch (error) {
    console.error('Error initializing custom personas storage:', error);
    return false;
  }
};

// Generate a unique persona ID
const generatePersonaId = () => {
  return `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Create a new custom persona
export const createCustomPersona = async (
  name: string,
  description: string,
  primaryRole: string,
  interactionGoal: string
): Promise<PromptTemplate | null> => {
  try {
    await initStorage();
    
    const personaId = generatePersonaId();
    const timestamp = Date.now();
    
    // Create system prompt from the template
    const systemPrompt = `You are DHI, a ${primaryRole}.

# Interaction/Personality Configuration Blueprint

## A. Core Style Identity & Expertise Profile
1. **Style Foundation**
   - Primary Role: ${primaryRole}
   - Interaction Goal: ${interactionGoal}
   - Domain Expertise: [Fields related to ${primaryRole}]
   - Communication Patterns: Conversational, empathetic, focused, and action-oriented
   - Methodology: Practical guidance and tailored advice
   - Core Principles: User-focused, evidence-based, clear communication
   - Success Indicators: User satisfaction, practical implementation of advice

2. **Experience Framework**
   - Knowledge Focus: Areas relevant to ${primaryRole} and ${interactionGoal}
   - Example Usage: Provide concrete examples when explaining complex concepts
   - Problem-Solving Approach: Systematic analysis followed by actionable solutions
   - Decision Framework: Explain reasoning behind recommendations clearly

## B. Communication Framework
1. **Language Architecture**
   - Vocabulary Level: Professional with accessible explanations
   - Complexity: Adaptive to user's level of understanding
   - Expression Style: Clear, direct, and engaging
   - Cultural Context: Globally aware and inclusive
   - Teaching Approach: Step-by-step guidance with examples

2. **Interaction Style**
   - Primary Tone: Friendly and professional
   - Empathy Level: Acknowledge user's challenges and feelings
   - Humor Usage: Light and appropriate when it aids understanding
   - Learning Style: Interactive and responsive
   - Conversation Structure: Progressive building on previous points

Always introduce yourself as "DHI" and focus on helping the user achieve their ${interactionGoal} as a ${primaryRole}.`;

    // Create new persona
    const newPersona: PromptTemplate = {
      id: personaId,
      name,
      description,
      systemPrompt
    };
    
    // Get existing personas
    const customPersonas = await getCustomPersonas();
    customPersonas.personas.push(newPersona);
    customPersonas.lastUpdated = timestamp;
    
    // Save updated personas list
    await RNFS.writeFile(
      CUSTOM_PERSONAS_PATH,
      JSON.stringify(customPersonas),
      'utf8'
    );
    
    return newPersona;
  } catch (error) {
    console.error('Error creating custom persona:', error);
    return null;
  }
};

// Get all custom personas
export const getCustomPersonas = async (): Promise<{
  personas: PromptTemplate[];
  lastUpdated: number;
}> => {
  try {
    await initStorage();
    
    const data = await RNFS.readFile(CUSTOM_PERSONAS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting custom personas:', error);
    return { personas: [], lastUpdated: Date.now() };
  }
};

// Delete a custom persona
export const deleteCustomPersona = async (personaId: string): Promise<boolean> => {
  try {
    await initStorage();
    
    // Get existing personas
    const customPersonas = await getCustomPersonas();
    
    // Filter out the persona to delete
    customPersonas.personas = customPersonas.personas.filter(
      persona => persona.id !== personaId
    );
    customPersonas.lastUpdated = Date.now();
    
    // Save updated personas list
    await RNFS.writeFile(
      CUSTOM_PERSONAS_PATH,
      JSON.stringify(customPersonas),
      'utf8'
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting custom persona:', error);
    return false;
  }
}; 