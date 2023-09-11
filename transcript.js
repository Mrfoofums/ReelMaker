const axios = require('axios');
require('dotenv').config()
const fs = require('fs');
async function findInterestingSectionsInTranscriptFromFile(filename) {
    try {
      const transcript = fs.readFileSync(filename, 'utf8');
      const sections = splitTranscriptIntoSections(transcript, 7 * 60); // Split into 7-minute sections
      const responses = [];
  
      for (let i = 0; i < sections.length; i++) {
        console.log(`Executing iteration ${i}`);
        const section = sections[i];
        const response = await analyzeTranscriptSection(section);
  
        if (response && response.data.choices && response.data.choices.length > 0) {
          const timestamp = section.timestamp;
          const answer = response.data.choices[0].text.trim();
          responses.push({ timestamp, answer });
        }
      }
  
      return responses;
    } catch (error) {
      console.error('Error reading or analyzing the transcript:', error);
      return null;
    }
  }
  
  function splitTranscriptIntoSections(transcript, sectionDurationInSeconds) {
    const lines = transcript.split('\n');
    const sections = [];
    let currentSection = { timestamp: '', text: '' };
    let prevTimestampInSeconds = 0;
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^\d{2}:\d{2}:\d{2}:\d{2}\s+-/)) {
        if (currentSection.text !== '') {
          sections.push(currentSection);
          currentSection = { timestamp: '', text: '' };
        }
  
        // Extract the timestamp in seconds
        const timestampParts = line.split(' ')[0].split(':').map(Number);
        const timestampInSeconds =
          timestampParts[0] * 1440 +
          timestampParts[1] * 60 +
          timestampParts[2] +
          timestampParts[3] / 100;
  
        // Check if the current timestamp is more than 7 minutes ahead of the previous one
        if (timestampInSeconds - prevTimestampInSeconds > sectionDurationInSeconds) {
          sections.push(currentSection);
          currentSection = { timestamp: '', text: '' };
        }
  
        currentSection.timestamp = line;
        prevTimestampInSeconds = timestampInSeconds;
      } else {
        currentSection.text += line + ' ';
      }
    }
  
    if (currentSection.text !== '') {
      sections.push(currentSection);
    }
  
    return sections;
  }
  
  async function analyzeTranscriptSection(section) {
    try {
      const apiUrl = 'https://api.openai.com/v1/engines/text-davinci-003/completions';
      const response = await axios.post(
        apiUrl,
        {
          prompt: `Find the interesting parts of this transcript:\n\n${section.text}`,
          max_tokens: 150, // Adjust based on your token limit
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      return response;
    } catch (error) {
      console.error('Error analyzing transcript section:', error);
      return null;
    }
  }

  const filename = process.argv[2];

  if (!filename) {
    console.error('Please provide a filename as a command line argument.');
  } else {
    findInterestingSectionsInTranscriptFromFile(filename)
      .then((responses) => {
        console.log('Interesting Sections and Timestamps:');
        console.log(responses);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }