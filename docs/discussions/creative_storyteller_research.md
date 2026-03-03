# Creative Storyteller - Research & Discussion

## Concept
Build a 3D world where stories are told with camera movements and character expressions driven by real-time face/body motion capture via webcam. Integrate with a game engine for easy implementation.

## Core Modules
- **Character Generation** — Nano Banana + image-to-3D model pipeline
- **Skeleton Rigging** — Auto-rigging skeleton to the generated 3D asset
- **Real-time Motion Capture** — Live footage of body movements mapped to characters
- **Face Expression Module** — Webcam face expression input driving character faces

## Feasibility Assessment

### What's realistic today
- Face tracking from webcam is mature (MediaPipe, Apple ARKit, face-landmarks-detection)
- Body pose estimation via webcam (MediaPipe Pose, MoveNet) is solid for upper body
- Unity has ready-made integrations for face/body retargeting (Unity Face Capture, Rokoko)
- Unreal's MetaHuman + LiveLink already does something similar at the high end

### Hard parts
- Mapping webcam body tracking to full 3D character animation with natural results is rough — occlusion, lower body, and hand tracking from a single camera are noisy
- Camera movement derived from user motion is a novel UX challenge
- Building a full 3D story world authoring tool is massive scope
- Quality gap between webcam mocap and professional mocap is significant

### Recommended MVP approach
Start narrow — a demo where webcam face expressions drive a single 3D character using MediaPipe + engine animation rigging. Skip the full story world scope initially.

## Game Engine: Godot vs Unity

### Why consider Godot
- Open source, no licensing fees
- Lightweight, fast iteration
- GDScript is beginner-friendly

### Godot Camera System (Cinemachine equivalent)

| Cinemachine Feature | Godot Equivalent |
|---|---|
| Virtual Cameras | **Phantom Camera** addon |
| Dolly Track | Path3D + PathFollow3D |
| Follow Target | RemoteTransform3D or Phantom Camera |
| Camera Blending | Phantom Camera or custom Tween |
| Freelook (orbital) | Custom script or Phantom Camera |
| Noise/Shake | Custom shader or addon |
| Timeline integration | AnimationPlayer + camera keyframes |

### Key Godot tools
- **Phantom Camera (phantom-camera)** — closest to Unity Cinemachine. Provides virtual cameras with priority switching, follow/look-at targets, damping, camera blending. Works with 2D and 3D.
- **Path3D + PathFollow3D** — rail-based camera movement
- **RemoteTransform3D** — attach camera to follow a target node
- **AnimationPlayer** — keyframe-based camera animations

### Motion capture pipeline into Godot
- MediaPipe landmarks -> WebSocket/OSC -> GDScript -> skeleton retargeting
- Godot's SkeletonIK and BoneAttachment3D nodes for applying captured poses

## Open Questions
- Which image-to-3D pipeline for character generation? (Nano Banana + ?)
- Auto-rigging solution for generated 3D models?
- Latency budget for real-time mocap -> character animation?
- Target platform: desktop app, web, or both?
