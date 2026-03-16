import base64
import io
import json
import logging
import os
import subprocess
import tempfile
import time
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pipeline")

# Shared Vertex AI client (lazy)
_genai_client = None


def get_genai_client():
    global _genai_client
    if _genai_client is None:
        import google.genai as genai
        project_id = os.getenv("PROJECT_ID")
        location = os.getenv("LOCATION", "us-central1")
        _genai_client = genai.Client(vertexai=True, project=project_id, location=location)
        logger.info(f"GenAI client initialized (project={project_id}, location={location})")
    return _genai_client


# =============================================================================
# 1. Describe Toy — Gemini analyzes the toy image
# =============================================================================

class DescribeToyRequest(BaseModel):
    image: str
    toy_name: Optional[str] = ""


class DescribeToyResponse(BaseModel):
    description: str
    success: bool


@router.post("/describe-toy")
async def describe_toy(request: DescribeToyRequest):
    try:
        from google.genai import types
        client = get_genai_client()
        image_bytes = base64.b64decode(request.image)

        prompt = (
            "You are helping create an animated children's movie. "
            "Describe this toy in detail so an image/video generator can recreate it as a Pixar-style animated character. "
            "Include: animal/object type, color, size, distinguishing features, expression, pose. "
            "Be very specific about colors and proportions. "
            "Output ONLY the description, no preamble."
        )
        if request.toy_name:
            prompt += f"\nThe child calls this toy '{request.toy_name}'."

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(role="user", parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    types.Part.from_text(text=prompt),
                ])
            ],
        )

        description = response.text.strip()
        logger.info(f"Toy description: {description[:120]}...")
        return DescribeToyResponse(description=description, success=True)

    except Exception as e:
        logger.error(f"Describe toy error: {e}")
        fallback = request.toy_name or "a small toy animal"
        return DescribeToyResponse(
            description=f"A cute {fallback} character, Pixar animation style, friendly expression, vibrant colors",
            success=True,
        )


# =============================================================================
# 2. Create Storyboard — Gemini breaks story into sequential frame descriptions
# =============================================================================

class StoryboardRequest(BaseModel):
    toy_description: str
    clean_story: str
    setting: str
    num_frames: Optional[int] = 8


class StoryboardResponse(BaseModel):
    frames: List[str]
    success: bool


