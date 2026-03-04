export type VoiceAgentState =
  | 'greeting'
  | 'asking_character'
  | 'asking_setting'
  | 'asking_plot'
  | 'ready_to_shoot'
  | 'recording'
  | 'reviewing_shot'
  | 'asking_next'
  | 'movie_complete';

export interface VoiceDialogue {
  state: VoiceAgentState;
  agentText: string;
  hint?: string;
  autoAdvanceMs?: number;
}

export const voiceScript: VoiceDialogue[] = [
  {
    state: 'greeting',
    agentText: "Hey there, movie maker! 🎬 I'm your director buddy! Ready to make an awesome movie today?",
    hint: 'Tap anywhere to continue',
    autoAdvanceMs: 3000,
  },
  {
    state: 'asking_character',
    agentText: "Awesome! First, who's the star of our movie? Pick up your favorite toy and show me!",
    hint: 'Tap to continue',
  },
  {
    state: 'asking_setting',
    agentText: "Oh wow, great choice! And where does our adventure take place? A jungle? Outer space? Your bedroom?",
    hint: 'Tap to continue',
  },
  {
    state: 'asking_plot',
    agentText: "Love it! So what happens in our story? Does our hero go on a treasure hunt? Save a friend? Have a party?",
    hint: 'Tap to continue',
  },
  {
    state: 'ready_to_shoot',
    agentText: "Perfect! Let's shoot our first scene! Get your toy ready and say 'Action!' or just tap when you're ready!",
    hint: "Say 'Action!' or tap",
  },
  {
    state: 'recording',
    agentText: '🎥 Recording...',
  },
  {
    state: 'reviewing_shot',
    agentText: "That was amazing! Want to keep this shot or try again?",
    hint: 'Tap to keep it!',
  },
  {
    state: 'asking_next',
    agentText: "Great shot! Want to film another scene or are we done with our movie?",
    hint: 'Tap for another shot',
  },
  {
    state: 'movie_complete',
    agentText: "🎉 That's a wrap! Your movie is ready! Let's go watch it!",
    autoAdvanceMs: 2500,
  },
];

export const getDialogueForState = (state: VoiceAgentState): VoiceDialogue => {
  return voiceScript.find((d) => d.state === state) ?? voiceScript[0];
};
