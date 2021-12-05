const SPOTIFY_BASE_API = 'https://api.spotify.com/v1';
const SPOTIFY_SAVED_TRACKS =  SPOTIFY_BASE_API + '/me/tracks';
const SPOTIFY_ARTIST =  SPOTIFY_BASE_API + '/artists';
const COLOR_SCHEME = ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2']

const getOptions = () => {
  return {
    headers: {
      'Authorization': 'Bearer ' + getCookie('access_token'),
    }
  };
}

const getSavedTracks = () => {
  return fetch(buildURL(SPOTIFY_SAVED_TRACKS, {'limit': 50}), getOptions())
    .then(response => response.json())
    .catch(console.error);
}

const getArtistGenres = (artistID, dTime) => {
  return fetch(SPOTIFY_ARTIST + '/' + artistID, getOptions())
    .then(response => response.json())
    .then(artist => {
      return {time: dTime, genres: artist.genres};
    })
    .catch(console.error);
}

const buildGenreDS = (items) => {
  return Promise.all(items.map(item =>
    Promise.all(item.track.artists.map(artist =>
      getArtistGenres(artist.id, item.added_at)))))
    .then(values => {
      let genres = {};
      values.forEach(track =>
        track.forEach(artistGenres =>
          genres = accumulateGenres(genres, artistGenres)));
      return genres;
    })
    .catch(console.error);
}

const accumulateGenres = (acc, artist) => {
  artist.genres.forEach(genre => {
    const date = new Date(artist.time).toDateString();
    if (date in acc) {
      acc[date].push(genre);
    } else {
      acc[date] = {};
      acc[date] = [genre];
    }
  });
  return acc;
}

const sortDates = (dates) => {
  return dates.sort((date1, date2) => new Date(date1) - new Date(date2));
}

const process = (ds) => {
  // accumulate genres for each date
  ds = Object.fromEntries(
    Object.entries(ds).map(([date, value]) =>
      [date, value.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {})]));

  // refactor data structure to have genres as keys, dates with quantities as values
  let res = {};
  Object.entries(ds).forEach(([date, genres]) => {
    Object.entries(genres).forEach(([genre, value]) => {
      if (!(genre in res)) {
        res[genre] = {};
      }
      res[genre][date] = value;
    })
  });

  const sortedDates = sortDates(Object.keys(ds));
  const minDate = sortedDates[0];
  const maxDate = sortedDates[sortedDates.length - 1];

  // fill with all dates
  for (let d = new Date(minDate); d <= new Date(maxDate); d.setDate(d.getDate() + 1)) {
    res = Object.fromEntries(
      Object.entries(res).map(([genre, dates]) => {
        if (!(d.toDateString() in dates)) {
          dates[d.toDateString()] = 0;
        }
        return [genre, dates];
    }));
  }

  return res;
}

const selectTopK = (ds, n) => {
  const topGenres = Object.entries(ds)
    .map(([genre, dates]) => [genre, Object.values(dates).reduce((acc, curr) => acc + curr)])
    .sort((first, second) => first[1] > second[1])
    .slice(-n)
    .map(value => value[0]);
  return Object.fromEntries(Object.entries(ds).filter(([genre, dates]) => topGenres.includes(genre)));
}

const buildChart = (input) => {
  const dates = sortDates(Object.keys(Object.values(input)[0]));
  let i = 0;

  const data = {
    labels: dates,
    datasets: Object.entries(input)
      .sort((a, b) =>
        Object.values(a[1]).reduce((acc, curr) => acc + curr) < Object.values(b[1]).reduce((acc, curr) => acc + curr))
      .map(([genre, dates]) => {
        return {
          label: genre,
          data: Object.entries(dates)
            .sort((date1, date2) => new Date(date1[0]) - new Date(date2[0]))
            .map(([date, value]) => value),
          backgroundColor: COLOR_SCHEME[(i) % (COLOR_SCHEME.length - 1)],
          borderColor: COLOR_SCHEME[(i++) % (COLOR_SCHEME.length - 1)],
          fill: true,
        }
      })
  };

  const config = {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          mode: 'index'
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Saved Tracks'
          }
        }
      }
    },
  };

  const chart = new Chart(document.querySelector('.bar-chart'), config);
}

const displaySavedTracks = () => {
  getSavedTracks()
    .then(content => buildGenreDS(content.items))
    .then(genreDS => process(genreDS))
    .then(ds => selectTopK(ds, 20))
    .then(ds => buildChart(ds))
    .catch(console.error);
};