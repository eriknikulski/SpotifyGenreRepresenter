const SPOTIFY_BASE_API = 'https://api.spotify.com/v1';
const SPOTIFY_SAVED_TRACKS =  SPOTIFY_BASE_API + '/me/tracks';
const SPOTIFY_ARTIST =  SPOTIFY_BASE_API + '/artists';
const COLOR_SCHEME = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'];
const artistCache = {};

const getOptions = () => {
  return {
    headers: {
      'Authorization': 'Bearer ' + getCookie('access_token'),
    },
    cache: 'force-cache',
  };
}

const getSavedTracks = (n, url=buildURL(SPOTIFY_SAVED_TRACKS, {'limit': 50}), acc=[]) => {
  return fetch(url, getOptions())
    .then(response => response.json())
    .then(content => {
      if (n - 50 <= 0 || !content.next) {
        return acc.concat(content.items);
      }
      return getSavedTracks(n - 50, content.next, acc.concat(content.items));
    })
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

const getArtistGenresCache = (artistID, dTime) => {
  if (!artistCache[artistID]) {
    artistCache[artistID] = getArtistGenres(artistID, dTime);
  }
  return artistCache[artistID];
}

const buildGenreDS = (items) => {
  return Promise.all(items.map(item =>
    Promise.all(item.track.artists.map(artist =>
      getArtistGenresCache(artist.id, item.added_at)))))
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
          tension: 0.1,
        }
      })
  };

  const config = {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          mode: 'index'
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'xy',
          }
        }
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
  document.querySelector('.reset-zoom-btn').style.display = 'block';
  document.querySelector('.reset-zoom-btn').addEventListener('click', () => chart.resetZoom())
}

const displaySavedTracks = () => {
  getSavedTracks(150)
    .then(content => buildGenreDS(content))
    .then(genreDS => process(genreDS))
    .then(ds => selectTopK(ds, 20))
    .then(ds => buildChart(ds))
    .catch(console.error);
};