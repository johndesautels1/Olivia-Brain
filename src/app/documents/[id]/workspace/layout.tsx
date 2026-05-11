/**
 * Workspace layout — hides the site masthead, tickers, and dev banner
 * so the editor gets maximum vertical space.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #dev-banner,
            #site-masthead,
            #site-ticker,
            #site-stock-ticker {
              display: none !important;
            }
          `,
        }}
      />
      {children}
    </>
  );
}
