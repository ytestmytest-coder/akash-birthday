AKASH'S BIRTHDAY SHOW — SETUP GUIDE
=====================================

WHAT'S IN THIS FOLDER
----------------------
index.html   -> the page
style.css    -> all styling
script.js    -> all interactivity (game, countdown, gallery, cake, guestbook)
images/      -> photo1.jpg ... photo6.jpg (placeholder images — replace these!)

HOW TO VIEW IT RIGHT NOW
--------------------------
Just double-click index.html and it opens in your browser. Everything
works offline except the Google Fonts and the Google Analytics script
(those need internet).

STEP 1 — PHOTOS
-----------------------------------
The "images" folder already has Akash's real photos in it (photo1.jpg
through photo5.jpg) — nothing to do here unless you want to swap one
out. To replace a photo, just overwrite the file, keeping the exact
same file name (photo1.jpg, photo2.jpg, etc.) and it'll just work —
no code changes needed. Square-ish, well-lit photos look best since
they're cropped to squares in the gallery.

If you want to change the caption under each photo, or add a 6th
photo, open script.js and edit the PHOTOS list near the top (around
line 17) — each entry has a "caption" you can rewrite, and you can
add a new { src: "images/photo6.jpg", caption: "..." } line (after
adding that file to the images folder).

STEP 2 — CONNECT GOOGLE ANALYTICS 4
--------------------------------------
1. Go to https://analytics.google.com and create (or open) a GA4 property.
2. Go to Admin > Data Streams > your web stream, and copy the
   "Measurement ID" — it looks like G-ABC123XYZ.
3. Open index.html, and replace BOTH instances of G-XXXXXXXXXX
   (near the top, inside the <head> section) with your real ID.
4. Save, re-upload/host the file. That's it — GA4 will now track:
     - page views (automatic)
     - balloon_pop (each balloon popped in the intro game)
     - curtain_opened (when the intro finishes)
     - gallery_photo_view (each photo opened in the lightbox)
     - candle_lit / all_candles_lit (birthday cake game)
     - wish_submitted (someone leaves a guestbook message)
   You'll see these under GA4 > Reports > Engagement > Events after
   a little traffic comes through (can take a few hours to first appear).

STEP 3 — DOUBLE-CHECK THE DATE
---------------------------------
The countdown is already set to July 21st. If you ever need to change
it, open script.js and edit these two lines near the top:
     var BIRTHDAY_MONTH = 6;   // 0-indexed: Jan=0 ... Jul=6 ... Dec=11
     var BIRTHDAY_DAY = 21;

STEP 4 — PUT IT ONLINE (so you can share a link)
---------------------------------------------------
Easiest free options, no coding required:
  - Netlify Drop: https://app.netlify.com/drop — drag this whole folder
    into the browser window, get a live link in seconds.
  - GitHub Pages: create a repo, upload these files, enable Pages in
    repo Settings.
  - Vercel: https://vercel.com/new — import/upload the folder.

Any of these will give you a shareable URL you can send to Akash or
post on your story.

HOW THE PAGE WORKS
---------------------
- Opening game: pop all 6 balloons and the velvet curtain parts to
  reveal the site (each pop also nudges the curtain open a little).
- Countdown: live days/hours/minutes/seconds to July 21st. On the day
  itself it swaps to a "Happy Birthday!" message automatically.
- Gallery: click any photo for a full-screen view with arrow-key or
  on-screen navigation.
- Cake game: click each candle to light it. Light all 6 and a hidden
  birthday message reveals itself with a confetti burst.
- Guestbook: anyone viewing the page can leave a message. Messages are
  stored in that visitor's own browser (not shared between visitors —
  if you want a shared guestbook everyone can see, that needs a small
  backend/database, which I'm happy to help add).

Everything respects "reduced motion" settings for visitors who have
that turned on in their OS, and the whole page works on mobile.

Happy birthday, Akash! 🎉
