// Everything personal lives here. Edit the text, drop photos into /photos, and you're done.
// {name} and {from} are replaced automatically anywhere they appear.

export const CONFIG = {
  name: "Undappi",                // their name or a cute nickname
  from: "Kuttu",                  // how you sign off

  envelopeKicker: "to, {name}",
  envelopeTitle: "you've got mail 💌",
  envelopeCard: "today is all about you ✨",

  darkHint: "hmm… it's a little dark in here 🙈",
  popPrompt: "pop the balloons to turn on the lights 🎈",
  popMore2: "ooh ✨ two more…",
  popMore1: "one more… 🎈",

  cakeTitle: "Happy Birthday, {name}!",
  wishPrompt: "close your eyes, make a wish… then tap the cake to blow out the candles ✨",
  afterWish: "I hope every single wish comes true 💜",

  giftsTitle: "I got you a few little things",
  gifts: [
    {
      emoji: "🌷",
      title: "To the one I always care about",
      text: "On the busy days and the quiet ones, I'm always rooting for you. Whatever this year brings, I hope you know there's someone in your corner.",
    },
    {
      emoji: "✨",
      title: "Remember this",
      text: "You take care of everyone around you, so please take care of yourself too. Eat on time, rest when you're tired, and go easy on yourself. You deserve the same kindness you give.",
    },
    {
      emoji: "🍰",
      title: "A birthday coupon",
      text: "Good for one dessert of your choice, on me. No expiry date, no questions asked. 🍦",
    },
  ],

  photosTitle: "a few favourite pictures of you",
  // Her photos are private, so they're stored encrypted (photos/N.bin) and only open with the key in her link.
  // To change them: put the originals in private/originals (1.jpg, 2.png…), run  python3 private/seal_photos.py
  // then  node private/seal_photos.mjs , and keep one entry per photo here.
  // If a face gets cut off, add  focus: "top"  (or e.g. "50% 15%") to that photo to move the crop.
  photos: [
    { src: "photos/1.bin", caption: "that smile 🌸" },
    { src: "photos/2.bin", caption: "the birthday girl 🎉" },
    { src: "photos/3.bin", caption: "main character energy ✨" },
    { src: "photos/4.bin", caption: "glowing, even at night 🌙", focus: "50% 0%" },
    { src: "photos/5.bin", caption: "effortlessly lovely 💜" },
    { src: "photos/6.bin", caption: "and that laugh 🤍" },
  ],
  photosDone: "here's to many more smiles 💜",   // shown once she's gone through them all

  letter: [
    "For {name},",
    "Happy birthday! 🎂",
    "I wanted to make you something a little different this year — something you could open, poke at, and hopefully smile at.",
    "Thank you for being the kind of person who makes everyone around them feel seen. Talking to you is honestly one of the best parts of my day.",
    "I hope this year is gentle with you, surprises you in all the best ways, and gives you back every bit of the happiness you give everyone else.",
    "Never stop being exactly you. ✨",
  ],
  signoff: "— with lots of warmth, {from}",

  endingTitle: "Happy Birthday, {name} 💜",
  endingPrompt: "I hope today is every bit as lovely as you are ✨",
};
