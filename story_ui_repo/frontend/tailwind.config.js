/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        investigator: {
          bg: "#11100F",
          desk: "#161311",
          surface: "#1D1A18",
          surfaceLight: "#272320",
          border: "#38312B",
          borderLight: "#4E443C",
          parchment: "#C9B99B",
          parchmentLight: "#E8DECD",
          parchmentCard: "#DFD2BE",
          parchmentDark: "#A8987E",
          paperText: "#332A22",
          paperMuted: "#66584C",
          brass: "#C49A61",
          brassLight: "#E0B77D",
          brassDark: "#8E6936",
          redInk: "#A82E25",
          redStamp: "#B4473E",
          oliveStamp: "#78966A",
          cyanGaze: "#4EA8A1",
        }
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        cinzel: ["'Cinzel'", "serif"],
        typewriter: ["'Courier Prime'", "'Courier New'", "monospace"],
        handwriting: ["'Caveat'", "cursive"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'clipboard': '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(196, 154, 97, 0.15)',
        'polaroid': '0 12px 28px -5px rgba(0, 0, 0, 0.65), 0 2px 6px -1px rgba(0, 0, 0, 0.4)',
        'dossier': '0 20px 40px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'metal-clip': '0 8px 16px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'desk-radial': 'radial-gradient(circle at 50% 25%, #241E1A 0%, #11100F 75%, #0B0A09 100%)',
        'paper-texture': 'radial-gradient(#b8a483 1px, transparent 1px), radial-gradient(#b8a483 1px, #C9B99B 1px)',
        'metal-gradient': 'linear-gradient(180deg, #A8A8A8 0%, #686868 40%, #444444 60%, #888888 100%)',
        'brass-gradient': 'linear-gradient(180deg, #F1D49B 0%, #C49A61 50%, #856130 100%)',
      }
    },
  },
  plugins: [],
}
