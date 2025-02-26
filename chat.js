let conversationHistory = [];
const youtubeApiKey = 'AIzaSyDuTP_tkEhxxdF3_64Bo0rUdZEddgM3EtM'; // YouTube Data API v3 Key

function initializeNewChat() {
  conversationHistory = [{
    role: 'assistant',
    content: "Welcome to DJ Match! I'm your AI assistant specialized in everything about DJing, music production, and the electronic music scene. Ask me about techniques, equipment, music theory, or trending tracks. How can I help you today?"
  }];

  // Display welcome message
  const messagesDiv = document.getElementById('chatMessages');
  messagesDiv.innerHTML = ''; // Clear any existing messages
  addMessage(conversationHistory[0].content, false);
}

// Clear chat history on page load
window.addEventListener('load', () => {
  conversationHistory = [];
  initializeNewChat();
});

// Extract DJ-related preferences and topics from conversation
function analyzeConversation() {
  const userInterests = new Set();
  const userPreferences = {
    genres: new Set(),
    equipment: new Set(),
    techniques: new Set()
  };

  conversationHistory.forEach(msg => {
    if (msg.role === 'user') {
      // Look for music genres
      const genres = ['house', 'techno', 'trance', 'dubstep', 'dnb', 'edm'];
      genres.forEach(genre => {
        if (msg.content.toLowerCase().includes(genre)) {
          userPreferences.genres.add(genre);
        }
      });

      // Look for DJ equipment
      const equipment = ['cdj', 'turntable', 'controller', 'mixer', 'serato', 'rekordbox'];
      equipment.forEach(eq => {
        if (msg.content.toLowerCase().includes(eq)) {
          userPreferences.equipment.add(eq);
        }
      });

      // Look for DJ techniques
      const techniques = ['mixing', 'beatmatching', 'scratching', 'loops', 'effects'];
      techniques.forEach(tech => {
        if (msg.content.toLowerCase().includes(tech)) {
          userPreferences.techniques.add(tech);
        }
      });
    }
  });

  return {
    genres: Array.from(userPreferences.genres),
    equipment: Array.from(userPreferences.equipment),
    techniques: Array.from(userPreferences.techniques)
  };
}

async function searchYouTube(songTitle, artist) {
  try {
    const query = `${songTitle} ${artist}`;
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${youtubeApiKey}&maxResults=1`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      return `https://www.youtube.com/watch?v=${videoId}`;
    } else {
      return null;
    }
  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}

