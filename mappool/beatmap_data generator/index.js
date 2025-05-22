// get your APIv1 key from https://osu.ppy.sh/home/account/edit#legacy-api
const API_KEY = "YOUR_API_KEY_GOES_HERE";

const axios = require("axios");
const fs = require("fs");

const dataArr = fs.readFileSync("../beatmaps.txt", "utf-8").split("\n").filter(line => {
  return !(line.trim().startsWith("#") || line.trim() === "");
});

// No SR change -> enum = 0
const modEnums = {
  NM: 0,
  EZ: 2,
  HD: 8,
  HR: 16,
  SD: 32,
  DT: 64,
  RX: 0,
  HT: 256,
  FL: 1024,
  AP: 0,
  TB: 0,
};

function extractData(data) {
  let modCount = parseInt(data[0])
  let mods = []
  for (let i = 1; i <= modCount; i++)
    mods.push(data[i].split(" "));

  let output = new Map();
  let i = modCount + 1;
  for (const mod of mods) {
    let modName = mod[0];
    let count = parseInt(mod[1]);
    for (let j = 0; j < count; j++) {
      output.set(parseInt(data[i]), modName);
      i++;
    }
  }
  return output;
}

function cap(input, cap) {
  if (input > cap) return cap;
  return input;
}

function getEnumValue(enumString) {
  return modEnums[enumString] !== undefined
    ? modEnums[enumString]
    : "Unknown enum string";
}

function secondsToMMSS(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

function difficultyCalculate(data, mod) {
  let bpm = data.bpm;
  let cs = data.diff_size;
  let ar = data.diff_approach;
  let od = data.diff_overall;
  let hp = data.diff_drain;
  let drain = data.hit_length;
  let length = data.total_length;

  // if EZ
  if (mod & 2) {
    cs = cs / 2;
    ar = ar / 2;
    od = od / 2;
    hp = hp / 2;
  }
  // if HR
  if (mod & 16) {
    cs = cap(cs * 1.3, 10);
    ar = cap(ar * 1.4, 10);
    od = cap(od * 1.4, 10);
    hp = cap(hp * 1.4, 10);
  }
  // if DT/NC
  if (mod & 64 || mod & 512) {
    if (ar > 5) ar = (1200 - ((1200 - (ar - 5) * 150) * 2) / 3) / 150 + 5;
    else ar = (1800 - ((1800 - ar * 120) * 2) / 3) / 120;
    od = (79.5 - ((79.5 - 6 * od) * 2) / 3) / 6;
    bpm = bpm * 1.5;
    drain = drain / 1.5;
    length = length / 1.5;
  }
  // if HT
  if (mod & 256) {
    if (ar > 5) ar = (1200 - ((1200 - (ar - 5) * 150) * 4) / 3) / 150 + 5;
    else ar = (1800 - ((1800 - ar * 120) * 4) / 3) / 120;
    od = (79.5 - ((79.5 - 6 * od) * 4) / 3) / 6;
    bpm = bpm * 0.75;
    drain = drain * 1.5;
    length = length * 1.5;
  }
  return { cs, ar, od, hp, bpm, drain, length };
}

(async () => {
  let dataMap = extractData(dataArr);
  const dataOut = [];

  for (const [mapID, mod] of dataMap) {
    console.log(
      `Getting map details for ID = ${mapID} & mod = ${mod}`
    );
    const data = (
      await axios.get(`/get_beatmaps`, {
        baseURL: "https://osu.ppy.sh/api",
        params: {
          k: API_KEY,
          b: mapID,
          mods: getEnumValue(mod),
        },
      })
    ).data[0];

    const { cs, ar, od, hp, bpm, drain, length } = difficultyCalculate(
      data,
      getEnumValue(mod)
    );

    dataOut.push({
      mods: mod,
      set_id: Number(data.beatmapset_id),
      map_id: Number(data.beatmap_id),
      artist: data.artist,
      title: data.title,
      diff_name: data.version,
      mapper: data.creator,
      cs: parseFloat(Number(cs).toFixed(1)),
      ar: parseFloat(Number(ar).toFixed(1)),
      od: parseFloat(Number(od).toFixed(1)),
      drain: secondsToMMSS(drain),
      bpm: Number(bpm),
      sr: parseFloat(Number(data.difficultyrating).toFixed(2)),
    });
  }

  fs.writeFileSync(
    "../beatmap_data.json",
    JSON.stringify(dataOut, null, "\t"),
    "utf-8"
  );

  console.log("Successfully generated JSON data file");
})();
