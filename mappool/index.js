import WebSocketManager from "./deps/socket.js";

//TODO: remap variables from beatmap_data.json & check for maps not in mappool

window.addEventListener("contextmenu", (e) => e.preventDefault());

// START
let socket = new WebSocketManager("127.0.0.1:24050");
let axios = window.axios;
let user = {};

// NOW PLAYING
let mapContainer = document.getElementById("mapContainer");
let mapArtist = document.getElementById("mapName");
let mapInfo = document.getElementById("mapInfo");
let mapper = document.getElementById("mapper");
let stars = document.getElementById("stars");
let nowPlayingContainer = document.getElementById("nowPlayingContainer");
let stats = document.getElementById("stats");

// Chats
let chats = document.getElementById("chats");

// Avatar
let avaLeft = document.getElementById("avatarLeft");
let avaRight = document.getElementById("avatarRight");
let avaSet = 0;

// First Pick
let pickButtonR = document.getElementById("pickButtonR");
let pickButtonB = document.getElementById("pickButtonB");
let pickState = document.getElementById("pickState");

const beatmaps = new Set(); // Store beatmapID;

let tempUID;

let tempMapID, tempImg, tempMapArtist, tempMapTitle, tempMapDiff, tempMapper;

let tempSR, tempCS, tempAR, tempOD, tempHP;

let scoreLeftTemp, scoreRightTemp;
let teamNameLeftTemp, teamNameRightTemp;

let gameState;

let chatLen = 0;
let tempClass = "unknown";

let hasSetup = false;
let tempTempMapID;

let scoreLeft = [];
let scoreRight = [];

let tempLastPick = "Blue";

const mods = {
  NM: 0,
  HD: 1,
  HR: 2,
  DT: 3,
  FM: 4,
  RX: 4,
  AP: 6,
  TB: 7,
};

class Beatmap {
  constructor(mods, beatmapID, layerName) {
    this.mods = mods;
    this.beatmapID = beatmapID;
    this.layerName = layerName;
  }
  generate() {
    let mappoolContainer = document.getElementById(`${this.mods}`);

    this.clicker = document.createElement("div");
    this.clicker.id = `${this.layerName}-clicker`;

    mappoolContainer.appendChild(this.clicker);
    let clickerObj = document.getElementById(this.clicker.id);

    this.map = document.createElement("div");
    this.overlay = document.createElement("div");
    this.metadata = document.createElement("div");
    this.difficulty = document.createElement("div");
    this.modIcon = document.createElement("div");
    this.pickedStatus = document.createElement("div");

    this.map.id = `${this.layerName}-BG`;
    this.overlay.id = `${this.layerName}-overlay`;
    this.metadata.id = `${this.layerName}-metadata`;
    this.difficulty.id = `${this.layerName}-difficulty`;
    this.modIcon.id = `${this.layerName}-modicon`;
    this.pickedStatus.id = `${this.layerName}-status`;

    this.metadata.setAttribute("class", "mapInfo");
    this.difficulty.setAttribute("class", "mapInfo");
    this.map.setAttribute("class", "map");
    this.pickedStatus.setAttribute("class", "pickingStatus");
    this.overlay.setAttribute("class", "overlay");
    this.modIcon.setAttribute("class", "modIcon");
    this.modIcon.style.backgroundImage = `url("./static/${this.mods}.png")`;
    this.clicker.setAttribute("class", "clicker");
    clickerObj.appendChild(this.map);
    document.getElementById(this.map.id).appendChild(this.overlay);
    document.getElementById(this.map.id).appendChild(this.metadata);
    document.getElementById(this.map.id).appendChild(this.difficulty);
    clickerObj.appendChild(this.pickedStatus);
    clickerObj.appendChild(this.modIcon);

    this.clicker.style.transform = "translateY(0)";
  }
  grayedOut() {
    this.overlay.style.opacity = "1";
  }
  PickedOn(type) {
    this.pickedStatus.className = `picked${type}`;
    this.overlay.style.opacity = "0.5";
    this.metadata.style.opacity = "1";
    this.difficulty.style.opacity = "1";
    this.pickedStatus.innerHTML = "Picked";
  }
}

let bestOfTemp;
let scoreVisibleTemp;
let starsVisibleTemp;

let team1 = "Red",
  team2 = "Blue";

socket.api_v2((data) => {
  const leftTeamName = data.tourney.team.left !== "" ? data.tourney.team.left: "Red Team";
  const rightTeamName = data.tourney.team.right !== "" ? data.tourney.team.right: "Blue Team";

  if ((team1 !== leftTeamName && team2 !== rightTeamName) && (leftTeamName.length !== 0 && rightTeamName.length !== 0)) {
      team1 = leftTeamName;
      team2 = rightTeamName;
  }

  if (!hasSetup) setupBeatmaps();

  if (tempMapID !== data.beatmap.id) {
    tempMapID = data.beatmap.id;
    pickedOnManual(tempMapID);
  }

  if (teamNameLeftTemp !== leftTeamName) {
    teamNameLeftTemp = leftTeamName;
    pickButtonR.innerHTML = teamNameLeftTemp;
  }
  if (teamNameRightTemp !== rightTeamName) {
    teamNameRightTemp = rightTeamName;
    pickButtonB.innerHTML = teamNameRightTemp;
  }
});

