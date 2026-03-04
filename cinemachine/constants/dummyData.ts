export interface Shot {
  id: string;
  emoji: string;
  title: string;
  duration: number; // seconds
  description: string;
}

export interface Story {
  id: string;
  title: string;
  emoji: string;
  gradientIndex: number;
  description: string;
  character: string;
  setting: string;
  shots: Shot[];
  createdAt: string;
  totalDuration: number;
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  earned: boolean;
}

export interface UserProfile {
  name: string;
  avatar: string;
  title: string;
  storiesCount: number;
  totalShots: number;
  totalDuration: number;
  badges: Badge[];
}

export const dummyStories: Story[] = [
  {
    id: '1',
    title: 'Dragon\'s Big Day',
    emoji: '🐉',
    gradientIndex: 0,
    description: 'A friendly dragon goes on an adventure to find the golden cookie.',
    character: 'Sparky the Dragon',
    setting: 'Enchanted Forest',
    shots: [
      { id: '1-1', emoji: '🌅', title: 'Morning Wake Up', duration: 8, description: 'Sparky wakes up in his cozy cave' },
      { id: '1-2', emoji: '🗺️', title: 'The Map', duration: 6, description: 'Sparky finds an old treasure map' },
      { id: '1-3', emoji: '🌲', title: 'Into the Forest', duration: 10, description: 'Walking through the enchanted trees' },
      { id: '1-4', emoji: '🍪', title: 'The Golden Cookie', duration: 7, description: 'Sparky finds the golden cookie!' },
    ],
    createdAt: '2026-03-01',
    totalDuration: 31,
  },
  {
    id: '2',
    title: 'Space Teddy Mission',
    emoji: '🧸',
    gradientIndex: 1,
    description: 'Teddy Bear blasts off to save the Moon from tickle aliens.',
    character: 'Captain Teddy',
    setting: 'Outer Space',
    shots: [
      { id: '2-1', emoji: '🚀', title: 'Blast Off!', duration: 5, description: 'Teddy launches into space' },
      { id: '2-2', emoji: '🌙', title: 'Moon Landing', duration: 8, description: 'Landing on the moon surface' },
      { id: '2-3', emoji: '👽', title: 'Alien Friends', duration: 9, description: 'Meeting the tickle aliens' },
    ],
    createdAt: '2026-02-28',
    totalDuration: 22,
  },
  {
    id: '3',
    title: 'Pirate Dino Treasure',
    emoji: '🦕',
    gradientIndex: 2,
    description: 'A dinosaur pirate sails the seven bathtubs looking for rubber duck treasure.',
    character: 'Rex the Pirate',
    setting: 'The Seven Bathtubs',
    shots: [
      { id: '3-1', emoji: '🏴‍☠️', title: 'Setting Sail', duration: 6, description: 'Rex raises the jolly roger' },
      { id: '3-2', emoji: '🌊', title: 'Stormy Seas', duration: 8, description: 'Navigating through bubbles' },
      { id: '3-3', emoji: '🗝️', title: 'The Key', duration: 5, description: 'Finding the golden key' },
      { id: '3-4', emoji: '🦆', title: 'Rubber Duck Gold', duration: 7, description: 'The treasure is rubber ducks!' },
      { id: '3-5', emoji: '🎉', title: 'Celebration', duration: 6, description: 'Rex celebrates with his crew' },
    ],
    createdAt: '2026-02-25',
    totalDuration: 32,
  },
];

export const dummyUserProfile: UserProfile = {
  name: 'Alex',
  avatar: '🎬',
  title: 'Movie Director',
  storiesCount: 3,
  totalShots: 12,
  totalDuration: 85,
  badges: [
    { id: 'b1', emoji: '🌟', title: 'First Movie', earned: true },
    { id: 'b2', emoji: '🎬', title: 'Director', earned: true },
    { id: 'b3', emoji: '🏆', title: '5 Movies', earned: false },
    { id: 'b4', emoji: '⭐', title: 'Superstar', earned: false },
    { id: 'b5', emoji: '🎨', title: 'Creative', earned: true },
    { id: 'b6', emoji: '🚀', title: 'Explorer', earned: false },
  ],
};