@router.post("/create-storyboard")
async def create_storyboard(request: StoryboardRequest):
    """Use Gemini to break the story into detailed sequential frame descriptions."""
    try:
        from google.genai import types
        client = get_genai_client()

        prompt = f"""You are a storyboard artist for a Pixar-style animated children's movie.

CHARACTER: {request.toy_description}
STORY: {request.clean_story}
SETTING: {request.setting}

Break this story into exactly {request.num_frames} sequential frames for animation.
Each frame must describe a SPECIFIC MOMENT showing what the character is DOING.
The frames should progress the story from beginning to end like a real movie.

Rules:
- Each frame is one sentence describing the exact visual scene
- Include the character's pose, action, and expression in EVERY frame
- Include background/setting details in EVERY frame
- Make frames flow smoothly from one to the next like animation
- Show movement progression (e.g. "walking toward" → "reaching for" → "holding up")
- Include camera angle hints (wide shot, close-up, low angle, etc.)

Return ONLY a JSON array of strings. Example:
["Wide shot: A small gray elephant stands at the edge of a lush jungle, ears perked up, looking curious.",
"Medium shot: The elephant takes its first steps into the jungle, pushing through big green leaves with its trunk.",
...]

Return {request.num_frames} frames as a JSON array:"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        text = response.text.strip()
        # Extract JSON array from response
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        frames = json.loads(text)
        if not isinstance(frames, list) or len(frames) == 0:
            raise ValueError("Invalid storyboard format")

        logger.info(f"Storyboard created: {len(frames)} frames")
        for i, f in enumerate(frames):
            logger.info(f"  Frame {i+1}: {f[:80]}...")

        return StoryboardResponse(frames=frames, success=True)

    except Exception as e:
        logger.error(f"Storyboard creation error: {e}")
        # Fallback: split story into simple frames
        sentences = [s.strip() for s in request.clean_story.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        fallback_frames = []
        for s in sentences[:request.num_frames]:
            fallback_frames.append(f"{request.toy_description} {s}. Setting: {request.setting}.")
        if not fallback_frames:
            fallback_frames = [f"{request.toy_description} in {request.setting}, looking around."]
        return StoryboardResponse(frames=fallback_frames, success=True)


# =============================================================================
# 3. Generate Video — Try Veo first, fall back to Imagen frames
# =============================================================================

class GenerateVideoRequest(BaseModel):
    toy_description: str
    clean_story: str
    setting: str
    style: Optional[str] = "Pixar 3D animated children's movie"
    duration_seconds: Optional[int] = 8


class GenerateVideoResponse(BaseModel):
    video: Optional[str] = None  # base64 MP4 video (from Veo)
    frames: Optional[List[str]] = None  # base64 PNG images (from Imagen fallback)
    method: str  # "veo" or "imagen"
    success: bool


@router.post("/generate-video")
async def generate_video(request: GenerateVideoRequest):
    """Generate animated video. Creates a storyboard first, then generates
    one Veo clip per story beat (sequenced correctly). Falls back to Imagen frames."""

    # Step 1: Create storyboard (breaks story into sequential beats)
    storyboard_req = StoryboardRequest(
        toy_description=request.toy_description,
        clean_story=request.clean_story,
        setting=request.setting,
        num_frames=4,  # 4 beats → 4 Veo clips → ~32s video, or 4 Imagen frames
    )
    storyboard = await create_storyboard(storyboard_req)
    beats = storyboard.frames
    logger.info(f"Storyboard has {len(beats)} beats")

    # Step 2: Try Veo — launch ALL clips in parallel, then poll all
    try:
        from google.genai import types
        client = get_genai_client()

        # Launch all Veo operations at once
        operations = []
        for i, beat in enumerate(beats):
            beat_prompt = (
                f"A scene from a {request.style}: "
                f"{request.toy_description} — {beat}. "
                f"Setting: {request.setting}. "
                "Vibrant colors, child-friendly, cinematic camera, "
                "no text, no humans, no hands, no real photos. "
                "Smooth animation, the character acts out this specific moment."
            )

            logger.info(f"Launching Veo clip {i+1}/{len(beats)}: {beat[:80]}...")

            operation = client.models.generate_videos(
                model="veo-2.0-generate-001",
                prompt=beat_prompt,
                config=types.GenerateVideosConfig(
                    number_of_videos=1,
                    duration_seconds=5,
                    aspect_ratio="16:9",
                ),
            )
            operations.append((i, operation))

        logger.info(f"All {len(operations)} Veo clips launched in parallel, polling...")

        # Poll all operations until all done (max 4 min total)
        timeout = 240
        start = time.time()
        while True:
            if time.time() - start > timeout:
                logger.warning("Veo parallel generation timed out")
                break

            all_done = True
            for idx, (i, op) in enumerate(operations):
                if not op.done:
                    all_done = False
                    operations[idx] = (i, client.operations.get(op))

            if all_done:
                break

            done_count = sum(1 for _, op in operations if op.done)
            logger.info(f"Veo progress: {done_count}/{len(operations)} clips done ({int(time.time()-start)}s elapsed)")
            time.sleep(5)

        # Collect results in order
        veo_clips = []
        for i, op in operations:
            if op.done and op.result and op.result.generated_videos:
                video_data = op.result.generated_videos[0].video
                if hasattr(video_data, 'video_bytes') and video_data.video_bytes:
                    veo_clips.append((i, video_data.video_bytes))
                    logger.info(f"Veo clip {i+1} collected: {len(video_data.video_bytes)} bytes")

        # Sort by beat order and concatenate using ffmpeg
        veo_clips.sort(key=lambda x: x[0])

        if len(veo_clips) == 0:
            raise Exception("No Veo clips generated")

        if len(veo_clips) == 1:
            return GenerateVideoResponse(
                video=base64.b64encode(veo_clips[0][1]).decode("utf-8"),
                method="veo", success=True,
            )

        # Use ffmpeg to properly mux multiple MP4 clips into one
        logger.info(f"Muxing {len(veo_clips)} Veo clips with ffmpeg...")
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                # Write each clip to a temp file
                clip_paths = []
                for i, clip_data in veo_clips:
                    clip_path = os.path.join(tmpdir, f"clip_{i:02d}.mp4")
                    with open(clip_path, "wb") as f:
                        f.write(clip_data)
                    clip_paths.append(clip_path)

                # Create ffmpeg concat demuxer file
                concat_path = os.path.join(tmpdir, "concat.txt")
                with open(concat_path, "w") as f:
                    for cp in clip_paths:
                        f.write(f"file '{cp}'\n")

                output_path = os.path.join(tmpdir, "output.mp4")

                # Try stream copy first (fastest)
                cmd = [
                    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", concat_path, "-c", "copy",
                    "-movflags", "+faststart", output_path,
                ]
                result = subprocess.run(cmd, capture_output=True, timeout=30)

                if result.returncode != 0:
                    logger.warning("ffmpeg copy-concat failed, re-encoding...")
                    cmd = [
                        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                        "-i", concat_path, "-c:v", "libx264", "-preset", "fast",
                        "-crf", "22", "-movflags", "+faststart", output_path,
                    ]
                    result = subprocess.run(cmd, capture_output=True, timeout=120)
                    if result.returncode != 0:
                        raise Exception(f"ffmpeg failed: {result.stderr.decode()[:200]}")

                with open(output_path, "rb") as f:
                    combined = f.read()

                combined_b64 = base64.b64encode(combined).decode("utf-8")
                logger.info(f"Veo complete: {len(veo_clips)} clips muxed, {len(combined)/1024/1024:.1f}MB")
                return GenerateVideoResponse(video=combined_b64, method="veo", success=True)

        except Exception as mux_err:
            logger.error(f"ffmpeg mux failed: {mux_err}, returning first clip only")
            return GenerateVideoResponse(
                video=base64.b64encode(veo_clips[0][1]).decode("utf-8"),
                method="veo", success=True,
            )

    except Exception as veo_err:
        logger.warning(f"Veo failed ({veo_err}), falling back to Imagen storyboard...")

    # Step 3: Fallback — Imagen storyboard (one image per beat)
    try:
        from google.genai import types
        client = get_genai_client()
        generated_frames = []

        # Use more frames for Imagen since they're static images
        storyboard_req.num_frames = 8
        storyboard = await create_storyboard(storyboard_req)
        beats = storyboard.frames

        for i, desc in enumerate(beats):
            try:
                prompt = (
                    f"A single frame from a {request.style}: {desc}. "
                    "Vibrant colors, child-friendly, cinematic lighting, "
                    "detailed background, no text, no humans, no hands. "
                    "The character must be clearly visible and animated style."
                )

                logger.info(f"Imagen frame {i+1}/{len(beats)}: {desc[:80]}...")

                response = client.models.generate_images(
                    model="imagen-3.0-generate-002",
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio="16:9",
                        safety_filter_level="BLOCK_MEDIUM_AND_ABOVE",
                    ),
                )

                if response.generated_images and len(response.generated_images) > 0:
                    img_bytes = response.generated_images[0].image.image_bytes
                    generated_frames.append(base64.b64encode(img_bytes).decode("utf-8"))
                    logger.info(f"Imagen frame {i+1} done!")

            except Exception as frame_err:
                logger.warning(f"Imagen frame {i+1} failed: {frame_err}")

        if generated_frames:
            logger.info(f"Imagen storyboard complete: {len(generated_frames)} frames")
            return GenerateVideoResponse(frames=generated_frames, method="imagen", success=True)

        raise Exception("No frames generated")

    except Exception as e:
        logger.error(f"Video generation completely failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Legacy endpoint ---

class GenerateAnimatedFrameRequest(BaseModel):
    toy_description: str
    scene_description: str
    setting: str
    style: Optional[str] = "Pixar 3D animated children's movie"


@router.post("/generate-animated-frame")
async def generate_animated_frame(request: GenerateAnimatedFrameRequest):
    try:
        from google.genai import types
        client = get_genai_client()

        prompt = (
            f"A scene from a {request.style}: "
            f"{request.toy_description} "
            f"{request.scene_description}. "
            f"Setting: {request.setting}. "
            "Vibrant colors, child-friendly, cinematic lighting, "
            "detailed background, no text, no humans, no hands."
        )

        response = client.models.generate_images(
            model="imagen-3.0-generate-002",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
                safety_filter_level="BLOCK_MEDIUM_AND_ABOVE",
            ),
        )

        if response.generated_images and len(response.generated_images) > 0:
            image_bytes = response.generated_images[0].image.image_bytes
            return {"image": base64.b64encode(image_bytes).decode("utf-8"), "success": True}
        raise Exception("No image generated")

    except Exception as e:
        logger.error(f"Animated frame generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
