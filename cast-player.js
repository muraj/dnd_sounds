/**
 * Session idle time out in miliseconds
 **/
var SESSION_IDLE_TIMEOUT = 300000;

// Cast icon thumbnail active
var CAST_ICON_THUMB_ACTIVE = 'images/cast_icon_active.png';
// Cast icon thumbnail idle
var CAST_ICON_THUMB_IDLE = 'images/cast_icon_idle.png';
// Cast icon thumbnail warning
var CAST_ICON_THUMB_WARNING = 'images/cast_icon_warning.png';

/**
 * global variables
 */
var currentMediaSession = null;
var session = null;
var storedSession = null;

var currentMediaURL = '';
var currentMediaTitle = '';
var currentMediaArtist = '';
var currentMediaThumb = '';

var timer = null;

/**
 * Call initialization
 */

window['__onGCastApiAvailable'] = function(isAvailable) {
  if (isAvailable) {
    initializeCastApi();
  }
};

/**
 * initialization
 */
function initializeCastApi() {
  // default app ID to the default media receiver app
  // optional: you may change it to your own app ID/receiver
  var applicationIDs = [
      chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
    ];


  // auto join policy can be one of the following three
  // 1) no auto join
  // 2) same appID, same URL, same tab
  // 3) same appID and same origin URL
  var autoJoinPolicyArray = [
      chrome.cast.AutoJoinPolicy.PAGE_SCOPED,
      chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED,
      chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    ];

  // request session
  var sessionRequest = new chrome.cast.SessionRequest(applicationIDs[0]);
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
    sessionListener,
    receiverListener,
    autoJoinPolicyArray[1]);

  chrome.cast.initialize(apiConfig, onInitSuccess, onError('init'));
}

/**
 * initialization success callback
 */
function onInitSuccess() {
  appendMessage('init success');

  // check if a session ID is saved into localStorage
  storedSession = JSON.parse(localStorage.getItem('storedSession'));
  if (storedSession) {
    var dateString = storedSession.timestamp;
    var now = new Date().getTime();

    if (now - dateString < SESSION_IDLE_TIMEOUT) {
      //document.getElementById('joinsessionbyid').style.display = 'block';
    }
  }
}

/**
 * generic error callback
 * @param {Object} e A chrome.cast.Error object.
 */
function onError(func, e) {
	return function (e) {
		console.log('Error from ' + func + ' ' + e.description);
		appendMessage('Error' + e);
	}
}

/**
 * generic success callback
 * @param {string} message from callback
 */
function onSuccess(message) {
  console.log(message);
}

/**
 * callback on success for stopping app
 */
function onStopAppSuccess() {
  console.log('Session stopped');
  appendMessage('Session stopped');
  document.getElementById('casticon').src = CAST_ICON_THUMB_IDLE;
}

/**
 * session listener during initialization
 * @param {Object} e session object
 * @this sessionListener
 */
function sessionListener(e) {
  console.log('New session ID: ' + e.sessionId);
  appendMessage('New session ID:' + e.sessionId);
  session = e;
  //document.getElementById('casticon').src = CAST_ICON_THUMB_ACTIVE;
  if (session.media.length != 0) {
    appendMessage(
        'Found ' + session.media.length + ' existing media sessions.');
    onMediaDiscovered('sessionListener', session.media[0]);
  }
  session.addMediaListener(
    onMediaDiscovered.bind(this, 'addMediaListener'));
  session.addUpdateListener(sessionUpdateListener.bind(this));
  // disable join by session id when auto join already
  if (storedSession) {
    //document.getElementById('joinsessionbyid').style.display = 'none';
  }
}

/**
 * session update listener
 * @param {boolean} isAlive status from callback
 * @this sessionUpdateListener
 */
function sessionUpdateListener(isAlive) {
  if (!isAlive) {
    session = null;
    //document.getElementById('casticon').src = CAST_ICON_THUMB_IDLE;
    //var playpauseresume = document.getElementById('playpauseresume');
    //playpauseresume.innerHTML = 'Play';
    if (timer) {
      clearInterval(timer);
    }
    else {
      //timer = setInterval(updateCurrentTime.bind(this),
      //    PROGRESS_BAR_UPDATE_DELAY);
      //playpauseresume.innerHTML = 'Pause';
    }
  }
}

