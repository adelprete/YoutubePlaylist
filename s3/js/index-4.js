let autoplay = false;
let player;
let playlist = [];
let selectedResultId = null;
let timeout = null;


/**
* Initializes our web app.
*
* Uses the Fetch API to speak to our Lambda function which then pulls the playlist
* from DynamoDB.  The videos are then randomized and appended to the queue. The first 
* video in the array is cued into the player.
*/
function init() {
  // hide fields after they've gotten their listners
  //document.getElementById("search-input-group").classList.toggle("hidden");
  
  fetch('https://4m42dwn6k5.execute-api.us-east-1.amazonaws.com/prod/playlist')
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      playlist = json['playlist']['Items'];
      playlist.sort(() => Math.random() - 0.5);
      for (var i=1; i<playlist.length; i++) {
        addVideoToQueue(playlist[i], i);
      }
      cueVideo(playlist[0]);
    });
}

/**
* Adds a video object to the playlist at the specified index.
*
* @param {object} item   video object being added to playlist.
* @param {int}    index  the index of the playlist to add the video to.
*/
function addVideoToQueue(item, index) {
  // create preview container
  var divParent = document.createElement('div');
  divParent.className = 'preview';
  divParent.setAttribute('tabindex', '0');
  divParent.innerHTML = '<img src="'+item.ImageUrl+'"/>';
  
  // create description element and fill it out
  var divDescription = document.createElement('div');
  divDescription.className = 'description';
  divParent.appendChild(divDescription);
  formatVideoDescription(item, divDescription);
  
  // create options overlay and choices
  var divOptions = document.createElement('div');
  divOptions.className = 'options';
  divOptions.innerHTML = "<div class='choice left' onclick='playNow("+index+")'><p>Play Now</p></div> \
  <div class='choice right' onclick='playNext("+index+")'><p>Play Next</p></div>";
  divParent.appendChild(divOptions);
  
  // add our new preview element to the bottom of the queue
  var divQueue = document.getElementById("queue");
  divQueue.appendChild(divParent);
  
  // add our separator
  var hr = document.createElement('hr');
  divQueue.appendChild(hr);
}

/**
* Cues up a video in our player.
*
* @param {object}  item      video object being cued.
* @param {boolean} autoPlay  a boolean that determines if the video should start playing.
*/
function cueVideo(item, autoPlay=false) {
  player.cueVideoById({'videoId': item.VideoId});
  let playerDesc = document.getElementById("player-description");
  while (playerDesc.firstChild) {
      playerDesc.removeChild(playerDesc.firstChild);
  }
  formatVideoDescription(item, playerDesc);
}

/**
* Formats the video description for the player and preview elements.
*
* @param {object} item         video object to pull description from.
* @param {object} descElement  the html element that we are adding the description to.
*/
function formatVideoDescription(item, descElement){
  let spanTitle = document.createElement('span');
  spanTitle.className = 'video-title';
  if (item.CustomTitle) {
    spanTitle.innerHTML = item.CustomTitle + '<br>';
    descElement.appendChild(spanTitle);
  }
  if (item.CustomArtist) {
    let spanArtist = document.createElement('span');
    spanArtist.className = 'video-artist';
    spanArtist.innerHTML = item.CustomArtist + '<br>';
    descElement.appendChild(spanArtist);
  }
  if (!item.CustomTitle && !item.CustomArtist) {
    spanTitle.innerHTML = item.DefaultTitle + '<br>';
    descElement.appendChild(spanTitle);
  }
  let spanDuration = document.createElement('span');
  spanDuration.className = 'video-duration';
  spanDuration.innerHTML = item.Duration;
  descElement.appendChild(spanDuration);
}

/**
* Plays the video object at the given index immediately.
*
* @param {int} index  the index of the video that will be played.
*/
function playNow(index){
  // add our video to the front of the playlist array
  let movingToTop = playlist.splice(index,1)[0];
  let movingToBottom = playlist.shift();
  playlist.push(movingToBottom);
  playlist.unshift(movingToTop);
  
  // refresh the queue to match the order of the playlist array
  let queue = document.getElementById("queue");
  while (queue.firstChild) {
      queue.removeChild(queue.firstChild);
  }
  for (var i=1; i<playlist.length; i++) {
    addVideoToQueue(playlist[i], i);
  }
  cueVideo(playlist[0]);
  autoplay = true;
}

/**
* Plays the video object at the given index immediately.
*
* @param {int} index  the index of the video that will be moved to the front.
*/
function playNext(index) {
  var removed = playlist.splice(index,1)[0];
  playlist.splice(1,0,removed)
  
  var queue = document.getElementById("queue");
  while (queue.firstChild) {
      queue.removeChild(queue.firstChild);
  }
  for (var i=1; i<playlist.length; i++) {
    addVideoToQueue(playlist[i], i);
  }
}

