// ---------------- Spotify Config ----------------
const CLIENT_ID = "58a7cdff6fed430abee2cba6a3d2eb88";
const REDIRECT_URI = "http://127.0.0.1:5500/";  // must match Spotify Dashboard
const SCOPES = "playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify";

// ---------------- State ----------------
let accessToken = "";
let currentPlaylist = [];
let currentSongIndex = 0;
let songsToRemove = [];
let actionHistory = []; // for undo

// ---------------- DOM ----------------
const loginBtn = document.getElementById("login-btn");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const playlistDropdown = document.getElementById("playlist-dropdown");
const songCard = document.getElementById("song-card");
const albumArt = document.getElementById("album-art");
const songTitle = document.getElementById("song-title");
const artistName = document.getElementById("artist-name");
const removeBtn = document.getElementById("remove-btn");
const keepBtn = document.getElementById("keep-btn");
const undoBtn = document.getElementById("undo-btn");
const currentSongSpan = document.getElementById("current-song");
const totalSongsSpan = document.getElementById("total-songs");

// ---------------- Events ----------------
loginBtn.addEventListener("click", startAuth);
playlistDropdown.addEventListener("change", loadPlaylist);
removeBtn.addEventListener("click", () => handleSongDecision(false));
keepBtn.addEventListener("click", () => handleSongDecision(true));
undoBtn.addEventListener("click", undoLastAction);

// ---------------- Auth (PKCE Flow) ----------------
async function startAuth() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);
  localStorage.setItem("code_verifier", codeVerifier);

  const authUrl = "https://accounts.spotify.com/authorize" +
    `?response_type=code` +
    `&client_id=${CLIENT_ID}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${codeChallenge}`;

  window.location.href = authUrl;
}

// Run after redirect back from Spotify
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    const codeVerifier = localStorage.getItem("code_verifier");

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const data = await response.json();
    if (data.access_token) {
      accessToken = data.access_token;

      window.history.replaceState({}, document.title, "/"); // clean URL
      showApp();
      loadUserPlaylists();
    } else {
      console.error("Token exchange failed:", data);
      alert("Authentication failed. Try again.");
    }
    return;
  }

  showLogin();
});

// ---------------- Auth Helpers ----------------
function generateRandomString(length) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function pkceChallengeFromVerifier(v) {
  const encoder = new TextEncoder();
  const data = encoder.encode(v);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------------- UI Control ----------------
function showLogin() {
  loginSection.style.display = "block";
  appSection.style.display = "none";
}

function showApp() {
  loginSection.style.display = "none";
  appSection.style.display = "block";
}

// ---------------- Spotify API ----------------
async function loadUserPlaylists() {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/playlists", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    playlistDropdown.innerHTML = '<option value="">Select a playlist</option>';

    // Add Liked Songs option
    const likedOption = document.createElement("option");
    likedOption.value = "liked";
    likedOption.textContent = "Liked Songs";
    playlistDropdown.appendChild(likedOption);

    // Add playlists
    data.items.forEach(pl => {
      const opt = document.createElement("option");
      opt.value = pl.id;
      opt.textContent = pl.name;
      playlistDropdown.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading playlists:", err);
    alert("Could not load playlists.");
  }
}

async function loadPlaylist() {
  const playlistId = playlistDropdown.value;
  if (!playlistId) return;

  try {
    let endpoint;
    if (playlistId === "liked") {
      endpoint = "https://api.spotify.com/v1/me/tracks?limit=50";
    } else {
      endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
    }

    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    currentPlaylist = data.items;
    currentSongIndex = 0;
    songsToRemove = [];
    actionHistory = [];
    totalSongsSpan.textContent = currentPlaylist.length;

    if (currentPlaylist.length > 0) {
      showCurrentSong();
      songCard.style.display = "block";
    } else {
      alert("This playlist is empty!");
    }
  } catch (err) {
    console.error("Error loading playlist:", err);
    alert("Could not load playlist.");
  }
}

// ---------------- Song Navigation ----------------
function showCurrentSong() {
  if (currentSongIndex >= currentPlaylist.length) {
    finishCleaning();
    return;
  }

  const song = currentPlaylist[currentSongIndex].track;
  albumArt.src = song.album.images[0]?.url || "";
  songTitle.textContent = song.name;
  artistName.textContent = song.artists.map(a => a.name).join(", ");
  currentSongSpan.textContent = currentSongIndex + 1;
}

function handleSongDecision(keep) {
  const songData = currentPlaylist[currentSongIndex];

  // Save to history
  actionHistory.push({ song: songData, index: currentSongIndex, keep });

  if (!keep) songsToRemove.push(songData);

  currentSongIndex++;
  showCurrentSong();

  undoBtn.style.display = "inline-block";
}

function undoLastAction() {
  if (actionHistory.length === 0) return;

  const lastAction = actionHistory.pop();
  currentSongIndex = lastAction.index;

  if (!lastAction.keep) {
    songsToRemove = songsToRemove.filter(
      s => s.track.id !== lastAction.song.track.id
    );
  }

  showCurrentSong();
  if (actionHistory.length === 0) undoBtn.style.display = "none";
}

// ---------------- Finish ----------------
async function finishCleaning() {
  if (songsToRemove.length === 0) {
    alert("No songs to remove!");
    return;
  }

  const playlistId = playlistDropdown.value;
  try {
    if (playlistId === "liked") {
      for (const song of songsToRemove) {
        await fetch(`https://api.spotify.com/v1/me/tracks?ids=${song.track.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
    } else {
      const tracks = songsToRemove.map(s => ({ uri: s.track.uri }));
      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tracks })
      });
    }

    alert(`Removed ${songsToRemove.length} songs!`);
    songCard.style.display = "none";
    undoBtn.style.display = "none";
  } catch (err) {
    console.error("Error removing songs:", err);
    alert("Could not remove songs.");
  }
}
