const SPOTIFY_RECENTLY_PLAYED = 'https://api.spotify.com/v1/me/player/recently-played';

const getRecentlyPlayed = () => {
  const options = {
    headers: {
      'Authorization': 'Bearer ' + getCookie('access_token'),
    }
  };
  fetch(SPOTIFY_RECENTLY_PLAYED, options)
    .then(response => response.json())
    .then(content => console.log(content))
    .catch(err => console.error(err));
}