pickButtonR.addEventListener("click", () => {
  pickState.innerHTML = "First Team to pick: " + pickButtonR.innerHTML;
  tempLastPick = "Blue";
});

pickButtonB.addEventListener("click", () => {
  pickState.innerHTML = "First Team to pick: " + pickButtonB.innerHTML;
  tempLastPick = "Red";
});

async function setupBeatmaps() {
  hasSetup = true;

  const modsCount = {
    NM: 0,
    HD: 0,
    HR: 0,
    DT: 0,
    FM: 0,
    RX: 0,
    AP: 0,
    TB: 0,
  };

  const bms = [];
  try {
    $.ajaxSetup({ cache: false });
    const jsonData = await $.getJSON(`beatmaps.json`);
    jsonData.map((beatmap) => {
      bms.push(beatmap);
    });

  } catch (error) {
    console.error("Could not read JSON file", error);
  }

  (function countMods() {
    bms.map((beatmap) => {
      modsCount[beatmap.mods]++;
    });
  })();

  let row = -1;
  let preMod = 0;
  let colIndex = 0;
  bms.map(async (beatmap, index) => {
    if (beatmap.mods !== preMod || colIndex % 3 === 0) {
      preMod = beatmap.mods;
      colIndex = 0;
      row++;
    }
    const bm = new Beatmap(
      beatmap.mods,
      beatmap.beatmapId,
      `id-${beatmap.beatmapId}`
    );
    bm.generate();
    // bm.clicker.onmouseover = function () {
    //   bm.clicker.style.transform = "translateY(-5px)";
    // };
    // bm.clicker.onmouseleave = function () {
    //   bm.clicker.style.transform = "translateY(0px)";
    // };
    bm.clicker.addEventListener("mousedown", function () {
      bm.clicker.addEventListener("click", function (event) {
        if (event.shiftKey) {
          bm.pickedStatus.className = "bannedRed";
          bm.overlay.style.opacity = "0.8";
          bm.metadata.style.opacity = "0.3";
          bm.difficulty.style.opacity = "0.3";
          bm.pickedStatus.innerHTML = `Banned by ${team1}`;
        } else if (event.ctrlKey) {
          bm.overlay.style.opacity = "0.5";
          bm.metadata.style.opacity = "1";
          bm.difficulty.style.opacity = "1";
          bm.pickedStatus.className = "pickedStatus";
          bm.pickedStatus.innerHTML = "";
        } else {
          bm.PickedOn("Red");
        }
      });
      bm.clicker.addEventListener("contextmenu", function (event) {
        if (event.shiftKey) {
          bm.pickedStatus.className = "bannedBlue";
          bm.overlay.style.opacity = "0.8";
          bm.metadata.style.opacity = "0.3";
          bm.difficulty.style.opacity = "0.3";
          bm.pickedStatus.innerHTML = `Banned by ${team2}`;
        } else if (event.ctrlKey) {
          bm.overlay.style.opacity = "0.5";
          bm.metadata.style.opacity = "1";
          bm.difficulty.style.opacity = "1";
          bm.pickedStatus.className = "pickedStatus";
          bm.pickedStatus.innerHTML = "";
        } else {
          bm.PickedOn("Blue");
        }
      });
    });
    const mapData = await getDataSet(beatmap.beatmapId);
    bm.map.style.backgroundImage = `url('${mapData.coverURL}')`;
    bm.metadata.innerHTML = mapData.artist + " - " + mapData.title;
    bm.difficulty.innerHTML =
      `[${mapData.version}]` + "&emsp;&emsp;Mapper: " + mapData.creator;
    beatmaps.add(bm);
  });
}

async function getDataSet(beatmapID) {
  try {
    const data = (await axios.get(`https://tryz.vercel.app/api/b/${beatmapID}`))
      .data;
    const diff = data.beatmaps.filter((diff) => diff.id === beatmapID).shift();

    return {
      coverURL: data.covers["cover@2x"],
      artist: data.artist,
      title: data.title,
      version: diff.version,
      creator: data.creator,
    };
  } catch (error) {
    console.error(error);
  }
}

let pickedOnManual = (id) => {
  tempLastPick = tempLastPick === "Red" ? "Blue" : "Red";
  if (document.getElementById(`id-${id}-clicker`)) {
    let pickedStatus = document.getElementById(`id-${id}-status`);
    let overlay = document.getElementById(`id-${id}-overlay`);
    let metadata = document.getElementById(`id-${id}-metadata`);
    let difficulty = document.getElementById(`id-${id}-difficulty`);

    pickedStatus.className = `picked${tempLastPick}`;
    overlay.style.opacity = "0.5";
    metadata.style.opacity = "1";
    difficulty.style.opacity = "1";
    pickedStatus.innerHTML = "Picked";
  }
};
