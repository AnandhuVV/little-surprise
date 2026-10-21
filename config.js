// Everything personal lives here. Edit the text, drop photos into /photos, and you're done.
// {name} and {from} are replaced automatically anywhere they appear.

export const CONFIG = {
  name: "Sunshine",               // their name or a cute nickname
  from: "me",                     // how you sign off
  whatsappNumber: "",             // YOUR number for the reply button: country code + number, digits only (e.g. "97412345678")

  envelopeKicker: "psst… {name}",
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
      title: "Something I've noticed",
      text: "You have this way of making ordinary days feel a little softer. I don't think you even realise you do it.",
    },
    {
      emoji: "✨",
      title: "A tiny reminder",
      text: "You're so much more amazing than you give yourself credit for. Today is a very good day to believe it.",
    },
    {
      emoji: "🍰",
      title: "A birthday coupon",
      text: "Good for one dessert of your choice, on me. No expiry date, no questions asked. 🍦",
    },
  ],

  photosTitle: "a few favourite moments",
  photos: [
    { src: "photos/1.jpg", caption: "add a favourite photo here 📸" },
    { src: "photos/2.jpg", caption: "a day I still smile about" },
    { src: "photos/3.jpg", caption: "this one makes me laugh every time" },
    { src: "photos/4.jpg", caption: "the best kind of chaos" },
  ],

  letter: [
    "Hey {name},",
    "Happy birthday! 🎂",
    "I wanted to make you something a little different this year — something you could open, poke at, and hopefully smile at.",
    "Thank you for being the kind of person who makes everyone around them feel seen. Talking to you is honestly one of the best parts of my day.",
    "I hope this year is gentle with you, surprises you in all the best ways, and gives you back every bit of the happiness you give everyone else.",
    "Never stop being exactly you. ✨",
  ],
  signoff: "— with lots of warmth, {from}",

  endingTitle: "Happy Birthday, {name} 💜",
  endingPrompt: "If you feel like it… tell me what you wished for? ✨",
  replyButton: "send my wish 💌",
  replyText: "Okay okay, my birthday wish was… 🎂✨ ",
};
