# Cinemachine - Approach & Discussion

## Concept
Kids create movies from their toys. They record themselves playing with toys on a fixed camera, speaking dialogue while moving them. The system transforms raw footage into an animated movie — hands removed, fantasy backgrounds generated, eyes and lip sync added to bring toys to life.

## Key Insight: Fixed Camera Simplification
With a fixed camera, only the toys move. This eliminates the hardest problem (hand inpainting) entirely:
- Instead of removing hands from the scene, we **segment only the toy** and discard everything else
- The hand never makes it into the final frame
- Background is generated fresh from scratch via image generation — no need to preserve the original

## Pipeline

```
Fixed Camera Shot
        │
        ▼
 Reference Frame (empty scene, no toys — captured once)
        │
        ▼
 Segment Toy Only (SAM2 tracks the toy, hands excluded from mask)
        │
        ▼
 Extract Toy Cutout + Track Position (clean toy pixels, no hands, no BG)
        │
        ▼
 Generate World BG (Nanobanana generates fantasy world, once per scene,
                     based on story context from voice agent)
        │
        ▼
 Composite Toy onto New World
   + Add eyes/mouth (overlay, tracked to toy position)
   + Lip sync mouth to audio
   + Mild body animation (squash/stretch, bounce)
        │
        ▼
 Final Movie
```

## Tech Stack (Planned)

| Component | Technology |
|---|---|
| Voice Agent | Gemini Live API (real-time voice) |
| Segmentation | SAM2 / GroundingDINO + SAM |
| Background Gen | Nanobanana Pro (image generation) |
| Eye/Feature Gen | Nanobanana (targeted generation) |
| Lip Sync | Wav2Lip / SadTalker / similar |
| Video Consistency | Frame interpolation, optical flow |

## Remaining Challenges

### 1. Toy Segmentation Quality
SAM2 needs to cleanly separate toy from hand at contact points. Fingers overlapping the toy body are edge cases. May need mask refinement/erosion at hand-toy boundaries.

### 2. Background Generation
One-shot per scene. Voice agent determines setting ("forest", "castle"), Nanobanana generates it once. Static BG = no temporal consistency issues.

### 3. Eyes + Mouth Placement
- Detect the "face area" of the toy (or let kid specify via voice agent)
- Generate eyes/mouth style matching the toy aesthetic
- Track placement as toy moves frame-to-frame
- Lip sync mouth to audio dialogue

### 4. Mild Body Animation
Subtle animations to make toy feel alive:
- Slight squash/stretch on toy cutout
- Breathing motion, head tilt
- Could be driven by audio energy (bounces when speaking)

## MVP Build Order
1. Fixed camera + toy segmentation — get clean cutouts working
2. BG generation — composite toy onto a generated world
3. Voice agent — conversational flow to get story context
4. Eyes + mouth overlay — bring the toy to life
5. Lip sync + body animation — polish

## Open Questions
- How to handle multiple toys in one scene?
- Should the kid specify toy "face" location, or auto-detect?
- What resolution / frame rate is needed for the output?
- How long should a typical "movie" be? (affects processing time)
- Audio: keep kid's voice as-is, or generate character voices?
