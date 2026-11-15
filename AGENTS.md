<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep mission comparison helpers browser-safe and separate from presentation so geometry and window rules can be tested independently.
- Custom sites use an explicitly declared constant horizon, never an implied surveyed terrain profile; scenario exports include dates and model provenance.
- External lunar tools use browser-safe site/window URL helpers and explicit observer-altitude assumptions; they never silently change the calculation source.
- First-visit tour dismissal is device-local browser preference, not mission data; initialize it after hydration to preserve SSR consistency.
