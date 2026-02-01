# Ambient Audio Files Setup

This document provides guidance on sourcing and adding ambient audio files for the conversation feature.

## Required Audio Files

The following MP3 files should be added to `/public/audio/ambiance/`:

1. `cafe.mp3` - Coffee shop ambiance
2. `office.mp3` - Office environment sounds
3. `restaurant.mp3` - Restaurant ambiance
4. `hospital.mp3` - Hospital/clinic sounds
5. `street.mp3` - City street sounds
6. `train.mp3` - Train station ambiance
7. `airport.mp3` - Airport sounds
8. `park.mp3` - Park/nature sounds
9. `home.mp3` - Quiet indoor ambiance
10. `supermarket.mp3` - Supermarket sounds
11. `library.mp3` - Library ambiance

## Recommended Sources for Royalty-Free Audio

### 1. Freesound.org
- URL: https://freesound.org
- License: Creative Commons (check individual licenses)
- Quality: High
- Search tips: Use specific keywords like "coffee shop ambiance loop"

### 2. Pixabay
- URL: https://pixabay.com/sound-effects/
- License: Free for commercial use, no attribution required
- Quality: Good
- Easy to use with clear licensing

### 3. Mixkit
- URL: https://mixkit.co/free-sound-effects/
- License: Free for commercial use
- Quality: Professional
- Well-organized categories

### 4. Zapsplat
- URL: https://www.zapsplat.com/
- License: Free with attribution (or paid for no attribution)
- Quality: High
- Large collection

## Audio Specifications

- **Format**: MP3
- **Bitrate**: 128kbps (sufficient for ambient background)
- **Length**: 30-60 seconds for seamless looping
- **Volume**: Normalize to -20dB for consistent playback
- **Looping**: Ensure audio loops seamlessly (fade in/out at edges)

## Example Search Terms

- "cafe ambiance loop"
- "office background sounds"
- "restaurant chatter"
- "hospital corridor ambiance"
- "city street traffic"
- "train station announcement"
- "airport terminal sounds"
- "park birds chirping"
- "quiet room tone"
- "supermarket sounds"
- "library atmosphere"

## How to Add Files

1. Download audio files from the sources above
2. Convert to MP3 if needed (use FFmpeg or online converters)
3. Normalize volume and ensure they loop well
4. Rename according to the list above
5. Place in `/public/audio/ambiance/` directory
6. Test in the application

## Audio Editing Tools

If you need to edit or loop audio:

- **Audacity** (Free, cross-platform): https://www.audacityteam.org/
- **FFmpeg** (Command-line):
  ```bash
  # Convert to MP3 and normalize
  ffmpeg -i input.wav -b:a 128k -af loudnorm output.mp3
  ```

## License Compliance

Always:
- Check the license before downloading
- Keep attribution if required
- Download files legally
- Verify commercial use is allowed

## Alternative: AI-Generated Audio

You can also use AI audio generation tools:
- ElevenLabs Sound Effects (if available)
- Other AI audio generation platforms

## Note

The application will work without ambient audio files. The audio playback will simply fail silently if files are missing. This is an enhancement feature, not a requirement.
