---
version: alpha
name: YT Filter
description: Settings page of a Firefox extension that hides YouTube videos by title words.
colors:
  background: "#ffffff"
  text: "#1b1b1f"
  muted: "#5e5e66"
  border: "#74747e"
  primary: "#c4161c"
  on-primary: "#ffffff"
  background-dark: "#1b1b1f"
  text-dark: "#ececf1"
  muted-dark: "#a8a8b3"
  border-dark: "#8e8e99"
  primary-dark: "#ff5a5f"
  on-primary-dark: "#1b1b1f"
typography:
  body:
    fontFamily: system-ui, sans-serif
    fontSize: 16px
    lineHeight: 1.5
  label:
    fontFamily: system-ui, sans-serif
    fontSize: 16px
    fontWeight: 600
rounded:
  md: 8px
spacing:
  gap: 12px
  page: 16px
  button-x: 24px
components:
  textarea:
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.gap}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
---

## Overview

One settings page (`src/options.html`) shown inside Firefox's add-on manager: a list of words, a hint, and a Save button. It follows the system light or dark theme.

## Colors

A neutral surface with one red accent for the Save button and the focus ring. Dark mode uses each `-dark` twin through `color-scheme: light dark` and `light-dark()`.

## Typography

The system font at a single size, 16px; labels and the button use weight 600.

## Layout

A single column, 16px padding, at most 560px wide, 12px between items. It fits phone width with no horizontal scroll, and the button is 48px tall for touch.

## Components

- **Word list:** a resizable textarea, one word or phrase per line.
- **Save button:** the only filled control; a polite live region next to it confirms the save.

## Do's and Don'ts

- Do keep one font size and one accent colour.
- Don't add web fonts, icons or extra screens unless a request needs them.
