# Manual Build System

The user manual has been moved from an in-app React component to a standalone HTML file that's generated at build time.

## Benefits

- **Reduced bundle size**: Manual content and markdown parser are no longer included in the main JavaScript bundle
- **Better performance**: Manual is pre-rendered HTML/CSS instead of being processed at runtime
- **Improved accessibility**: Static HTML works without JavaScript and is more accessible
- **Faster loading**: No need to fetch and parse markdown content when opening the manual
- **Easier deployment**: Manual works independently of the main application

## How it works

1. **Source**: The manual content is maintained in `public/USER_MANUAL.md`
2. **Build script**: `scripts/build-manual.js` converts the markdown to styled HTML
3. **Output**: Generated `manual.html` files are created in both `dist/` and `public/` directories
4. **Integration**: The app opens the manual in a new tab/window via `window.open('./manual.html')`

## Build process

The manual is automatically generated as part of the main build process:

```bash
npm run build        # Builds app and generates manual
npm run build:manual # Generates manual only
```

## Development

During development, the manual is available at:
- `http://localhost:5174/manual.html` (dev server)
- `file:///path/to/project/dist/manual.html` (local file)

## Styling

The manual uses a custom CSS theme that matches the application's Material-UI dark theme:
- Dark background (`#121212`)
- Primary blue colors (`#1976d2`)
- Responsive design
- Print-friendly styles

## Files

- `public/USER_MANUAL.md` - Source markdown content
- `scripts/build-manual.js` - Build script
- `public/manual.html` - Generated manual (for dev server)
- `dist/manual.html` - Generated manual (for production)
- `dist/img/` - Manual images and assets

## Maintenance

To update the manual:
1. Edit `public/USER_MANUAL.md`
2. Run `npm run build:manual` to regenerate
3. Manual is automatically regenerated during `npm run build`

The generated `public/manual.html` file is gitignored since it's build output.
