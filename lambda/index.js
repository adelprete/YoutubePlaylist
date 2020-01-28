const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
    
    if (event.path === '/add-video') {
        const requestBody = JSON.parse(event.body);
        requestBody['CreatedAt'] = new Date().toISOString();
        requestBody['PlaylistID'] = 1;
        ddb.put({
            TableName: 'Playlist',
            Item: requestBody,
        },function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({'message': 'added successfully'}),
                headers: {'Access-Control-Allow-Origin': '*'},
            });
          }
        });
    }
    else if (event.path === '/playlist') {
        let params = {
            TableName: 'Playlist',
            KeyConditionExpression: 'PlaylistID = :id',
            ExpressionAttributeValues: {
                ':id': 1
            },
            ScanIndexForward: false
        };
        ddb.query(params,function(err, data) {
            
          if (err) {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({'error': err}),
                headers: {'Access-Control-Allow-Origin': '*'},
            });
          } else {
            // See if we need to delete some videos
            if (data.Items.length > 40) {
                let itemsToRemove = data.Items.splice(40, data.Items.length-1);
                // Record the removed songs to our history
                itemsToRemove.forEach(item => addToHistory(item.CustomArtist, item.CustomTitle, item.VideoId));
                // Create our delete requests for DynamoDB
                const deleteRequests = itemsToRemove.map(function(x) {
                    let deleteRequest = {
                        'DeleteRequest': {
                            'Key': {
                                'PlaylistID': 1,
                                'CreatedAt': x.CreatedAt
                            }
                        }
                    };
                    return deleteRequest;
                });
                let removeParams = {
                    'RequestItems': { 
                        'Playlist': deleteRequests
                    }
                };
                // Delete playlist overflow
                ddb.batchWrite(removeParams, function(err, result) {
                    if (err) {
                        console.log('err: ', err);
                    }
                    else {console.log('successfully deleted');}
                    return;
                });
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({'playlist': data}),
                    headers: {'Access-Control-Allow-Origin': '*'},
                });
            }
            else {
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({'playlist': data}),
                    headers: {'Access-Control-Allow-Origin': '*'},
                });
            }
          }
        });
    }
    else if (event.path === '/history') {
        let params = {
            Bucket: process.env.BUCKET_NAME,
            Key: process.env.FILE_KEY
        };
        s3.getObject(params, function(err, result) {
            console.log('err: ', err);
            let playlistHistory = JSON.parse(result.Body.toString());
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({'playlistHistory': playlistHistory}),
                headers: {'Access-Control-Allow-Origin': '*'},
            });
        });
    }
};

function addToHistory(artist, title, videoId) {
        let params = {
            Bucket: process.env.BUCKET_NAME,
            Key: process.env.FILE_KEY
        };
        s3.getObject(params, function(err, result) {
            console.log('err in addToHistory: ', err);
            let playlistHistory = JSON.parse(result.Body.toString());
            console.log('artist: ', artist);
            console.log('title: ', title);
            console.log('videoId: ', videoId);
            playlistHistory.unshift({
                "title": title,
                "artist": artist,
                "videoId": videoId
            });
            s3.putObject({
              Bucket: process.env.BUCKET_NAME,
              Key: process.env.FILE_KEY,
              Body: JSON.stringify(playlistHistory),
              ContentType: "application/json"},
              function (err,data) {
                console.log(JSON.stringify(err) + " " + JSON.stringify(data));
              }
            );
        });
}

function getHistory() {
        let params = {
            Bucket: process.env.BUCKET_NAME,
            Key: process.env.FILE_KEY
        };
        s3.getObject(params, function(err, result) {
            console.log('err: ', err);
            return JSON.parse(result.Body.toString());
        });
}