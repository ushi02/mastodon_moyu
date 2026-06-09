# mastodon_moyu

[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

`TouchFish` is a low-profile reader designed for Mastodon.

![TouchFish dark mode](./dark_demo.png)

Dark mode preview

![TouchFish light mode](./light_demo.png)

Light mode preview

## What this app can do

This is a Mastodon reader for quietly checking your timeline.

- Low-profile: the UI is lighter and looks more like a small utility window than a full social website.
- More private: it does not put your avatar, display name, sidebar, and other social elements all over the screen like a normal web page.
- Keyboard-first: great for people who prefer Vim-style navigation and do not want to keep reaching for the mouse.
- One-key toggle: the most important part, it supports a global shortcut to show or hide the window instantly.

## Vim-friendly controls

Default reading controls:

- `j` / `k`: scroll down / up
- `u` / `d`: move half a page up / down
- `gg`: jump to the top
- `G`: jump to the bottom
- `r`: refresh the timeline

## One-key toggle

This app supports a global shortcut.

The default shortcut is:

```text
CommandOrControl + D
```

## How to fill in the instance URL and token

When you use the app for the first time, fill in these fields in Settings:

- `Instance URL`
- `Access Token`

### How to fill in the instance URL

Enter your own Mastodon instance URL, for example:

```text
https://mastodon.social
```

If you enter it without `https://`, the app will automatically add it for you.

### What the token is

The `Access Token` is basically a key that allows this app to read your timeline.

Right now, it is mainly used to read your `Home` timeline, and the app does not require you to log in again through a web page here.

### How to get the token

1. Open your Mastodon instance and log in to your account.
2. Go to:

```text
Preferences -> Development -> New Application
```

3. Create a new application.
4. Give it a name, for example `TouchFish`.
5. In `Scopes`, enable at least `read`.
6. After creating it, open the application's detail page.
7. Copy the `Access Token`.
8. Go back to TouchFish and paste it into the `Access Token` field in Settings.

After that, you can switch to the `Home` timeline.

## Languages

The current UI supports:

- Chinese
- English
- Japanese

You can switch the interface language in Settings.
