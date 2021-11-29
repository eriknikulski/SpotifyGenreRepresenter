const SPOTIFY_BASE_API = 'https://api.spotify.com/v1';
const SPOTIFY_RECENTLY_PLAYED =  SPOTIFY_BASE_API + '/me/player/recently-played';
const SPOTIFY_ARTIST =  SPOTIFY_BASE_API + '/artists';
const COLOR_SCHEME = ['#ffffbf', '#fee08b', '#fdae61', '#f46d43', '#d53e4f', '#9e0142']

const getOptions = () => {
  return {
    headers: {
      'Authorization': 'Bearer ' + getCookie('access_token'),
    }
  };
}

const getRecentlyPlayed = () => {
  fetch(buildURL(SPOTIFY_RECENTLY_PLAYED, {'limit': 50}), getOptions())
    .then(response => response.json())
    .then(content => {
      Promise.all(content.items.map(item =>
        Promise.all(item.track.artists.map(artist =>
          getArtistGenres(artist.id)))))
        .then(values => {
          let genres = {};
          values.forEach(track =>
            track.forEach(artistGenres =>
              genres = accumulateGenres(genres, artistGenres)));
          buildChart(genres);
        });
    })
    .catch(err => console.error(err));
}

const getArtistGenres = (artistID) => {
  return fetch(SPOTIFY_ARTIST + '/' + artistID, getOptions())
    .then(response => response.json())
    .then(artist => artist.genres)
    .catch(err => console.error(err));
}

const accumulateGenres = (acc, genres) => {
  genres.forEach(genre => {
    if (genre in acc) {
      acc[genre]++;
    } else {
      acc[genre] = 1;
    }
  });
  return acc;
}

const buildChart = (input) => {
  input = sortObj(input);
  const max = Math.max(...Object.values(input));
  const data = {
    labels: Object.keys(input),
    datasets: [{
      label: 'Genres',
      data: Object.values(input),
      backgroundColor: Object.values(input).map((el, i) =>
        COLOR_SCHEME[Math.round((Math.log(el) / Math.log(max)) * (COLOR_SCHEME.length - 1))]),
      borderWidth: 1
    }]
  };

  const config = {
    type: 'bar',
    data: data,
    options: {
      responsive: false,
      scales: {
        x: {
          ticks: {
            autoSkip: false
          }
        }
      }
    },
  };

  const chart = new Chart(document.querySelector('.bar-chart'), config);
}