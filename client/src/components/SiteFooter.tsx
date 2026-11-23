/** Site footer, shown at the bottom of every screen (spec section 5). */
export const FOOTER_TEXT = '© 2026 Discerning Parenting. All Rights Reserved.';
export const FOOTER_URL = 'https://discerningparenting.com';

export function SiteFooter() {
  return (
    <footer className="app-footer">
      <p>
        © 2026{' '}
        <a
          href={FOOTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Discerning Parenting (opens in a new tab)"
        >
          Discerning Parenting
        </a>
        . All Rights Reserved.
      </p>
    </footer>
  );
}
