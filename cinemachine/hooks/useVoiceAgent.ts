import { useReducer, useCallback } from 'react';
import { type VoiceAgentState, getDialogueForState } from '../constants/voiceScripts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryContext {
  character: string | null;
  setting: string | null;
  plot: string | null;
}

interface VoiceAgentContext {
  state: VoiceAgentState;
  dialogue: string;
  hint?: string;
  shotCount: number;
  isComplete: boolean;
  storyContext: StoryContext;
  geminiDialogue: string | null;
  isVoiceActive: boolean;
}

type VoiceAction =
  | { type: 'ADVANCE' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'KEEP_SHOT' }
  | { type: 'REDO_SHOT' }
  | { type: 'ADD_ANOTHER' }
  | { type: 'FINISH_MOVIE' }
  | { type: 'RESET' }
  | { type: 'SET_GEMINI_DIALOGUE'; text: string | null }
  | { type: 'SET_STORY_CONTEXT'; context: Partial<StoryContext> }
  | { type: 'SET_VOICE_ACTIVE'; active: boolean };

// ---------------------------------------------------------------------------
// State flow
// ---------------------------------------------------------------------------

const stateFlow: VoiceAgentState[] = [
  'greeting',
  'asking_character',
  'asking_setting',
  'asking_plot',
  'ready_to_shoot',
  'recording',
  'reviewing_shot',
  'asking_next',
  'movie_complete',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return dialogue text — prefer Gemini dialogue when available. */
function resolveDialogue(
  geminiDialogue: string | null,
  scriptedDialogue: string
): string {
  return geminiDialogue ?? scriptedDialogue;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(
  context: VoiceAgentContext,
  action: VoiceAction
): VoiceAgentContext {
  switch (action.type) {
    case 'ADVANCE': {
      const currentIdx = stateFlow.indexOf(context.state);
      if (currentIdx < stateFlow.indexOf('ready_to_shoot')) {
        const nextState = stateFlow[currentIdx + 1];
        const dialogue = getDialogueForState(nextState);
        return {
          ...context,
          state: nextState,
          dialogue: resolveDialogue(null, dialogue.agentText),
          hint: dialogue.hint,
          geminiDialogue: null,
        };
      }
      // At ready_to_shoot, advance means start recording
      if (context.state === 'ready_to_shoot') {
        const dialogue = getDialogueForState('recording');
        return {
          ...context,
          state: 'recording',
          dialogue: resolveDialogue(null, dialogue.agentText),
          hint: dialogue.hint,
          geminiDialogue: null,
        };
      }
      return context;
    }

    case 'START_RECORDING': {
      const dialogue = getDialogueForState('recording');
      return {
        ...context,
        state: 'recording',
        dialogue: resolveDialogue(null, dialogue.agentText),
        hint: dialogue.hint,
        geminiDialogue: null,
      };
    }

    case 'STOP_RECORDING': {
      const dialogue = getDialogueForState('reviewing_shot');
      return {
        ...context,
        state: 'reviewing_shot',
        dialogue: resolveDialogue(null, dialogue.agentText),
        hint: dialogue.hint,
        geminiDialogue: null,
      };
    }

    case 'KEEP_SHOT': {
      const newCount = context.shotCount + 1;
      const dialogue = getDialogueForState('asking_next');
      return {
        ...context,
        state: 'asking_next',
        shotCount: newCount,
        dialogue: resolveDialogue(null, dialogue.agentText),
        hint: dialogue.hint,
        geminiDialogue: null,
      };
    }

    case 'REDO_SHOT': {
      const dialogue = getDialogueForState('ready_to_shoot');
      return {
        ...context,
        state: 'ready_to_shoot',
        dialogue: "Let's try that again! Get ready...",
        hint: dialogue.hint,
        geminiDialogue: null,
      };
    }

    case 'ADD_ANOTHER': {
      const dialogue = getDialogueForState('ready_to_shoot');
      return {
        ...context,
        state: 'ready_to_shoot',
        dialogue: `Shot ${context.shotCount + 1} coming up! Get your toy ready!`,
        hint: dialogue.hint,
        geminiDialogue: null,
      };
    }

    case 'FINISH_MOVIE': {
      const dialogue = getDialogueForState('movie_complete');
      return {
        ...context,
        state: 'movie_complete',
        dialogue: resolveDialogue(null, dialogue.agentText),
        hint: dialogue.hint,
        isComplete: true,
        geminiDialogue: null,
      };
    }

    case 'RESET': {
      const dialogue = getDialogueForState('greeting');
      return {
        state: 'greeting',
        dialogue: dialogue.agentText,
        hint: dialogue.hint,
        shotCount: 0,
        isComplete: false,
        storyContext: { character: null, setting: null, plot: null },
        geminiDialogue: null,
        isVoiceActive: false,
      };
    }

    case 'SET_GEMINI_DIALOGUE': {
      return {
        ...context,
        geminiDialogue: action.text,
        dialogue: action.text ?? context.dialogue,
      };
    }

    case 'SET_STORY_CONTEXT': {
      return {
        ...context,
        storyContext: { ...context.storyContext, ...action.context },
      };
    }

    case 'SET_VOICE_ACTIVE': {
      return {
        ...context,
        isVoiceActive: action.active,
      };
    }

    default:
      return context;
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialDialogue = getDialogueForState('greeting');
const initialState: VoiceAgentContext = {
  state: 'greeting',
  dialogue: initialDialogue.agentText,
  hint: initialDialogue.hint,
  shotCount: 0,
  isComplete: false,
  storyContext: { character: null, setting: null, plot: null },
  geminiDialogue: null,
  isVoiceActive: false,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceAgent() {
  const [context, dispatch] = useReducer(reducer, initialState);

  const advance = useCallback(() => dispatch({ type: 'ADVANCE' }), []);
  const startRecording = useCallback(
    () => dispatch({ type: 'START_RECORDING' }),
    []
  );
  const stopRecording = useCallback(
    () => dispatch({ type: 'STOP_RECORDING' }),
    []
  );
  const keepShot = useCallback(() => dispatch({ type: 'KEEP_SHOT' }), []);
  const redoShot = useCallback(() => dispatch({ type: 'REDO_SHOT' }), []);
  const addAnother = useCallback(
    () => dispatch({ type: 'ADD_ANOTHER' }),
    []
  );
  const finishMovie = useCallback(
    () => dispatch({ type: 'FINISH_MOVIE' }),
    []
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  // New: voice-related dispatchers
  const setGeminiDialogue = useCallback(
    (text: string | null) =>
      dispatch({ type: 'SET_GEMINI_DIALOGUE', text }),
    []
  );

  const updateStoryContext = useCallback(
    (ctx: Partial<{ character: string | null; setting: string | null; plot: string | null }>) =>
      dispatch({ type: 'SET_STORY_CONTEXT', context: ctx }),
    []
  );

  const setVoiceActive = useCallback(
    (active: boolean) =>
      dispatch({ type: 'SET_VOICE_ACTIVE', active }),
    []
  );

  /**
   * Handle a command dispatched from the VoiceSocket (Gemini Live API).
   * Maps START_RECORDING / STOP_RECORDING to the appropriate reducer actions.
   */
  const handleVoiceCommand = useCallback(
    (action: 'START_RECORDING' | 'STOP_RECORDING') => {
      if (action === 'START_RECORDING') {
        dispatch({ type: 'START_RECORDING' });
      } else {
        dispatch({ type: 'STOP_RECORDING' });
      }
    },
    []
  );

  // Demo mode: tap handler that advances through the flow (fallback)
  const handleDemoTap = useCallback(() => {
    switch (context.state) {
      case 'greeting':
      case 'asking_character':
      case 'asking_setting':
      case 'asking_plot':
        advance();
        break;
      case 'ready_to_shoot':
        startRecording();
        break;
      case 'recording':
        stopRecording();
        break;
      case 'reviewing_shot':
        keepShot();
        break;
      case 'asking_next':
        // Alternate between adding shots and finishing
        if (context.shotCount >= 3) {
          finishMovie();
        } else {
          addAnother();
        }
        break;
      default:
        break;
    }
  }, [
    context.state,
    context.shotCount,
    advance,
    startRecording,
    stopRecording,
    keepShot,
    addAnother,
    finishMovie,
  ]);

  return {
    ...context,
    advance,
    startRecording,
    stopRecording,
    keepShot,
    redoShot,
    addAnother,
    finishMovie,
    reset,
    handleDemoTap,
    // New voice-related methods
    setGeminiDialogue,
    updateStoryContext,
    setVoiceActive,
    handleVoiceCommand,
  };
}
