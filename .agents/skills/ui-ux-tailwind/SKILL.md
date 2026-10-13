---
name: ui-ux-tailwind
description: >-
  Provides styling standards, Tailwind CSS v4 conventions, and UI/UX design patterns for PicklePoint.
  Use when designing or styling React components, implementing dark mode aesthetics, creating responsive layouts,
  building accessible modals and form controls, or refining micro-interactions and transitions.
---

# UI/UX & Tailwind CSS v4 Design Skill

This skill defines the styling guidelines, visual design language, and Tailwind CSS v4 patterns used across the PicklePoint platform.

---

## 1. 🎨 PicklePoint Visual Identity & Design System

PicklePoint uses a high-contrast, modern dark-mode sports aesthetic with energetic accents:

| Token / Role | Tailwind Utility | Visual Purpose |
| :--- | :--- | :--- |
| **Primary Background** | `bg-slate-950` / `bg-slate-900` | Deep slate canvas for high readability |
| **Card / Surface Background** | `bg-slate-900/80` / `bg-slate-800/60` | Elevated glassmorphism surfaces with borders |
| **Primary Brand Accent** | `text-emerald-400` / `bg-emerald-500` | Court green / Pickleball vibrant energetic accent |
| **Secondary Accent** | `text-cyan-400` / `bg-cyan-500` | Digital tech accent for analytics and badges |
| **GCash Accent** | `bg-blue-600` / `text-blue-400` | Official GCash cobalt blue for payment flows |
| **Border / Dividers** | `border-slate-800` / `border-slate-700/60` | Subtle, clean separation without heavy visual clutter |
| **Text Primary** | `text-white` / `text-slate-100` | High-contrast main headers and primary text |
| **Text Secondary** | `text-slate-400` / `text-slate-300` | Subtitles, labels, timestamps, and secondary info |

---

## 2. ⚡ Tailwind CSS v4 Best Practices

This project uses `@tailwindcss/vite` with Tailwind CSS v4:

1. **Native CSS Variables & Vite Integration**:
   - Styling is driven directly by `@import "tailwindcss";` in [src/App.css](file:///c:/Users/GeranPeredo/Documents/reactjs/pickleball_court_reservation/src/App.css).
   - Use standard utility classes rather than heavy bespoke CSS blocks.
2. **Glassmorphism & Backdrop Blurs**:
   - For sticky headers, floating summaries, and modal backdrops:
     ```tsx
     <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-xl rounded-2xl">
     ```
3. **Rounded Corners & Spacing**:
   - Standard card border radius: `rounded-2xl` or `rounded-3xl` for hero containers.
   - Standard button border radius: `rounded-xl` or `rounded-2xl`.
   - Badge pill border radius: `rounded-full`.

---

## 3. 📱 Responsive & Mobile-First Layouts

A large portion of pickleball players and organizers use mobile smartphones at the courts. All views must be rigorously mobile-optimized:

1. **Grid to Stack Breakpoints**:
   - Always structure layouts to display single-column on mobile (`col-span-1`), expanding to multi-column on tablet and desktop (`md:grid-cols-2`, `lg:grid-cols-3`):
     ```tsx
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
     ```
2. **Touch Targets & Hit Areas**:
   - Interactive buttons, slot chips, and icons must have at least `44px` minimum touch targets:
     ```tsx
     <button className="min-h-[44px] px-4 py-2.5 flex items-center justify-center ...">
     ```
3. **Sticky Action Bars on Mobile**:
   - On mobile checkout or slot selection, pin primary action buttons (e.g., "Proceed to GCash Payment") to the bottom of the viewport using `fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 md:relative`.

---

## 4. ✨ Micro-Interactions & Polish

1. **Interactive Button States**:
   - Apply subtle scale-down and hover feedback:
     ```tsx
     <button className="transition-all duration-200 active:scale-95 hover:brightness-110 shadow-lg hover:shadow-emerald-500/20">
     ```
2. **Clipboard Copy Feedback**:
   - Provide instant tactile feedback when users copy GCash account details or reference codes:
     ```tsx
     <button onClick={handleCopy} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5">
       {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
       {isCopied ? 'Copied!' : 'Copy'}
     </button>
     ```
3. **Dropzone File Uploader**:
   - Provide empty state with animated icons, file type restrictions, drag hover effects, and a clear preview with an active delete `X` button.

---

## 5. 🪟 Modals & Dialog UX Standards

1. **Backdrop & Focus Trap**:
   - Dark translucent backdrop (`bg-black/70 backdrop-blur-sm`).
   - Dismissible on backdrop click or explicit `X` close button.
2. **Error Modal Alerts**:
   - Distinctive red icon badge (`bg-rose-500/20 text-rose-400 border border-rose-500/30`).
   - Clear, friendly explanation of what failed (e.g., "Reference Number must be exactly 13 digits").
   - Actionable "Go Back & Fix" primary button with red styling.

---

## 6. ♿ Accessibility & Icon Standards

1. **Lucide React Icons**:
   - Pair icons with text labels or include `aria-label` attributes on icon-only buttons.
   - Standard sizing: `w-4 h-4` for compact chips, `w-5 h-5` for standard buttons, `w-6 h-6` for headers.
2. **Color Contrast**:
   - Never place low-contrast gray text (`text-slate-600`) on dark backgrounds (`bg-slate-900`); use `text-slate-400` or higher for legible secondary text.