async function getAIResponse(message) {
  try {
    conversationHistory.push({ role: 'user', content: message });

    const userProfile = analyzeConversation();

    const response = await fetch('/api/ai_completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: `You are DJ Match, an AI assistant specialized in DJing, music production, and electronic music.
        Provide helpful advice and recommendations based on the user's interests and the conversation context.

        For each recommended song:
        - Generate a valid YouTube link using the YouTube Data API. Use the provided API key and the searchYouTube function. If no video is found, return null.
        - Generate a valid Spotify link using the Spotify API. The URL must be in the format: https://open.spotify.com/track/TRACK_ID. If no track is found, return null.

        Include the BPM, musical key, and a brief description for each song.

        User Profile:
        Preferred Genres: ${userProfile.genres.join(', ')}
        Equipment Experience: ${userProfile.equipment.join(', ')}
        Techniques Interest: ${userProfile.techniques.join(', ')}

        Previous conversation:
        ${JSON.stringify(conversationHistory)}

        Response format must be:
        {
          reply: string,
          songs?: Array<{
            title: string,
            artist: string,
            bpm: number,
            key: string,
            description: string,
            youtubeUrl: string | null, // Must be a real, verified URL or null
            spotifyUrl: string | null  // Must be a real, verified URL or null
          }>,
          links?: Array<{
            url: string,
            title: string,
            description: string
          }]
        }
        `,
        data: message
      }),
    });

    const data = await response.json();

    // After getting the AI response, enrich song recommendations with YouTube links
    if (data.songs && data.songs.length > 0) {
      for (const song of data.songs) {
        song.youtubeUrl = await searchYouTube(song.title, song.artist);
      }
    }

    conversationHistory.push({ role: 'assistant', content: data.reply });

    return data;
  } catch (error) {
    console.error('Error:', error);
    return {
      reply: "I'm having trouble processing your request. Please try again.",
      songs: [],
      links: []
    };
  }
}

function addMessage(message, isUser = false, songs = [], links = []) {
  const messagesDiv = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

  const messageText = document.createElement('p');
  messageText.textContent = message;
  messageDiv.appendChild(messageText);

  if (songs && songs.length > 0) {
    const songsList = document.createElement('div');
    songsList.className = 'songs-list';

    songs.forEach(song => {
      const songCard = document.createElement('div');
      songCard.className = 'song-card';

      const titleArtist = document.createElement('div');
      titleArtist.className = 'song-title';

      // Add vinyl icon
      const vinylIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      vinylIcon.setAttribute("viewBox", "0 0 24 24");
      vinylIcon.classList.add("vinyl-icon");
      vinylIcon.innerHTML = `
        <defs>
          <linearGradient id="vinyl-gradient">
            <stop offset="0%" stop-color="#b388ff"/>
            <stop offset="100%" stop-color="#7c43bd"/>
          </linearGradient>
        </defs>
        <path fill="url(#vinyl-gradient)" d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2zM12,18C8.69,18 6,15.31 6,12C6,8.69 8.69,6 12,6C15.31,6 18,8.69 18,12C18,15.31 15.31,18 12,18zM12,8C9.79,8 8,9.79 8,12C8,14.21 9.79,16 12,16C14.21,16 16,14.21 16,12C16,9.79 14.21,8 12,8z"/>
      `;

      titleArtist.appendChild(vinylIcon);
      titleArtist.appendChild(document.createTextNode(`${song.title} - ${song.artist}`));

      const linksContainer = document.createElement('div');
      linksContainer.className = 'song-links';

      function createPlatformLink(platform, url, iconPath, color) {
        const link = document.createElement('a');
        link.className = 'platform-link ' + platform.toLowerCase() + '-link';
        link.target = '_blank';

        if (url) {
          link.href = url;
          link.innerHTML = `
            <svg class="platform-icon ${platform.toLowerCase()}-icon" viewBox="0 0 24 24">
              ${iconPath}
            </svg>
            ${platform}
          `;
        } else {
          link.classList.add('disabled-link');
          link.innerHTML = `
            <svg class="platform-icon ${platform.toLowerCase()}-icon" viewBox="0 0 24 24">
              ${iconPath}
            </svg>
            ${platform}
          `;
        }

        return link;
      }

      // YouTube Link
      const youtubeIcon = `<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>`;
      const youtubeLink = createPlatformLink('YouTube', song.youtubeUrl, youtubeIcon, '#FF0000');
      linksContainer.appendChild(youtubeLink);


      // Spotify Link
      const spotifyIcon = `<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>`;
      const spotifyLink = createPlatformLink('Spotify', song.spotifyUrl, spotifyIcon, '#1DB954');
      linksContainer.appendChild(spotifyLink);

      const technicalInfo = document.createElement('div');
      technicalInfo.className = 'song-technical';
      technicalInfo.textContent = `${song.bpm} BPM | Key: ${song.key}`;

      const description = document.createElement('div');
      description.className = 'song-description';
      description.textContent = song.description;

      songCard.appendChild(titleArtist);
      songCard.appendChild(technicalInfo);
      songCard.appendChild(description);
      linksContainer.querySelectorAll('.platform-link:not(.disabled-link)').forEach(link => songCard.appendChild(link)); 
      songsList.appendChild(songCard);
    });

    messageDiv.appendChild(songsList);
  }

  if (links && links.length > 0) {
    const linksList = document.createElement('div');
    linksList.className = 'links-list';
    links.forEach(link => {
      const linkElement = document.createElement('a');
      linkElement.href = link.url;
      linkElement.textContent = link.title;
      linkElement.title = link.description;
      linkElement.target = "_blank";
      linksList.appendChild(linkElement);
      linksList.appendChild(document.createElement('br'));
    });
    messageDiv.appendChild(linksList);
  }

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, true);
  input.value = '';

  const aiResponse = await getAIResponse(message);
  addMessage(aiResponse.reply, false, aiResponse.songs, aiResponse.links);
}

// Initialize chat when page loads
window.addEventListener('DOMContentLoaded', () => {
  initializeNewChat();
});

document.getElementById('userInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Make sure button click works correctly on shared/posted versions
document.querySelector('.chat-input button').addEventListener('click', sendMessage);