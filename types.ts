export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface VoiceOption {
  id: VoiceName;
  label: string;
  description: string;
  gender: 'Male' | 'Female';
}

export interface GenerationConfig {
  voice: VoiceName;
  stylePrompt: string;
}

export interface StoryboardSegment {
  narrativeText: string;
  imagePrompt: string;
  generatedImage?: string;
  audio?: string; // Base64 audio string specific to this segment
  hasCharacter?: boolean; // Indicates if the image contains a person/character suitable for reference
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: VoiceName.Fenrir, label: 'Fenrir', description: 'Profundo, ressonante, autoritário', gender: 'Male' },
  { id: VoiceName.Puck, label: 'Puck', description: 'Claro, brincalhão, expressivo', gender: 'Male' },
  { id: VoiceName.Kore, label: 'Kore', description: 'Quente, suave, calmo', gender: 'Female' },
  { id: VoiceName.Charon, label: 'Charon', description: 'Baixo, rouco, sério', gender: 'Male' },
  { id: VoiceName.Zephyr, label: 'Zephyr', description: 'Equilibrado, moderno, amigável', gender: 'Female' },
];

export const STORY_STYLES = [
  { 
    id: 'experienced', 
    label: 'Narrador Experiente', 
    prompt: 'Você é um narrador de histórias de classe mundial, com uma voz cheia de sabedoria e experiência. Narre o texto com imersão profunda, usando um ritmo perfeito, pausas dramáticas e inflexões sutis para cativar o ouvinte. Não leia estas instruções.' 
  },
  { 
    id: 'bedtime', 
    label: 'História de Ninar', 
    prompt: 'Você é um cuidador gentil contando uma história de ninar. Fale em um tom suave, lento, sussurrado e reconfortante, projetado para ajudar uma criança a adormecer. Não leia estas instruções.' 
  },
  { 
    id: 'dramatic', 
    label: 'Trailer Dramático', 
    prompt: 'Você é um narrador intenso de trailer de filme de ação ou suspense. Fale com alta energia, urgência e forte ênfase nos momentos emocionais. Não leia estas instruções.' 
  },
  { 
    id: 'news', 
    label: 'Noticiário', 
    prompt: 'Você é um âncora de telejornal profissional. Entregue o texto com articulação perfeita, um tom neutro e autoritário, e um ritmo constante e informativo. Não leia estas instruções.' 
  },
];

export const VISUAL_STYLES = [
  { 
    id: 'cinematic', 
    label: 'Cinemático (Padrão)', 
    promptSuffix: 'cinematic lighting, highly detailed, 8k resolution, photorealistic, dramatic atmosphere, vertical 9:16 aspect ratio.' 
  },
  { 
    id: 'anatomy', 
    label: 'Anatomia 3D (Medical)', 
    promptSuffix: 'Style description: 3D anatomical skeleton character, full body visible, internal organs exposed (lungs, heart, liver, intestines), semi transparent body, medical educational illustration, stylized cartoon eyes, ultra detailed organic textures, octane render, studio lighting, soft pink gradient background, high resolution, 8k. Negative prompt: low quality, blurry, deformed organs, extra limbs, missing bones, distorted anatomy, text artifacts, watermark, poor lighting, flat textures.' 
  },
  { 
    id: 'watercolor', 
    label: 'Aquarela Artística', 
    promptSuffix: 'Soft watercolor painting style, artistic, flowing colors, paper texture, dreamy atmosphere, detailed ink outlines.' 
  },
];
