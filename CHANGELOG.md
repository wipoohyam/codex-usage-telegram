# Changelog

All notable changes to this project are documented in this file. Releases follow
[Semantic Versioning](https://semver.org/).

## Unreleased

## [0.4.1] - 2026-10-22

### Fixed

- Give login, language-setting, usage-error, and Prime-setting replies a clear first-line title in all four languages.
- Add localized titles to device-login instructions and the separate verification-code message while keeping only the code masked and copyable.
- Show all supported commands in `/help` and `/start`, including language options, `/lang`, and login confirmation aliases.

## [0.4.0] - 2026-10-22

### Added

- Notifications for new reset announcements reported by the Codex Resets public API.
- Advance Telegram notices for scheduled resets, including the expected time in the configured time zone.
- Pending schedule notifications on installation or upgrade, persisted deduplication, and updated notices when the schedule changes.
- Conditional reset checks with ETag support and persisted reset IDs to prevent duplicate alerts.
- Automatic Docker Hub Overview updates during container publishing.

### Changed

- Prime notifications now identify the action on the first line in all four languages.
- Rewrote the English, Korean, and Docker Hub documentation around the user setup and operation flow.

### Fixed

- Persist each delivered reset alert before sending the next one, and update the ETag only after all deliveries succeed so failed sends can be retried without repeating successful alerts.

## [0.3.0] - 2026-10-06

### Added

- Optional five-hour prime using a minimal `1+1=?` Codex request.
- Telegram commands to enable, disable, and inspect prime behavior.
- Two-decimal usage display and comparison.
- Configurable reset-time jitter tolerance and prime cooldown settings.

### Changed

- Prime notifications now run before the refreshed usage report.
- Usage is refreshed up to three times after a prime request.
- Reset-time differences of three minutes or less are ignored by default.
- Container releases now publish immutable semantic-version tags in addition to
  `latest` and commit SHA tags.

### Fixed

- Prevented repeated prime requests while the same five-hour cycle still reports
  100%.
- Prevented one-minute reset-time jitter from generating repeated notifications.
- Preserved prime settings and cycle state across container restarts.
