# Changelog

All notable changes to this project are documented in this file. Releases follow
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Notifications for new reset announcements reported by the Codex Resets public API.
- Conditional reset checks with ETag support and persisted reset IDs to prevent duplicate alerts.
- Automatic Docker Hub Overview updates during container publishing.

### Changed

- Prime notifications now show the five-hour remaining amount and the action on separate lines.
- Rewrote the English, Korean, and Docker Hub documentation around the user setup and operation flow.

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
