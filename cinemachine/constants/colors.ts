export const Colors = {
  orange: '#FF8C42',
  orangeLight: '#FFB380',
  cream: '#FFF8F0',
  golden: '#F5C542',
  salmon: '#F5A08C',
  skyBlue: '#5BC0EB',
  navy: '#1B2845',
  white: '#FFFFFF',
  black: '#000000',

  // Grays
  gray100: '#F7F7F7',
  gray200: '#E8E8E8',
  gray300: '#D1D1D1',
  gray400: '#A0A0A0',
  gray500: '#6B6B6B',

  // Semantic
  recording: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',

  // Gradients (as tuples for LinearGradient)
  gradientSunset: ['#FF8C42', '#F5A08C'] as const,
  gradientOcean: ['#5BC0EB', '#1B2845'] as const,
  gradientGolden: ['#F5C542', '#FF8C42'] as const,
  gradientForest: ['#34C759', '#5BC0EB'] as const,
  gradientBerry: ['#E040FB', '#F5A08C'] as const,
  gradientNight: ['#1B2845', '#5BC0EB'] as const,
};

export const StoryGradients = [
  Colors.gradientSunset,
  Colors.gradientOcean,
  Colors.gradientGolden,
  Colors.gradientForest,
  Colors.gradientBerry,
  Colors.gradientNight,
];
