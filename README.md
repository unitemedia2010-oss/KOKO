# Koko Linh — Executive Creative Portfolio

Static website ready for **GitHub Pages**. No build step is required.

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `koko-linh-portfolio`.
2. Upload **all files and folders in this package** to the repository root:
   - `index.html`
   - `assets/`
   - `.nojekyll`
3. Commit / push to the `main` branch.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select **main** and **/(root)**, then click **Save**.
7. GitHub will publish the site at a URL similar to:
   `https://USERNAME.github.io/koko-linh-portfolio/`

## Local preview

From this folder, run:

```bash
python -m http.server 8000
```

On Windows you can also use:

```bash
py -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes before public launch

The website currently keeps the title and operating figures from the supplied portfolio/research direction. Before a high-profile public launch, internally confirm the exact public-facing title, the `10K+` inventory figure, the `300+` people figure, and any partner-logo usage if logos are added later.

## Tech

- Pure static HTML/CSS/JS
- GSAP + ScrollTrigger via CDN for motion
- Google Fonts via CDN
- Optimized local WebP assets
- Responsive mobile layout
- Dark/light theme toggle
- Reduced-motion fallback
