// Spotify API configuration
const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID_HERE';
const REDIRECT_URI = 'http://127.0.0.1:3000/';
const SCOPES = 'playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify';

let accessToken = '';
let currentPlaylist = [];
let currentSongIndex = 0;
let songsToRemove = [];

// DOM elements
const loginBtn = document.getElementById('login-btn');
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const playlistDropdown = document.getElementById('playlist-dropdown');
const songCard = document.getElementById('song-card');
const albumArt = document.getElementById('album-art');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const removeBtn = document.getElementById('remove-btn');
const keepBtn = document.getElementById('keep-btn');
const currentSongSpan = document.getElementById('current-song');
const totalSongsSpan = document.getElementById('total-songs');

// Event listeners
loginBtn.addEventListener('click', loginToSpotify);
playlistDropdown.addEventListener('change', loadPlaylist);
removeBtn.addEventListener('click', () => handleSongDecision(false));
keepBtn.addEventListener('click', () => handleSongDecision(true));

// Check if we're returning from Spotify auth
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const token = getTokenFromUrl();
    
    if (code) {
        // Handle authorization code flow
        exchangeCodeForToken(code);
    } else if (token) {
        // Handle implicit flow (fallback)
        accessToken = token;
        showApp();
        loadUserPlaylists();
    }
});

// PKCE helper functions
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function loginToSpotify() {
    try {
        // Try PKCE flow first
        const codeVerifier = generateRandomString(128);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateRandomString(16);
        
        localStorage.setItem('code_verifier', codeVerifier);
        localStorage.setItem('spotify_auth_state', state);
        
        const authUrl = `https://accounts.spotify.com/authorize?` +
            `client_id=${CLIENT_ID}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
            `scope=${encodeURIComponent(SCOPES)}&` +
            `code_challenge_method=S256&` +
            `code_challenge=${codeChallenge}&` +
            `state=${state}`;
        
        console.log('Using PKCE Auth URL:', authUrl);
        window.location.href = authUrl;
    } catch (error) {
        console.error('PKCE not supported, falling back to implicit flow:', error);
        
        // Fallback to implicit flow
        const state = generateRandomString(16);
        localStorage.setItem('spotify_auth_state', state);
        
        const authUrl = `https://accounts.spotify.com/authorize?` +
            `client_id=${CLIENT_ID}&` +
            `response_type=token&` +
            `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
            `scope=${encodeURIComponent(SCOPES)}&` +
            `state=${state}&` +
            `show_dialog=true`;
        
        console.log('Fallback Auth URL:', authUrl);
        window.location.href = authUrl;
    }
}

async function exchangeCodeForToken(code) {
    const codeVerifier = localStorage.getItem('code_verifier');
    
    if (!codeVerifier) {
        console.error('No code verifier found');
        return;
    }
    
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier
            })
        });
        
        const data = await response.json();
        
        if (data.access_token) {
            accessToken = data.access_token;
            localStorage.removeItem('code_verifier');
            localStorage.removeItem('spotify_auth_state');
            
            // Clean URL
            window.history.replaceState({}, document.title, '/');
            
            showApp();
            loadUserPlaylists();
        } else {
            console.error('Token exchange failed:', data);
            alert('Authentication failed. Please try again.');
        }
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        alert('Authentication failed. Please try again.');
    }
}

function getTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        const state = params.get('state');
        const storedState = localStorage.getItem('spotify_auth_state');
        
        // Verify state for security
        if (state === storedState && token) {
            localStorage.removeItem('spotify_auth_state');
            // Clear the hash from URL
            window.location.hash = '';
            return token;
        }
    }
    return null;
}

function showApp() {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
}

async function loadUserPlaylists() {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Clear existing options
        playlistDropdown.innerHTML = '<option value="">Select a playlist</option>';
        
        // Add "Liked Songs" option
        const likedOption = document.createElement('option');
        likedOption.value = 'liked';
        likedOption.textContent = 'Liked Songs';
        playlistDropdown.appendChild(likedOption);
        
        // Add user playlists
        data.items.forEach(playlist => {
            const option = document.createElement('option');
            option.value = playlist.id;
            option.textContent = playlist.name;
            playlistDropdown.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading playlists:', error);
        alert('Error loading playlists. Please try logging in again.');
    }
}

async function loadPlaylist() {
    const playlistId = playlistDropdown.value;
    if (!playlistId) return;
    
    try {
        let endpoint;
        if (playlistId === 'liked') {
            endpoint = 'https://api.spotify.com/v1/me/tracks?limit=50';
        } else {
            endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
        }
        
        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentPlaylist = data.items;
        currentSongIndex = 0;
        songsToRemove = [];
        
        totalSongsSpan.textContent = currentPlaylist.length;
        
        if (currentPlaylist.length > 0) {
            showCurrentSong();
            songCard.style.display = 'block';
        } else {
            alert('This playlist is empty!');
        }
        
    } catch (error) {
        console.error('Error loading playlist:', error);
        alert('Error loading playlist. Please try again.');
    }
}

function showCurrentSong() {
    if (currentSongIndex >= currentPlaylist.length) {
        finishCleaning();
        return;
    }
    
    const song = currentPlaylist[currentSongIndex].track;
    
    albumArt.src = song.album.images[0]?.url || '';
    songTitle.textContent = song.name;
    artistName.textContent = song.artists.map(a => a.name).join(', ');
    currentSongSpan.textContent = currentSongIndex + 1;
}

function handleSongDecision(keep) {
    if (!keep) {
        songsToRemove.push(currentPlaylist[currentSongIndex]);
    }
    
    currentSongIndex++;
    showCurrentSong();
}

async function finishCleaning() {
    if (songsToRemove.length === 0) {
        alert('No songs to remove!');
        return;
    }
    
    const playlistId = playlistDropdown.value;
    
    try {
        if (playlistId === 'liked') {
            // Remove from liked songs
            for (const song of songsToRemove) {
                await fetch(`https://api.spotify.com/v1/me/tracks?ids=${song.track.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
            }
        } else {
            // Remove from playlist
            const tracks = songsToRemove.map(song => ({
                uri: song.track.uri
            }));
            
            await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tracks })
            });
        }
        
        alert(`Removed ${songsToRemove.length} songs!`);
        songCard.style.display = 'none';
        
    } catch (error) {
        console.error('Error removing songs:', error);
        alert('Error removing songs. Please try again.');
    }
}