/**
 * receiver listener during initialization
 * @param {string} e status string from callback
 */
function receiverListener(e) {
  if (e === 'available') {
    console.log('receiver found');
    appendMessage('receiver found');
  }
  else {
    console.log('receiver list empty');
    appendMessage('receiver list empty');
  }
}

/**
 * select a media URL
 * @param {string} m An index for media URL
 */
function selectMedia(url, title, artist, thumb) {
  console.log('media selected' + title);
  appendMessage('media selected' + title);
  currentMediaURL = url;
  currentMediaTitle = title;
	currentMediaArtist = artist;
  currentMediaThumb = thumb;
  //var playpauseresume = document.getElementById('playpauseresume');
  //document.getElementById('thumb').src = currentMediaThumb;
}

/**
 * launch app and request session
 */
function launchApp() {
  console.log('launching app...');
  appendMessage('launching app...');
  chrome.cast.requestSession(onRequestSessionSuccess, onLaunchError);
  if (timer) {
    clearInterval(timer);
  }
}

/**
 * callback on success for requestSession call
 * @param {Object} e A non-null new session.
 * @this onRequestSesionSuccess
 */
function onRequestSessionSuccess(e) {
  console.log('session success: ' + e.sessionId);
  appendMessage('session success: ' + e.sessionId);
  saveSessionID(e.sessionId);
  session = e;
  document.getElementById('casticon').src = CAST_ICON_THUMB_ACTIVE;
  session.addUpdateListener(sessionUpdateListener.bind(this));
  if (session.media.length != 0) {
    onMediaDiscovered('onRequestSession', session.media[0]);
  }
  session.addMediaListener(
    onMediaDiscovered.bind(this, 'addMediaListener'));
}

/**
 * callback on launch error
 */
function onLaunchError() {
  console.log('launch error');
  appendMessage('launch error');
}

/**
 * save session ID into localStorage for sharing
 * @param {string} sessionId A string for session ID
 */
function saveSessionID(sessionId) {
  // Check browser support of localStorage
  if (typeof(Storage) != 'undefined') {
    // Store sessionId and timestamp into an object
    var object = {id: sessionId, timestamp: new Date().getTime()};
    localStorage.setItem('storedSession', JSON.stringify(object));
  }
}

/**
 * join session by a given session ID
 */
function joinSessionBySessionId() {
  if (storedSession) {
    appendMessage(
        'Found stored session id: ' + storedSession.id);
    chrome.cast.requestSessionById(storedSession.id);
  }
}

/**
 * stop app/session
 */
function stopApp() {
  session.stop(onStopAppSuccess, onError('stop'));
  if (timer) {
    clearInterval(timer);
  }
}

/**
 * load media specified by custom URL
 */
function loadCustomMedia() {
  var customMediaURL = document.getElementById('customMediaURL').value;
  if (customMediaURL.length > 0) {
    loadMedia(customMediaURL);
  }
}

/**
 * load media
 * @param {string} mediaURL media URL string
 * @this loadMedia
 */
function loadMedia(mediaURL) {
  if (!session) {
    console.log('no session');
    appendMessage('no session');
    return;
  }

  if (mediaURL) {
    var mediaInfo = new chrome.cast.media.MediaInfo(mediaURL);
    currentMediaTitle = 'custom title needed';
    currentMediaArtist = null;
    currentMediaThumb = 'images/video_icon.png';
    //document.getElementById('thumb').src = currentMediaThumb;
  }
  else {
    console.log('loading...' + currentMediaURL);
    appendMessage('loading...' + currentMediaURL);
    var mediaInfo = new chrome.cast.media.MediaInfo(currentMediaURL);
  }

  mediaInfo.contentType = 'audio/mpeg';
	if (mediaInfo.contentType.startsWith('audio/')) {
		mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
		mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.MUSIC_TRACK;
		mediaInfo.metadata.artist = currentMediaArtist;
	}
	else {
		mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
		mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
	}

  mediaInfo.metadata.title = currentMediaTitle;
  mediaInfo.metadata.images = [{'url': currentMediaThumb}];

	var items = [];
	var queueItem = new chrome.cast.media.QueueItem(mediaInfo);
	queueItem.preloadTime = 10;
	queueItem.autoplay = true;
	items.push(queueItem);

	var request = new chrome.cast.media.QueueLoadRequest(items);
	request.repeatMode = chrome.cast.media.RepeatMode.SINGLE;
	session.queueLoad(request, onMediaDiscovered.bind(this, 'queueMedia'),
		onMediaError);

/*
  var request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = true;
  request.currentTime = 0;

  session.loadMedia(request,
    onMediaDiscovered.bind(this, 'loadMedia'),
    onMediaError);
*/
}

