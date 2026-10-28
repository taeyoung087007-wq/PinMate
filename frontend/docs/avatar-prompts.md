# PinMate avatar generation

Generated with the built-in image_gen tool. Each asset is a separate generated image. The cat image is the style reference for the other seven. Original generated PNGs are in public/avatars/. No API key or external image URL is used by the UI.

## cat

Use case: stylized-concept. Asset type: one square character avatar for PinMate, a Korean friends' shared places app with a dark navy and violet UI. Create ONE adorable lavender CAT face, front-facing centered head only, tiny neck base if needed, rounded triangular ears, simple black bead eyes, tiny expressive mouth, warm friendly expression. Cohesive premium soft 3D clay toy illustration, smooth matte surface, gentle studio lighting from upper left, very subtle dimension, NOT glossy plastic, not furry or realistic. The head occupies about 76% of square canvas including ears, fully inside frame with generous safe padding, recognisable at 40px. Solid uniform deep navy #201D35 background edge to edge, no gradient backdrop, no circle or frame. Lavender fur, pale cream muzzle, tiny blush accents. No words, letters, numbers, logos, accessories, body, scenery, ground, or cast shadow outside the head. Output a single square avatar image, not a contact sheet.

## dog

Use case: stylized-concept. Create ONE new square PinMate character avatar matching the supplied image as a STYLE REFERENCE. Replace the cat with a caramel tan PUPPY with floppy ears, cream muzzle, friendly smile. Match exactly the reference's soft matte 3D clay rendering, black bead eyes, gentle upper-left studio light, subtle blush, friendly expression, deep navy #201D35 background, front-facing centered head only and generous padding. Species must be clearly recognisable and anatomically distinct. Same visual collection as the reference cat, but remove all cat-specific features. The whole head including ears fits comfortably inside the image, about 76% of the square. Small-icon readability at 40px. No words, letters, logos, frames, accessories, body, scenery, or extra objects. One image of one character, never a sheet.

## rabbit

Use case: stylized-concept. Create ONE new square PinMate character avatar matching the supplied image as a STYLE REFERENCE. Replace the cat with a pale peach RABBIT with two upright rounded ears kept fully in the frame, tiny nose, friendly smile. Match exactly the reference's soft matte 3D clay rendering, black bead eyes, gentle upper-left studio light, subtle blush, friendly expression, deep navy #201D35 background, front-facing centered head only and generous padding. Species must be clearly recognisable and anatomically distinct. Same visual collection as the reference cat, but remove all cat-specific features. The whole head including ears fits comfortably inside the image, about 76% of the square. Small-icon readability at 40px. No words, letters, logos, frames, accessories, body, scenery, or extra objects. One image of one character, never a sheet.

## bear

Use case: stylized-concept. Create ONE new square PinMate character avatar matching the supplied image as a STYLE REFERENCE. Replace the cat with a warm cocoa BROWN BEAR with small round ears and cream muzzle. Match exactly the reference's soft matte 3D clay rendering, black bead eyes, gentle upper-left studio light, subtle blush, friendly expression, deep navy #201D35 background, front-facing centered head only and generous padding. Species must be clearly recognisable and anatomically distinct. Same visual collection as the reference cat, but remove all cat-specific features. The whole head including ears fits comfortably inside the image, about 76% of the square. Small-icon readability at 40px. No words, letters, logos, frames, accessories, body, scenery, or extra objects. One image of one character, never a sheet.

## fox

Use case: stylized-concept. Create ONE new square PinMate character avatar matching the supplied image as a STYLE REFERENCE. Replace the cat with an apricot orange FOX with pointed ears and cream cheeks, rounded friendly shapes. Match exactly the reference's soft matte 3D clay rendering, black bead eyes, gentle upper-left studio light, subtle blush, friendly expression, deep navy #201D35 background, front-facing centered head only and generous padding. Species must be clearly recognisable and anatomically distinct. Same visual collection as the reference cat, but remove all cat-specific features. The whole head including ears fits comfortably inside the image, about 76% of the square. Small-icon readability at 40px. No words, letters, logos, frames, accessories, body, scenery, or extra objects. One image of one character, never a sheet.

## panda

Use case: stylized-concept. Create ONE new square PinMate character avatar matching the supplied image as a STYLE REFERENCE. Replace the cat with a soft ivory PANDA with charcoal round ears and eye patches. Match exactly the reference's soft matte 3D clay rendering, black bead eyes, gentle upper-left studio light, subtle blush, friendly expression, deep navy #201D35 background, front-facing centered head only and generous padding. Species must be clearly recognisable and anatomically distinct. Same visual collection as the reference cat, but remove all cat-specific features. The whole head including ears fits comfortably inside the image, about 76% of the square. Small-icon readability at 40px. No words, letters, logos, frames, accessories, body, scenery, or extra objects. One image of one character, never a sheet.

## penguin

Use case: stylized-concept. Create ONE new square PinMate character avatar matching the supplied image as a STYLE REFERENCE. Replace the cat with a slate blue PENGUIN with ivory face patch and tiny muted orange beak, no external ears. Match exactly the reference's soft matte 3D clay rendering, black bead eyes, gentle upper-left studio light, subtle blush, friendly expression, deep navy #201D35 background, front-facing centered head only and generous padding. Species must be clearly recognisable and anatomically distinct. Same visual collection as the reference cat, but remove all cat-specific features. The whole head including ears fits comfortably inside the image, about 76% of the square. Small-icon readability at 40px. No words, letters, logos, frames, accessories, body, scenery, or extra objects. One image of one character, never a sheet.

## otter

Use case: stylized-concept. Create ONE new square PinMate character avatar matching the supplied image as a STYLE REFERENCE. Replace the cat with a warm taupe OTTER with tiny round ears, wide cream muzzle, little whisker dots. Match exactly the reference's soft matte 3D clay rendering, black bead eyes, gentle upper-left studio light, subtle blush, friendly expression, deep navy #201D35 background, front-facing centered head only and generous padding. Species must be clearly recognisable and anatomically distinct. Same visual collection as the reference cat, but remove all cat-specific features. The whole head including ears fits comfortably inside the image, about 76% of the square. Small-icon readability at 40px. No words, letters, logos, frames, accessories, body, scenery, or extra objects. One image of one character, never a sheet.


## Transparent character variants

Built-in image_gen editing, transparent_background=true. Each corresponding original image in public/avatars/ is the edit target. Final transparent files use the -transparent.png suffix. Background colors are composed in CSS and do not alter the character artwork.

Prompt used for all eight individual edits:

Use case: background-extraction. Edit the supplied avatar image by removing ONLY its dark navy background. Preserve the exact character's species, colors, face, expression, ears, small neck, head size, framing, lighting, texture, and all details. Genuine transparent alpha outside the character, including gaps around ears. No solid backdrop, no checkerboard baked into pixels, no shadow beyond the silhouette, no new objects. Keep the same square canvas and placement. The output is a transparent PNG cutout for compositing on user-selected background colors in an app.
