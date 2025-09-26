Made with ❤️ for Peppe.
# TI AMO AYICIGIM BENIMMM 

# Spotify Playlist Cleaner

A simple web application that helps you clean up your Spotify playlists by letting you quickly decide which songs to keep or remove.

## Features

- 🎵 Connect to your Spotify account
- 📋 Browse all your playlists and liked songs
- 👆 Simple keep/remove interface for each song
- ⚡ Batch removal of unwanted tracks
- 📱 Responsive design


## Setup

### Prerequisites

- A Spotify account
- Python 3 (for local development server)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/spotify-playlist-cleaner.git
   cd spotify-playlist-cleaner
   ```

2. **Create a Spotify App:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Click "Create an App"
   - Add redirect URI: `http://127.0.0.1:5500/`
   - Note your Client ID

3. **Configure the app:**
   - Open `script.js`
   - Replace `YOUR_SPOTIFY_CLIENT_ID_HERE` with your actual Client ID

4. **Start local server:**
   ```bash
   python3 -m http.server 3000
   ```

5. **Open your browser:**
   - Navigate to `http://127.0.0.1:3000`
   - Click "Connect to Spotify"
   - Authorize the application

## Usage

1. **Connect your Spotify account** by clicking the login button
2. **Select a playlist** from the dropdown menu
3. **Review each song** - click "Keep" or "Remove"
4. **Finish cleaning** - removed songs will be deleted from your playlist

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **API**: Spotify Web API
- **Authentication**: OAuth 2.0 with PKCE

## Project Structure

```
spotify-playlist-cleaner/
├── index.html          # Main application interface
├── style.css           # Styling and layout
├── script.js           # JavaScript logic and API calls
├── .gitignore         # Git ignore rules
└── README.md          # Project documentation
```

## API Permissions

This app requires the following Spotify scopes:
- `playlist-read-private` - Read your private playlists
- `playlist-modify-private` - Modify your private playlists
- `playlist-modify-public` - Modify your public playlists
- `user-library-read` - Read your liked songs
- `user-library-modify` - Modify your liked songs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Troubleshooting

### "Invalid Client" Error
- Make sure your redirect URI in Spotify Dashboard matches exactly: `http://127.0.0.1:3000/`
- Ensure your Client ID is correctly set in `script.js`

### Local Server Issues
- Try a different port: `python3 -m http.server 8000`
- Update redirect URI accordingly

### Browser Compatibility
- Recommended: Chrome, Firefox, Safari
- Enable popups for localhost

## Future Enhancements

- [ ] Add undo functionality
- [ ] Implement song preview playback
- [ ] Bulk operations across multiple playlists
- [ ] Export removed songs list
- [ ] Mobile app version

---