/**
 * callback on success for loading media
 * @param {string} how info string from callback
 * @param {Object} mediaSession media session object
 * @this onMediaDiscovered
 */
function onMediaDiscovered(how, mediaSession) {
  console.log('new media session ID ('+how+'):' + mediaSession.mediaSessionId);
  appendMessage('new media session ID:' + mediaSession.mediaSessionId +
      ' (' + how + ')');
  currentMediaSession = mediaSession;
  currentMediaSession.addUpdateListener(onMediaStatusUpdate);
  mediaCurrentTime = currentMediaSession.currentTime;
  //playpauseresume.innerHTML = 'Play';
  //document.getElementById('casticon').src = CAST_ICON_THUMB_ACTIVE;
  //document.getElementById('playerstate').innerHTML =
  //    currentMediaSession.playerState;
  if (!timer) {
    //timer = setInterval(updateCurrentTime.bind(this),
    //    PROGRESS_BAR_UPDATE_DELAY);
    //playpauseresume.innerHTML = 'Pause';
  }
}

/**
 * callback on media loading error
 * @param {Object} e A non-null media object
 */
function onMediaError(e) {
  console.log('media error');
  appendMessage('media error');
  document.getElementById('casticon').src = CAST_ICON_THUMB_WARNING;
}

/**
 * get media status initiated by sender when necessary
 * currentMediaSession gets updated
 * @this getMediaStatus
 */
function getMediaStatus() {
  if (!session || !currentMediaSession) {
    return;
  }

  currentMediaSession.getStatus(null,
      mediaCommandSuccessCallback.bind(this, 'got media status'),
      onError('mediaStatus'));
}

/**
 * callback for media status event
 * @param {boolean} isAlive status from callback
 */
function onMediaStatusUpdate(isAlive) {
  if (!isAlive) {
    currentMediaTime = 0;
  }
  else {
    if (currentMediaSession.playerState == 'PLAYING') {
      /*if (progressFlag) {
        document.getElementById('progress').value = parseInt(100 *
            currentMediaSession.currentTime /
            currentMediaSession.media.duration);
        document.getElementById('progress_tick').innerHTML =
            currentMediaSession.currentTime;
        document.getElementById('duration').innerHTML =
            currentMediaSession.media.duration;
        progressFlag = 0;
      }*/
      //document.getElementById('playpauseresume').innerHTML = 'Pause';
    }
  }
  //document.getElementById('playerstate').innerHTML =
  //    currentMediaSession.playerState;
}

/**
 * Updates the progress bar shown for each media item.
 */
function updateCurrentTime() {
  if (!session || !currentMediaSession) {
    return;
  }

  if (currentMediaSession.media && currentMediaSession.media.duration != null) {
    var cTime = currentMediaSession.getEstimatedTime();
    document.getElementById('progress').value = parseInt(100 * cTime /
        currentMediaSession.media.duration);
    document.getElementById('progress_tick').innerHTML = cTime;
  }
  else {
    document.getElementById('progress').value = 0;
    document.getElementById('progress_tick').innerHTML = 0;
    if (timer) {
      clearInterval(timer);
    }
  }
}

/**
 * play media
 * @this playMedia
 */
