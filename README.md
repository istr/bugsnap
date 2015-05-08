# Introduction
This is Chrome extension that allows you to take page screenshots, annotate them and post directly to your bug tracker.

Supported trackers:

* GitLab
* Gemini
* Jira
* Rally
* Redmine
* YouTrack

## Warning

Since GitLab doesn't have an API endpoint for uploading files, we worked around it by posting
directly to the GitLab site, once [API to attach attachments](http://feedback.gitlab.com/forums/176466-general/suggestions/3865548-api-to-attach-attachments-to-notes-issue-comments)
is committed, the code will be updated.

To be able to use this extensions, you need:

- Your private token: https://YOUR_GITLAB_SERVER/profile/account
- To be logged in at https://YOUR_GITLAB_SERVER in the same browser session
- Set the options first and close and re-open the extension

## Extension

- [Get it for Chrome](https://chrome.google.com/webstore/detail/bugsnap-gitlab/fkpibgcheloimcdickpmcffanfcbdkjo)
- [Original extension without GitLab support](https://chrome.google.com/webstore/detail/bugsnap/mfodpdfcbkmkdebahlkghnegochneenh)

# Development

Setting environment and packaging:

1. Install nodejs
2. Install grunt (sudo npm install -g grunt-cli)
3. Navigate to bugsnap root folder and install modules (npm install)
4. Package extensions (grunt)

Packaged extensions will appear in build folder.

Chrome extension can be tested directly by using "Load unpacked extension..."
button on Extensions page and pointing it to chrome directory.
