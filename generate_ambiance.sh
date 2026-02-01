#!/bin/bash

# Generate ambient audio files using ElevenLabs Sound Effects API
# Requires ELEVENLABS_API_KEY environment variable

set -e

API_KEY="${ELEVENLABS_API_KEY}"
API_URL="https://api.elevenlabs.io/v1/sound-generation"
OUTPUT_DIR="public/audio/ambiance"

if [ -z "$API_KEY" ]; then
    echo "Error: ELEVENLABS_API_KEY environment variable not set"
    exit 1
fi

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Function to generate audio file
generate_audio() {
    local filename="$1"
    local prompt="$2"
    local output_path="$OUTPUT_DIR/$filename"

    echo "Generating $filename..."
    echo "  Prompt: $prompt"

    # Call ElevenLabs API
    curl -X POST "$API_URL" \
        -H "xi-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"$prompt\",
            \"duration_seconds\": 30,
            \"prompt_influence\": 0.5,
            \"loop\": true,
            \"output_format\": \"mp3_44100_128\"
        }" \
        --output "$output_path" \
        --silent \
        --show-error

    # Check if file was created and has reasonable size
    if [ -f "$output_path" ]; then
        local filesize=$(stat -f%z "$output_path" 2>/dev/null || stat -c%s "$output_path" 2>/dev/null)
        if [ "$filesize" -gt 10240 ]; then
            echo "  ✓ Success (${filesize} bytes)"
        else
            echo "  ✗ Warning: File size is suspiciously small ($filesize bytes)"
        fi
    else
        echo "  ✗ Failed to create file"
    fi

    echo ""
}

echo "Starting ambient audio generation..."
echo "=================================="
echo ""

# Generate all 11 files
CURRENT=1
TOTAL=11

echo "[$CURRENT/$TOTAL]"
generate_audio "cafe.mp3" "Coffee shop ambiance with espresso machine sounds, quiet chatter, cups clinking"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "office.mp3" "Office environment with keyboard typing, mouse clicks, quiet murmurs, printer"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "restaurant.mp3" "Restaurant ambiance with dishes clinking, conversations, kitchen sounds"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "hospital.mp3" "Hospital corridor ambiance, quiet hallway, distant PA announcement, soft beeping"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "street.mp3" "City street sounds with traffic, car horns, pedestrians walking, distant sirens"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "train.mp3" "Train station ambiance with platform announcements, train arriving, crowd"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "airport.mp3" "Airport terminal sounds with flight announcements, rolling luggage, crowd murmur"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "park.mp3" "Park nature sounds with birds singing, gentle wind through trees, distant children"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "home.mp3" "Quiet indoor home ambiance, clock ticking, faint appliance hum, calm atmosphere"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "supermarket.mp3" "Supermarket ambiance with shopping cart wheels, checkout beeping, background music"
sleep 1
CURRENT=$((CURRENT + 1))

echo "[$CURRENT/$TOTAL]"
generate_audio "library.mp3" "Very quiet library ambiance, page turning, soft whispers, air conditioning hum"

echo "=================================="
echo "Generation complete!"
echo ""
echo "Verifying files..."
ls -lh "$OUTPUT_DIR"/*.mp3 2>/dev/null || echo "No MP3 files found"

echo ""
echo "Summary:"
echo "--------"
file_count=$(ls -1 "$OUTPUT_DIR"/*.mp3 2>/dev/null | wc -l | tr -d ' ')
echo "Generated $file_count of $TOTAL files"
