## YouTube Playlist

A simple music oriented video playlist that users can add random videos to. The 30 most recently added videos to the playlist are kept.

This static website is hosted from an AWS S3 buckets and uses various AWS services along the way to get the job done.

No external libraries were used on the frontend as I tried to stick with vanilla.js, css, css grid and simple HTML.

## AWS Tools Used

**S3** - The template and stylesheets are served from an Amazon S3 bucket.

**Lambda** - An AWS Lambda function is invoked when retrieving a playlist and adding to the playlist.

**API GATEWAY** - A single proxy resource was created that points to the Lambda function.

**DynamoDB** - DynamoDB stores the playlist.  Each video is on a single Partition Key and the Sort Key helps determine which videos need to be removed.

**CloudWatch** - Each AWS service has its logs stored into AWS CloudWatch.

**IAM** - An IAM role was created to allow the Lambda function to communicate with DynamoDB, CloudWatch.