/**
* Toggle search options
*/
function toggleSearchOptions() {
  document.getElementById("search-input-group").classList.toggle("hidden");
  document.querySelector(".arrow").classList.toggle("flip");
}

/**
* Throttles youtube searches so that we dont hit our quota too fast.
*/
function searchYoutube(query) {
  clearTimeout(timeout);

  timeout = setTimeout(function () {
      if (query.length >= 5) executeSearch(query);
  }, 500);
}

/**
* Does a search on the concatenation of display title and display artist
* if the custom search input is hidden.
*/
function searchTitleArtist() {
  let displayTitle = document.getElementById("add-title").value;
  let displayArtist = document.getElementById("add-artist").value;
  let query = `${displayArtist} - ${displayTitle}`;
  
  if (document.getElementById("search-input-group").classList.contains('hidden')){
    document.getElementById("search-input").value = query;
    searchYoutube(query);
  }
}

/**
* Perform a youtube search based on the given text.
*
* Clears the previous search results and creates new search elements.  Also alerts 
* the user if the youtube search quota has been reached.
*
* @param {string} query  query is the string to search for.
*/
function executeSearch(query) {
  let searchResults = document.getElementById("search-results");
  let popupBreak = document.getElementById("popup-break");
  let searchOptions = document.getElementById("popup-search-options");
  
  return gapi.client.youtube.search.list({
    'part': 'snippet',
    'q': query,
    'type': 'video',
    'videoCategoryId': '10',
    'videoEmbeddable': 'true'
  })
  .then(function(response) {
    clearSearchResults();
    // display help text
    if (response.result.items.length) {
      searchResults.innerHTML = '<p>Select a video to accompany the Artist name and Title entered above</p>';
      
      // start formatting the results
      let items = response.result.items;
      for (var i=0;i<items.length;i++) {
        if (!items[i].snippet.channelTitle.toLowerCase().includes('vevo')) {
          addItemToSearchResults(items[i]);
        }
      }
    }
    else {
      searchResults.innerHTML = '<p>no eligible videos found :(</p>';
    }
    
    // show the results to the user
    searchOptions.classList.remove('hidden');
    popupBreak.classList.remove('hidden');
    searchResults.classList.remove('hidden');
    hideConfirmButton();
  },
  function(err) {
    console.error("Execute error", err);
    clearSearchResults();
    searchOptions.classList.remove('hidden');
    popupBreak.classList.remove('hidden');
    searchResults.classList.remove('hidden');
    searchResults.innerHTML = '<p>Youtube Query limit reached.  Come back tomorrow.</p>';
  });
}

/**
* Creates a checkbox input that displays a youtube search results information.
*
* @param {object} item  video details from youtube.
*/
function addItemToSearchResults(item){
  let videoId = item.id.videoId;
  let divResult = document.createElement('div');
  divResult.className = 'result';
  divResult.innerHTML = 
    '<input id="'+videoId+'_result" type="radio" name="result" value="'+videoId+'" class="hidden"> \
     <label for="'+videoId+'_result" class="result-description" onclick="showConfirmButton()"> \
      <img src="'+item.snippet.thumbnails.medium.url+'"> \
      <span>'+item.snippet.title+'<br></span> \
     </label>';
  var searchResults = document.getElementById("search-results");
  searchResults.appendChild(divResult);
}

/**
* Shows the button button that will add a youtube search result video.
*/
function showConfirmButton() {
  document.getElementById("confirm-add").classList.remove('hidden');
}

/**
* Hides the button button that will add a youtube search result video.
*/
function hideConfirmButton() {
  document.getElementById("confirm-add").classList.add('hidden');
}

/**
* Validates the form 
*/
function validateForm() {
  let customTitle = document.getElementById("add-title").value;
  let customArtist = document.getElementById("add-artist").value;
  if (customTitle && customArtist) {
    addVideo();
  }
  else {
    document.querySelector('#confirm-add').disabled = false;
    document.querySelector('#add-form').reportValidity();
  }
}

