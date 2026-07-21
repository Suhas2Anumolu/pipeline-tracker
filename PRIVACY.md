# Privacy Policy — Pipeline: Job Capture

_Last updated: 2026-07-21_

## What this extension does

Pipeline: Job Capture lets you save the job posting you're currently viewing into your own instance of the Pipeline application (a self-hosted, open-source recruiting tracker).

## What data it accesses

- **Page content**: when you click the extension icon, it reads the current tab's page title and Open Graph meta tags (`og:site_name`, `og:title`) to guess the company and role. This only happens when you actively click the extension — it does not run in the background or monitor browsing.
- **The data you enter or edit**: company, role, source, deadline, and the posting URL, as shown and editable in the popup before you save anything.

## Where that data goes

When you click "Save to Pipeline," the data above is sent to the **API base URL you configured** in the extension's options page — this is your own Pipeline deployment, not a server operated by the extension's developer. The extension authenticates using a personal API token you generate from your own Pipeline account and paste into the options page.

## What the extension developer collects

Nothing. This extension has no analytics, no third-party trackers, and no server of its own. All data flows directly from your browser to the Pipeline instance you configured, over a connection you control.

## Data storage

The API base URL and token you enter are stored locally in your browser via the `chrome.storage.local` API. They are not synced to any account or transmitted anywhere except to your configured Pipeline instance on each save/connect action.

## Third parties

None. The only network requests this extension makes are to the API base URL you explicitly configure.

## Changes to this policy

If this extension's data handling changes in a future version, this file will be updated accordingly.

## Contact

Since Pipeline is self-hosted and open source, there is no central operator to contact about your data — you control the server it talks to. For questions about the extension's code, see the source repository.
