const fs = require('fs');
const path = require('path');
const https = require('https');

const sounds = [
  { name: 'fahhhhhhh', url: 'https://www.myinstants.com/media/sounds/fahhhhhhhhhhhhhh.mp3' },
  { name: 'vine-boom', url: 'https://www.myinstants.com/media/sounds/vine-boom.mp3' },
  { name: 'faaah', url: 'https://www.myinstants.com/media/sounds/faaah.mp3' },
  { name: 'fart', url: 'https://www.myinstants.com/media/sounds/dry-fart.mp3' },
  { name: 'fahhh-alt', url: 'https://www.myinstants.com/media/sounds/fahhh_KcgAXfs.mp3' },
  { name: 'rizz-effect', url: 'https://www.myinstants.com/media/sounds/rizz-sound-effect.mp3' },
  { name: 'chicken-screaming', url: 'https://www.myinstants.com/media/sounds/chicken-on-tree-screaming.mp3' },
  { name: 'among-us-role', url: 'https://www.myinstants.com/media/sounds/among-us-role-reveal-sound.mp3' },
  { name: 'phone-ringing', url: 'https://www.myinstants.com/media/sounds/youre-phone-is-ringing.mp3' },
  { name: 'anime-wow', url: 'https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3' },
  { name: 'granny-bazooka', url: 'https://www.myinstants.com/media/sounds/rip-my-granny-she-got-hit-by-a-bazooka.mp3' },
  { name: 'ive-got-this-faaaaaah', url: 'https://www.myinstants.com/media/sounds/ive-got-this-faaaaaaaaahhhhh.mp3' },
  { name: 'apple-pay', url: 'https://www.myinstants.com/media/sounds/applepay.mp3' },
  { name: 'bone-crack', url: 'https://www.myinstants.com/media/sounds/bone-crack.mp3' },
  { name: 'spongebob-fail', url: 'https://www.myinstants.com/media/sounds/spongebob-fail.mp3' },
  { name: 'metal-pipe-clang', url: 'https://www.myinstants.com/media/sounds/metal-pipe-clang.mp3' },
  { name: 'lizard-button', url: 'https://www.myinstants.com/media/sounds/lizard-button.mp3' },
  { name: 'dexter-meme', url: 'https://www.myinstants.com/media/sounds/dexter-meme.mp3' },
  { name: 'what-a-good-boy', url: 'https://www.myinstants.com/media/sounds/what-a-good-boy.mp3' },
  { name: 'fart-button', url: 'https://www.myinstants.com/media/sounds/perfect-fart.mp3' },
  { name: 'hub-intro', url: 'https://www.myinstants.com/media/sounds/hub-intro-sound.mp3' },
  { name: 'ack', url: 'https://www.myinstants.com/media/sounds/ack.mp3' },
  { name: 'diddy-blud', url: 'https://www.myinstants.com/media/sounds/what-is-this-diddy-blud-doing-on-the.mp3' },
  { name: 'romance', url: 'https://www.myinstants.com/media/sounds/romanceeeeeeeeeeeeee.mp3' },
  { name: 'movie-bruh', url: 'https://www.myinstants.com/media/sounds/movie_1.mp3' },
  { name: 'tuco-get-out', url: 'https://www.myinstants.com/media/sounds/tuco-get-out.mp3' },
  { name: 'charlie-kirk-phone', url: 'https://www.myinstants.com/media/sounds/we-are-charlie-kirk-phone.mp3' },
  { name: 'undertaker-bell', url: 'https://www.myinstants.com/media/sounds/undertakers-bell_2UwFCIe.mp3' },
  { name: 'charlie-kirk-loud', url: 'https://www.myinstants.com/media/sounds/we-are-charlie-kirk-loud-asf.mp3' },
  { name: 'smoke-detector-beep', url: 'https://www.myinstants.com/media/sounds/smoke-detector-beep.mp3' },
  // Indian sounds
  { name: 'so-beautiful', url: 'https://www.voicy.network/Content/Clips/Sound/64b5460e-7507-4e08-920b-31d553b7ba0b.mp3' },
  { name: 'wah-sab-ji-wah', url: 'https://www.voicy.network/Content/Clips/Sound/4778dd3b-2381-4a59-966e-9726a07459f0.mp3' },
  { name: 'ye-baburao-ka-style-hai', url: 'https://www.voicy.network/Content/Clips/Sound/634ada7b-554e-4cff-81fa-e156262916d5.mp3' },
  { name: 'uthale-re-deva', url: 'https://www.voicy.network/Content/Clips/Sound/2ea6001c-0f51-4349-8765-6de797652d21.mp3' },
  { name: 'are-kehna-kya-chahte-ho', url: 'https://www.voicy.network/Content/Clips/Sound/abc8af71-912a-48d6-8a24-a8ce6717fc8f.mp3' },
  { name: 'he-prabhu', url: 'https://www.voicy.network/Content/Clips/Sound/1098a8b8-1c49-4289-bb25-8d6b23c24357.mp3' },
  { name: 'ai-baigan', url: 'https://www.voicy.network/Content/Clips/Sound/2ce26832-24e9-469a-a40d-4820a290c5d8.mp3' },
  { name: 'wo-bulati-hai-magar', url: 'https://www.voicy.network/Content/Clips/Sound/37bdf8d7-3673-44f8-a2b6-213f024aa125.mp3' },
  { name: 'awaz-nichy', url: 'https://www.voicy.network/Content/Clips/Sound/143284a0-5b1c-4423-ab5e-3063c565dd82.mp3' },
  { name: 'rahul-gandhi-aloo-sona', url: 'https://www.voicy.network/Content/Clips/Sound/bff43276-2b61-464b-b73a-d3ec4194046e.mp3' },
  { name: 'paisa-hi-paisa', url: 'https://www.voicy.network/Content/Clips/Sound/b2b92514-6733-47b9-87fd-d554dbedb073.mp3' },
  { name: 'golmaal-hai-bhai', url: 'https://www.voicy.network/Content/Clips/Sound/8cce8c67-8d05-4f0e-bfaa-ae57bc5e6a29.mp3' },
  { name: 'aayein-meme', url: 'https://www.myinstants.com/media/sounds/aayein-meme.mp3' },
  { name: 'chalti-firti-cocaine', url: 'https://www.myinstants.com/media/sounds/chalti-firti-cocaine.mp3' },
  { name: 'america-kya-kehta-tha', url: 'https://www.myinstants.com/media/sounds/america-kya-kehta-tha.mp3' }
];

const soundsDir = path.resolve('p:/Projects/Sound Board/sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

async function download(sound) {
  const filePath = path.join(soundsDir, `${sound.name}.mp3`);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(sound.url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
          https.get(response.headers.location, (res) => {
              res.pipe(file);
              file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${sound.name}`);
                resolve();
              });
          }).on('error', (err) => {
              fs.unlink(filePath, () => reject(err));
          });
          return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${sound.name}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => reject(err));
    });
  });
}

(async () => {
  for (const sound of sounds) {
    try {
      await download(sound);
    } catch (err) {
      console.error(`Failed to download ${sound.name}: ${err.message}`);
    }
  }
})();
