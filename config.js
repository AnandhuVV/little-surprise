// Everything personal lives here. Edit the text, drop photos into /photos, and you're done.
// {name} and {from} are replaced automatically anywhere they appear.

export const CONFIG = {
  name: "Anu",                    // their name or a cute nickname
  from: "Kuttu",                  // how you sign off

  envelopeKicker: "to, {name}",
  envelopeTitle: "you've got mail 💌",
  envelopeCard: "this one's all about you ✨",

  darkHint: "hmm… it's a little dark in here 🙈",
  popPrompt: "pop the balloons to turn on the lights 🎈",
  popMore2: "ooh ✨ two more…",
  popMore1: "one more… 🎈",

  cakeTitle: "Happy Birthday, {name}!",
  lightPrompt: "tap the cake to light your candles ✨",
  wishPrompt: "now close your eyes, make a wish… open your eyes and tap the cake 💜",
  afterWish: "may every single wish find its way to you 💜",
  afterWish2: "and may every moment, this year and always, stay lit ✨",

  giftsTitle: "I got you a few little things",
  gifts: [
    {
      emoji: "🌷",
      title: "To the one I always care about",
      text: "Some people make ordinary days a little brighter just by being in them. You're one of those people 🌷",
    },
    {
      emoji: "✨",
      title: "Remember this",
      text: "You deserve all the care and kindness you give to everyone else, and a little extra on your birthday ✨",
    },
    {
      emoji: "🛍️",
      title: "A little birthday treat",
      text: "Treat yourself to something that makes you smile. And the dessert is still on me 🍦",
      voucher: true,   // shows the real gift card, sealed in assets/gift.bin by private/seal_gift.mjs
    },
  ],

  photosTitle: "favourites of you",
  // Her photos are private, so they're stored encrypted (photos/N.bin) and only open with the key in her link.
  // To change them: put the originals in private/originals (1.jpg, 2.png…), run  python3 private/seal_photos.py
  // then  node private/seal_photos.mjs , and keep one entry per photo here.
  // If a face gets cut off, add  focus: "top"  (or e.g. "50% 15%") to that photo to move the crop.
  photos: [
    { src: "photos/1.bin", caption: "🌸" },
    { src: "photos/2.bin", caption: "🎉" },
    { src: "photos/3.bin", caption: "✨" },
    { src: "photos/4.bin", caption: "🌙", focus: "50% 0%" },
    { src: "photos/5.bin", caption: "💜" },
    { src: "photos/6.bin", caption: "🤍" },
  ],
  photosDone: "here's to many more smiles 💜",   // shown once she's gone through them all

  letter: [
    "For {name},",
    "Happy birthday! 🎂",
    "I wanted to do something a little different, so I made you this. I hope it made you smile at least once. Okay, maybe twice 😄",
    "Thank you for all the chats, the laughs and the random little moments. They've made so many of my days better.",
    "Keep smiling the way you do. It really suits you ✨",
  ],
  signoff: "Always, {from} 💜",

  endingTitle: "Happy Birthday, Undappi 💜",   // the nickname only here, on the last screen
  endingPrompt: "I hope this year is every bit as lovely as you are ✨",
};
