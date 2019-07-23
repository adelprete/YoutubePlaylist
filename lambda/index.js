const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

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
            if (data.Items.length > 30) {
                let itemsToRemove = data.Items.splice(30, data.Items.length-1);
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
};