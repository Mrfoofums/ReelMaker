const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function cutVideoIntoSegments(sourceFilePath) {
  const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
  // Create the output directory
  const outputDirectory = path.join(path.dirname(sourceFilePath), `output_${fileName}`);
  fs.mkdirSync(outputDirectory, { recursive: true });

  // Get the file name without the extension

  // Run FFmpeg to cut the video into segments
  const ffmpegArgs = [
    '-i',
    sourceFilePath,
    '-c',
    'copy',
    '-map',
    '0',
    '-f',
    'segment',
    '-segment_time',
    '50',
    '-reset_timestamps',
    '1',
    '-segment_format',
    'mp4',
    path.join(outputDirectory, `${fileName}_%03d.mp4`)
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      console.log('Video segmentation complete.');
    } else {
      console.error('Video segmentation failed.');
    }
  });
}

// Example usage: node cut-video.js /path/to/video.mp4
const sourceFilePath = process.argv[2];

cutVideoIntoSegments(sourceFilePath);


// TO DO
// Add a call to Chat GPT here so that we can name the fiels as we cut them
// We want to fetch all the video names in 1 call, not multiple calls.
// 1) Calculate the total number of video names required
// 2) Apply the video names sequentially