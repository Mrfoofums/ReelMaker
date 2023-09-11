require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const apiKey = process.env.API_KEY;

function cutVideoIntoSegments(sourceFilePath, titles) {
  const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
  // Create the output directory
  const outputDirectory = path.join(path.dirname(sourceFilePath), `output_${fileName}`);
  fs.mkdirSync(outputDirectory, { recursive: true });

  const sanitizedTitles = titles.map((title, index) => {
    // Remove characters that are not allowed in filenames
    const sanitizedTitle = title.replace(/[/\\?%*:|"<>]/g, '-');
    return `${index + 1}.mp4`;
  });

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
    path.join(outputDirectory, getRandomValueFromArray(sanitizedTitles))
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
const prompt = process.argv[3];

async function main() {
  try {
    let titles = await generateVideoTitles(prompt, 100); // Wait for titles to be generated
    // console.log(`Titles values are: ${titles}`);
    cutVideoIntoSegments(sourceFilePath, titles);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();


// TO DO
// Add a call to Chat GPT here so that we can name the fiels as we cut them
// We want to fetch all the video names in 1 call, not multiple calls.
// 1) Calculate the total number of video names required
// 2) Apply the video names sequentially
async function generateVideoTitles(prompt, numberOfTitles) {
  try {
    const apiUrl = 'https://api.openai.com/v1/engines/text-davinci-003/completions';

    const titles = [];

    while (titles.length < numberOfTitles) {
      const remainingTitles = numberOfTitles - titles.length;
      const response = await axios.post(
        apiUrl,
        {
          prompt: `Generate ${remainingTitles} video titles based on: ${prompt}\n`,
          max_tokens: 30, // Adjust the max tokens as needed to control title length
          n: remainingTitles, // Number of titles to generate in this request
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const generatedTitles = response.data.choices.map((choice) => choice.text);
      titles.push(...generatedTitles);
    }

    // Split the combined text into an array of lines
    const titleLines = titles.join('\n').split('\n').map((line) => line.trim());

    return titleLines.filter((line) => line); // Remove any empty lines
  } catch (error) {
    console.error('Error generating video titles:', error);
    throw error;
  }
}

// Example usage:
const numberOfTitles = 10; // Adjust the number as needed

// generateVideoTitles(prompt, numberOfTitles)
//   .then((titles) => {
//     console.log('Generated Video Titles:');
//     console.log(titles); // Returns an array with each line as an element
//   })
//   .catch((error) => {
//     console.error('Error:', error);
//   });

function getRandomValueFromArray(arr) {
  if (arr.length === 0) {
    return undefined; // Return undefined for an empty array
  }
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}
