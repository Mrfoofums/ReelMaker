require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const apiKey = process.env.API_KEY;

function cutVideoIntoSegments(sourceFilePath) {
  return new Promise((resolve, reject) => {
  const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
  // Create the output directory
  const outputDirectory = path.join(path.dirname(sourceFilePath), `output_${fileName}`);
  fs.mkdirSync(outputDirectory, { recursive: true });

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
      resolve();
    } else {
      console.error('Video segmentation failed.');
      reject(new Error('Video segmentation failed'));
    }
  });
});
}

// Example usage: node cut-video.js /path/to/video.mp4
const sourceFilePath = process.argv[2];
const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
const outputDirectory = path.join(path.dirname(sourceFilePath), `output_${fileName}`);
const prompt = process.argv[3];

async function main() {
  try {
    let titles = await generateVideoTitles(prompt, 100); // Wait for titles to be generated
    titles = titles.map((title, index) => {
      // Remove characters that are not allowed in filenames
      const sanitizedTitle = title.replace(/[/\\?%*:|"<>]/g, '-');
      // Remove leading numbers and spaces
      const cleanedTitle = sanitizedTitle.replace(/^\d+\.\s*/, '');
      return `${cleanedTitle}`;
    });
    // console.log(`Titles values are: ${titles}`);
    await cutVideoIntoSegments(sourceFilePath, titles);
    renameVideosInOutputDirectory(outputDirectory, titles)
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

function renameVideosInOutputDirectory(outputDirectory, titles) {
  const files = fs.readdirSync(outputDirectory);
  const videoFiles = files.filter((file) => file.endsWith('.mp4'));

  if (videoFiles.length === 0) {
    console.log('No video files found in the output directory.');
    return;
  }

  console.log(`Found ${videoFiles.length} video files in the output directory.`);

  for (let i = 0; i < videoFiles.length; i++) {
    const oldFilePath = path.join(outputDirectory, videoFiles[i]);
    const newTitle = titles[i % titles.length]; // Use titles sequentially, looping if necessary
    const newFileName = `${i + 1}. ${newTitle}.mp4`;
    const newFilePath = path.join(outputDirectory, newFileName);

    fs.renameSync(oldFilePath, newFilePath);
    console.log(`Renamed "${path.basename(oldFilePath)}" to "${newFileName}"`);
  }

  console.log('Video renaming complete.');
}




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
