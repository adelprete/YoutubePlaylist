init();
/**
* Grab the playlist history.
*
* Uses the Fetch API to speak to our Lambda function which then pulls the playlist history
* from an S3 json file.
*/
function init() {
  // hide fields after they've gotten their listners
  //document.getElementById("search-input-group").classList.toggle("hidden");
  
  fetch('https://4m42dwn6k5.execute-api.us-east-1.amazonaws.com/prod/history',{mode: 'cors'})
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      let playlistHistory = json['playlistHistory'];
      
      let tracks = document.querySelector('#tracks');
      let track = document.querySelector('#track');
      playlistHistory.forEach(function (item, index) {
        let clone = document.importNode(track.content, true);
        let a = clone.querySelectorAll('a');
        a[0].href = `https://www.youtube.com/watch?v=${item.videoId}`;
        let spans = clone.querySelectorAll('span');
        spans[0].textContent = item.title;
        spans[1].textContent = item.artist;
        tracks.appendChild(clone);
      });
      
    });
}