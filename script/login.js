const ACCESS_URL = 'https://accounts.spotify.com/api/token';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const CURRENT_URL = location.protocol + '//' + location.host + location.pathname;
const CLIENT_ID = 'add75f7cbf1e4278b7bea6d92edb7fea';
const CLIENT = '5c1bc74f6eb74908ba6cfa7035084c41';


const getURLParams = function () {
  let hashParams = {};
  let e, r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.search.substring(1);
  while (e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

const generateRandomString = function (length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const buildURL = function (base, arr) {
  let url = base + '?';
  for (const [key, value] of Object.entries(arr)) {
    url += key + '=' + encodeURIComponent(value) + '&';
  }
  return url.slice(0, -1);
}

const toBase64 = function (str) {
  return btoa(unescape(encodeURIComponent(str)));
}

const login = function () {
  const accessToken = getCookie('access-token');
  const state = getCookie('state');

  const params = getURLParams();
  const access_token = 'access_token' in params ? params.access_token : null;
  const refresh_token = 'refresh_token' in params ? params.refresh_token : null;
  const authCode = 'code' in params ? params.code : getCookie('code');
  const error = 'error' in params ? params.error : null;

  if (error) {
    alert('There was an error during the authentication');
  }

  if (accessToken) {
    console.log('Access Token present! ' + accessToken);
  } else if (authCode) {
    console.log('Auth Code present! ' + authCode);

    const body = {
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: CURRENT_URL
    }

    const options = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Authorization': 'Basic ' + toBase64(CLIENT_ID + ':' + CLIENT),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    fetch(ACCESS_URL, options)
      .then(response => response.json())
      .then(content => console.log(content))
      .catch(error => console.error(error))
  } else {
    console.log('Getting auth code');
    const scope = 'user-read-recently-played';
    const state = generateRandomString(16);

    setCookie('state', state, 1);

    console.log(CURRENT_URL);
    document.getElementById('login-btn').addEventListener('click', function () {
      window.location.href = buildURL(AUTH_URL,
        {
          'response_type': 'code',
          'client_id': CLIENT_ID,
          'scope': scope,
          'redirect_uri': CURRENT_URL,
          'state': state
        });
    });
  }
}