/**
* Adds the selected video in the search results to the db.
*
* We first check to see if the video is already in the list.
* Then we ask youtube for more information about the video.
* We create a format the given information into a format that DynamoDB likes 
* and add it to the database.
*
*/
function addVideo() {
  let addButton = document.querySelector('.confirm-add');
  let selectedVideoId = document.querySelector('input[name="result"]:checked').value;
  // check if video is already in the playlist
  const found = playlist.some(el => el.VideoId === selectedVideoId);
  if (!found) {
    // ask youtube for more information
    let videoDetails = gapi.client.youtube.videos.list({
      'part': 'contentDetails,snippet',
      'id': selectedVideoId
    })
    .then(function(response) {
      // format our data for the db
      let result = response.result.items[0];
      duration = formatDuration(result.contentDetails.duration);
      if (duration) {
        let item = {
          'VideoId': result.id,
          'DefaultTitle': result.snippet.title,
          'ImageUrl': result.snippet.thumbnails.medium.url,
          'Duration': duration
        }
        item['CustomTitle'] = document.getElementById("add-title").value;
        item['CustomArtist'] = document.getElementById("add-artist").value;
        
        addToDB(item);
      }
      else {
        alert('Video doesnt have a duration');
        addButton.disabled = false;
      }
    },
    function(err) { 
      console.error("Execute error", err); 
      addButton.disabled = false;
    });

    
  }
  else {
    alert('Video is already in the list');
    addButton.disabled = false;
  }
}

/**
* Communicates with Lambda to add the given item to the DB.
*
* @param {object} item  a properly formatted object for the db to consume.
*/
function addToDB(item){
  postParams = {
    'method': 'POST',
    'header': {'Content-Type': 'application/json'},
    'body': JSON.stringify(item)
  }
  fetch('https://4m42dwn6k5.execute-api.us-east-1.amazonaws.com/prod/add-video', postParams)
    .then(function(response) {
      return response.json();
    })
    .then(function(myJson) {
      playlist.push(item);
      addVideoToQueue(item, playlist.length-1);
      hideSearchForm();
      let addButton = document.querySelector('.confirm-add');
      addButton.disabled = false;
    });
}

/**
* Opens the add video form
*/
function openAddVideoForm(){
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('add-video-popup').classList.remove('hidden');
};

/**
* Clears search results.
*/
function hideSearchForm(){
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('add-video-popup').classList.add('hidden');
  document.getElementById('search-input').value = '';
  document.getElementById('add-title').value = '';
  document.getElementById('add-artist').value = '';
  clearSearchResults();
  hideConfirmButton();
};

/**
* Clears search results.
*
*/
function clearSearchResults(){
  var searchResults = document.getElementById("search-results");
  while (searchResults.firstChild) {
      searchResults.removeChild(searchResults.firstChild);
  }
}


/**
* Initalize the Youtube Player
*/
function onYouTubePlayerAPIReady() {
    player = new YT.Player('player', {
      width: '640',
      height: '390',
      videoId: '',
      playerVarss: {
        'autoplay': 0
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange
      }
    });
}

/**
* When the player is ready we initialize our app and pull down the playlist.
*
* @param {object} event  youtube player event.
*/
function onPlayerReady(event) {
    init();
}

/**
* When the youtube video has ended, we play the next video.
*
* @param {object} event  youtube player event.
*/
function onPlayerStateChange(event) {
    if(event.data === 0) {
        playNow(1);
    }
    if(event.data === 5 && autoplay === true) {
      player.playVideo();
  }
}

/**
* Loads the google api (gapi) so that we can search youtube for videos and 
* grab their details.
*/
function loadClient() {
  gapi.client.setApiKey("AIzaSyCoK-XocYfQ_3qcBw0cPEWPe4KTIOVdq5k");
  return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
      .then(function() { console.log("GAPI client loaded for API"); },
            function(err) { console.error("Error loading GAPI client for API", err); });
}

/**
* Authorize the gapi client with our token.
*
* The token can only used by this website ;).
*/
gapi.load("client:auth2", function() {
  gapi.auth2.init({client_id: "800770865782-6mprnnnndebi2r9hd70iqcm7r71gnjul.apps.googleusercontent.com"})
    .then(function(){
      loadClient();
    });
});

/**
* formats youtubes duration string into a more human readable format.
*
* @param {string} duration  duration must be in ISO 8601 format
*
* @return {string} a string in the format of MM:SS.
*/
function formatDuration(duration){
  formatted_duration = '';
  hours = duration.match(/(\d+)H/);
  minutes = duration.match(/(\d+)M/);
  seconds = duration.match(/(\d+)S/);
  if (hours || (minutes && minutes[1] >= 20)){
    alert('Video must be under 20 minutes long');
    return null;
  }
  if (!minutes) {
    minutes = '00';
  }
  else if (minutes[1] < 10) {
    minutes = '0'+minutes[1];
  }
  else {
    minutes = minutes[1];
  }
  
  if (!seconds) {
    seconds = '00';
  }
  else if (seconds && seconds[1] < 10) {
    seconds = '0'+seconds[1];
  }
  else {
    seconds = seconds[1];
  }
  return `${minutes}:${seconds}`;
}