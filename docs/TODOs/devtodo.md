# phase 1
### connect gemini services and start a voice agent that talks and stores shots and clips them into a single video
- [x] generate a good database archietecture to capture all these
    - Cloud SQL Postgres 15 with 6 tables (parents, kid_profiles, stories, shots, badges, kid_badges), 2 views, triggers
- [x] have google cloud native implementation in things like
    - [x] oauth — Google OAuth with iOS + Web client IDs, parent accounts → kid profiles
    - [x] postgres storage to store the users and stories — Cloud SQL instance running, schema deployed
    - [ ] gemini llm interactions ( live agent testing and prompting it in sync with permission) — Backend WebSocket proxy written, model name updated to gemini-2.0-flash-exp, needs end-to-end testing
- [ ] action to start recording , cut to stop , store the scene — Voice commands ([COMMAND:START_RECORDING/STOP_RECORDING]) implemented in backend, frontend wired but needs camera testing on real device
- [x] for the first phase we can just have audio interaction and recording the videos as is
    - [x] store the videos in gcp storage in an optimized way and easy to interact — GCS bucket with signed URL upload pattern, lifecycle policies
- [x] currently we have 3-4 shots and then ending it , have it dynamic , kid can add any number of shots and just clicks end / export to add all the clips — Dynamic shots with "Add Another" / "End Movie" buttons, export job with ffmpeg

### Infrastructure completed
- [x] GCP billing activated
- [x] APIs enabled, service account with roles
- [x] Cloud SQL instance (cinemachine-db)
- [x] GCS bucket (cinemachine-videos-f2c3e477)
- [x] Secrets in Secret Manager
- [x] Backend deployed to Cloud Run (https://cinemachine-api-684023745855.us-central1.run.app)
- [x] OAuth consent screen + iOS & Web client IDs
- [x] Auth flow working (Google sign-in → backend → kid profile creation)

### Still in progress
- [ ] Gemini Live voice session (model updated, needs retest after deploy)
- [ ] Camera recording on real device (simulator has no camera)
- [ ] Video upload to GCS via signed URLs
- [ ] Export Cloud Run Job (ffmpeg concat)
- [ ] End-to-end flow testing