function playMedia() {
  if (!currentMediaSession) {
    return;
  }

  if (timer) {
    clearInterval(timer);
  }

  var playpauseresume = document.getElementById('playpauseresume');
  if (playpauseresume.innerHTML == 'Play') {
    currentMediaSession.play(null,
      mediaCommandSuccessCallback.bind(this, 'playing started for ' +
          currentMediaSession.sessionId),
      onError('play'));
      playpauseresume.innerHTML = 'Pause';
      appendMessage('play started');
      //timer = setInterval(updateCurrentTime.bind(this),
      //    PROGRESS_BAR_UPDATE_DELAY);
  }
  else {
    if (playpauseresume.innerHTML == 'Pause') {
      currentMediaSession.pause(null,
        mediaCommandSuccessCallback.bind(this, 'paused ' +
            currentMediaSession.sessionId),
        onError('pause'));
      playpauseresume.innerHTML = 'Resume';
      appendMessage('paused');
    }
    else {
      if (playpauseresume.innerHTML == 'Resume') {
        currentMediaSession.play(null,
          mediaCommandSuccessCallback.bind(this, 'resumed ' +
              currentMediaSession.sessionId),
          onError('resume'));
        playpauseresume.innerHTML = 'Pause';
        appendMessage('resumed');
        //timer = setInterval(updateCurrentTime.bind(this),
        //    PROGRESS_BAR_UPDATE_DELAY);
      }
    }
  }
}

/**
 * stop media
 * @this stopMedia
 */
function stopMedia() {
  if (!currentMediaSession)
    return;

  currentMediaSession.stop(null,
    mediaCommandSuccessCallback.bind(this, 'stopped ' +
        currentMediaSession.sessionId),
    onError('stop'));
  //var playpauseresume = document.getElementById('playpauseresume');
  //playpauseresume.innerHTML = 'Play';
  appendMessage('media stopped');
  if (timer) {
    clearInterval(timer);
  }
}

/**
 * set media volume
 * @param {Number} level A number for volume level
 * @param {Boolean} mute A true/false for mute/unmute
 * @this setMediaVolume
 */
function setMediaVolume(level, mute) {
  if (!currentMediaSession)
    return;

  var volume = new chrome.cast.Volume();
  volume.level = level;
  currentVolume = volume.level;
  volume.muted = mute;
  var request = new chrome.cast.media.VolumeRequest();
  request.volume = volume;
  currentMediaSession.setVolume(request,
    mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
    onError('volume'));
}

/**
 * set receiver volume
 * @param {Number} level A number for volume level
 * @param {Boolean} mute A true/false for mute/unmute
 * @this setReceiverVolume
 */
function setReceiverVolume(level, mute) {
  if (!session)
    return;

  if (!mute) {
    session.setReceiverVolumeLevel(level,
      mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
      onError('recv-volume'));
    currentVolume = level;
  }
  else {
    session.setReceiverMuted(true,
      mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
      onError('recv-mute'));
  }
}

/**
 * mute media
 */
function muteMedia() {
  if (!session || !currentMediaSession) {
    return;
  }

  var muteunmute = document.getElementById('muteunmute');
  // It's recommended that setReceiverVolumeLevel be used
  // but media stream volume can be set instread as shown in the
  // setMediaVolume(currentVolume, true);
  if (muteunmute.innerHTML == 'Mute media') {
    muteunmute.innerHTML = 'Unmute media';
    setReceiverVolume(currentVolume, true);
    appendMessage('media muted');
  } else {
    muteunmute.innerHTML = 'Mute media';
    setReceiverVolume(currentVolume, false);
    appendMessage('media unmuted');
  }
}

/**
 * seek media position
 * @param {Number} pos A number to indicate percent
 * @this seekMedia
 */
function seekMedia(pos) {
  console.log('Seeking ' + currentMediaSession.sessionId + ':' +
    currentMediaSession.mediaSessionId + ' to ' + pos + '%');
  progressFlag = 0;
  var request = new chrome.cast.media.SeekRequest();
  request.currentTime = pos * currentMediaSession.media.duration / 100;
  currentMediaSession.seek(request,
    onSeekSuccess.bind(this, 'media seek done'),
    onError('seek'));
}

/**
 * callback on success for media commands
 * @param {string} info A message string
 */
function onSeekSuccess(info) {
  console.log(info);
  appendMessage(info);
  setTimeout(function() {progressFlag = 1},PROGRESS_BAR_UPDATE_DELAY);
}

/**
 * callback on success for media commands
 * @param {string} info A message string
 */
function mediaCommandSuccessCallback(info) {
  console.log(info);
  appendMessage(info);
}

/**
 * append message to debug message window
 * @param {string} message A message string
 */
function appendMessage(message) {
  //var dw = document.getElementById('debugmessage');
  //dw.innerHTML += '\n' + JSON.stringify(message);
}
